import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class MicroInvestmentService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // MANAJEMEN MICRO-INVESTOR (Oleh INVESTOR UTAMA)
  // ============================================
  
  async setupMicroInvestor(parentId: string, dapurUnitId: string, data: { userId: string, internalSharePct: number }) {
    // 1. Verifikasi Dapur Unit & Stake Parent
    const stake = await this.prisma.dapurInvestor.findUnique({
      where: {
        dapurUnitId_investorId: {
          dapurUnitId,
          investorId: parentId,
        },
      },
    });

    if (!stake) {
      throw new ForbiddenException('You have no primary stake in this Dapur Unit.');
    }

    // 2. Verifikasi user yang didaftarkan ada & bukan parent-nya sendiri
    if (parentId === data.userId) throw new BadRequestException('Cannot set yourself as micro-investor.');
    
    const user = await this.prisma.user.findUnique({ where: { id: data.userId } });
    if (!user) throw new NotFoundException('Micro-Investor User not found.');

    // 3. Upsert Micro Investor
    const micro = await this.prisma.microInvestor.upsert({
      where: { userId: data.userId },
      update: {
        parentInvestorId: parentId,
        dapurUnitId,
        internalSharePct: data.internalSharePct,
        isActive: true,
      },
      create: {
        userId: data.userId,
        parentInvestorId: parentId,
        dapurUnitId,
        internalSharePct: data.internalSharePct,
      },
    });

    // 4. Pastikan user tersebut role-nya MICRO_INVESTOR
    if (user.role !== Role.MICRO_INVESTOR) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { role: Role.MICRO_INVESTOR }
      });
    }

    return micro;
  }

  async getMyMicroInvestors(parentId: string) {
    return this.prisma.microInvestor.findMany({
      where: { parentInvestorId: parentId },
      include: {
        user: { select: { fullname: true, email: true, whatsapp: true } },
        dapurUnit: { select: { name: true } },
      },
    });
  }

  // ============================================
  // WALLET & LOGS (Oleh MICRO-INVESTOR)
  // ============================================

  async getWallet(userId: string) {
    const wallet = await this.prisma.investorWallet.findUnique({
      where: { userId },
    });
    
    if (!wallet) {
      return this.prisma.investorWallet.create({
        data: { userId, balance: 0 },
      });
    }
    return wallet;
  }

  async getDividendLogs(userId: string) {
    return this.prisma.microDividend.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
