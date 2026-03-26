import { Controller, Get, Param, Query, Request, UseGuards } from '@nestjs/common';
import { InvestmentHistoryService } from './investment-history.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequireProjectAccess } from '../auth/decorators/investor-project-access.decorator';
import { Role } from '@prisma/client';

@Controller('investment-history')
@UseGuards(JwtAuthGuard)
export class InvestmentHistoryController {
  constructor(private readonly investmentHistoryService: InvestmentHistoryService) {}

  // Get investment history for current investor
  @Get('my-investments')
  @UseGuards(RolesGuard)
  @Roles(Role.INVESTOR)
  async getMyInvestmentHistory(@Request() req) {
    return this.investmentHistoryService.getInvestorHistory(req.user.id);
  }

  // Get profit sharing history for current investor
  @Get('my-dividends')
  @UseGuards(RolesGuard)
  @Roles(Role.INVESTOR)
  async getMyProfitSharing(@Request() req, @Query('projectId') projectId?: string) {
    return this.investmentHistoryService.getInvestorProfitSharing(req.user.id, projectId);
  }

  // Get investment summary for current investor
  @Get('my-summary')
  @UseGuards(RolesGuard)
  @Roles(Role.INVESTOR)
  async getMyInvestmentSummary(@Request() req) {
    return this.investmentHistoryService.getInvestorSummary(req.user.id);
  }

  // Get project investment analytics for project owner
  @Get('project/:projectId/analytics')
  @RequireProjectAccess()
  @Roles(Role.PROJECT_OWNER, Role.ADMIN, Role.SUPER_ADMIN)
  async getProjectAnalytics(@Param('projectId') projectId: string, @Request() req) {
    return this.investmentHistoryService.getProjectInvestmentAnalytics(projectId, req.user.id);
  }

  // Get specific investor's history (admin only)
  @Get('investor/:investorId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async getInvestorHistory(@Param('investorId') investorId: string) {
    return this.investmentHistoryService.getInvestorHistory(investorId);
  }

  // Get specific investor's profit sharing (admin only)
  @Get('investor/:investorId/dividends')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async getInvestorProfitSharing(
    @Param('investorId') investorId: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.investmentHistoryService.getInvestorProfitSharing(investorId, projectId);
  }

  // Get all investment activities (admin only)
  @Get('all-activities')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async getAllInvestmentActivities(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.investmentHistoryService.getAllInvestmentActivities(
      parseInt(page),
      parseInt(limit),
    );
  }
}