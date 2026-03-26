import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportType } from '@prisma/client';

export interface CreateFinancialReportDto {
  projectId: string;
  reportType: ReportType;
  title: string;
  description?: string;
  fileUrl: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}

@Injectable()
export class FinancialReportsService {
  constructor(private prisma: PrismaService) {}

  async createFinancialReport(userId: string, data: CreateFinancialReportDto) {
    // Verify that the user owns the project
    const project = await this.prisma.project.findUnique({
      where: { id: data.projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== userId) {
      throw new ForbiddenException('You can only create reports for your own projects');
    }

    // Create the financial report
    const report = await this.prisma.report.create({
      data: {
        type: data.reportType,
        fileUrl: data.fileUrl,
        projectId: data.projectId,
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            ownerId: true,
          },
        },
      },
    });

    return {
      id: report.id,
      projectId: report.projectId,
      reportType: report.type,
      title: data.title,
      description: data.description,
      file: {
        id: report.id,
        filename: data.fileName || 'financial-report.pdf',
        originalName: data.fileName || 'financial-report.pdf',
        size: data.fileSize || 0,
        mimeType: data.mimeType || 'application/pdf',
        url: data.fileUrl,
        uploadedAt: report.createdAt.toISOString(),
      },
      uploadedBy: userId,
      uploadedAt: report.createdAt.toISOString(),
      status: 'APPROVED' as const,
    };
  }

  async getFinancialReportsByProject(projectId: string, userId: string) {
    // Verify that the user has access to this project
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        investments: {
          where: { investorId: userId },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check if user is project owner or has investment in the project
    const hasAccess = project.ownerId === userId || project.investments.length > 0;
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this project');
    }

    const reports = await this.prisma.report.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        project: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Transform reports to expected format
    const reportsWithFiles = reports.map((report) => {
      const fileName = report.fileUrl.split('/').pop() || 'financial-report.pdf';
      const reportDate = report.createdAt.toLocaleDateString('en-US', { 
        month: 'numeric', 
        year: 'numeric' 
      });

      return {
        id: report.id,
        projectId: report.projectId,
        reportType: report.type,
        title: `${report.type} Report - ${reportDate}`,
        description: `${report.type} financial report for ${report.project.title}`,
        file: {
          id: report.id,
          filename: fileName,
          originalName: fileName,
          size: 0, // Size not stored in current schema
          mimeType: 'application/pdf',
          url: report.fileUrl,
          uploadedAt: report.createdAt.toISOString(),
        },
        uploadedBy: project.ownerId,
        uploadedAt: report.createdAt.toISOString(),
        status: 'APPROVED' as const,
      };
    });

    return reportsWithFiles;
  }

  async getMyFinancialReports(userId: string) {
    // Get all projects owned by the user
    const projects = await this.prisma.project.findMany({
      where: { ownerId: userId },
      include: {
        reports: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const allReports = [];
    for (const project of projects) {
      for (const report of project.reports) {
        const fileName = report.fileUrl.split('/').pop() || 'financial-report.pdf';
        const reportDate = report.createdAt.toLocaleDateString('en-US', { 
          month: 'numeric', 
          year: 'numeric' 
        });

        allReports.push({
          id: report.id,
          projectId: report.projectId,
          reportType: report.type,
          title: `${report.type} Report - ${reportDate}`,
          description: `${report.type} financial report for ${project.title}`,
          file: {
            id: report.id,
            filename: fileName,
            originalName: fileName,
            size: 0, // Size not stored in current schema
            mimeType: 'application/pdf',
            url: report.fileUrl,
            uploadedAt: report.createdAt.toISOString(),
          },
          uploadedBy: userId,
          uploadedAt: report.createdAt.toISOString(),
          status: 'APPROVED' as const,
        });
      }
    }

    return allReports;
  }

  async deleteFinancialReport(reportId: string, userId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        project: true,
      },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.project.ownerId !== userId) {
      throw new ForbiddenException('You can only delete your own reports');
    }

    await this.prisma.report.delete({
      where: { id: reportId },
    });

    return { success: true };
  }
}