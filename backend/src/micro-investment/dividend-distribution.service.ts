import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DividendDistributionService {
  private readonly logger = new Logger(DividendDistributionService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Picu distribusi dividen ke micro-investor berdasarkan profit yang diterima Investor Utama.
   * Dipanggil saat laporan keuangan divalidasi atau bagi hasil utama cair.
   */
  async distributeDividends(dapurUnitId: string, primaryInvestorId: string, totalProfitAmount: number, reportId?: string) {
    this.logger.log(`Distributing dividends for Dapur ${dapurUnitId}, Parent: ${primaryInvestorId}, Amount: ${totalProfitAmount}`);

    // 1. Cari semua Micro-Investor di bawah Investor Utama ini untuk unit dapur ini
    const micros = await this.prisma.microInvestor.findMany({
      where: {
        parentInvestorId: primaryInvestorId,
        dapurUnitId: dapurUnitId,
        isActive: true,
      },
    });

    if (micros.length === 0) {
      this.logger.log('No micro-investors found for this parent in this unit.');
      return;
    }

    // 2. Gunakan transaksi database untuk menjamin atomisitas
    return await this.prisma.$transaction(async (tx) => {
      for (const micro of micros) {
        // Hitung jatah berdasarkan % internal
        const amount = (micro.internalSharePct / 100) * totalProfitAmount;

        if (amount <= 0) continue;

        // A. Catat log dividen
        await tx.microDividend.create({
          data: {
            userId: micro.userId,
            financialReportId: reportId,
            amount,
            type: 'MICRO',
          },
        });

        // B. Update saldo Wallet Micro-Investor
        await tx.investorWallet.upsert({
          where: { userId: micro.userId },
          update: { balance: { increment: amount } },
          create: { userId: micro.userId, balance: amount },
        });

        this.logger.debug(`Distributed ${amount} to micro-investor ${micro.userId}`);
      }
    });
  }
}
