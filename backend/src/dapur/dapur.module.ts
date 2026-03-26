import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DapurService } from './dapur.service';
import { DapurController } from './dapur.controller';

@Module({
  imports: [PrismaModule],
  providers: [DapurService],
  controllers: [DapurController]
})
export class DapurModule {}
