import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider, PaymentStatus, SubscriptionPlan, PaymentType, SubscriptionStatus, Currency } from '@prisma/client';
import { PaypalConfigService } from './paypal.config';
import { XenditSubscriptionService } from './xendit-subscription.service';
import { Xendit } from 'xendit-node';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly xenditClient: Xendit;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private paypalConfigService: PaypalConfigService,
    private xenditSubscriptionService: XenditSubscriptionService,
  ) {
    this.xenditClient = new Xendit({
      secretKey: this.configService.get('XENDIT_SECRET_KEY'),
    });
  }

  async createPayment(data: {
    userId: string;
    amount: number;
    description: string;
    paymentMethod: string;
    orderId?: string;
    currency?: string;
    subscriptionId?: string; // link payment to subscription if available
    labelId?: string; // link to EnterpriseLabel for org-level billing
    metadata?: any; // arbitrary metadata
    invoiceNumber?: string; // manual invoice number
  }) {
    this.logger.log(`Creating payment for user ${data.userId}: ${data.amount} - ${data.description}`);

    // Determine payment provider based on paymentMethod
    let provider: PaymentProvider = PaymentProvider.XENDIT;
    const MANUAL_PROVIDER = 'MANUAL' as PaymentProvider; // Local constant to represent manual provider
    if (data.paymentMethod.toLowerCase() === 'paypal') {
      provider = PaymentProvider.PAYPAL;
    } else if (data.paymentMethod.toLowerCase() === 'manual') {
      provider = MANUAL_PROVIDER;
    }

    // Create payment record in database
    const payment = await this.prisma.payment.create({
      data: {
        userId: data.userId,
        amount: data.amount,
        currency: ((data.currency as any) || (provider === PaymentProvider.PAYPAL ? Currency.USD : Currency.IDR)) as Currency,
        provider: provider,
        status: PaymentStatus.PENDING,
        paymentType: PaymentType.ONE_TIME,
        description: data.description,
        subscriptionId: data.subscriptionId,
        labelId: data.labelId,
        invoiceNumber: data.invoiceNumber,
        metadata: data.metadata as any,
      },
    });

    // NEW: Handle MANUAL provider by immediately marking as PAID
    if (provider === MANUAL_PROVIDER) {
      const awaitingApproval = !!(data.metadata && (data.metadata.awaitingApproval === true));
      return this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: awaitingApproval ? (PaymentStatus as any).AWAITING_APPROVAL ?? PaymentStatus.PENDING : PaymentStatus.PAID,
          paidAt: awaitingApproval ? null : new Date(),
          metadata: {
            note: 'Manual payment (Enterprise Label)',
            description: data.description,
            ...(data.metadata || {}),
          } as any,
        },
      });
    }

    // Jika menggunakan PayPal, buat pembayaran melalui PayPal API
    if (provider === PaymentProvider.PAYPAL) {
      try {
        const paypal = this.paypalConfigService.getPaypalSDK();
        const baseUrl = this.configService.get('APP_URL') || 'http://localhost:3000';
        
        const create_payment_json = {
          intent: "sale",
          payer: {
            payment_method: "paypal"
          },
          redirect_urls: {
            return_url: `${baseUrl}/subscription/payment/paypal/execute?paymentId=${payment.id}`,
            cancel_url: `${baseUrl}/subscription/payment/cancel`
          },
          transactions: [{
            amount: {
              total: data.amount.toString(),
              currency: (data.currency as any) || "USD"
            },
            description: data.description || "Sentra Dapur Subscription"
          }]
        };

        // Buat promise untuk menangani callback PayPal
        return new Promise((resolve, reject) => {
          paypal.payment.create(create_payment_json, (error, paypalPayment) => {
            if (error) {
              this.logger.error(`PayPal Create Payment Error: ${error.message}`);
              reject(error);
              return;
            }
            
            // Cari approval URL dari response PayPal
            const approvalLink = paypalPayment.links.find(link => link.rel === "approval_url");
            if (!approvalLink) {
              reject(new Error("Approval URL tidak ditemukan dari PayPal"));
              return;
            }

            // Update payment dengan paymentLink, externalId, dan metadata
            this.prisma.payment.update({
              where: { id: payment.id },
              data: {
                paymentLink: approvalLink.href,
                externalId: paypalPayment.id,
                metadata: {
                  paymentLink: approvalLink.href,
                  externalId: paypalPayment.id,
                  description: data.description
                } as any,
                providerData: JSON.parse(JSON.stringify(paypalPayment)) as any
              },
            }).then(() => {
              resolve({
                id: payment.id,
                approval_url: approvalLink.href,
                status: PaymentStatus.PENDING
              });
            }).catch(err => {
              reject(err);
            });
          });
        });
      } catch (error) {
        this.logger.error(`Error creating PayPal payment: ${error.message}`);
        throw error;
      }
    } else {
      // Untuk Xendit, gunakan implementasi one-time payment
      try {
        const invoice = await this.xenditClient.Invoice.createInvoice({
          data: {
            externalId: `invoice_${payment.id}_${Date.now()}`,
            amount: data.amount,
            description: data.description || "Sentra Dapur Payment",
            invoiceDuration: 86400, // 24 hours
            currency: (data.currency as any) || "IDR",
            reminderTime: 1,
            successRedirectUrl: `${this.configService.get('APP_URL')}/payment/success`,
            failureRedirectUrl: `${this.configService.get('APP_URL')}/payment/failed`,
          }
        });

        // FIX: Convert Invoice object to plain JSON to avoid TypeScript error
        const invoiceData = JSON.parse(JSON.stringify(invoice));

        // Update payment dengan invoice data
        return await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            paymentLink: invoice.invoiceUrl!,
            externalId: invoice.id!,
            metadata: {
              invoice: invoiceData, // Now it's a plain object
              description: data.description,
              invoiceId: invoice.id,
              invoiceUrl: invoice.invoiceUrl,
              status: invoice.status,
              currency: invoice.currency,
              amount: invoice.amount,
              createdAt: invoice.created,
              ...(data.metadata || {}),
            } as any,
            providerData: invoiceData as any
          },
        });
      } catch (error) {
        this.logger.error(`Error creating Xendit invoice: ${error.message}`);
        throw error;
      }
    }
  }

  /**
   * Create subscription payment - works for both PayPal and Xendit
   */
  async createSubscriptionPayment(data: {
    userId: string;
    plan: SubscriptionPlan;
    price: number;
    paymentMethod: string;
    currency?: string;
  }) {
    this.logger.log(`Creating subscription payment for user ${data.userId}: ${data.plan}`);

    if (data.paymentMethod.toLowerCase() === 'paypal') {
      // Use existing PayPal subscription logic (from PaypalSubscriptionService)
      throw new Error('Use PaypalSubscriptionService.createBillingAgreement for PayPal subscriptions');
    } else {
      // Use Xendit subscription
      return await this.xenditSubscriptionService.createSubscriptionPlan({
        userId: data.userId,
        plan: data.plan,
        price: data.price,
        currency: (data.currency as any) || 'IDR'
      });
    }
  }

  private generatePaymentLink(paymentId: string, amount: number, provider: PaymentProvider): string {
    // In a real implementation, this would call a payment gateway API
    // For demonstration, we'll just create a mock URL
    const baseUrl = this.configService.get('PAYMENT_GATEWAY_URL') || 'https://payment.sentradapur.com';
    
    if (provider === PaymentProvider.PAYPAL) {
      return `${baseUrl}/paypal/${paymentId}?amount=${amount}`;
    } else {
      return `${baseUrl}/xendit/${paymentId}?amount=${amount}`;
    }
  }

  async verifyPayment(paymentId: string, transactionId: string) {
    // In a real implementation, this would verify the payment with the payment gateway
    // For demonstration, we'll just update the payment status
    
    this.logger.log(`Verifying payment ${paymentId} with transaction ${transactionId}`);
    
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.PAID,
        paidAt: new Date(),
        metadata: {
          transactionId: transactionId,
          verifiedAt: new Date().toISOString()
        } as any
      },
    });
  }

  async executePaypalPayment(paymentId: string, payerId: string) {
    try {
      // Ambil data payment dari database
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new Error(`Payment dengan ID ${paymentId} tidak ditemukan`);
      }

      if (payment.status === PaymentStatus.PAID) {
        return { success: true, message: 'Pembayaran sudah diproses sebelumnya' };
      }

      // Eksekusi pembayaran di PayPal
      const paypal = this.paypalConfigService.getPaypalSDK();
      
      const execute_payment_json = {
        payer_id: payerId
      };

      return new Promise((resolve, reject) => {
        // Ambil externalId dari field externalId
        const externalId = payment.externalId;
        if (!externalId) {
          reject(new Error('External ID tidak ditemukan'));
          return;
        }
        
        paypal.payment.execute(externalId, execute_payment_json, async (error, paypalPayment) => {
          if (error) {
            this.logger.error(`PayPal Execute Payment Error: ${error.message}`);
            reject(error);
            return;
          }

          // Update status pembayaran di database
          try {
            const updatedPayment = await this.prisma.payment.update({
              where: { id: paymentId },
              data: {
                status: PaymentStatus.PAID,
                paidAt: new Date(),
                metadata: {
                  ...payment.metadata as any,
                  paypalPayment: JSON.parse(JSON.stringify(paypalPayment)), // Convert to plain object
                  executedAt: new Date().toISOString(),
                  payerId: payerId
                } as any,
                providerData: JSON.parse(JSON.stringify(paypalPayment)) as any
              },
            });

            // Jika pembayaran untuk subscription, aktifkan subscription
            if (payment.subscriptionId) {
              await this.prisma.subscription.update({
                where: { id: payment.subscriptionId },
                data: {
                  status: SubscriptionStatus.ACTIVE,
                  startedAt: new Date(),
                  currentPeriodStart: new Date(),
                  currentPeriodEnd: this.calculatePeriodEnd(new Date(), 'MONTHLY') // Default to monthly
                },
              });
            }

            resolve({
              success: true,
              payment: updatedPayment,
              message: 'Pembayaran berhasil diproses'
            });
          } catch (dbError) {
            this.logger.error(`Database Error: ${dbError.message}`);
            reject(dbError);
          }
        });
      });
    } catch (error) {
      this.logger.error(`Error executing PayPal payment: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle Xendit webhook for invoice and subscription events
   */
  async handleXenditWebhook(eventType: string, data: any) {
    this.logger.log(`Received Xendit webhook: ${eventType}`);

    try {
      if (eventType.startsWith('recurring.')) {
        // Handle subscription webhooks
        return await (this.xenditSubscriptionService as any).handleSubscriptionWebhook(eventType, data);
      } else if (eventType === 'invoice.paid') {
        // Handle one-time payment invoice
        const payment = await this.prisma.payment.findFirst({
          where: { externalId: data.id }
        });

        if (payment) {
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.PAID,
              paidAt: new Date(data.paid_at || new Date()),
              metadata: {
                ...(payment.metadata as any),
                webhookData: JSON.parse(JSON.stringify(data)), // Convert to plain object
                paidAt: data.paid_at,
                updatedAt: new Date().toISOString(),
              } as any,
              webhookData: JSON.parse(JSON.stringify(data)) as any
            }
          });

          // If payment is linked to subscription, activate it
          if (payment.subscriptionId) {
            await this.prisma.subscription.update({
              where: { id: payment.subscriptionId },
              data: {
                status: SubscriptionStatus.ACTIVE,
                startedAt: new Date(),
                currentPeriodStart: new Date(),
                currentPeriodEnd: this.calculatePeriodEnd(new Date(), 'MONTHLY')
              }
            });
          }
        }
      } else if (eventType === 'invoice.expired' || eventType === 'invoice.failed') {
        // Handle failed payments
        const payment = await this.prisma.payment.findFirst({
          where: { externalId: data.id }
        });

        if (payment) {
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.FAILED,
              failedAt: new Date(),
              failureReason: data.failure_code || 'Unknown error',
              metadata: {
                ...(payment.metadata as any),
                webhookData: JSON.parse(JSON.stringify(data)), // Convert to plain object
                failedAt: new Date().toISOString(),
                failureReason: data.failure_code || 'Unknown error'
              } as any,
              webhookData: JSON.parse(JSON.stringify(data)) as any
            }
          });

          // If payment is linked to subscription, mark as failed
          if (payment.subscriptionId) {
            await this.prisma.subscription.update({
              where: { id: payment.subscriptionId },
              data: {
                status: SubscriptionStatus.EXPIRED,
              }
            });
          }
        }
      }

      return { success: true, message: 'Webhook processed successfully' };
    } catch (error) {
      this.logger.error(`Error handling Xendit webhook: ${error.message}`);
      throw error;
    }
  }

  async getPaymentById(paymentId: string) {
    return this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        subscription: true, // Include subscription data
        user: {
          select: { id: true, email: true } // Include basic user info
        }
      }
    });
  }

  async getUserPayments(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: true // Include subscription data if available
      }
    });
  }

  /**
   * Cancel subscription - works for both providers
   */
  async cancelSubscription(subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({ where: { id: subscriptionId } });

    if (!subscription) {
      throw new Error('Subscription tidak ditemukan');
    }

    const payment = await this.prisma.payment.findFirst({
      where: { subscriptionId },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment) {
      throw new Error('Payment record tidak ditemukan untuk subscription ini');
    }

    if (payment.provider === PaymentProvider.XENDIT) {
      await (this.xenditSubscriptionService as any).cancelSubscription(subscriptionId);
    } else {
      throw new Error('PayPal subscription cancellation not implemented yet');
    }

    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: SubscriptionStatus.CANCELLED, cancelledAt: new Date(), autoRenew: false },
    });

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        metadata: {
          ...(payment.metadata as any),
          cancelledAt: new Date().toISOString(),
          cancelledBy: 'user',
        } as any,
      },
    });

    return { success: true, message: 'Subscription berhasil dibatalkan' };
  }

  /**
   * Get subscription status and details
   */
  async getSubscriptionDetails(subscriptionId: string) {
    return this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' }
        },
        user: {
          select: { id: true, email: true }
        }
      }
    });
  }

  /**
   * Check if user has active subscription
   */
  async hasActiveSubscription(userId: string): Promise<boolean> {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId: userId,
        status: SubscriptionStatus.ACTIVE,
        expiresAt: {
          gt: new Date() // Not expired
        }
      }
    });

    return !!subscription;
  }

  /**
   * Get user's active subscription
   */
  async getUserActiveSubscription(userId: string) {
    return this.prisma.subscription.findFirst({
      where: {
        userId: userId,
        status: SubscriptionStatus.ACTIVE,
        expiresAt: {
          gt: new Date() // Not expired
        }
      },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 5 // Last 5 payments
        }
      }
    });
  }

  /**
   * Calculate period end date based on plan type
   */
  private calculatePeriodEnd(startDate: Date, planType: string): Date {
    const endDate = new Date(startDate);
    
    if (planType.includes('YEARLY')) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }
    
    return endDate;
  }

  /**
   * Log subscription history for audit trail
   */
  private async logSubscriptionHistory(
    subscriptionId: string,
    action: string,
    oldStatus?: string,
    newStatus?: string,
    reason?: string,
    metadata?: any
  ) {
    try {
      await this.prisma.subscriptionHistory.create({
        data: {
          subscriptionId,
          action: action as any,
          oldStatus: oldStatus as any,
          newStatus: newStatus as any,
          reason,
          metadata: metadata as any
        }
      });
    } catch (error) {
      this.logger.warn(`Failed to log subscription history: ${error.message}`);
    }
  }
}