import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MicroInvestmentService } from './micro-investment.service';
import { DividendDistributionService } from './dividend-distribution.service';
import { MicroInvestmentController } from './micro-investment.controller';

@Module({
  imports: [PrismaModule],
  controllers: [MicroInvestmentController],
  providers: [MicroInvestmentService, DividendDistributionService],
  exports: [MicroInvestmentService, DividendDistributionService],
})
export class MicroInvestmentModule {}
