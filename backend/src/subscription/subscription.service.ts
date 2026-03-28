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

  private async ensureDapursBelongToLabel(labelId: string, dapurUnitIds: string[]) {
    const links = await this.prisma.labelDapur.findMany({
      where: { labelId, dapurUnitId: { in: dapurUnitIds } },
      select: { dapurUnitId: true },
    });
    if (links.length !== dapurUnitIds.length) {
      throw new BadRequestException(
        'Setiap unit dapur harus sudah terhubung ke label enterprise (LabelDapur).',
      );
    }
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

  private async clearUsersLinkedToSubscription(subscriptionId: string) {
    await this.prisma.user.updateMany({
      where: { subscriptionId },
      data: { subscriptionId: null },
    });
  }

  private async mapLegacyUserIdsToDapurUnitIds(userIds: string[]): Promise<string[]> {
    const out: string[] = [];
    for (const uid of userIds) {
      const d = await this.prisma.dapurUnit.findFirst({
        where: { projectOwnerId: uid },
        select: { id: true },
      });
      if (d) out.push(d.id);
    }
    return out;
  }

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

  /** Dapur units linked to an enterprise label (for admin bulk subscribe UI). */
  async getDapurUnitsForEnterpriseLabel(labelId: string) {
    const label = await (this.prisma as any).enterpriseLabel.findUnique({ where: { id: labelId } });
    if (!label) throw new NotFoundException('Enterprise label not found');
    return this.prisma.labelDapur.findMany({
      where: { labelId },
      include: {
        dapurUnit: {
          include: {
            projectOwner: { select: { id: true, fullname: true, email: true, role: true } },
            adminDapur: { select: { id: true, fullname: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

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
      select: { id: true, dapurUnitId: true, currentPeriodEnd: true, expiresAt: true },
    });

    let updated = 0;
    for (const s of overdue) {
      try {
        await this.clearUsersLinkedToSubscription(s.id);
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
        dapurUnit: {
          select: {
            id: true,
            name: true,
            projectOwnerId: true,
            projectOwner: { select: { id: true, email: true } },
          },
        },
        label: { select: { id: true, name: true, code: true } },
      },
    });

    const superAdmins = await this.prisma.user.findMany({ where: { role: 'SUPER_ADMIN' as any }, select: { id: true, email: true } });

    let userNotifs = 0;
    let adminNotifs = 0;
    for (const s of expiring) {
      const ownerId = s.dapurUnit?.projectOwnerId;
      if (!ownerId) continue;
      try {
        await (this.prisma as any).notification.create({
          data: {
            userId: ownerId,
            title: 'Langganan Enterprise akan berakhir besok',
            message: `Akses Enterprise (${s.label?.name || 'Organisasi'}) untuk dapur "${s.dapurUnit?.name || ''}" akan berakhir dalam 1 hari. Mohon lakukan perpanjangan.`,
            type: 'ENTERPRISE_EXPIRY',
            relatedId: s.id,
            metadata: {
              labelId: s.label?.id,
              labelName: s.label?.name,
              dapurUnitId: s.dapurUnit?.id,
              dapurUnitName: s.dapurUnit?.name,
              currentPeriodEnd: s.currentPeriodEnd,
              expiresAt: s.expiresAt,
            } as any,
          },
        });
        userNotifs++;
      } catch (e) {
        this.logger.warn(`Failed to notify project owner ${ownerId} enterprise expiry: ${e?.message}`);
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
              metadata: {
                items: expiring.map((e) => ({
                  subscriptionId: e.id,
                  dapurUnitId: e.dapurUnit?.id,
                  dapurUnitName: e.dapurUnit?.name,
                  ownerEmail: e.dapurUnit?.projectOwner?.email,
                  labelName: e.label?.name,
                  currentPeriodEnd: e.currentPeriodEnd,
                  expiresAt: e.expiresAt,
                })),
              } as any,
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
    
    const newMeta = { ...meta, awaitingApproval: false, approved: true, approvedAt: new Date().toISOString(), approvedBy: approverUserId };
    await this.prisma.payment.update({ 
      where: { id: payment.id }, 
      data: { status: (PaymentStatus as any).PAID ?? 'PAID', paidAt: new Date(), metadata: newMeta } as any 
    });

    if (meta.mode === 'SINGLE_SUBSCRIPTION' && payment.subscriptionId) {
      const period = meta.period || 'MONTHLY';
      const now = new Date();
      const periodEnd = this.calculatePeriodEnd(now, period);

      await this.prisma.subscription.update({
        where: { id: payment.subscriptionId },
        data: {
          status: SubscriptionStatus.ACTIVE,
          startedAt: now,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        }
      });
    } else if (meta.mode === 'ORG_INVOICE') {
      await this.activateBulkFromOrgInvoice({
        labelId: meta.labelId,
        dapurUnitIds: Array.isArray(meta.dapurUnitIds) ? meta.dapurUnitIds : [],
        userIds: Array.isArray(meta.userIds) ? meta.userIds : [],
        pricePerUser: meta.pricePerUser || 0,
        currency: meta.currency || 'IDR',
        period: meta.period || 'MONTHLY',
      });
    }
    
    return { success: true };
  }

  /** Fail manual org payment -> mark FAILED and optionally expire subscriptions */
  async failManualOrgPayment(params: { paymentId: string; reason?: string; expireSubscriptions?: boolean }) {
    const { paymentId, reason, expireSubscriptions = false } = params;
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    const meta: any = payment.metadata || {};
    
    await this.prisma.payment.update({ 
      where: { id: payment.id }, 
      data: { status: PaymentStatus.FAILED, failedAt: new Date(), failureReason: reason } 
    });

    if (expireSubscriptions) {
      let dapurUnitIds: string[] = [];
      if (meta.mode === 'SINGLE_SUBSCRIPTION' && meta.dapurUnitId) {
        dapurUnitIds = [meta.dapurUnitId];
      } else if (meta.mode === 'ORG_INVOICE') {
        dapurUnitIds = Array.isArray(meta.dapurUnitIds) ? meta.dapurUnitIds : [];
        if (dapurUnitIds.length === 0 && Array.isArray(meta.userIds)) {
          dapurUnitIds = await this.mapLegacyUserIdsToDapurUnitIds(meta.userIds);
        }
      }

      for (const dapurUnitId of dapurUnitIds) {
        const existing = await this.prisma.subscription.findUnique({ where: { dapurUnitId } });
        if (existing) {
          await this.clearUsersLinkedToSubscription(existing.id);
          await this.prisma.subscription.update({
            where: { id: existing.id },
            data: { status: SubscriptionStatus.EXPIRED, currentPeriodEnd: new Date() },
          });
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
    dapurUnitIds: string[];
    pricePerUser: number;
    totalAmount?: number;
    currency?: string;
    period: 'MONTHLY' | 'YEARLY' | 'TWO_YEARS';
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
    let {
      adminUserId,
      labelId,
      dapurUnitIds,
      pricePerUser,
      totalAmount,
      currency = 'IDR',
      period,
      provider = 'xendit',
      description,
      invoiceNumber,
      referenceNumber,
      bankName,
      paidBy,
      notes,
      awaitingApproval = false,
      additionalSeats = false,
    } = params;

    // Force approval workflow for manual provider
    if (provider === 'manual') {
      awaitingApproval = true;
    }

    if (!dapurUnitIds || dapurUnitIds.length === 0) {
      throw new BadRequestException('dapurUnitIds is required');
    }
    await this.ensureDapursBelongToLabel(labelId, dapurUnitIds);
    const label = await (this.prisma as any).enterpriseLabel.findUnique({ where: { id: labelId } });
    if (!label) throw new NotFoundException('Enterprise label not found');

    const amountToCharge =
      typeof totalAmount === 'number' && totalAmount > 0
        ? totalAmount
        : pricePerUser * dapurUnitIds.length;
    const desc =
      description ||
      `Enterprise Custom (${label.name}) ${period} • ${dapurUnitIds.length} unit dapur`;

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
        dapurUnitIds,
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
   * Activate ENTERPRISE_CUSTOM per DapurUnit after org invoice is paid.
   * Supports legacy payments that only stored userIds (project owners).
   */
  async activateBulkFromOrgInvoice(params: {
    labelId: string;
    dapurUnitIds?: string[];
    userIds?: string[];
    pricePerUser: number;
    currency?: string;
    period: 'MONTHLY' | 'YEARLY' | 'TWO_YEARS';
  }) {
    let { labelId, pricePerUser, currency = 'IDR', period } = params;
    let dapurUnitIds = params.dapurUnitIds?.length ? params.dapurUnitIds : [];
    if (dapurUnitIds.length === 0 && params.userIds?.length) {
      dapurUnitIds = await this.mapLegacyUserIdsToDapurUnitIds(params.userIds);
    }
    if (dapurUnitIds.length === 0) {
      throw new BadRequestException('No dapur units to activate');
    }
    await this.ensureDapursBelongToLabel(labelId, dapurUnitIds);

    const now = new Date();
    const periodEnd = this.calculatePeriodEnd(now, period);
    const ENTERPRISE_CUSTOM_PLAN = 'ENTERPRISE_CUSTOM' as SubscriptionPlan;

    for (const dapurUnitId of dapurUnitIds) {
      const existing = await this.prisma.subscription.findUnique({ where: { dapurUnitId } });
      let subscription;
      if (existing) {
        subscription = await this.prisma.subscription.update({
          where: { id: existing.id },
          data: {
            plan: ENTERPRISE_CUSTOM_PLAN,
            status: SubscriptionStatus.ACTIVE,
            startedAt: now,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            customPrice: pricePerUser,
            customCurrency: currency as any,
            labelId,
          } as any,
        });
      } else {
        subscription = await this.prisma.subscription.create({
          data: {
            dapurUnitId,
            plan: ENTERPRISE_CUSTOM_PLAN,
            status: SubscriptionStatus.ACTIVE,
            startedAt: now,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            customPrice: pricePerUser,
            customCurrency: currency as any,
            labelId,
          } as any,
        });
      }
      await this.propagateSubscriptionToDapurUsers(dapurUnitId, subscription.id);
    }

    this.logger.log(`Activated ${dapurUnitIds.length} dapur subscriptions for label ${labelId} via ORG_INVOICE`);
    return { labelId, count: dapurUnitIds.length };
  }

  /**
   * Create a renewal org invoice based on a previous ORG_INVOICE payment.
   * Reuse labelId and userIds from previous payment metadata.
   */
  async createOrgInvoiceRenewalFromPayment(params: {
    adminUserId: string;
    previousPaymentId: string;
    period?: 'MONTHLY' | 'YEARLY' | 'TWO_YEARS';
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
    let dapurUnitIds: string[] = Array.isArray(meta.dapurUnitIds) ? (meta.dapurUnitIds as string[]) : [];
    if (dapurUnitIds.length === 0 && Array.isArray(meta.userIds)) {
      dapurUnitIds = await this.mapLegacyUserIdsToDapurUnitIds(meta.userIds as string[]);
    }
    if (!labelId || dapurUnitIds.length === 0) {
      throw new BadRequestException('Previous payment missing labelId or dapurUnitIds');
    }

    const label = await (this.prisma as any).enterpriseLabel.findUnique({ where: { id: labelId } });
    if (!label) throw new NotFoundException('Enterprise label not found');

    const amountToCharge =
      typeof totalAmount === 'number' && totalAmount > 0
        ? totalAmount
        : pricePerUser * dapurUnitIds.length;
    const desc =
      description ||
      `Enterprise Custom (${label.name}) ${period} • Renewal • ${dapurUnitIds.length} unit dapur`;

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
        dapurUnitIds,
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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });
    if (user?.subscription) {
      return user.subscription;
    }
    return this.prisma.subscription.findFirst({
      where: {
        dapurUnit: {
          OR: [
            { projectOwnerId: userId },
            { adminDapurId: userId },
            { adminPusatId: userId },
            { investors: { some: { investorId: userId } } },
          ],
        },
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async createSubscription(userId: string, planId: string, paymentMethod: string, role?: Role) {
    const plans = await this.getSubscriptionPlans();
    const plan = plans.find((p) => p.id === planId);

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    const dbUser = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!dbUser) throw new NotFoundException('User not found');
    const effectiveRole = role ?? dbUser.role;

    const dapurUnitId = await this.resolvePrimaryDapurUnitIdForUser(userId, effectiveRole as Role);
    if (!dapurUnitId) {
      throw new BadRequestException('Tidak ada unit dapur terkait akun ini; hubungkan ke dapur terlebih dahulu.');
    }

    const payment = await this.paymentService.createPayment({
      userId,
      amount: 0,
      description: `Subscription to ${plan.plan} plan`,
      paymentMethod,
    });

    const existing = await this.prisma.subscription.findUnique({ where: { dapurUnitId } });
    let subscription;
    if (existing) {
      subscription = await this.prisma.subscription.update({
        where: { id: existing.id },
        data: {
          plan: plan.plan,
          status: SubscriptionStatus.TRIAL,
          startedAt: new Date(),
        },
      });
    } else {
      subscription = await this.prisma.subscription.create({
        data: {
          dapurUnitId,
          plan: plan.plan,
          status: SubscriptionStatus.TRIAL,
          startedAt: new Date(),
        },
      });
    }
    await this.propagateSubscriptionToDapurUsers(dapurUnitId, subscription.id);

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
      include: { dapurUnit: true },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, subscriptionId: true },
    });
    const isSuperAdmin = actor?.role === Role.SUPER_ADMIN;
    const du = subscription.dapurUnit;
    const ownsDapur =
      du.projectOwnerId === userId || du.adminDapurId === userId || du.adminPusatId === userId;
    const linked = actor?.subscriptionId === subscriptionId;

    if (!isSuperAdmin && !ownsDapur && !linked) {
      throw new BadRequestException('You do not have permission to cancel this subscription');
    }

    await this.clearUsersLinkedToSubscription(subscriptionId);

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
    const planLevels: Record<string, number> = {
      [SubscriptionPlan.TRIAL]: 1,
      [SubscriptionPlan.GOLD_MONTHLY]: 2,
      [SubscriptionPlan.GOLD_YEARLY]: 3,
      ['GOLD_TWO_YEARS']: 3,
      [SubscriptionPlan.ENTERPRISE_CUSTOM]: 4,
    }

    return (planLevels[subscription.plan] || 0) >= (planLevels[requiredPlan] || 0)
  }
  
  async getAllSubscriptions() {
    return this.prisma.subscription.findMany({
      include: {
        dapurUnit: {
          select: {
            id: true,
            name: true,
            location: true,
            projectOwner: {
              select: {
                id: true,
                fullname: true,
                email: true,
                role: true,
              },
            },
            adminDapur: { select: { id: true, fullname: true, email: true } },
            labelDapurs: {
              include: { label: { select: { id: true, name: true } } },
            },
          },
        },
        label: {
          select: { id: true, name: true },
        } as any,
      },
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
    const usersCount = Array.isArray(meta.dapurUnitIds)
      ? meta.dapurUnitIds.length
      : Array.isArray(meta.userIds)
        ? meta.userIds.length
        : (meta.usersCount || 1);
    const period = meta.period || 'MONTHLY';
    const planText = `Enterprise Custom ${period}${meta.additionalSeats ? ' - additional seats' : ''} - ${usersCount} unit dapur`;
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
            <td class="item">Langganan per unit dapur</td>
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

    const usersCount = Array.isArray(meta.dapurUnitIds)
      ? meta.dapurUnitIds.length
      : Array.isArray(meta.userIds)
        ? meta.userIds.length
        : (meta.usersCount || 1);
    const period = meta.period || 'MONTHLY';
    const planText = `Enterprise Custom ${period}${meta.additionalSeats ? ' - additional seats' : ''} - ${usersCount} unit dapur`;
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
    doc.fillColor('#000').text('Langganan per unit dapur', itemX);
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

  async getAllDapurUnits() {
    return this.prisma.dapurUnit.findMany({
      include: {
        projectOwner: { select: { id: true, fullname: true, email: true } },
        adminDapur: { select: { id: true, fullname: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Berlangganan (Subscribe) Unit Dapur ke paket GOLD (ENTERPRISE_CUSTOM) - Pembayaran MANUAL.
   */
  async subscribeDapurUnits(params: {
    dapurUnitIds: string[];
    price: number;
    currency?: string;
    period?: 'MONTHLY' | 'YEARLY' | 'TWO_YEARS';
  }) {
    let { dapurUnitIds = [], price, currency = 'IDR', period = 'MONTHLY' } = params;

    // Map period to correct SubscriptionPlan
    let planToSet: SubscriptionPlan = SubscriptionPlan.GOLD_MONTHLY;
    if (period === 'YEARLY') planToSet = SubscriptionPlan.GOLD_YEARLY;
    else if (period === 'TWO_YEARS') planToSet = (SubscriptionPlan as any).GOLD_TWO_YEARS ?? SubscriptionPlan.GOLD_YEARLY;

    const results: Array<{ dapurUnitId: string; subscriptionId: string; paymentId?: string }> = [];

    for (const dapurUnitId of dapurUnitIds) {
      const dapur = await this.prisma.dapurUnit.findUnique({
        where: { id: dapurUnitId },
        select: { projectOwnerId: true, name: true },
      });
      if (!dapur) continue;

      const existing = await this.prisma.subscription.findUnique({ where: { dapurUnitId } });
      let subscription;

      // Status PAST_DUE for manual payment (implies payment is needed)
      const status = SubscriptionStatus.PAST_DUE;

      if (existing) {
        subscription = await this.prisma.subscription.update({
          where: { id: existing.id },
          data: {
            plan: planToSet,
            status: status,
            customPrice: price,
            customCurrency: currency as any,
            // Reset dates until payment is approved
            startedAt: null,
            currentPeriodStart: null,
            currentPeriodEnd: null,
          } as any,
        });
      } else {
        subscription = await this.prisma.subscription.create({
          data: {
            dapurUnitId,
            plan: planToSet,
            status: status,
            customPrice: price,
            customCurrency: currency as any,
          } as any,
        });
      }

      await this.propagateSubscriptionToDapurUsers(dapurUnitId, subscription.id);

      // Create manual payment record
      const payment = await this.paymentService.createPayment({
        userId: dapur.projectOwnerId,
        amount: price,
        description: `Langganan Unit Dapur: ${dapur.name || dapurUnitId} (${period})`,
        paymentMethod: 'manual',
        currency,
        subscriptionId: subscription.id,
        metadata: {
          mode: 'SINGLE_SUBSCRIPTION',
          awaitingApproval: true, // This ensures it shows up for admin review
          period,
          dapurUnitId,
          plan: planToSet,
        },
      });

      try {
        await (this.prisma as any).notification.create({
          data: {
            userId: dapur.projectOwnerId,
            title: 'Pembayaran Langganan Diperlukan',
            message: `Langganan untuk dapur "${dapur.name}" telah dibuat. Silakan hubungi admin untuk konfirmasi pembayaran manual sebesar ${currency} ${price.toLocaleString('id-ID')}.`,
            type: 'PAYMENT_REQUIRED',
            relatedId: subscription.id,
            metadata: { paymentId: (payment as any)?.id, period, dapurUnitId } as any,
          },
        });
      } catch (e) {
        this.logger.warn(`Failed payment notification for dapur ${dapurUnitId}: ${e?.message}`);
      }

      results.push({ dapurUnitId, subscriptionId: subscription.id, paymentId: (payment as any)?.id });
    }

    this.logger.log(`Subscribe ${dapurUnitIds.length} dapur units to GOLD plan (Manual Payment)`);
    return { count: dapurUnitIds.length, results };
  }

  private calculatePeriodEnd(startDate: Date, period: 'MONTHLY' | 'YEARLY' | 'TWO_YEARS') {
    const endDate = new Date(startDate);
    if (period === 'TWO_YEARS') endDate.setFullYear(endDate.getFullYear() + 2);
    else if (period === 'YEARLY') endDate.setFullYear(endDate.getFullYear() + 1);
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

  const dapurUnitId = await this.resolvePrimaryDapurUnitIdForUser(userId, role)
  if (!dapurUnitId) {
    this.logger.log(`No dapur unit for user ${userId}; skipping trial`)
    return null
  }

  const existing = await this.prisma.subscription.findUnique({ where: { dapurUnitId } })
  const now = new Date()
  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + 7)

  if (existing) {
    if (existing.plan !== SubscriptionPlan.TRIAL) {
      this.logger.log(`Dapur ${dapurUnitId} already has non-TRIAL plan (${existing.plan}); skipping trial`)
      return existing
    }
    if (existing.status === SubscriptionStatus.TRIAL && existing.trialEndsAt && existing.trialEndsAt > now) {
      this.logger.log(`Dapur ${dapurUnitId} already in valid TRIAL until ${existing.trialEndsAt}`)
      return existing
    }
    this.logger.log(`Dapur ${dapurUnitId} has expired TRIAL; not refreshing automatically`)
    return existing
  }

  const created = await this.prisma.subscription.create({
    data: {
      dapurUnitId,
      plan: SubscriptionPlan.TRIAL,
      status: SubscriptionStatus.TRIAL,
      startedAt: now,
      trialEndsAt,
      expiresAt: trialEndsAt,
    },
  })
  await this.propagateSubscriptionToDapurUsers(dapurUnitId, created.id)
  this.logger.log(`Created trial subscription for dapur ${dapurUnitId} (user ${userId}) until ${trialEndsAt.toISOString()}`)
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
      },
      select: { id: true, trialEndsAt: true, plan: true },
    });
    const subIds = expiring.map((s) => s.id);
    const affectedUsers = await this.prisma.user.findMany({
      where: {
        subscriptionId: { in: subIds },
        role: { in: roles as any },
      },
      select: { id: true, email: true, subscriptionId: true },
    });

    let created = 0;
    for (const u of affectedUsers) {
      const sub = expiring.find((s) => s.id === u.subscriptionId);
      if (!sub) continue;
      try {
        await (this.prisma as any).notification.create({
          data: {
            userId: u.id,
            title: 'Trial akan berakhir besok',
            message: 'Masa trial Anda akan berakhir dalam 1 hari. Upgrade ke plan Gold untuk terus mengakses fitur premium.',
            type: 'TRIAL_EXPIRY',
            relatedId: sub.id,
            metadata: { trialEndsAt: sub.trialEndsAt, plan: sub.plan } as any,
          },
        });
        created++;
      } catch (e) {
        this.logger.warn(`Failed to create trial expiry notification for user ${u.id}: ${e?.message}`);
      }
    }

    this.logger.log(`Trial expiry H-1 notifications created: ${created} / ${expiring.length}`);
    return { totalCandidates: expiring.length, created };
  }
}
