import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { PaypalConfigService } from './paypal.config';
import { SubscriptionPlan, SubscriptionStatus, Role } from '@prisma/client';

@Injectable()
export class PaypalSubscriptionService {
  private readonly logger = new Logger(PaypalSubscriptionService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private paypalConfigService: PaypalConfigService,
  ) {}

  private async resolvePrimaryDapurUnitIdForUser(userId: string, role: Role): Promise<string | null> {
    if (role === Role.PROJECT_OWNER) {
      const d = await this.prisma.dapurUnit.findFirst({
        where: { projectOwnerId: userId },
        select: { id: true },
      });
      return d?.id ?? null;
    }
    if (role === Role.ADMIN_DAPUR) {
      const d = await this.prisma.dapurUnit.findFirst({
        where: { adminDapurId: userId },
        select: { id: true },
      });
      return d?.id ?? null;
    }
    if (role === Role.ADMIN_PUSAT) {
      const d = await this.prisma.dapurUnit.findFirst({
        where: { adminPusatId: userId },
        select: { id: true },
      });
      return d?.id ?? null;
    }
    if (role === Role.INVESTOR) {
      const stake = await this.prisma.dapurInvestor.findFirst({
        where: { investorId: userId },
        select: { dapurUnitId: true },
      });
      return stake?.dapurUnitId ?? null;
    }
    return null;
  }

  private async propagateSubscriptionToDapurUsers(dapurUnitId: string, subscriptionId: string) {
    const dapur = await this.prisma.dapurUnit.findUnique({
      where: { id: dapurUnitId },
      include: { investors: true },
    });
    if (!dapur) return;
    const ids = new Set<string>();
    ids.add(dapur.projectOwnerId);
    if (dapur.adminDapurId) ids.add(dapur.adminDapurId);
    if (dapur.adminPusatId) ids.add(dapur.adminPusatId);
    for (const i of dapur.investors) ids.add(i.investorId);
    await this.prisma.user.updateMany({
      where: { id: { in: [...ids] } },
      data: { subscriptionId },
    });
  }

