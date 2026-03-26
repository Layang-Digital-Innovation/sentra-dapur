import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { InvestmentModule } from './investment/investment.module';
import { TradingModule } from './trading/trading.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { UploadModule } from './upload/upload.module';
import { NotificationModule } from './notification/notification.module';
import { FinancialReportsModule } from './financial-reports/financial-reports.module';
import { ChatModule } from './chat/chat.module';
import { SettingsModule } from './settings/settings.module';
import { DapurModule } from './dapur/dapur.module';
import { ProduksiModule } from './produksi/produksi.module';
import { MicroInvestmentModule } from './micro-investment/micro-investment.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // Serve static files for uploaded assets (images, pdfs)
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    DashboardModule,
    InvestmentModule,
    TradingModule,
    SubscriptionModule,
    UploadModule,
    NotificationModule,
    FinancialReportsModule,
    ChatModule,
    SettingsModule,
    DapurModule,
    ProduksiModule,
    MicroInvestmentModule,
  ],
})
export class AppModule {}