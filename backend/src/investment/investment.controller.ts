import { Controller, Get, Post, Body, Param, UseGuards, Request, Put, Query, Patch, Res, StreamableFile } from '@nestjs/common';
import { InvestmentService } from './investment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectStatus, ReportType, InvestmentStatus } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequireProjectAccess } from '../auth/decorators/investor-project-access.decorator';
import { Response } from 'express';
import { createReadStream } from 'fs';
import { join } from 'path';

@Controller('investment')
export class InvestmentController {
  constructor(private readonly investmentService: InvestmentService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PROJECT_OWNER')
  @Post('projects')
  async createProject(
    @Request() req,
    @Body() data: { 
      title: string; 
      description: string;
      targetAmount?: number;
      deadline?: Date | string;
      bankAccount?: string;
      bankName?: string;
      accountHolder?: string;
      profitSharingPercentage?: number;
      profitSharingPercentageAfterBEP?: number;
      minInvestment?: number;
      prospectusUrl?: string;
      prospectusFileName?: string;
    }
  ) {
    return this.investmentService.createProject(req.user.id, data);
  }

  @Get('projects')
  async getProjects(@Query('status') status?: ProjectStatus) {
    return this.investmentService.getProjects({ status });
  }

  @Get('projects/:id')
  async getProjectById(@Param('id') id: string) {
    return this.investmentService.getProjectById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INVESTOR')
  @Post('projects/:id/invest')
  async investInProject(
    @Request() req,
    @Param('id') projectId: string,
    @Body() data: { amount: number }
  ) {
    return this.investmentService.investInProject(req.user.id, projectId, data.amount);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ADMIN_INVESTMENT')
  @Put('projects/:id/status')
  async updateProjectStatus(
    @Param('id') projectId: string,
    @Body() data: { status: ProjectStatus }
  ) {
    return this.investmentService.updateProjectStatus(projectId, data.status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PROJECT_OWNER')
  @Post('projects/:id/dividends')
  async distributeDividend(
    @Param('id') projectId: string,
    @Body() data: { amount: number; date: Date; afterBEP?: boolean }
  ) {
    return this.investmentService.distributeDividend(projectId, data);
  }

  // PROJECT OWNER ENDPOINTS
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PROJECT_OWNER')
  @Get('my-projects')
  async getMyProjects(@Request() req) {
    return this.investmentService.getProjectsByOwner(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PROJECT_OWNER')
  @Patch('projects/:id')
  async updateProject(
    @Request() req,
    @Param('id') projectId: string,
    @Body() data: {
      title?: string;
      description?: string;
      targetAmount?: number;
      deadline?: Date;
      minInvestment?: number;
      profitSharingPercentage?: number;
      profitSharingPercentageAfterBEP?: number;
      prospectusUrl?: string;
      prospectusFileName?: string;
      bankName?: string;
      bankAccount?: string;
      accountHolder?: string;
      progress?: number;
    }
  ) {
    return this.investmentService.updateProject(projectId, req.user.id, data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PROJECT_OWNER')
  @Patch('projects/:id/bank-account')
  async updateBankAccount(
    @Request() req,
    @Param('id') projectId: string,
    @Body() data: {
      bankAccount: string;
      bankName: string;
      accountHolder: string;
    }
  ) {
    return this.investmentService.updateBankAccount(projectId, req.user.id, data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PROJECT_OWNER')
  @Post('projects/:id/reports')
  async addFinancialReport(
    @Request() req,
    @Param('id') projectId: string,
    @Body() data: {
      type: ReportType;
      fileUrl: string;
      month?: number;
      year?: number;
    }
  ) {
    return this.investmentService.addFinancialReport(projectId, req.user.id, data);
  }

  // INVESTOR ENDPOINTS
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INVESTOR')
  @Get('portfolio')
  async getPortfolio(@Request() req) {
    return this.investmentService.getInvestorPortfolio(req.user.id);
  }

  // Dapur Portfolio: data investasi investor per DapurUnit (ditautkan oleh admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INVESTOR')
  @Get('dapur-portfolio')
  async getDapurPortfolio(@Request() req) {
    return this.investmentService.getDapurPortfolio(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INVESTOR')
  @Get('investment-history')
  async getInvestmentHistory(@Request() req) {
    return this.investmentService.getInvestmentHistory(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INVESTOR')
  @Get('dividend-history')
  async getDividendHistory(@Request() req) {
    return this.investmentService.getDividendHistory(req.user.id);
  }

  // ADMIN ENDPOINTS
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ADMIN_INVESTMENT', 'SUPER_ADMIN')
  @Get('admin/projects')
  async getAllProjectsForAdmin() {
    return this.investmentService.getAllProjectsForAdmin();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ADMIN_INVESTMENT', 'SUPER_ADMIN')
  @Get('admin/statistics')
  async getProjectStatistics() {
    return this.investmentService.getProjectStatistics();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ADMIN_INVESTMENT', 'SUPER_ADMIN')
  @Get('admin/all')
  async getAllInvestmentsForAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.investmentService.getAllInvestmentsForAdmin(pageNum, limitNum, status as any);
  }

  // NEW INVESTMENT WORKFLOW ENDPOINTS

  // Create investment request (after chat with admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INVESTOR')
  @Post('request')
  async createInvestmentRequest(
    @Request() req,
    @Body() data: { projectId: string; chatId: string }
  ) {
    return this.investmentService.createInvestmentRequest(req.user.id, data.projectId, data.chatId);
  }

  // Get project details for investor (including bank details)
  @RequireProjectAccess()
  @Roles('INVESTOR')
  @Get('projects/:id/details')
  async getProjectDetailsForInvestor(
    @Request() req,
    @Param('id') projectId: string
  ) {
    return this.investmentService.getProjectDetailsForInvestor(req.user.id, projectId);
  }



  // Admin approve investment
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ADMIN_INVESTMENT', 'SUPER_ADMIN')
  @Post(':id/approve')
  async approveInvestment(
    @Request() req,
    @Param('id') investmentId: string,
    @Body() data?: { amount?: number }
  ) {
    return this.investmentService.approveInvestment(req.user.id, investmentId, data);
  }

  // Admin reject investment
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ADMIN_INVESTMENT', 'SUPER_ADMIN')
  @Post(':id/reject')
  async rejectInvestment(
    @Request() req,
    @Param('id') investmentId: string,
    @Body() data: { rejectedReason: string }
  ) {
    return this.investmentService.rejectInvestment(req.user.id, investmentId, data);
  }

  // Get pending investments for admin review
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ADMIN_INVESTMENT', 'SUPER_ADMIN')
  @Get('admin/pending')
  async getPendingInvestments() {
    return this.investmentService.getPendingInvestments();
  }
  
  // Get pending projects count for admin badge
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ADMIN_INVESTMENT', 'SUPER_ADMIN')
  @Get('admin/pending-projects-count')
  async getPendingProjectsCount() {
    return this.investmentService.getPendingProjectsCount();
  }

  // Get investor's approved projects
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INVESTOR')
  @Get('my-approved-projects')
  async getMyApprovedProjects(@Request() req) {
    return this.investmentService.getInvestorApprovedProjects(req.user.id);
  }

  // Get investment details by ID
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getInvestmentById(
    @Request() req,
    @Param('id') investmentId: string
  ) {
    return this.investmentService.getInvestmentById(investmentId, req.user.id, req.user.role);
  }

  // Get project investments (for project owner)
  @RequireProjectAccess()
  @Roles('PROJECT_OWNER', 'ADMIN', 'SUPER_ADMIN')
  @Get('projects/:id/investments')
  async getProjectInvestments(
    @Request() req,
    @Param('id') projectId: string
  ) {
    return this.investmentService.getProjectInvestments(projectId, req.user.id);
  }

  // Preview prospectus file (inline viewing)
  @Get('projects/:id/prospectus/preview')
  async previewProspectus(@Param('id') projectId: string, @Res({ passthrough: true }) res: Response) {
    const prospectusInfo = await this.investmentService.getProspectusInfo(projectId);
    
    if (!prospectusInfo.prospectusUrl) {
      throw new Error('Prospectus file not found');
    }

    // Extract filename from URL
    const filename = prospectusInfo.prospectusUrl.split('/').pop();
    const filePath = join(__dirname, '..', '..', '..', 'uploads', 'prospectus', filename);
    
    const file = createReadStream(filePath);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline', // This allows inline viewing instead of download
    });

    return new StreamableFile(file);
  }

  // Download prospectus file
  @Get('projects/:id/prospectus')
  async downloadProspectus(@Param('id') projectId: string, @Res({ passthrough: true }) res: Response) {
    const prospectusInfo = await this.investmentService.getProspectusInfo(projectId);
    
    if (!prospectusInfo.prospectusUrl) {
      throw new Error('Prospectus file not found');
    }

    // Extract filename from URL
    const filename = prospectusInfo.prospectusUrl.split('/').pop();
    const filePath = join(__dirname, '..', '..', '..', 'uploads', 'prospectus', filename);
    
    const file = createReadStream(filePath);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${prospectusInfo.prospectusFileName || 'prospektus.pdf'}"`,
    });

    return new StreamableFile(file);
  }
}