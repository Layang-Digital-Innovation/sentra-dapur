import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { MicroInvestmentService } from './micro-investment.service';

@Controller('investor')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MicroInvestmentController {
  constructor(private readonly microInvestmentService: MicroInvestmentService) {}

  // ============================================
  // INVESTOR UTAMA ENDPOINTS
  // ============================================

  @Post('setup-micro')
  @Roles(Role.INVESTOR)
  async setupMicro(@Req() req, @Body() body: { userId: string, dapurUnitId: string, internalSharePct: number }) {
    return this.microInvestmentService.setupMicroInvestor(req.user.id, body.dapurUnitId, body);
  }

  @Get('my-micros')
  @Roles(Role.INVESTOR)
  async getMyMicros(@Req() req) {
    return this.microInvestmentService.getMyMicroInvestors(req.user.id);
  }

  // ============================================
  // MICRO-INVESTOR ENDPOINTS
  // ============================================

  @Get('wallet')
  @Roles(Role.MICRO_INVESTOR, Role.INVESTOR) // Investor might also be micro-investor of another investor
  async getWallet(@Req() req) {
    return this.microInvestmentService.getWallet(req.user.id);
  }

  @Get('dividend-logs')
  @Roles(Role.MICRO_INVESTOR, Role.INVESTOR)
  async getDividendLogs(@Req() req) {
    return this.microInvestmentService.getDividendLogs(req.user.id);
  }
}