  /**
   * Membuat billing plan di PayPal untuk subscription
   */
  async createBillingPlan(plan: SubscriptionPlan, price: number, period?: 'MONTHLY' | 'YEARLY' | 'TWO_YEARS', name?: string) {
     try {
       const clientId = this.configService.get<string>('PAYPAL_CLIENT_ID');
       const clientSecret = this.configService.get<string>('PAYPAL_CLIENT_SECRET');
       if (!clientId || !clientSecret) {
         this.logger.error('PayPal credentials are missing: PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET');
         throw new BadRequestException('Konfigurasi PayPal belum disetel (client ID/secret). Hubungi admin.');
       }
       const paypal = this.paypalConfigService.getPaypalSDK();
       const sanitizeUrl = (v?: string) => (v || '')
         .trim()
         .replace(/^['"`]+|['"`]+$/g, '')
         .replace(/\s+#.*$/g, '')
         .replace(/\/+$/, '');
       const appUrlRaw = sanitizeUrl(this.configService.get<string>('APP_URL'));
       const frontUrlRaw = sanitizeUrl(this.configService.get<string>('FRONTEND_URL'));
       const baseUrl = sanitizeUrl(appUrlRaw || frontUrlRaw || 'https://sentradapur.com');
       
       // Tentukan durasi berdasarkan jenis plan atau period yang dikirim
       let frequency = 'MONTH';
       let frequencyInterval = 1;
       const resolvedPeriod = period ?? (plan === SubscriptionPlan.GOLD_YEARLY ? 'YEARLY' : 'MONTHLY');
       if (resolvedPeriod === 'TWO_YEARS') {
         frequency = 'YEAR';
         frequencyInterval = 2;
       } else if (resolvedPeriod === 'YEARLY') {
         frequency = 'YEAR';
         frequencyInterval = 1;
       }
 
       // Buat billing plan
       const billingPlanAttributes = {
         name: name ?? `Sentra Dapur ${plan}`,
         description: `Subscription plan for Sentra Dapur - ${name || plan}`,
         type: 'INFINITE',
         payment_definitions: [
           {
             name: 'Regular Payment',
             type: 'REGULAR',
             frequency: frequency,
             frequency_interval: frequencyInterval.toString(),
             amount: {
               currency: 'USD',
               value: price.toString()
             },
             cycles: '0' // Infinite cycles
           }
         ],
         merchant_preferences: {
            setup_fee: {
              currency: 'USD',
              value: '0' // No setup fee
            },
           return_url: `${baseUrl}/api/subscription/billing-agreement/execute`,
           cancel_url: `${baseUrl}/api/subscription/payment/cancel`,
            auto_bill_amount: 'YES',
            initial_fail_amount_action: 'CONTINUE',
            max_fail_attempts: '3'
          }
       };

      return new Promise((resolve, reject) => {
        paypal.billingPlan.create(billingPlanAttributes, (error, billingPlan) => {
          if (error) {
            const status = (error as any)?.httpStatusCode || (error as any)?.response?.httpStatusCode;
            const errName = (error as any)?.response?.name || (error as any)?.name;
            const errMsg = (error as any)?.response?.message || (error as any)?.message || 'unknown error';
            const actionable = (status === 401 || (errName && ['INVALID_CLIENT','AUTHENTICATION_FAILURE'].includes(String(errName).toUpperCase())))
              ? 'Pastikan PAYPAL_MODE=live dan gunakan Client ID/Secret dari tab Live (bukan Sandbox). Regenerate secret jika perlu.'
              : '';
            this.logger.error(`PayPal Create Billing Plan Error [${status || 'n/a'} ${errName || ''}]: ${errMsg} ${actionable ? '| Hint: ' + actionable : ''}`);
            reject(new BadRequestException(`Gagal membuat billing plan PayPal: ${errName ? errName + ' - ' : ''}${errMsg}${status ? ` (Status ${status})` : ''}${actionable ? ` | ${actionable}` : ''}`));
            return;
          }
          
          // Aktifkan billing plan
          const billingPlanUpdateAttributes = {
            op: 'replace',
            path: '/',
            value: {
              state: 'ACTIVE'
            }
          };

          paypal.billingPlan.update(billingPlan.id, [billingPlanUpdateAttributes], (updateError) => {
            if (updateError) {
              const status = (updateError as any)?.httpStatusCode || (updateError as any)?.response?.httpStatusCode;
              const errName = (updateError as any)?.response?.name || (updateError as any)?.name;
              const errMsg = (updateError as any)?.response?.message || (updateError as any)?.message || 'unknown error';
              const actionable = (status === 401 || (errName && ['INVALID_CLIENT','AUTHENTICATION_FAILURE'].includes(String(errName).toUpperCase())))
                ? 'Pastikan PAYPAL_MODE=live dan gunakan Client ID/Secret dari tab Live (bukan Sandbox). Regenerate secret jika perlu.'
                : '';
              this.logger.error(`PayPal Update Billing Plan Error [${status || 'n/a'} ${errName || ''}]: ${errMsg} ${actionable ? '| Hint: ' + actionable : ''}`);
              reject(new BadRequestException(`Gagal mengaktifkan billing plan PayPal: ${errName ? errName + ' - ' : ''}${errMsg}${status ? ` (Status ${status})` : ''}${actionable ? ` | ${actionable}` : ''}`));
              return;
            }
                        (async () => {
              // Simpan BillingPlan ke database (USD • PAYPAL)
              try {
                const created = await (this.prisma as any).billingPlan.upsert({
                   where: { provider_plan_period_currency: { provider: 'PAYPAL', plan, period: resolvedPeriod, currency: 'USD' } },
                   update: {
                     providerPlanId: billingPlan.id,
                     name: name ?? billingPlan.name,
                     description: `Subscription plan for Sentra Dapur - ${name || plan}`,
                     price: price,
                     currency: 'USD',
                     status: billingPlan.state,
                   },
                   create: {
                     provider: 'PAYPAL',
                     providerPlanId: billingPlan.id,
                     plan,
                     name: name ?? billingPlan.name,
                     description: `Subscription plan for Sentra Dapur - ${name || plan}`,
                     price: price,
                     currency: 'USD',
                     period: resolvedPeriod,
                     status: billingPlan.state,
                   }
                 });
                 resolve({
                   id: created.id,
                   providerPlanId: billingPlan.id,
                   name: created.name,
                   status: created.status,
                 });
              } catch (dbErr) {
                this.logger.error(`Failed to persist BillingPlan: ${dbErr.message}`);
                // Tetap kembalikan info dari PayPal agar admin tahu plan sudah aktif di PayPal
                resolve({
                  id: billingPlan.id,
                  name: billingPlan.name,
                  status: billingPlan.state,
                });
              }
            })();
          });
        });
      });
    } catch (error) {
      this.logger.error(`Error creating PayPal billing plan: ${error.message}`);
      throw error;
    }
  }

  /**
   * Membuat billing agreement untuk user berdasarkan billing plan
   */
  async createBillingAgreement(userId: string, planId: string, billingPlanId: string) {
    try {
      const paypal = this.paypalConfigService.getPaypalSDK();
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      
      if (!user) {
        throw new Error(`User dengan ID ${userId} tidak ditemukan`);
      }

      const dapurUnitId = await this.resolvePrimaryDapurUnitIdForUser(userId, user.role as Role);
      if (!dapurUnitId) {
        throw new BadRequestException(
          'Tidak ada unit dapur terkait akun ini; hubungkan ke dapur sebelum berlangganan PayPal.',
        );
      }

      // Tentukan tanggal mulai (1 hari dari sekarang untuk trial)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      
      const billingAgreementAttributes = {
        name: 'Sentra Dapur Subscription Agreement',
        description: 'Billing Agreement for Sentra Dapur Subscription',
        start_date: startDate.toISOString(),
        plan: {
          id: billingPlanId
        },
        payer: {
          payment_method: 'paypal'
        },
        shipping_address: {
          line1: 'No shipping address',
          city: 'No City',
          state: 'No State',
          postal_code: '00000',
          country_code: 'US'
        }
      };

      return new Promise((resolve, reject) => {
        paypal.billingAgreement.create(billingAgreementAttributes, async (error, billingAgreement) => {
          if (error) {
            this.logger.error(`PayPal Create Billing Agreement Error: ${error.message}`);
            reject(error);
            return;
          }
          
          // Simpan informasi billing agreement di database
          try {
            // Simpan ID agreement di variabel untuk digunakan nanti
            const agreementId = billingAgreement.id;
            
            const now = new Date();
            const existing = await this.prisma.subscription.findUnique({ where: { dapurUnitId } });
            let subscription;
            if (existing) {
              subscription = await this.prisma.subscription.update({
                where: { id: existing.id },
                data: {
                  plan: planId as SubscriptionPlan,
                  status: SubscriptionStatus.TRIAL,
                  startedAt: now,
                  expiresAt: null,
                },
              });
            } else {
              subscription = await this.prisma.subscription.create({
                data: {
                  dapurUnitId,
                  plan: planId as SubscriptionPlan,
                  status: SubscriptionStatus.TRIAL,
                  startedAt: now,
                  expiresAt: null,
                },
              });
            }
            await this.propagateSubscriptionToDapurUsers(dapurUnitId, subscription.id);
            
            // Ambil approval URL dan ekstrak token
            const approvalUrl = billingAgreement.links.find(link => link.rel === 'approval_url');

            if (!approvalUrl) {
              reject(new Error('Approval URL tidak ditemukan dari PayPal'));
              return;
            }

            const urlObj = new URL(approvalUrl.href);
            const urlToken = urlObj.searchParams.get('token') || undefined;
            const urlBaToken = urlObj.searchParams.get('ba_token') || undefined;

            // Simpan payment dengan semua field yang diperlukan
            await this.prisma.payment.create({
              data: {
                userId: userId,
                provider: 'PAYPAL',
                amount: 0, // Akan diupdate nanti
                status: 'PENDING',
                subscriptionId: subscription.id,
                externalId: null,
                metadata: { 
                  agreementId: agreementId,
                  subscriptionId: subscription.id,
                  billingPlanId: billingPlanId,
                  plan: planId,
                  token: urlToken,
                  ba_token: urlBaToken,
                }
              }
            });
            
            resolve({
              id: subscription.id,
              approval_url: approvalUrl.href,
              status: subscription.status
            });
          } catch (dbError) {
            this.logger.error(`Database Error: ${dbError.message}`);
            reject(dbError);
          }
        });
      });
    } catch (error) {
      this.logger.error(`Error creating PayPal billing agreement: ${error.message}`);
      throw error;
    }
  }

  /**
   * Eksekusi billing agreement setelah user menyetujui
   */
  async executeBillingAgreement(token: string) {
    try {
      const paypal = this.paypalConfigService.getPaypalSDK();
      
      return new Promise((resolve, reject) => {
        paypal.billingAgreement.execute(token, {}, async (error, billingAgreement) => {
          if (error) {
            this.logger.error(`PayPal Execute Billing Agreement Error: ${error.message}`);
            reject(error);
            return;
          }
          
          try {
            // Cari payment berdasarkan token (saat create) atau agreementId (setelah execute)
            const payment = await this.prisma.payment.findFirst({
              where: {
                OR: [
                  { metadata: { path: ['token'], equals: token } as any },
                  { metadata: { path: ['ba_token'], equals: token } as any },
                  { externalId: billingAgreement.id },
                  {
                    metadata: {
                      path: ['agreementId'],
                      equals: billingAgreement.id
                    }
                  }
                ]
              }
            });
            
            if (!payment) {
              reject(new Error(`Payment dengan agreement ID ${billingAgreement.id} tidak ditemukan`));
              return;
            }
            
            // Cari subscription berdasarkan subscriptionId dari payment
            const subscription = await this.prisma.subscription.findUnique({
              where: { id: payment.subscriptionId! }
            });
            
            if (!subscription) {
              reject(new Error(`Subscription dengan ID ${payment.subscriptionId} tidak ditemukan`));
              return;
            }
            
            // Ambil informasi billing plan untuk mengetahui harga dan mata uang
            const meta: any = payment.metadata || {};
            const billingPlanId = meta?.billingPlanId;
            const billingPlan = billingPlanId
              ? await (this.prisma as any).billingPlan.findFirst({ where: { providerPlanId: billingPlanId } })
              : null;

            // Hitung tanggal berakhir berdasarkan jenis plan
            const now = new Date();
            let periodEnd = new Date(now);
            if (subscription.plan === SubscriptionPlan.GOLD_MONTHLY) {
              periodEnd.setMonth(periodEnd.getMonth() + 1);
            } else if (subscription.plan === SubscriptionPlan.GOLD_YEARLY) {
              periodEnd.setFullYear(periodEnd.getFullYear() + 1);
            } else {
              // Default fallback 30 hari
              periodEnd.setDate(periodEnd.getDate() + 30);
            }
            
            // Update subscription status dan periode aktif
            const updatedSubscription = await this.prisma.subscription.update({
              where: { id: subscription.id },
              data: {
                status: SubscriptionStatus.ACTIVE,
                startedAt: subscription.startedAt ?? now,
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
                // clear trial fields to avoid UI reading old trial end
                trialEndsAt: null as any,
                expiresAt: periodEnd,
              }
            });

            // Update payment status, amount dan metadata
            await this.prisma.payment.update({
              where: { id: payment.id },
              data: {
                status: 'PAID',
                amount: billingPlan?.price ?? payment.amount ?? 0,
                currency: (billingPlan?.currency as any) ?? (payment as any).currency ?? 'USD',
                externalId: billingAgreement.id,
                metadata: {
                  ...(payment.metadata as any),
                  billingAgreement: billingAgreement,
                  executedAt: new Date().toISOString(),
                  token: token
                }
              }
            });
            
            resolve({
              success: true,
              subscription: updatedSubscription,
              message: 'Subscription berhasil diaktifkan'
            });
          } catch (dbError) {
            this.logger.error(`Database Error: ${dbError.message}`);
            reject(dbError);
          }
        });
      });
    } catch (error) {
      this.logger.error(`Error executing PayPal billing agreement: ${error.message}`);
      throw error;
    }
  }
}