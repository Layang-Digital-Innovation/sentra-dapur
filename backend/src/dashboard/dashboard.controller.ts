import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getDashboardData(@Request() req) {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    if (userRole === 'INVESTOR') {
      return this.dashboardService.getInvestorDashboard(userId);
    } else if (userRole === 'PROJECT_OWNER') {
      return this.dashboardService.getProjectOwnerDashboard(userId);
    } else if (userRole === 'SUPER_ADMIN') {
      return this.dashboardService.getAdminDashboard();
    } else {
      // Regular ADMIN gets limited dashboard
      return this.dashboardService.getAdminDashboard();
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('summary')
  async getSummary(@Request() req) {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    if (userRole === 'INVESTOR') {
      return this.dashboardService.getInvestorSummary(userId);
    } else if (userRole === 'PROJECT_OWNER') {
      return this.dashboardService.getProjectOwnerSummary(userId);
    } else if (userRole === 'SUPER_ADMIN') {
      return this.dashboardService.getAdminSummary();
    } else {
      // Regular ADMIN gets limited summary
      return this.dashboardService.getAdminSummary();
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  async getStats(@Request() req) {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    if (userRole === 'INVESTOR') {
      return this.dashboardService.getInvestorStats(userId);
    } else if (userRole === 'PROJECT_OWNER') {
      return this.dashboardService.getProjectOwnerStats(userId);
    } else if (userRole === 'SUPER_ADMIN') {
      return this.dashboardService.getAdminStats();
    } else {
      // Regular ADMIN gets limited stats
      return this.dashboardService.getAdminStats();
    }
  }

  // SUPER_ADMIN only endpoints for advanced analytics
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Get('analytics/users')
  async getUserAnalytics() {
    return this.dashboardService.getUserAnalytics();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Get('analytics/subscriptions')
  async getSubscriptionAnalytics(@Query('currency') currency?: string) {
    const c = currency === 'IDR' || currency === 'USD' ? (currency as 'IDR' | 'USD') : undefined;
    return this.dashboardService.getSubscriptionAnalytics(c);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Get('analytics/revenue')
  async getRevenueAnalytics() {
    return this.dashboardService.getRevenueAnalytics();
  }
}