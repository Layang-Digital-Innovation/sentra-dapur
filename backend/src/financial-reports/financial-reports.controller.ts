import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FinancialReportsService, CreateFinancialReportDto } from './financial-reports.service';

@Controller('financial-reports')
@UseGuards(JwtAuthGuard)
export class FinancialReportsController {
  constructor(private readonly financialReportsService: FinancialReportsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createFinancialReport(
    @Request() req,
    @Body() createReportDto: CreateFinancialReportDto,
  ) {
    console.log('Financial reports endpoint reached');
    console.log('Request user:', req.user);
    console.log('Request body:', createReportDto);
    
    // Fix: Use req.user.id instead of req.user.userId
    const userId = req.user.id || req.user.sub;
    console.log('Using userId:', userId);
    
    try {
      const result = await this.financialReportsService.createFinancialReport(userId, createReportDto);
      console.log('Financial report created successfully:', result);
      return result;
    } catch (error) {
      console.error('Error creating financial report:', error);
      throw error;
    }
  }

  @Get('project/:projectId')
  async getFinancialReportsByProject(
    @Request() req,
    @Param('projectId') projectId: string,
  ) {
    const userId = req.user.id || req.user.sub;
    return this.financialReportsService.getFinancialReportsByProject(projectId, userId);
  }

  @Get('my-reports')
  async getMyFinancialReports(@Request() req) {
    const userId = req.user.id || req.user.sub;
    return this.financialReportsService.getMyFinancialReports(userId);
  }

  @Delete(':reportId')
  @HttpCode(HttpStatus.OK)
  async deleteFinancialReport(
    @Request() req,
    @Param('reportId') reportId: string,
  ) {
    const userId = req.user.id || req.user.sub;
    return this.financialReportsService.deleteFinancialReport(reportId, userId);
  }
}