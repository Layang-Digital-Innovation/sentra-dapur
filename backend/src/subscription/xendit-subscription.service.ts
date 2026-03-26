import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { SubscriptionPlan, SubscriptionStatus, PaymentProvider, PaymentStatus, PaymentType, SubscriptionAction, Currency } from '@prisma/client';

import { Xendit } from 'xendit-node';
import { PaymentRequestCurrency } from 'xendit-node/payment_request/models/PaymentRequestCurrency';

@Injectable()
export class XenditSubscriptionService {
  private readonly logger = new Logger(XenditSubscriptionService.name);
  private readonly xenditClient: Xendit;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.xenditClient = new Xendit({
      secretKey: this.configService.get('XENDIT_SECRET_KEY'),
    });
  }

  async createSubscriptionPlan(data: {
    userId: string;
    plan: SubscriptionPlan;
    price: number;
    currency?: string;
  }) {
    try {
      // ...

      const paymentRequest = await this.xenditClient.PaymentRequest.createPaymentRequest({
        data: {
          referenceId: `plan_${data.userId}_${Date.now()}`,
          amount: data.price,
          currency: (data.currency as PaymentRequestCurrency) || PaymentRequestCurrency.Idr,

          // ...
        }
      });

      const subscription = await this.prisma.subscription.create({
        data: {
          userId: data.userId,
          plan: data.plan,
          status: SubscriptionStatus.TRIAL,
          startedAt: new Date(),
          expiresAt: null,
          trialEndsAt: this.calculateTrialEnd(new Date()),
          autoRenew: true,
          currentPeriodStart: new Date(),
          currentPeriodEnd: null
        }
      });

      const payment = await this.prisma.payment.create({
        data: {
          userId: data.userId,
          provider: PaymentProvider.XENDIT,
          amount: data.price,
          currency: (((data.currency as any) === 'USD') ? Currency.USD : Currency.IDR),
          paymentType: PaymentType.RECURRING,
          status: PaymentStatus.PENDING,
          description: `${data.plan} subscription payment`,
          subscriptionId: subscription.id,
          externalId: paymentRequest.id!,
          paymentLink: paymentRequest.actions?.find(a => a.action === 'AUTH')?.url,
          metadata: {
            paymentRequestId: paymentRequest.id,
            planType: data.plan,
            planData: JSON.parse(JSON.stringify(paymentRequest)),
            currency: (data.currency as any) || 'IDR',
            createdAt: new Date().toISOString(),
          } as any,
          providerData: {
            xenditPaymentRequest: paymentRequest
          } as any
        }
      });

      // Return plan creation data to caller
      return {
        subscriptionId: subscription.id,
        paymentId: payment.id,
        planId: paymentRequest.id!,
        paymentLink: payment.paymentLink,
        status: subscription.status,
        paymentRequest: JSON.parse(JSON.stringify(paymentRequest)),
      };
    } catch (error) {
      // ...
    }
  }

  async createOneTimePayment(data: {
    userId: string;
    amount: number;
    description: string;
    currency?: string;
  }) {
    try {
      // ...

      const invoice = await this.xenditClient.Invoice.createInvoice({
        data: {
          externalId: `onetime_${data.userId}_${Date.now()}`,
          amount: data.amount,
          description: data.description,
          invoiceDuration: 86400,
          currency: (data.currency as PaymentRequestCurrency) || PaymentRequestCurrency.Idr,
          reminderTime: 1,
          successRedirectUrl: `${this.configService.get('APP_URL')}/payment/success`,
          failureRedirectUrl: `${this.configService.get('APP_URL')}/payment/failed`,
        }
      });

      const payment = await this.prisma.payment.create({
        data: {
          userId: data.userId,
          provider: PaymentProvider.XENDIT,
          amount: data.amount,
          currency: (((data.currency as any) === 'USD') ? Currency.USD : Currency.IDR),
          paymentType: PaymentType.ONE_TIME,
          status: PaymentStatus.PENDING,
          description: data.description,
          externalId: invoice.id!,
          paymentLink: invoice.invoiceUrl!,
          metadata: {
            invoiceId: invoice.id,
            invoiceUrl: invoice.invoiceUrl,
            description: data.description,
            currency: (data.currency as any) || 'IDR',
            invoiceData: JSON.parse(JSON.stringify(invoice)),
          } as any,
          providerData: {
            xenditInvoice: invoice
          } as any
        }
      });

      // Return response for client usage
      return {
        paymentId: payment.id,
        invoiceId: invoice.id!,
        paymentLink: invoice.invoiceUrl!,
        status: payment.status,
        invoice: JSON.parse(JSON.stringify(invoice)),
      };
    } catch (error) {
      this.logger.error(`Error creating Xendit one-time payment: ${error.message}`, error.stack);
      throw error;
    }
  }

  async handleSubscriptionWebhook(eventType: string, data: any) {
    try {
      this.logger.log(`Received Xendit webhook: ${eventType}`, data);

      switch (eventType) {
        case 'recurring.plan.activated':
          return await this.handlePlanActivated(data);
        case 'recurring.cycle.created':
          return await this.handleCycleCreated(data);
        case 'recurring.cycle.succeeded':
          return await this.handleCycleSucceeded(data);
        case 'recurring.cycle.failed':
          return await this.handleCycleFailed(data);
        case 'recurring.plan.deactivated':
          return await this.handlePlanDeactivated(data);
        case 'recurring.plan.stopped':
          return await this.handlePlanStopped(data);
        default:
          this.logger.warn(`Unhandled webhook event: ${eventType}`);
          return { success: false, message: `Unhandled event: ${eventType}` };
      }
    } catch (error) {
      this.logger.error(`Error handling Xendit webhook: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handlePlanActivated(data: any) {
    try {
      this.logger.log('Processing plan activated webhook:', data);

      const payment = await this.prisma.payment.findFirst({
        where: { externalId: data.id },
        include: { subscription: true }
      });

      if (!payment || !payment.subscription) {
        this.logger.warn(`Payment or subscription not found for plan: ${data.id}`);
        return;
      }

      await this.prisma.subscription.update({
        where: { id: payment.subscriptionId! },
        data: {
          status: SubscriptionStatus.ACTIVE,
          startedAt: new Date(),
          currentPeriodStart: new Date(),
          currentPeriodEnd: this.calculatePeriodEnd(new Date(), payment.subscription.plan),
          autoRenew: true
        }
      });

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          paidAt: new Date(),
          metadata: {
            ...(payment.metadata as any),
            planActivatedAt: new Date().toISOString(),
            xenditPlanData: data
          } as any,
          providerData: {
            ...(payment.providerData as any),
            planActivatedData: data
          } as any
        }
      });

      await this.logSubscriptionHistory(
        payment.subscriptionId!,
        'ACTIVATED',
        SubscriptionStatus.TRIAL,
        SubscriptionStatus.ACTIVE,
        'Plan activated via Xendit webhook'
      );

      this.logger.log(`Subscription activated: ${payment.subscriptionId}`);
    } catch (error) {
      this.logger.error('Error handling plan activated:', error);
    }
  }

  private async handleCycleCreated(data: any) {
    try {
      this.logger.log(`Subscription cycle created: ${data.id} for plan: ${data.recurringPlanId}`);
      
      const payment = await this.prisma.payment.findFirst({
        where: { externalId: data.recurringPlanId }
      });

      if (payment) {
        await this.prisma.payment.create({
          data: {
            userId: payment.userId,
            provider: PaymentProvider.XENDIT,
            amount: data.amount || 0,
            status: PaymentStatus.PENDING,
            subscriptionId: payment.subscriptionId,
            externalId: data.id,
            metadata: {
              cycleType: 'CREATED',
              cycleData: JSON.parse(JSON.stringify(data)),
              recurringPlanId: data.recurringPlanId,
              scheduledAt: data.scheduledTimestamp,
              createdAt: new Date().toISOString(),
            }
          }
        });
      }

      return { success: true, message: 'Cycle created logged' };
    } catch (error) {
      this.logger.error(`Error handling cycle created: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handleCycleSucceeded(data: any) {
    try {
      const originalPayment = await this.prisma.payment.findFirst({
        where: { externalId: data.recurringPlanId },
        include: { subscription: true }
      });

      if (!originalPayment || !originalPayment.subscriptionId) {
        this.logger.warn(`Original payment not found for cycle: ${data.id}`);
        return { success: false, message: 'Original payment not found' };
      }

      await this.prisma.payment.create({
        data: {
          userId: originalPayment.userId,
          provider: PaymentProvider.XENDIT,
          amount: data.amount,
          status: PaymentStatus.PAID,
          subscriptionId: originalPayment.subscriptionId,
          externalId: data.id,
          metadata: {
            cycleType: 'SUCCESS',
            cycleData: JSON.parse(JSON.stringify(data)),
            recurringPlanId: data.recurringPlanId,
            paidAt: data.paidTimestamp || new Date().toISOString(),
            createdAt: new Date().toISOString(),
          }
        }
      });

      const subscription = originalPayment.subscription;
      if (subscription) {
        let newExpiresAt = subscription.expiresAt ? new Date(subscription.expiresAt) : new Date();
        
        if (subscription.plan === SubscriptionPlan.GOLD_MONTHLY) {
          newExpiresAt.setMonth(newExpiresAt.getMonth() + 1);
        } else if (subscription.plan === SubscriptionPlan.GOLD_YEARLY) {
          newExpiresAt.setFullYear(newExpiresAt.getFullYear() + 1);
        }

        await this.prisma.subscription.update({
          where: { id: originalPayment.subscriptionId },
          data: { 
            expiresAt: newExpiresAt,
            status: SubscriptionStatus.ACTIVE
          }
        });
      }

      this.logger.log(`Subscription cycle succeeded: ${data.id}`);
      return { success: true, message: 'Cycle payment processed' };
    } catch (error) {
      this.logger.error(`Error handling cycle succeeded: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handleCycleFailed(data: any) {
    try {
      const originalPayment = await this.prisma.payment.findFirst({
        where: { externalId: data.recurringPlanId }
      });

      if (!originalPayment || !originalPayment.subscriptionId) {
        this.logger.warn(`Original payment not found for failed cycle: ${data.id}`);
        return { success: false, message: 'Original payment not found' };
      }

      await this.prisma.payment.create({
        data: {
          userId: originalPayment.userId,
          provider: PaymentProvider.XENDIT,
          amount: data.amount || 0,
          status: PaymentStatus.FAILED,
          subscriptionId: originalPayment.subscriptionId,
          externalId: data.id,
          metadata: {
            cycleType: 'FAILED',
            cycleData: JSON.parse(JSON.stringify(data)),
            recurringPlanId: data.recurringPlanId,
            failureReason: data.failureCode || data.failureReason || 'Unknown failure',
            failedAt: new Date().toISOString(),
          }
        }
      });

      const failedPaymentsCount = await this.prisma.payment.count({
        where: {
          subscriptionId: originalPayment.subscriptionId,
          status: PaymentStatus.FAILED,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      });

      if (failedPaymentsCount >= 3) {
        await this.prisma.subscription.update({
          where: { id: originalPayment.subscriptionId },
          data: {
            status: SubscriptionStatus.EXPIRED,
          }
        });
        this.logger.warn(`Subscription suspended due to multiple payment failures: ${originalPayment.subscriptionId}`);
      }

      this.logger.warn(`Subscription cycle failed: ${data.id} - Reason: ${data.failureCode}`);
      return { success: true, message: 'Failed cycle recorded' };
    } catch (error) {
      this.logger.error(`Error handling cycle failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handlePlanDeactivated(data: any) {
    try {
      const payment = await this.prisma.payment.findFirst({
        where: { externalId: data.id }
      });

      if (!payment || !payment.subscriptionId) {
        this.logger.warn(`Payment not found for deactivated plan: ${data.id}`);
        return { success: false, message: 'Payment not found' };
      }

      await this.prisma.subscription.update({
        where: { id: payment.subscriptionId },
        data: {
          status: SubscriptionStatus.EXPIRED,
        }
      });

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          metadata: {
            ...(payment.metadata as any),
            deactivatedAt: new Date().toISOString(),
            deactivationData: JSON.parse(JSON.stringify(data)),
          }
        }
      });

      this.logger.log(`Subscription deactivated: ${payment.subscriptionId}`);
      return { success: true, message: 'Subscription deactivated' };
    } catch (error) {
      this.logger.error(`Error handling plan deactivated: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handlePlanStopped(data: any) {
    try {
      const payment = await this.prisma.payment.findFirst({
        where: { externalId: data.id }
      });

      if (!payment || !payment.subscriptionId) {
        this.logger.warn(`Payment not found for stopped plan: ${data.id}`);
        return { success: false, message: 'Payment not found' };
      }

      await this.prisma.subscription.update({
        where: { id: payment.subscriptionId },
        data: {
          status: SubscriptionStatus.EXPIRED,
        }
      });

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          metadata: {
            ...(payment.metadata as any),
            stoppedAt: new Date().toISOString(),
            stopData: JSON.parse(JSON.stringify(data)),
          }
        }
      });

      this.logger.log(`Subscription stopped: ${payment.subscriptionId}`);
      return { success: true, message: 'Subscription stopped' };
    } catch (error) {
      this.logger.error(`Error handling plan stopped: ${error.message}`, error.stack);
      throw error;
    }
  }

  async cancelSubscription(subscriptionId: string) {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id: subscriptionId }
      });

      if (!subscription) {
        throw new Error(`Subscription tidak ditemukan: ${subscriptionId}`);
      }

      const payment = await this.prisma.payment.findFirst({
        where: { 
          subscriptionId: subscriptionId, 
          provider: PaymentProvider.XENDIT,
          status: { in: [PaymentStatus.PAID, PaymentStatus.PENDING] }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (payment && payment.externalId) {
        try {
          this.logger.log(`Attempting to cancel Xendit payment request: ${payment.externalId}`);
        } catch (xenditError) {
          this.logger.warn(`Failed to cancel Xendit payment request ${payment.externalId}: ${xenditError.message}`);
        }
      }

      await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: SubscriptionStatus.CANCELLED,
          cancelledAt: new Date(),
          autoRenew: false
        }
      });

      if (payment) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            metadata: {
              ...(payment.metadata as any),
              cancelledAt: new Date().toISOString(),
              cancelledBy: 'user',
            }
          }
        });
      }

      return { success: true, message: 'Subscription berhasil dibatalkan' };
    } catch (error) {
      this.logger.error(`Error canceling subscription: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getSubscriptionDetails(subscriptionId: string) {
    try {
      return await this.prisma.subscription.findUnique({
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
    } catch (error) {
      this.logger.error(`Error getting subscription details: ${error.message}`, error.stack);
      throw error;
    }
  }

  async checkAndUpdateSubscriptionStatus(subscriptionId: string) {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id: subscriptionId }
      });

      if (!subscription) {
        throw new Error(`Subscription not found: ${subscriptionId}`);
      }

      if (subscription.expiresAt && subscription.expiresAt < new Date()) {
        await this.prisma.subscription.update({
          where: { id: subscriptionId },
          data: { status: SubscriptionStatus.EXPIRED }
        });
        return { ...subscription, status: SubscriptionStatus.EXPIRED };
      }

      return subscription;
    } catch (error) {
      this.logger.error(`Error checking subscription status: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getExpiringSubscriptions(daysBeforeExpiry: number = 3) {
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + daysBeforeExpiry);

      return await this.prisma.subscription.findMany({
        where: {
          status: SubscriptionStatus.ACTIVE,
          expiresAt: {
            lte: expiryDate,
            gte: new Date()
          }
        },
        include: {
          user: {
            select: { id: true, email: true }
          }
        }
      });
    } catch (error) {
      this.logger.error(`Error getting expiring subscriptions: ${error.message}`, error.stack);
      throw error;
    }
  }

  async resumeSubscription(subscriptionId: string) {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: { payments: true }
      });

      if (!subscription) {
        throw new Error(`Subscription not found: ${subscriptionId}`);
      }

      if (subscription.status !== SubscriptionStatus.EXPIRED) {
        throw new Error(`Subscription is not expired, cannot resume: ${subscriptionId}`);
      }

      const originalPayment = subscription.payments.find(p => 
        p.provider === PaymentProvider.XENDIT && 
        p.externalId && 
        p.metadata && 
        (p.metadata as any).planType
      );

      if (!originalPayment) {
        throw new Error(`Original payment record not found for subscription: ${subscriptionId}`);
      }

      const newPlan = await this.createSubscriptionPlan({
        userId: subscription.userId,
        plan: subscription.plan,
        price: originalPayment.amount,
        currency: ((originalPayment.metadata as any).currency as PaymentRequestCurrency) || PaymentRequestCurrency.Idr
      });

      await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: SubscriptionStatus.TRIAL,
        }
      });

      return {
        success: true,
        message: 'Subscription resumed with new payment plan',
        newPaymentLink: newPlan.paymentLink,
        newPlanId: newPlan.planId
      };
    } catch (error) {
      this.logger.error(`Error resuming subscription: ${error.message}`, error.stack);
      throw error;
    }
  }

  private calculateTrialEnd(startDate: Date): Date {
    const trialEnd = new Date(startDate);
    trialEnd.setDate(trialEnd.getDate() + 7);
    return trialEnd;
  }

  private calculatePeriodEnd(startDate: Date, plan: SubscriptionPlan): Date {
    const periodEnd = new Date(startDate);
    if (plan === SubscriptionPlan.GOLD_MONTHLY) {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else if (plan === SubscriptionPlan.GOLD_YEARLY) {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setDate(periodEnd.getDate() + 30);
    }
    return periodEnd;
  }

  private async logSubscriptionHistory(
    subscriptionId: string,
    action: SubscriptionAction,
    oldStatus: SubscriptionStatus,
    newStatus: SubscriptionStatus,
    reason?: string
  ) {
    try {
      await this.prisma.subscriptionHistory.create({
        data: {
          subscriptionId,
          action,
          oldStatus,
          newStatus,
          reason,
          metadata: {
            timestamp: new Date().toISOString(),
            source: 'xendit-subscription-service'
          } as any
        }
      });
    } catch (error) {
      this.logger.error('Error logging subscription history:', error);
    }
  }
}