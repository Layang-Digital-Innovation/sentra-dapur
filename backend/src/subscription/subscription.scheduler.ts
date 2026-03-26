import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class SubscriptionScheduler {
  private readonly logger = new Logger(SubscriptionScheduler.name);

  constructor(private readonly subscriptionService: SubscriptionService) {}

  // Runs every day at 09:00 server time. Adjust as needed.
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleTrialExpiryHMinus1Notifications() {
    try {
      this.logger.log('Running daily job: notifyTrialsExpiringHMinus1');
      const result = await this.subscriptionService.notifyTrialsExpiringHMinus1();
      this.logger.log(`Trial expiry notifications job result: ${JSON.stringify(result)}`);
    } catch (e: any) {
      this.logger.error(`notifyTrialsExpiringHMinus1 failed: ${e?.message}`, e?.stack);
    }
  }

  // Auto-expire past-due subscriptions daily at 00:10 server time
  @Cron('10 0 * * *')
  async handleAutoExpirePastDue() {
    try {
      this.logger.log('Running daily job: expirePastDueSubscriptions');
      const result = await this.subscriptionService.expirePastDueSubscriptions();
      this.logger.log(`Auto-expire job result: ${JSON.stringify(result)}`);
    } catch (e: any) {
      this.logger.error(`expirePastDueSubscriptions failed: ${e?.message}`, e?.stack);
    }
  }

  // Runs every day at 09:15 server time to notify Enterprise Custom expiries H-1
  @Cron('15 9 * * *')
  async handleEnterpriseExpiryHMinus1Notifications() {
    try {
      this.logger.log('Running daily job: notifyEnterpriseCustomExpiringHMinus1');
      const result = await this.subscriptionService.notifyEnterpriseCustomExpiringHMinus1();
      this.logger.log(`Enterprise expiry notifications job result: ${JSON.stringify(result)}`);
    } catch (e: any) {
      this.logger.error(`notifyEnterpriseCustomExpiringHMinus1 failed: ${e?.message}`, e?.stack);
    }
  }
}
