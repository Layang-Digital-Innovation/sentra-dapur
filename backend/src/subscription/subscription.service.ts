import { Injectable, Logger, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentService } from './payment.service';
import { SubscriptionPlan, Role, PaymentProvider, SubscriptionStatus, PaymentStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private prisma: PrismaService,
    private paymentService: PaymentService,
  ) {}

  /** Delete a payment (SUPER_ADMIN only). Restrict deleting PAID payments. */
  async deletePayment(id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found');
    const meta: any = payment.metadata || {};
    // Only allow deleting manual org invoice payments or pending/failed payments
    const isOrgInvoice = meta.mode === 'ORG_INVOICE';
    const isDeletableStatus = [PaymentStatus.PENDING, (PaymentStatus as any).AWAITING_APPROVAL, PaymentStatus.FAILED].includes(payment.status as any);
    if (!isOrgInvoice && !isDeletableStatus) {
      throw new BadRequestException('Only ORG_INVOICE or non-PAID payments can be deleted');
    }
    if (payment.status === PaymentStatus.PAID) {
      throw new BadRequestException('Cannot delete a PAID payment');
    }
    // If linked to subscription, we keep subscription; deletion only removes payment record
    await this.prisma.payment.delete({ where: { id } });
    return { success: true };
  }
  
  async updateBillingPlan(id: string, data: { name?: string; description?: string; price?: number; currency?: string; period?: 'MONTHLY'|'YEARLY'; status?: string; plan?: SubscriptionPlan | string; provider?: PaymentProvider | string; }) {
    const existing = await (this.prisma as any).billingPlan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Billing plan not found');

    let planVal: any = undefined;
    if (typeof data.plan === 'string' && data.plan.length > 0) {
      const up = data.plan.toUpperCase() as any;
      if (Object.prototype.hasOwnProperty.call(SubscriptionPlan, up)) planVal = (SubscriptionPlan as any)[up];
      else planVal = up;
    } else if (data.plan) {
      planVal = data.plan as any;
    }

    let providerVal: any = undefined;
    if (typeof data.provider === 'string' && data.provider.length > 0) {
      const up = data.provider.toUpperCase() as any;
      if (Object.prototype.hasOwnProperty.call(PaymentProvider, up)) providerVal = (PaymentProvider as any)[up];
      else providerVal = up;
    } else if (data.provider) {
      providerVal = data.provider as any;
    }

    let periodVal: any = undefined;
    if (typeof data.period === 'string' && data.period.length > 0) {
      const up = data.period.toUpperCase();
      periodVal = up === 'YEARLY' ? 'YEARLY' : (up === 'MONTHLY' ? 'MONTHLY' : undefined);
    }

    const updated = await (this.prisma as any).billingPlan.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        price: typeof data.price === 'number' ? data.price : undefined,
        currency: data.currency,
        period: periodVal,
        status: data.status,
        plan: planVal,
        provider: providerVal,
      }
    });

    return {
      id: updated.id,
      provider: updated.provider,
      providerPlanId: updated.providerPlanId,
      plan: updated.plan,
      name: updated.name,
      description: updated.description,
      price: updated.price,
      currency: updated.currency,
      period: updated.period,
      status: updated.status,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async deleteBillingPlan(id: string) {
    const existing = await (this.prisma as any).billingPlan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Billing plan not found');
    await (this.prisma as any).billingPlan.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Create or update a local BillingPlan row (for non-PayPal currencies like IDR/Xendit).
   * Uses unique key [provider, plan, period, currency].
   */
  async createLocalBillingPlan(params: { plan: any; price: number; period?: 'MONTHLY'|'YEARLY'; name?: string; currency?: string; provider?: string; status?: string; }) {
    const { plan, price } = params;
    if (typeof price !== 'number' || price <= 0) throw new BadRequestException('Invalid price');

    // Map enums safely
    const planUp = String(plan || '').toUpperCase();
    const planVal = (Object.prototype.hasOwnProperty.call((require('@prisma/client') as any).SubscriptionPlan, planUp)
      ? ((require('@prisma/client') as any).SubscriptionPlan[planUp])
      : planUp);

    const periodUp = String(params.period || 'MONTHLY').toUpperCase();
    const periodVal = periodUp === 'YEARLY' ? 'YEARLY' : 'MONTHLY';

    const currencyUp = String(params.currency || 'IDR').toUpperCase();
    const currencyVal = (Object.prototype.hasOwnProperty.call((require('@prisma/client') as any).Currency, currencyUp)
      ? ((require('@prisma/client') as any).Currency[currencyUp])
      : currencyUp);

    const providerUp = String(params.provider || (currencyUp === 'USD' ? 'PAYPAL' : 'XENDIT')).toUpperCase();
    const providerVal = (Object.prototype.hasOwnProperty.call((require('@prisma/client') as any).PaymentProvider, providerUp)
      ? ((require('@prisma/client') as any).PaymentProvider[providerUp])
      : providerUp);

    const name = params.name || undefined;
    const status = params.status || 'ACTIVE';

    const created = await (this.prisma as any).billingPlan.upsert({
      where: {
        provider_plan_period_currency: {
          provider: providerVal,
          plan: planVal,
          period: periodVal,
          currency: currencyVal,
        }
      },
      update: {
        price: price,
        name: name,
        status: status,
      },
      create: {
        provider: providerVal,
        plan: planVal,
        price: price,
        currency: currencyVal,
        period: periodVal,
        name: name,
        status: status,
      }
    });

    return {
      id: created.id,
      provider: created.provider,
      plan: created.plan,
      name: created.name,
      price: created.price,
      currency: created.currency,
      period: created.period,
      status: created.status,
    };
  }
  async getSubscriptionPlans() {
    // Ambil daftar Billing Plans yang tersedia dari database (status ACTIVE, CREATED, atau status null)
    const plans = await (this.prisma as any).billingPlan.findMany({
      where: {
        OR: [
          { status: { equals: 'ACTIVE' } },
          { status: { equals: 'CREATED' } },
          { status: null },
        ],
      },
      orderBy: [{ plan: 'asc' }, { period: 'asc' }],
    });

    // Kembalikan dalam bentuk yang mudah dikonsumsi frontend
    return plans.map((p: any) => ({
      id: p.id,
      provider: p.provider,
      providerPlanId: p.providerPlanId,
      plan: p.plan,
      name: p.name,
      description: p.description,
      price: p.price,
      currency: p.currency,
      period: p.period,
      status: p.status,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }

  /**
   * Auto-expire subscriptions where period end is in the past.
   */
  async expirePastDueSubscriptions() {
    const now = new Date();
    const overdue = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        OR: [
          { currentPeriodEnd: { lt: now } },
          { expiresAt: { lt: now } },
        ],
      },
      select: { id: true, userId: true, currentPeriodEnd: true, expiresAt: true },
    });

    let updated = 0;
    for (const s of overdue) {
      try {
        await this.prisma.subscription.update({
          where: { id: s.id },
          data: { status: SubscriptionStatus.EXPIRED },
        });
        updated++;
      } catch (e) {
        this.logger.warn(`Failed to expire subscription ${s.id}: ${e?.message}`);
      }
    }

    this.logger.log(`Auto-expired subscriptions: ${updated} / ${overdue.length}`);
    return { totalCandidates: overdue.length, updated };
  }

  /**
   * Notify H-1 before Enterprise Custom subscriptions expire (organization/label-based).
   * Notifies affected users and all SUPER_ADMINs.
   */
  async notifyEnterpriseCustomExpiringHMinus1() {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() + 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    const expiring = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        plan: SubscriptionPlan.ENTERPRISE_CUSTOM,
        OR: [
          { currentPeriodEnd: { gte: start, lte: end } },
          { expiresAt: { gte: start, lte: end } },
        ],
      },
      include: {
        user: { select: { id: true, email: true } },
        label: { select: { id: true, name: true, code: true } },
      },
    });

    const superAdmins = await this.prisma.user.findMany({ where: { role: 'SUPER_ADMIN' as any }, select: { id: true, email: true } });

    let userNotifs = 0;
    let adminNotifs = 0;
    for (const s of expiring) {
      try {
        // Notify the user
        await (this.prisma as any).notification.create({
          data: {
            userId: s.userId,
            title: 'Langganan Enterprise akan berakhir besok',
            message: `Akses Enterprise (${s.label?.name || 'Organisasi'}) akan berakhir dalam 1 hari. Mohon lakukan perpanjangan.`,
            type: 'ENTERPRISE_EXPIRY',
            relatedId: s.id,
            metadata: { labelId: s.label?.id, labelName: s.label?.name, currentPeriodEnd: s.currentPeriodEnd, expiresAt: s.expiresAt } as any,
          },
        });
        userNotifs++;
      } catch (e) {
        this.logger.warn(`Failed to notify user ${s.userId} enterprise expiry: ${e?.message}`);
      }
    }

    if (expiring.length > 0 && superAdmins.length > 0) {
      for (const admin of superAdmins) {
        try {
          await (this.prisma as any).notification.create({
            data: {
              userId: admin.id,
              title: 'Enterprise subscriptions expiring H-1',
              message: `Ada ${expiring.length} subscription Enterprise Custom yang akan berakhir besok.`,
              type: 'ENTERPRISE_EXPIRY_ADMIN',
              metadata: { items: expiring.map(e => ({ subscriptionId: e.id, userEmail: e.user.email, labelName: e.label?.name, currentPeriodEnd: e.currentPeriodEnd, expiresAt: e.expiresAt })) } as any,
            },
          });
          adminNotifs++;
        } catch (e) {
          this.logger.warn(`Failed to notify admin ${admin.id} enterprise expiry: ${e?.message}`);
        }
      }
    }

    this.logger.log(`Enterprise expiry H-1 notifications -> users: ${userNotifs}, admins: ${adminNotifs}, candidates: ${expiring.length}`);
    return { totalCandidates: expiring.length, userNotifications: userNotifs, adminNotifications: adminNotifs };
  }

  /** Approve manual org payment -> mark PAID and activate */
  async approveManualOrgPayment(paymentId: string, approverUserId?: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    const meta: any = payment.metadata || {};
    if (meta.mode !== 'ORG_INVOICE') throw new BadRequestException('Not an ORG_INVOICE payment');
    const newMeta = { ...meta, awaitingApproval: false, approved: true, approvedAt: new Date().toISOString(), approvedBy: approverUserId };
    await this.prisma.payment.update({ where: { id: payment.id }, data: { status: (PaymentStatus as any).PAID ?? 'PAID', paidAt: new Date(), metadata: newMeta } as any });
    await this.activateBulkFromOrgInvoice({
      labelId: meta.labelId,
      userIds: Array.isArray(meta.userIds) ? meta.userIds : [],
      pricePerUser: meta.pricePerUser || 0,
      currency: meta.currency || 'IDR',
      period: meta.period || 'MONTHLY'
    });
    return { success: true };
  }

  /** Fail manual org payment -> mark FAILED and optionally expire subscriptions */
  async failManualOrgPayment(params: { paymentId: string; reason?: string; expireSubscriptions?: boolean }) {
    const { paymentId, reason, expireSubscriptions = false } = params;
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    const meta: any = payment.metadata || {};
    if (meta.mode !== 'ORG_INVOICE') throw new BadRequestException('Not an ORG_INVOICE payment');
    await this.prisma.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.FAILED, failedAt: new Date(), failureReason: reason } });
    if (expireSubscriptions && Array.isArray(meta.userIds)) {
      for (const userId of meta.userIds) {
        const existing = await this.prisma.subscription.findUnique({ where: { userId } });
        if (existing) {
          await this.prisma.subscription.update({ where: { id: existing.id }, data: { status: SubscriptionStatus.EXPIRED, currentPeriodEnd: new Date() } });
        }
      }
    }
    return { success: true };
  }

  /**
   * Create a single organization invoice for ENTERPRISE_CUSTOM subscriptions under a label.
   * On payment success (webhook), use activateBulkFromOrgInvoice to activate all.
   */
  async createOrgInvoiceForLabel(params: {
    adminUserId: string;
    labelId: string;
    userIds: string[];
    pricePerUser: number;
    totalAmount?: number;
    currency?: string;
    period: 'MONTHLY' | 'YEARLY';
    provider?: 'xendit' | 'manual';
    description?: string;
    // manual invoice fields
    invoiceNumber?: string;
    referenceNumber?: string;
    bankName?: string;
    paidBy?: string;
    notes?: string;
    awaitingApproval?: boolean;
    additionalSeats?: boolean;
  }) {
    let { adminUserId, labelId, userIds, pricePerUser, totalAmount, currency = 'IDR', period, provider = 'xendit', description,
      invoiceNumber, referenceNumber, bankName, paidBy, notes, awaitingApproval = false, additionalSeats = false } = params;

    // Force approval workflow for manual provider
    if (provider === 'manual') {
      awaitingApproval = true;
    }

    if (!userIds || userIds.length === 0) throw new BadRequestException('userIds is required');
    const label = await (this.prisma as any).enterpriseLabel.findUnique({ where: { id: labelId } });
    if (!label) throw new NotFoundException('Enterprise label not found');

    const amountToCharge = typeof totalAmount === 'number' && totalAmount > 0
      ? totalAmount
      : (pricePerUser * userIds.length);
    const desc = description || `Enterprise Custom (${label.name}) ${period} • ${userIds.length} users`;

    // auto-generate invoice number if not provided
    if (!invoiceNumber) {
      const y = new Date().toISOString().slice(0,10).replace(/-/g,'');
      const rand = Math.random().toString(36).slice(2,7).toUpperCase();
      invoiceNumber = `INV-${y}-${(label.code || label.name || 'ORG').toString().toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6)}-${rand}`;
    }

    const payment = await this.paymentService.createPayment({
      userId: adminUserId,
      amount: amountToCharge,
      description: desc,
      paymentMethod: provider === 'manual' ? 'manual' : 'xendit',
      currency,
      labelId,
      invoiceNumber,
      metadata: {
        mode: 'ORG_INVOICE',
        labelId,
        userIds,
        pricePerUser,
        totalAmount: typeof totalAmount === 'number' ? totalAmount : undefined,
        currency,
        period,
        awaitingApproval,
        referenceNumber,
        bankName,
        paidBy,
        notes,
        additionalSeats,
      },
    });

    return payment;
  }

  /**
   * Activate multiple users' subscriptions for ENTERPRISE_CUSTOM after org invoice is paid.
   */
  async activateBulkFromOrgInvoice(params: {
    labelId: string;
    userIds: string[];
    pricePerUser: number;
    currency?: string;
    period: 'MONTHLY' | 'YEARLY';
  }) {
    const { labelId, userIds, pricePerUser, currency = 'IDR', period } = params;
    const now = new Date();
    const periodEnd = this.calculatePeriodEnd(now, period);
    const ENTERPRISE_CUSTOM_PLAN = 'ENTERPRISE_CUSTOM' as SubscriptionPlan;

    for (const userId of userIds) {
      const existing = await this.prisma.subscription.findUnique({ where: { userId } });
      if (existing) {
        await this.prisma.subscription.update({
          where: { id: existing.id },
          data: {
            plan: ENTERPRISE_CUSTOM_PLAN,
            status: SubscriptionStatus.ACTIVE,
            startedAt: now,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            customPrice: pricePerUser,
            customCurrency: currency,
            labelId,
          } as any,
        });
      } else {
        await this.prisma.subscription.create({
          data: {
            userId,
            plan: ENTERPRISE_CUSTOM_PLAN,
            status: SubscriptionStatus.ACTIVE,
            startedAt: now,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            customPrice: pricePerUser,
            customCurrency: currency,
            labelId,
          } as any,
        });
      }
    }

    this.logger.log(`Activated ${userIds.length} subscriptions for label ${labelId} via ORG_INVOICE`);
    return { labelId, count: userIds.length };
  }

  /**
   * Create a renewal org invoice based on a previous ORG_INVOICE payment.
   * Reuse labelId and userIds from previous payment metadata.
   */
  async createOrgInvoiceRenewalFromPayment(params: {
    adminUserId: string;
    previousPaymentId: string;
    period?: 'MONTHLY' | 'YEARLY';
    currency?: string;
    totalAmount?: number;
    pricePerUser?: number;
    provider?: 'xendit' | 'manual';
    description?: string;
    invoiceNumber?: string;
    referenceNumber?: string;
    bankName?: string;
    paidBy?: string;
    notes?: string;
    awaitingApproval?: boolean;
  }) {
    const {
      adminUserId,
      previousPaymentId,
      period = 'MONTHLY',
      currency = 'IDR',
      totalAmount,
      pricePerUser = 0,
      provider = 'xendit',
      description,
      invoiceNumber,
      referenceNumber,
      bankName,
      paidBy,
      notes,
      awaitingApproval = provider === 'manual'
    } = params;

    const prev = await this.prisma.payment.findUnique({ where: { id: previousPaymentId } });
    if (!prev) throw new NotFoundException('Previous payment not found');
    const meta: any = prev.metadata || {};
    if (meta.mode !== 'ORG_INVOICE') throw new BadRequestException('Previous payment is not an ORG_INVOICE');
    const labelId = meta.labelId as string;
    const userIds = Array.isArray(meta.userIds) ? (meta.userIds as string[]) : [];
    if (!labelId || userIds.length === 0) throw new BadRequestException('Previous payment missing labelId or userIds');

    const label = await (this.prisma as any).enterpriseLabel.findUnique({ where: { id: labelId } });
    if (!label) throw new NotFoundException('Enterprise label not found');

    const amountToCharge = typeof totalAmount === 'number' && totalAmount > 0
      ? totalAmount
      : (pricePerUser * userIds.length);
    const desc = description || `Enterprise Custom (${label.name}) ${period} • Renewal • ${userIds.length} users`;

    const payment = await this.paymentService.createPayment({
      userId: adminUserId,
      amount: amountToCharge,
      description: desc,
      paymentMethod: provider === 'manual' ? 'manual' : 'xendit',
      currency,
      labelId,
      invoiceNumber,
      metadata: {
        mode: 'ORG_INVOICE',
        labelId,
        userIds,
        pricePerUser,
        totalAmount: typeof totalAmount === 'number' ? totalAmount : undefined,
        currency,
        period,
        awaitingApproval,
        referenceNumber,
        bankName,
        paidBy,
        notes,
        renewalOfPaymentId: prev.id,
      },
    });

    return payment;
  }

  async getUserSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
      },
      orderBy: {
        startedAt: 'desc',
      },
    })

    return subscription
  }

  async createSubscription(userId: string, planId: string, paymentMethod: string) {
    // Ambil informasi plan dari database/konfigurasi admin (tanpa hardcode)
    const plans = await this.getSubscriptionPlans();
    const plan = plans.find(p => p.id === planId);

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    // Catatan: price/duration tidak ditentukan di sini (diatur oleh admin)
    // Buat payment dengan amount 0 sebagai placeholder, atau sesuaikan saat integrasi konfigurasi admin
    const payment = await this.paymentService.createPayment({
      userId,
      amount: 0,
      description: `Subscription to ${plan.plan} plan`,
      paymentMethod,
    });

    // Create subscription (status TRIAL default, tanggal akan diatur oleh admin atau saat aktivasi)
    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        plan: plan.plan,
        status: SubscriptionStatus.TRIAL,
        startedAt: new Date(),
      },
    });

    return {
      subscription,
      payment,
    };
  }

  async activateSubscription(subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status !== SubscriptionStatus.TRIAL) {
      throw new BadRequestException('Subscription is not in trial status');
    }

    // Activate subscription
    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: SubscriptionStatus.ACTIVE,
      },
    });
  }

  async cancelSubscription(subscriptionId: string, userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.userId !== userId) {
      throw new BadRequestException('You do not have permission to cancel this subscription');
    }

    // Cancel subscription
    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: SubscriptionStatus.EXPIRED, // Menggunakan EXPIRED sebagai pengganti CANCELLED
      },
    });
  }

  async processPayment(paymentId: string) {
    // Sederhanakan implementasi untuk menghindari error
    return { status: 'success' };
  }

  async checkSubscriptionAccess(userId: string, requiredPlan: SubscriptionPlan) {
    // Check if user is admin/super admin - always have access
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    if (user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')) {
      return true
    }

    const subscription = await this.getUserSubscription(userId)

    if (!subscription) {
      return false
    }

    const now = new Date()

    // Trial access: valid only until trialEndsAt/expiresAt and only for TRIAL tier
    if (subscription.status === SubscriptionStatus.TRIAL) {
      const trialEnd = subscription.trialEndsAt ?? subscription.expiresAt
      if (!trialEnd || trialEnd <= now) {
        return false
      }
      return requiredPlan === SubscriptionPlan.TRIAL
    }

    // Active subscription
    const isActive = subscription.status === SubscriptionStatus.ACTIVE
    const periodEnd = subscription.currentPeriodEnd ?? subscription.expiresAt
    const isNotExpired = !!periodEnd && periodEnd > now

    if (!isActive || !isNotExpired) {
      return false
    }

    // Check plan access (higher plans have access to lower plan features)
    const planLevels: Record<SubscriptionPlan, number> = {
      [SubscriptionPlan.TRIAL]: 1,
      [SubscriptionPlan.GOLD_MONTHLY]: 2,
      [SubscriptionPlan.GOLD_YEARLY]: 3,
      [SubscriptionPlan.ENTERPRISE_CUSTOM]: 4,
    }

    return planLevels[subscription.plan] >= planLevels[requiredPlan]
  }
  
  async getAllSubscriptions() {
    return this.prisma.subscription.findMany({
      include: {
        user: {
          select: {
            id: true,
            fullname: true,
            email: true,
            role: true,
            labelInvestors: {
              include: { label: { select: { id: true, name: true } } }
            }
          }
        },
        // expose label information for UI attribution
        label: {
          select: { id: true, name: true }
        } as any,
      }
    });
  }

  /**
   * Create Enterprise Label with optional metadata
   */
  async createEnterpriseLabel(data: { name: string; description?: string; ownerUserId?: string; }) {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Label name is required');
    }

    // Generate unique code based on name
    const baseCode = data.name.trim().toUpperCase().replace(/\s+/g, '_');
    const uniqueSuffix = Date.now().toString(36);
    const code = `${baseCode}_${uniqueSuffix}`;

    const label = await (this.prisma as any).enterpriseLabel.create({
      data: {
        name: data.name,
        description: data.description,
        code,
      }
    });

    this.logger.log(`Enterprise label created: ${label.name} (${label.id})`);
    return label;
  }

  /**
   * Get all Enterprise Labels for management UI
   */
  async getEnterpriseLabels() {
    return (this.prisma as any).enterpriseLabel.findMany();
  }

  async updateEnterpriseLabel(id: string, data: { name?: string; description?: string }) {
    const existing = await (this.prisma as any).enterpriseLabel.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Enterprise label not found');
    const updated = await (this.prisma as any).enterpriseLabel.update({ where: { id }, data: { name: data.name, description: data.description } });
    return updated;
  }

  async deleteEnterpriseLabel(id: string) {
    const existing = await (this.prisma as any).enterpriseLabel.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Enterprise label not found');
    await (this.prisma as any).enterpriseLabel.delete({ where: { id } });
    return { success: true };
  }

  /** Build invoice data and html for ORG_INVOICE payment */
  async buildInvoiceHtml(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { label: true }
    });
    if (!payment) throw new NotFoundException('Payment not found');
    const meta: any = payment.metadata || {};
    if (meta.mode !== 'ORG_INVOICE') throw new BadRequestException('Not an ORG_INVOICE payment');

    const orgName = payment.label?.name || meta.paidBy || '-';
    const invoiceNo = payment.invoiceNumber || meta.invoiceNumber || payment.id;
    const createdAt = payment.createdAt ? new Date(payment.createdAt).toLocaleString() : '';
    const status = payment.status;
    const currency = payment.currency || 'IDR';
    const amount = payment.amount || 0;
    const usersCount = Array.isArray(meta.userIds) ? meta.userIds.length : (meta.usersCount || 1);
    const period = meta.period || 'MONTHLY';
    const planText = `Enterprise Custom ${period}${meta.additionalSeats ? ' - additional seats' : ''} - ${usersCount} users`;
    const bankInfoLines = [
      meta.bankName ? `Bank: ${meta.bankName}` : '',
      meta.bankAccountName ? `Account Name: ${meta.bankAccountName}` : '',
      meta.bankAccountNumber ? `Account Number: ${meta.bankAccountNumber}` : '',
      meta.bankInstruction ? `Instruction: ${meta.bankInstruction}` : ''
    ].filter(Boolean);
    const notes = meta.notes ? String(meta.notes) : '';

    const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice ${invoiceNo}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111; padding: 24px; }
    .header { display:flex; justify-content: space-between; align-items: flex-start; }
    .brand { font-size: 20px; font-weight: 700; color: #4b2aad; }
    .inv-box { margin-top: 8px; }
    .muted { color: #666; }
    .card { border:1px solid #e5e7eb; border-radius:12px; padding:16px; margin-top:16px; }
    .row { display:flex; gap:16px; }
    .col { flex:1; }
    table { width:100%; border-collapse: collapse; margin-top:8px; table-layout: fixed; }
    th, td { padding:8px; border-bottom:1px solid #eee; vertical-align: top; }
    th.item, td.item { text-align:left; }
    th.qty, td.qty { text-align:right; width: 80px; }
    th.unit, td.unit { text-align:right; width: 160px; }
    th.total, td.total { text-align:right; width: 160px; }
    .tot-label { text-align:right; font-weight:700; }
    .badge { display:inline-block; padding:2px 8px; border-radius:9999px; font-size:12px; border:1px solid #ddd; }
  </style>
  </head>
  <body>
    <div class="header">
      <div>
        <div class="brand">Sentra Dapur</div>
        <div class="muted">PT. Layang Digital Innovation</div>
      </div>
      <div class="inv-box">
        <div><strong>Invoice:</strong> ${invoiceNo}</div>
        <div><strong>Date:</strong> ${createdAt}</div>
        <div><strong>Status:</strong> <span class="badge">${status}</span></div>
      </div>
    </div>

    <div class="card row">
      <div class="col">
        <div class="muted">Billed To</div>
        <div><strong>${orgName}</strong></div>
        ${meta.paidBy ? `<div>${meta.paidBy}</div>` : ''}
      </div>
      <div class="col">
        <div class="muted">Description</div>
        <div>${planText}</div>
      </div>
    </div>

    <div class="card">
      <table>
        <thead>
          <tr>
            <th class="item">Item</th>
            <th class="qty">Qty</th>
            <th class="unit">Unit Price</th>
            <th class="total">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="item">Subscription seats</td>
            <td class="qty">${usersCount}</td>
            <td class="unit">${fmt((meta.totalAmount && usersCount) ? (meta.totalAmount / usersCount) : (meta.pricePerUser || amount))}</td>
            <td class="total">${fmt(amount || meta.totalAmount || (usersCount * (meta.pricePerUser || 0)))}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" class="tot-label">Grand Total</td>
            <td class="total">${fmt(amount || meta.totalAmount || 0)}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    ${bankInfoLines.length ? `<div class="card"><div class="muted">Bank Transfer</div><div>${bankInfoLines.join('<br/>')}</div></div>` : ''}
    ${notes ? `<div class="card"><div class="muted">Notes</div><div>${notes}</div></div>` : ''}

  </body>
</html>`;
    return { payment, html, filename: `invoice-${invoiceNo}.html` };
  }

  /** Stream PDF for ORG_INVOICE using pdfkit (if installed) */
  async streamInvoicePdf(res: any, paymentId: string) {
    // lazy import to avoid hard dependency at compile time
    let PDFDocument: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      PDFDocument = require('pdfkit');
    } catch {
      throw new BadRequestException('PDF generator not available');
    }

    const { payment, filename } = await this.buildInvoiceHtml(paymentId);
    const meta: any = payment.metadata || {};
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/\.html$/, '.pdf')}"`);
    doc.pipe(res);

    // Header
    doc.fillColor('#4b2aad').fontSize(20).text('Sentra Dapur', { continued: false });
    doc.fillColor('#444').fontSize(10).text('PT. Layang Digital Innovation');

    const invoiceNo = payment.invoiceNumber || meta.invoiceNumber || payment.id;
    const createdAt = payment.createdAt ? new Date(payment.createdAt).toLocaleString() : '';
    doc.moveDown(0.5);
    doc.fillColor('#000').fontSize(12).text(`Invoice: ${invoiceNo}`);
    doc.text(`Date: ${createdAt}`);
    doc.text(`Status: ${payment.status}`);

    doc.moveDown();
    // Bill to and description
    const orgName = payment.label?.name || meta.paidBy || '-';
    doc.fontSize(11).fillColor('#666').text('Billed To');
    doc.fillColor('#000').text(orgName);

    const usersCount = Array.isArray(meta.userIds) ? meta.userIds.length : (meta.usersCount || 1);
    const period = meta.period || 'MONTHLY';
    const planText = `Enterprise Custom ${period}${meta.additionalSeats ? ' - additional seats' : ''} - ${usersCount} users`;
    doc.moveDown(0.5);
    doc.fillColor('#666').text('Description');
    doc.fillColor('#000').text(planText);

    // Table-ish
    doc.moveDown();
    const currency = payment.currency || 'IDR';
    const amount = payment.amount || 0;
    const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
    const unitPrice = (meta.totalAmount && usersCount) ? (meta.totalAmount / usersCount) : (meta.pricePerUser || amount);
    const total = amount || meta.totalAmount || (usersCount * (meta.pricePerUser || 0));
    // Column positions and widths
    const marginLeft = 48;
    const itemX = marginLeft;
    const qtyX = 280; const qtyW = 40;
    const unitX = 340; const unitW = 100;
    const totalX = 460; const totalW = 100;

    // Header row (align numeric headers to the right edge of their cells)
    doc.fontSize(12).text('Item', itemX);
    doc.moveUp().text('Qty', qtyX, undefined as any, { width: qtyW, align: 'right' });
    doc.moveUp().text('Unit Price', unitX, undefined as any, { width: unitW, align: 'right' });
    doc.moveUp().text('Total', totalX, undefined as any, { width: totalW, align: 'right' });
    doc.moveDown(0.2); doc.strokeColor('#eee').moveTo(48, doc.y).lineTo(560, doc.y).stroke();
    doc.moveDown(0.4);
    // Data row (numeric cells right-aligned)
    doc.fillColor('#000').text('Subscription seats', itemX);
    doc.moveUp().text(String(usersCount), qtyX, undefined as any, { width: qtyW, align: 'right' });
    doc.moveUp().text(fmt(unitPrice), unitX, undefined as any, { width: unitW, align: 'right' });
    doc.moveUp().text(fmt(total), totalX, undefined as any, { width: totalW, align: 'right' });
    doc.moveDown(0.4); doc.strokeColor('#eee').moveTo(48, doc.y).lineTo(560, doc.y).stroke();
    doc.moveDown(0.6);
    // Align Grand Total with Unit/Total columns
    const labelWidth = totalX - unitX - 10;
    doc.font('Helvetica-Bold').text('Grand Total', unitX, doc.y, { width: labelWidth, align: 'right' });
    doc.text(fmt(total), totalX, undefined as any, { width: totalW, align: 'right' });
    doc.font('Helvetica');

    // Bank Transfer (separate from Notes)
    const bankInfo: string[] = [];
    if (meta.bankName) bankInfo.push(`Bank: ${meta.bankName}`);
    if (meta.bankAccountName) bankInfo.push(`Account Name: ${meta.bankAccountName}`);
    if (meta.bankAccountNumber) bankInfo.push(`Account Number: ${meta.bankAccountNumber}`);
    if (meta.bankInstruction) bankInfo.push(`Instruction: ${meta.bankInstruction}`);
    if (bankInfo.length) {
      doc.moveDown();
      doc.fillColor('#666').text('Bank Transfer');
      doc.fillColor('#000').text(bankInfo.join('\n'));
    }

    // Notes
    if (meta.notes) {
      doc.moveDown();
      doc.fillColor('#666').text('Notes');
      doc.fillColor('#000').text(String(meta.notes));
    }

    doc.end();
  }

  /**
   * Bulk create investors under a label.
   * Each investor will be created with Role.INVESTOR and password hashed.
   */
  async bulkCreateInvestorsForLabel(params: {
    labelId: string;
    investors: Array<{ email: string; fullName?: string; password?: string }>;
    defaultPassword?: string;
    requireUniqueEmail?: boolean;
  }) {
    const { labelId, investors, defaultPassword = 'password123', requireUniqueEmail = true } = params;

    const label = await (this.prisma as any).enterpriseLabel.findUnique({ where: { id: labelId } });
    if (!label) throw new NotFoundException('Enterprise label not found');

    const results: Array<{ userId: string; email: string; created: boolean; reason?: string }> = [];

    for (const inv of investors) {
      const email = inv.email.toLowerCase().trim();
      if (requireUniqueEmail) {
        const existing = await this.prisma.user.findUnique({ where: { email } });
        if (existing) {
          // Link existing user to label as investor without creating new user
          await this.ensureLabelInvestor(labelId, existing.id);
          results.push({ userId: existing.id, email, created: false, reason: 'Email already exists, linked to label' });
        } else {
          continue;
        }
      }

      const plainPassword = inv.password || defaultPassword;
      const passwordHash = await bcrypt.hash(plainPassword, 10);

      const user = await this.prisma.user.create({
        data: {
          email,
          password: passwordHash,
          role: Role.INVESTOR,
          fullname: inv.fullName,
        }
      });

      await this.ensureLabelInvestor(labelId, user.id);
      results.push({ userId: user.id, email, created: true });
    }

    this.logger.log(`Bulk create investors for label ${labelId} completed: ${results.length} processed`);
    return { labelId, count: results.length, results };
  }

  private async ensureLabelInvestor(labelId: string, userId: string) {
    const existing = await (this.prisma as any).labelInvestor.findFirst({
      where: { labelId, userId }
    });
    if (existing) return existing;

    return (this.prisma as any).labelInvestor.create({
      data: { labelId, userId }
    });
  }

  /**
   * Bulk subscribe investors to ENTERPRISE_CUSTOM plan with custom price and currency.
   * Optionally auto activate by marking payment as manual paid.
   */
  async bulkSubscribeInvestorsForLabel(params: {
    labelId: string;
    userIds: string[];
    price: number;
    currency?: string;
    autoActivate?: boolean; // if true, mark payment as PAID immediately (manual)
    period?: 'MONTHLY' | 'YEARLY';
  }) {
    const { labelId, userIds, price, currency = 'IDR', autoActivate = true, period = 'MONTHLY' } = params;

    const label = await (this.prisma as any).enterpriseLabel.findUnique({ where: { id: labelId } });
    if (!label) throw new NotFoundException('Enterprise label not found');

    const ENTERPRISE_CUSTOM_PLAN = 'ENTERPRISE_CUSTOM' as SubscriptionPlan;
    const now = new Date();
    const results: Array<{ userId: string; subscriptionId: string; paymentId?: string }> = [];

    for (const userId of userIds) {
      // Upsert subscription for user
      const existing = await this.prisma.subscription.findUnique({ where: { userId } });

      let subscription;
      const periodEnd = this.calculatePeriodEnd(now, period);

      if (existing) {
        subscription = await this.prisma.subscription.update({
          where: { id: existing.id },
          data: {
            plan: ENTERPRISE_CUSTOM_PLAN,
            status: autoActivate ? SubscriptionStatus.ACTIVE : SubscriptionStatus.PAUSED,
            startedAt: autoActivate ? now : existing.startedAt,
            currentPeriodStart: autoActivate ? now : existing.currentPeriodStart,
            currentPeriodEnd: autoActivate ? periodEnd : existing.currentPeriodEnd,
            customPrice: price,
            customCurrency: currency,
            labelId,
          } as any,
        });
      } else {
        subscription = await this.prisma.subscription.create({
          data: {
            userId,
            plan: ENTERPRISE_CUSTOM_PLAN,
            status: autoActivate ? SubscriptionStatus.ACTIVE : SubscriptionStatus.PAUSED,
            startedAt: autoActivate ? now : null,
            currentPeriodStart: autoActivate ? now : null,
            currentPeriodEnd: autoActivate ? periodEnd : null,
            customPrice: price,
            customCurrency: currency,
            labelId,
          } as any,
        });
      }

      // Create payment record
      const payment = await this.paymentService.createPayment({
        userId,
        amount: price,
        description: `Enterprise Custom (${label.name}) ${period}`,
        paymentMethod: autoActivate ? 'manual' : 'xendit',
        currency,
        subscriptionId: subscription.id,
      });

      // If payment is required (not auto-activated), notify user with payment link
      if (!autoActivate) {
        try {
          const paymentLink = (payment as any)?.paymentLink;
          await (this.prisma as any).notification.create({
            data: {
              userId,
              title: 'Pembayaran diperlukan',
              message: paymentLink
                ? `Langganan ENTERPRISE_CUSTOM melalui label ${label.name} telah dibuat. Silakan selesaikan pembayaran: ${paymentLink}`
                : `Langganan ENTERPRISE_CUSTOM melalui label ${label.name} telah dibuat. Silakan selesaikan pembayaran Anda.`,
              type: 'PAYMENT_REQUIRED',
              relatedId: subscription.id,
              metadata: { paymentId: (payment as any)?.id, paymentLink, labelId: labelId, period } as any,
            },
          });
        } catch (e) {
          this.logger.warn(`Failed to create payment required notification for user ${userId}: ${e?.message}`);
        }
      }

      // If autoActivate is false and using gateway, leave subscription pending until webhook updates
      if (autoActivate) {
        // Ensure subscription is marked active and period dates set
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: SubscriptionStatus.ACTIVE,
            startedAt: now,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          }
        });
      }

      results.push({ userId, subscriptionId: subscription.id, paymentId: (payment as any)?.id });
    }

    this.logger.log(`Bulk subscribe ${userIds.length} investors to ENTERPRISE_CUSTOM under label ${labelId}`);
    return { labelId, count: userIds.length, results };
  }

  private calculatePeriodEnd(startDate: Date, period: 'MONTHLY' | 'YEARLY') {
    const endDate = new Date(startDate);
    if (period === 'YEARLY') endDate.setFullYear(endDate.getFullYear() + 1);
    else endDate.setMonth(endDate.getMonth() + 1);
    return endDate;
  }

  async startTrialForEligibleUser(userId: string, role: Role) {
  if (role === Role.ADMIN || role === Role.SUPER_ADMIN || (Role as any).ADMIN_INVESTMENT === role || (Role as any).ADMIN_TRADING === role) {
    this.logger.log(`Skipping trial creation for admin role: ${role}`)
    return null
  }

  const isEligible =
    role === Role.INVESTOR ||
    role === Role.PROJECT_OWNER ||
    role === Role.BUYER ||
    role === Role.SUPPLIER
  if (!isEligible) {
    this.logger.log(`Role ${role} is not eligible for trial`)
    return null
  }

  const existing = await this.prisma.subscription.findUnique({ where: { userId } })
  const now = new Date()
  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + 7)

  if (existing) {
    // Never downgrade an existing non-TRIAL subscription (even if EXPIRED/PAUSED) to TRIAL
    if (existing.plan !== SubscriptionPlan.TRIAL) {
      this.logger.log(`User ${userId} already has non-TRIAL plan (${existing.plan}) with status ${existing.status}; skipping trial creation`)
      return existing
    }
    // If existing TRIAL is still valid, keep as-is
    if (existing.status === SubscriptionStatus.TRIAL && existing.trialEndsAt && existing.trialEndsAt > now) {
      this.logger.log(`User ${userId} already in valid TRIAL until ${existing.trialEndsAt}`)
      return existing
    }
    // Do not auto-refresh expired TRIALs; keep historical record
    this.logger.log(`User ${userId} has an existing TRIAL that is no longer valid; not refreshing trial automatically`)
    return existing
  }

  // Create new trial subscription
  const created = await this.prisma.subscription.create({
    data: {
      userId,
      plan: SubscriptionPlan.TRIAL,
      status: SubscriptionStatus.TRIAL,
      startedAt: now,
      trialEndsAt,
      expiresAt: trialEndsAt,
    },
  })
  this.logger.log(`Created trial subscription for user ${userId} valid until ${trialEndsAt.toISOString()}`)
  return created
}

  /**
   * Create in-app notifications H-1 before trial ends for eligible roles.
   */
  async notifyTrialsExpiringHMinus1() {
    const roles: Role[] = [Role.INVESTOR, Role.PROJECT_OWNER, Role.BUYER, Role.SUPPLIER];
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() + 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    const expiring = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.TRIAL,
        trialEndsAt: { gte: start, lte: end },
        user: { role: { in: roles as any } },
      },
      include: { user: { select: { id: true, email: true, role: true } } },
    });

    let created = 0;
    for (const s of expiring) {
      try {
        await (this.prisma as any).notification.create({
          data: {
            userId: s.userId,
            title: 'Trial akan berakhir besok',
            message: 'Masa trial Anda akan berakhir dalam 1 hari. Upgrade ke plan Gold untuk terus mengakses fitur premium.',
            type: 'TRIAL_EXPIRY',
            relatedId: s.id,
            metadata: { trialEndsAt: s.trialEndsAt, plan: s.plan } as any,
          },
        });
        created++;
      } catch (e) {
        this.logger.warn(`Failed to create trial expiry notification for user ${s.userId}: ${e?.message}`);
      }
    }

    this.logger.log(`Trial expiry H-1 notifications created: ${created} / ${expiring.length}`);
    return { totalCandidates: expiring.length, created };
  }
}
