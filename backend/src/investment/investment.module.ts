import { Module } from '@nestjs/common';
import { InvestmentController } from './investment.controller';
import { InvestmentService } from './investment.service';
import { InvestmentHistoryController } from './investment-history.controller';
import { InvestmentHistoryService } from './investment-history.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [InvestmentController, InvestmentHistoryController],
  providers: [InvestmentService, InvestmentHistoryService],
  exports: [InvestmentService, InvestmentHistoryService],
})
export class InvestmentModule {}