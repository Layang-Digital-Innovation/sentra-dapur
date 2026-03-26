import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface PlatformBankSettingsDto {
  bankName?: string | null;
  accountName?: string | null;
  accountNumber?: string | null;
  instruction?: string | null;
}

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getPlatformBankSettings() {
    const rec = await this.prisma.platformSettings.findUnique({ where: { id: 'platform_settings' } });
    return rec || { id: 'platform_settings', bankName: null, accountName: null, accountNumber: null, instruction: null };
  }

  async upsertPlatformBankSettings(data: PlatformBankSettingsDto, updatedByUserId?: string) {
    const now = new Date();
    const payload = {
      bankName: data.bankName ?? null,
      accountName: data.accountName ?? null,
      accountNumber: data.accountNumber ?? null,
      instruction: data.instruction ?? null,
      updatedByUserId: updatedByUserId || null,
      updatedAt: now,
    } as any;
    const res = await this.prisma.platformSettings.upsert({
      where: { id: 'platform_settings' },
      update: payload,
      create: { id: 'platform_settings', ...payload, createdAt: now },
    });
    return res;
  }
}
