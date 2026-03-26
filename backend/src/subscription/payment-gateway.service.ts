import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionPlan } from '@prisma/client';
import { XenditSubscriptionService } from './xendit-subscription.service';
import { PaypalSubscriptionService } from './paypal-subscription.service';
import { PaymentService } from './payment.service';

interface CheckoutInput {
  userId: string;
  type: 'subscription' | 'one_time';
  plan?: SubscriptionPlan; // required for subscription (unless enterprise custom handled separately)
  price?: number; // required for enterprise custom or one_time
  currency?: 'IDR' | 'USD';
  provider?: 'xendit' | 'paypal';
  billingPlanId?: string; // required for PayPal subscription path
  description?: string; // optional for one_time
}

@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);

  constructor(
    private prisma: PrismaService,
    private xenditSubscription: XenditSubscriptionService,
    private paypalSubscription: PaypalSubscriptionService,
    private paymentService: PaymentService,
  ) {}

  async checkout(input: CheckoutInput) {
    const currency = input.currency || 'IDR';
    const preferPaypal = input.provider === 'paypal' || currency === 'USD';

    if (input.type === 'subscription') {
      // Enterprise custom if plan is ENTERPRISE_CUSTOM must include price
      if (input.plan === 'ENTERPRISE_CUSTOM' as SubscriptionPlan) {
        if (!input.price || input.price <= 0) {
          throw new BadRequestException('price is required for ENTERPRISE_CUSTOM');
        }
        // Use Xendit as primary for enterprise custom (or PayPal if forced)
        if (preferPaypal) {
          if (!input.billingPlanId) {
            throw new BadRequestException('billingPlanId is required for PayPal subscription');
          }
          return this.paypalSubscription.createBillingAgreement(input.userId, input.plan!, input.billingPlanId);
        }
        return this.xenditSubscription.createSubscriptionPlan({
          userId: input.userId,
          plan: input.plan!,
          price: input.price,
          currency,
        });
      }

      // Normal GOLD_* subscription requires plan and price
      if (!input.plan) {
        throw new BadRequestException('plan is required for subscription');
      }
      if (preferPaypal) {
        if (!input.billingPlanId) {
          throw new BadRequestException('billingPlanId is required for PayPal subscription');
        }
        return this.paypalSubscription.createBillingAgreement(input.userId, input.plan, input.billingPlanId);
      }

      if (!input.price || input.price <= 0) {
        throw new BadRequestException('price is required for subscription checkout');
      }
      return this.xenditSubscription.createSubscriptionPlan({
        userId: input.userId,
        plan: input.plan,
        price: input.price,
        currency,
      });
    }

    // one_time payments
    if (!input.price || input.price <= 0) {
      throw new BadRequestException('price is required for one_time checkout');
    }
    const method = preferPaypal ? 'paypal' : 'xendit';
    return this.paymentService.createPayment({
      userId: input.userId,
      amount: input.price,
      description: input.description || 'One-time payment',
      paymentMethod: method,
      currency,
    });
  }
}
