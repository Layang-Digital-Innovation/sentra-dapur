import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { PaymentService } from './payment.service';
import { PaypalConfigService } from './paypal.config';
import { PaypalSubscriptionService } from './paypal-subscription.service';
import { XenditSubscriptionService } from './xendit-subscription.service';
import { PaymentGatewayService } from './payment-gateway.service';
import { SubscriptionScheduler } from './subscription.scheduler';

@Module({
  imports: [SettingsModule],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, PaymentService, PaypalConfigService, PaypalSubscriptionService, XenditSubscriptionService, PaymentGatewayService, SubscriptionScheduler],
  exports: [SubscriptionService, PaymentService, PaypalSubscriptionService, XenditSubscriptionService, PaymentGatewayService],
})
export class SubscriptionModule {}