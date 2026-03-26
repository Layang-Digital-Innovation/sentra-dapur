import { Controller, Get, Post, Body, Param, UseGuards, Request, Query, Res, Header, Put, Delete, Logger } from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { SubscriptionService } from './subscription.service';
import { PaymentService } from './payment.service';
import { PaypalSubscriptionService } from './paypal-subscription.service';
import { PaymentGatewayService } from './payment-gateway.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SubscriptionPlan, PaymentStatus, Role } from '@prisma/client';
 

@Controller('subscription')
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly paymentService: PaymentService,
    private readonly paypalSubscriptionService: PaypalSubscriptionService,
    private readonly paymentGateway: PaymentGatewayService,
    private readonly configService: ConfigService,
    
  ) {}
  private readonly logger = new Logger(SubscriptionController.name);

  @Get('plans')
  async getSubscriptionPlans() {
    return this.subscriptionService.getSubscriptionPlans();
  }
  
  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async getAllSubscriptions() {
    return this.subscriptionService.getAllSubscriptions();
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getUserSubscription(@Request() req) {
    return this.subscriptionService.getUserSubscription(req.user.id);
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  async createSubscription(
    @Request() req,
    @Body() data: { planId: string; paymentMethod: string },
  ) {
    return this.subscriptionService.createSubscription(
      req.user.id,
      data.planId,
      data.paymentMethod,
    );
  }

  @Post(':id/activate')
  @UseGuards(JwtAuthGuard)
  async activateSubscription(@Param('id') id: string) {
    return this.subscriptionService.activateSubscription(id);
  }
  
  @Get('payment/paypal/execute')
  async executePaypalPayment(@Query('paymentId') paymentId: string, @Query('PayerID') payerId: string) {
    return this.paymentService.executePaypalPayment(paymentId, payerId);
  }
  
  @Get('payment/cancel')
  async cancelPayment() {
    return { success: false, message: 'Pembayaran dibatalkan' };
  }
  
  @Post('billing-plan/create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async createBillingPlan(@Body() data: { plan: SubscriptionPlan, price: number, period?: 'MONTHLY' | 'YEARLY', name?: string, currency?: 'USD' | 'IDR' | string, provider?: 'PAYPAL' | 'XENDIT' | string }) {
    // Multi-currency: if creating USD with PayPal, use PayPal integration; otherwise persist locally (e.g., IDR/Xendit)
    const currency = (data.currency || 'USD').toUpperCase();
    const provider = (data.provider || (currency === 'USD' ? 'PAYPAL' : 'XENDIT')).toUpperCase();
    this.logger.log(`Create billing plan requested: provider=${provider}, currency=${currency}, plan=${data.plan}, price=${data.price}, period=${data.period || 'MONTHLY'}, name=${data.name || ''}`);
    if (currency === 'USD' && provider === 'PAYPAL') {
      try {
        return await this.paypalSubscriptionService.createBillingPlan(data.plan, data.price, data.period, data.name);
      } catch (e: any) {
        this.logger.warn(`Create PayPal billing plan failed: ${e?.message || e}`);
        throw e;
      }
    }
    // Fallback/local create for non-PayPal or non-USD (e.g., IDR/Xendit)
    return this.subscriptionService.createLocalBillingPlan({
      plan: data.plan,
      price: data.price,
      period: data.period,
      name: data.name,
      currency: currency as any,
      provider: provider as any,
    });
  }
 
  // Update Billing Plan
  @Put('billing-plan/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async updateBillingPlan(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; price?: number; currency?: string; period?: 'MONTHLY'|'YEARLY'; status?: string; plan?: SubscriptionPlan | string; provider?: any }
  ) {
    return this.subscriptionService.updateBillingPlan(id, body as any);
  }

  // Delete Billing Plan
  @Delete('billing-plan/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async deleteBillingPlan(@Param('id') id: string) {
    return this.subscriptionService.deleteBillingPlan(id);
  }
  
  @Post('billing-agreement/create')
  @UseGuards(JwtAuthGuard)
  async createBillingAgreement(
    @Request() req,
    @Body() data: { planId: string, billingPlanId: string },
  ) {
    return this.paypalSubscriptionService.createBillingAgreement(
      req.user.id,
      data.planId,
      data.billingPlanId,
    );
  }
  
  @Get('billing-agreement/execute')
  async executeBillingAgreement(
    @Query('token') token: string,
    @Query('ba_token') baToken: string,
    @Res() res: Response,
  ) {
    const frontUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const tok = token || baToken;
    if (!tok) {
      return res.redirect(`${frontUrl}/dashboard/subscription?status=error&reason=missing_token`);
    }
    try {
      const result = await this.paypalSubscriptionService.executeBillingAgreement(tok);
      if ((result as any)?.success) {
        return res.redirect(`${frontUrl}/dashboard/subscription?status=success`);
      }
      return res.redirect(`${frontUrl}/dashboard/subscription?status=error&reason=unknown`);
    } catch (e: any) {
      const reason = encodeURIComponent(e?.message || 'internal_error');
      return res.redirect(`${frontUrl}/dashboard/subscription?status=error&reason=${reason}`);
    }
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelSubscription(@Param('id') id: string, @Request() req) {
    return this.subscriptionService.cancelSubscription(id, req.user.id);
  }

  @Post('payment/verify')
  async verifyPayment(
    @Body() data: { paymentId: string; transactionId: string },
  ) {
    const payment = await this.paymentService.verifyPayment(
      data.paymentId,
      data.transactionId,
    );

    // If payment is for a subscription, activate the subscription
    if (payment.status === PaymentStatus.PAID) {
      const subscription = await this.subscriptionService['prisma'].subscription.findFirst({
        where: { userId: payment.userId },
      });

      if (subscription) {
        await this.subscriptionService.activateSubscription(subscription.id);
      }
    }

    return { success: true };
  }

  @Get('payment/:id')
  @UseGuards(JwtAuthGuard)
  async getPayment(@Param('id') id: string) {
    return this.paymentService.getPaymentById(id);
  }


  @Get('payments')
  @UseGuards(JwtAuthGuard)
  async getUserPayments(@Request() req) {
    return this.paymentService.getUserPayments(req.user.id);
  }

  @Post('payment/checkout')
  @UseGuards(JwtAuthGuard)
  async unifiedCheckout(
    @Request() req,
    @Body() body: {
      type: 'subscription' | 'one_time';
      plan?: any;
      price?: number;
      currency?: 'IDR' | 'USD';
      provider?: 'xendit' | 'paypal';
      billingPlanId?: string;
      description?: string;
    },
  ) {
    return this.paymentGateway.checkout({
      userId: req.user.id,
      ...body,
    });
  }

  @Post('trial/start')
  @UseGuards(JwtAuthGuard)
  async startTrial(@Request() req) {
    return this.subscriptionService.startTrialForEligibleUser(req.user.id, req.user.role);
  }

  // Admin trigger for H-1 trial expiry notifications (can be scheduled externally)
  @Post('trial/notify-expiring')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async notifyExpiringTrials() {
    return this.subscriptionService.notifyTrialsExpiringHMinus1();
  }

  // Admin trigger for H-1 enterprise custom expiry notifications
  @Post('enterprise/notify-expiring')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async notifyEnterpriseExpiring() {
    return this.subscriptionService.notifyEnterpriseCustomExpiringHMinus1();
  }

  @Get('check-access/:tier')
  @UseGuards(JwtAuthGuard)
  async checkAccess(
    @Request() req,
    @Param('tier') tier: SubscriptionPlan,
  ) {
    const hasAccess = await this.subscriptionService.checkSubscriptionAccess(
      req.user.id,
      tier,
    );
    return { hasAccess };
  }

  // Enterprise Label endpoints
  @Get('enterprise/labels')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async getEnterpriseLabels() {
    return this.subscriptionService.getEnterpriseLabels();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('enterprise/label')
  async createEnterpriseLabel(@Body() body: { name: string; description?: string; ownerUserId?: string; }) {
    return this.subscriptionService.createEnterpriseLabel(body);
  }

  // Update Enterprise Label
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Put('enterprise/labels/:id')
  async updateEnterpriseLabel(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string }
  ) {
    return this.subscriptionService.updateEnterpriseLabel(id, body);
  }

  // Delete Enterprise Label
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Delete('enterprise/labels/:id')
  async deleteEnterpriseLabel(@Param('id') id: string) {
    return this.subscriptionService.deleteEnterpriseLabel(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('enterprise/label/investors/bulk-create')
  async bulkCreateInvestors(@Body() body: { labelId: string; investors: Array<{ email: string; fullName?: string; password?: string }>; defaultPassword?: string; requireUniqueEmail?: boolean; }) {
    return this.subscriptionService.bulkCreateInvestorsForLabel(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('enterprise/label/investors/bulk-subscribe')
  async bulkSubscribeInvestors(@Body() body: { labelId: string; userIds: string[]; price: number; currency?: string; autoActivate?: boolean; period?: 'MONTHLY' | 'YEARLY'; }) {
    return this.subscriptionService.bulkSubscribeInvestorsForLabel(body);
  }

  // Organization-level invoice for Enterprise Custom (single invoice for many users)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('enterprise/label/org-invoice')
  async createOrgInvoice(
    @Request() req,
    @Body() body: { 
      labelId: string; 
      userIds: string[]; 
      pricePerUser?: number; 
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
    }
  ) {
    return this.subscriptionService.createOrgInvoiceForLabel({
      adminUserId: req.user.id,
      labelId: body.labelId,
      userIds: body.userIds,
      pricePerUser: (body.pricePerUser ?? 0),
      totalAmount: body.totalAmount,
      currency: body.currency,
      period: body.period,
      provider: body.provider,
      description: body.description,
      invoiceNumber: body.invoiceNumber,
      referenceNumber: body.referenceNumber,
      bankName: body.bankName,
      paidBy: body.paidBy,
      notes: body.notes,
      awaitingApproval: body.awaitingApproval,
      additionalSeats: body.additionalSeats,
    });
  }

  // Renewal based on previous org invoice (re-use same label + userIds)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('enterprise/label/org-invoice/renew')
  async renewOrgInvoice(
    @Request() req,
    @Body() body: {
      previousPaymentId: string;
      period?: 'MONTHLY' | 'YEARLY';
      currency?: string;
      // choose either totalAmount or pricePerUser for renewal
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
    }
  ) {
    return this.subscriptionService.createOrgInvoiceRenewalFromPayment({
      adminUserId: req.user.id,
      previousPaymentId: body.previousPaymentId,
      period: body.period,
      currency: body.currency,
      totalAmount: body.totalAmount,
      pricePerUser: body.pricePerUser,
      provider: body.provider,
      description: body.description,
      invoiceNumber: body.invoiceNumber,
      referenceNumber: body.referenceNumber,
      bankName: body.bankName,
      paidBy: body.paidBy,
      notes: body.notes,
      awaitingApproval: body.awaitingApproval,
    });
  }

  // Xendit webhook receiver (minimal). On ORG_INVOICE paid, activate all users from metadata
  @Post('payment/xendit/webhook')
  async xenditWebhook(@Body() payload: any) {
    const event = payload?.event || payload?.event_type || payload?.type;
    const data = payload?.data || payload;
    await this.paymentService.handleXenditWebhook(event, data);

    // After status update, if this invoice is for ORG_INVOICE, trigger activation
    if ((event === 'invoice.paid') && data?.id) {
      const payment = await this.subscriptionService['prisma'].payment.findFirst({ where: { externalId: data.id } });
      if (payment && payment.status === 'PAID') {
        const meta: any = payment.metadata || {};
        if (meta.mode === 'ORG_INVOICE' && Array.isArray(meta.userIds) && meta.labelId) {
          await this.subscriptionService.activateBulkFromOrgInvoice({
            labelId: meta.labelId,
            userIds: meta.userIds,
            pricePerUser: meta.pricePerUser || 0,
            currency: meta.currency || 'IDR',
            period: meta.period || 'MONTHLY',
          });
        }
      }
    }
    return { success: true };
  }

  // Approve manual organization invoice -> mark PAID and activate subscriptions
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('enterprise/label/manual/approve')
  async approveManualOrg(@Body() body: { paymentId: string }) {
    return this.subscriptionService.approveManualOrgPayment(body.paymentId);
  }

  // Fail manual organization invoice -> mark FAILED and optionally expire subscriptions
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('enterprise/label/manual/fail')
  async failManualOrg(@Body() body: { paymentId: string; reason?: string; expireSubscriptions?: boolean }) {
    return this.subscriptionService.failManualOrgPayment(body);
  }

  // Admin list payments (ORG_INVOICE focus) with filters
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get('payments/admin')
  async listAdminPayments(
    @Query('labelId') labelId?: string,
    @Query('status') status?: string,
    @Query('provider') provider?: string,
    @Query('mode') mode?: string,
    @Query('limit') limit: string = '50',
  ) {
    const take = Math.min(parseInt(limit || '50', 10) || 50, 200);
    const where: any = {};
    if (labelId) where.labelId = labelId;
    // Status filter: support enum statuses; "AWAITING_APPROVAL" maps to metadata.awaitingApproval=true
    if (status) {
      if (status === 'AWAITING_APPROVAL') {
        where.metadata = { path: ['awaitingApproval'], equals: true } as any;
      } else {
        where.status = status as any;
      }
    }
    // Provider filter: only apply for known enum values
    if (provider) {
      const p = provider.toUpperCase();
      if (p === 'XENDIT' || p === 'PAYPAL') {
        where.provider = p as any;
      }
      // ignore 'manual' because it may not be a Prisma enum; rely on mode/metadata filters instead
    }
    if (mode) where.metadata = { path: ['mode'], equals: mode } as any;

    // Default to ORG_INVOICE only if mode not provided
    if (!mode) {
      where.AND = [
        { metadata: { path: ['mode'], equals: 'ORG_INVOICE' } as any },
      ];
    }

    const payments = await this.subscriptionService['prisma'].payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        userId: true,
        labelId: true,
        label: { select: { id: true, name: true } },
        amount: true,
        currency: true,
        provider: true,
        status: true,
        invoiceNumber: true,
        description: true,
        createdAt: true,
        paidAt: true,
        metadata: true,
      }
    });
    return { items: payments };
  }

  // Invoice HTML for ORG_INVOICE payments
  @Get('payment/:id/invoice/html')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async getInvoiceHtml(@Param('id') id: string, @Res() res: Response) {
    const { html, filename } = await this.subscriptionService.buildInvoiceHtml(id);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(html);
  }

  // Invoice PDF stream for ORG_INVOICE payments
  @Get('payment/:id/invoice/pdf')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async getInvoicePdf(@Param('id') id: string, @Res() res: Response) {
    await this.subscriptionService.streamInvoicePdf(res, id);
  }

  // Delete payment (SUPER_ADMIN only)
  @Delete('payment/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async deletePayment(@Param('id') id: string) {
    return this.subscriptionService.deletePayment(id);
  }
}