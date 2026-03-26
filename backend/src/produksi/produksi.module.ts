import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProduksiService } from './produksi.service';
import { ProduksiController } from './produksi.controller';

@Module({
  imports: [PrismaModule],
  providers: [ProduksiService],
  controllers: [ProduksiController],
  exports: [ProduksiService],
})
export class ProduksiModule {}
