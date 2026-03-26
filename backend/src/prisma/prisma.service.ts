import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.connectWithRetry();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async connectWithRetry(retries = 10, baseDelayMs = 2000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.$connect();
        return;
      } catch (err) {
        if (attempt === retries) throw err;
        const delay = baseDelayMs * Math.min(6, attempt);
        console.warn(`Prisma connect failed (attempt ${attempt}/${retries}). Retrying in ${delay}ms.`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
}