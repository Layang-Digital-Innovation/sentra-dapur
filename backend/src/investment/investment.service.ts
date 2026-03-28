import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { ProjectStatus, ReportType, InvestmentStatus, Role } from '@prisma/client';

@Injectable()
export class InvestmentService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async createProject(ownerId: string, data: { 
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
  }) {
    // Convert deadline string to Date object if needed
    let deadlineDate: Date | undefined = undefined;
    if (data.deadline) {
      if (typeof data.deadline === 'string') {
        // Convert date string (YYYY-MM-DD) to Date object with end of day time
        deadlineDate = new Date(data.deadline + 'T23:59:59.999Z');
      } else {
        deadlineDate = data.deadline;
      }
    }

    const project = await this.prisma.project.create({
      data: {
        title: data.title,
        description: data.description,
        ownerId,
        targetAmount: data.targetAmount,
        deadline: deadlineDate,
        accountNumber: data.bankAccount,
        bankName: data.bankName,
        accountHolder: data.accountHolder,
        profitSharingPercentage: data.profitSharingPercentage,
        profitSharingPercentageAfterBEP: data.profitSharingPercentageAfterBEP,
        minInvestment: data.minInvestment,
        prospectusUrl: data.prospectusUrl,
        prospectusFileName: data.prospectusFileName,
      },
    });
    
    // Send notification to all admins about new project
    const admins = await this.prisma.user.findMany({
      where: {
        role: {
          in: [Role.ADMIN, Role.SUPER_ADMIN]
        }
      }
    });
    
    // Create notifications for each admin
    for (const admin of admins) {
      await this.notificationService.createNotification({
        userId: admin.id,
        type: 'NEW_PROJECT',
        title: 'Proyek Baru Dibuat',
        message: `Proyek baru "${data.title}" telah dibuat dan menunggu persetujuan`,
        relatedId: project.id,
        metadata: {
          projectId: project.id,
          projectTitle: data.title,
          ownerId: ownerId
        },
      });
    }
    
    return project;
  }

  async getProjects(filters?: { status?: ProjectStatus }) {
    const projects = await this.prisma.project.findMany({
      where: filters,
      include: {
        owner: {
          select: {
            id: true,
            email: true,
          },
        },
        investments: {
          select: {
            id: true,
            amount: true,
            status: true,
          },
        },
      },
    });

    // Calculate totalInvestment for each project
    return projects.map(project => {
      const totalInvestment = project.investments
        .filter(inv => inv.status === InvestmentStatus.APPROVED || inv.status === InvestmentStatus.ACTIVE)
        .reduce((sum, inv) => sum + inv.amount, 0);
      
      return {
        ...project,
        totalInvestment,
      };
    });
  }

  async getProjectById(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
          },
        },
        investments: {
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true,
            investor: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
        reports: true,
        dividends: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Calculate totalInvestment
    const totalInvestment = project.investments
      .filter(inv => inv.status === InvestmentStatus.APPROVED || inv.status === InvestmentStatus.ACTIVE)
      .reduce((sum, inv) => sum + inv.amount, 0);

    return {
      ...project,
      totalInvestment,
    };
  }

  async investInProject(investorId: string, projectId: string, amount: number) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        title: true,
        ownerId: true,
        status: true,
        targetAmount: true,
        deadline: true,
        minInvestment: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Enforce project investability rules
    if (project.status !== ProjectStatus.ONGOING && project.status !== ProjectStatus.APPROVED) {
      throw new BadRequestException('Project is not open for investment');
    }

    if (project.deadline && new Date(project.deadline) < new Date()) {
      throw new BadRequestException('Project deadline has passed');
    }

    if (amount <= 0) {
      throw new BadRequestException('Investment amount must be greater than 0');
    }

    if (project.minInvestment && amount < project.minInvestment) {
      throw new BadRequestException(`Minimum investment is ${project.minInvestment}`);
    }

    // Check funding status and remaining amount
    let totalApprovedActive = 0;
    if (project.targetAmount) {
      const aggregate = await this.prisma.investment.aggregate({
        where: { projectId, status: { in: [InvestmentStatus.APPROVED, InvestmentStatus.ACTIVE] } },
        _sum: { amount: true },
      });
      totalApprovedActive = aggregate._sum.amount || 0;

      if (totalApprovedActive >= project.targetAmount) {
        throw new BadRequestException('Project is already fully funded');
      }

      const remaining = project.targetAmount - totalApprovedActive;
      if (amount > remaining) {
        throw new BadRequestException(`Investment exceeds remaining target (${remaining})`);
      }
    }

    // Create investment with PENDING status (simplified workflow)
    const investment = await this.prisma.investment.create({
      data: {
        amount,
        investorId,
        projectId,
        status: InvestmentStatus.PENDING, // Default to PENDING for admin approval
      },
      include: {
        project: {
          select: {
            title: true,
            owner: {
              select: {
                email: true,
              },
            },
          },
        },
        investor: {
          select: {
            email: true,
          },
        },
      },
    });

    // Send notification to project owner about new investment
    await this.notificationService.createNotification({
      userId: project.ownerId,
      type: 'INVESTMENT_REQUEST',
      title: 'New Investment Request',
      message: `New investment of ${amount} received for project ${project.title}`,
      metadata: {
        investmentId: investment.id,
        projectId,
        amount,
      },
    });

    return investment;
  }

  async updateProjectStatus(projectId: string, status: ProjectStatus) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.prisma.project.update({
      where: { id: projectId },
      data: { status },
    });
  }

  async addProjectReport(projectId: string, data: { type: any; fileUrl: string }) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.prisma.report.create({
      data: {
        type: data.type,
        fileUrl: data.fileUrl,
        projectId,
      },
    });
  }

  async distributeDividend(projectId: string, data: { amount: number; date: Date; afterBEP?: boolean }) {
    if (!data.amount || data.amount <= 0) {
      throw new BadRequestException('Dividend amount must be greater than 0');
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        title: true,
        profitSharingPercentage: true,
        profitSharingPercentageAfterBEP: true,
        investments: {
          where: { status: { in: [InvestmentStatus.APPROVED, InvestmentStatus.ACTIVE] } },
          select: { id: true, investorId: true, amount: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const totalInvestment = project.investments.reduce((sum, inv) => sum + inv.amount, 0);
    if (totalInvestment <= 0) {
      throw new BadRequestException('No approved/active investments to distribute dividends');
    }

    const investorPortionPercent = (data.afterBEP ? project.profitSharingPercentageAfterBEP : project.profitSharingPercentage) ?? project.profitSharingPercentage ?? 0;
    if (!investorPortionPercent || investorPortionPercent <= 0) {
      throw new BadRequestException('Project profit sharing percentage is not configured');
    }

    // Create the parent dividend record
    const dividend = await this.prisma.dividend.create({
      data: {
        amount: data.amount,
        date: data.date,
        projectId,
      },
    });

    // Build distributions for each investment
    const distributions = project.investments.map(inv => {
      const investorShare = inv.amount / totalInvestment; // 0..1
      const distributionPercentage = investorShare * investorPortionPercent; // percent of total dividend
      const distributionAmount = data.amount * (distributionPercentage / 100);

      return {
        amount: distributionAmount,
        percentage: distributionPercentage,
        dividendId: dividend.id,
        investorId: inv.investorId,
        investmentId: inv.id,
      };
    });

    // Persist all distributions
    if (distributions.length > 0) {
      await this.prisma.dividendDistribution.createMany({ data: distributions });
    }

    // Optionally notify investors (non-blocking)
    try {
      for (const inv of project.investments) {
        await this.notificationService.createNotification({
          userId: inv.investorId,
          type: 'DIVIDEND_DISTRIBUTED',
          title: `Dividend distributed for ${project.title}`,
          message: `A dividend has been distributed. Check your portfolio for details.`,
          metadata: { projectId, dividendId: dividend.id },
        });
      }
    } catch (err) {
      // Do not fail the process on notification errors
      console.error('Failed to send dividend notifications:', err);
    }

    // Return dividend with distributions count
    return {
      ...dividend,
      distributionsCreated: distributions.length,
    } as any;
  }

  // PROJECT OWNER FEATURES
  async getProjectsByOwner(ownerId: string) {
    const projects = await this.prisma.project.findMany({
      where: { ownerId },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        ownerId: true,
        targetAmount: true,
        currentAmount: true,
        profitSharingPercentage: true,
        profitSharingPercentageAfterBEP: true,
        minInvestment: true,
        prospectusUrl: true,
        prospectusFileName: true,
        deadline: true,
        bankName: true,
        accountNumber: true,
        accountHolder: true,
        createdAt: true,
        updatedAt: true,
        investments: {
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true,
            investor: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
        reports: true,
        dividends: true,
        _count: {
          select: {
            investments: true,
          },
        },
      },
    });

    // Calculate totalInvestment for each project
    return projects.map(project => {
      const totalInvestment = project.investments
        .filter(inv => inv.status === InvestmentStatus.APPROVED || inv.status === InvestmentStatus.ACTIVE)
        .reduce((sum, inv) => sum + inv.amount, 0);
      
      return {
        ...project,
        totalInvestment,
      };
    });
  }

  async updateProject(projectId: string, ownerId: string, data: {
    title?: string;
    description?: string;
    targetAmount?: number;
    deadline?: Date | string;
    minInvestment?: number;
    profitSharingPercentage?: number;
    profitSharingPercentageAfterBEP?: number;
    prospectusUrl?: string;
    prospectusFileName?: string;
    bankName?: string;
    bankAccount?: string;
    accountHolder?: string;
    progress?: number;
  }) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== ownerId) {
      throw new ForbiddenException('You can only update your own projects');
    }

    const currentFinancialDocs = project.financialDocs as any || {};

    // Convert deadline input to Date end-of-day only when valid
    let deadlineToSave: Date | undefined = undefined;
    if (data.deadline !== undefined && data.deadline !== null) {
      if (typeof data.deadline === 'string') {
        const raw = data.deadline.trim();
        if (raw) {
          const iso = raw.includes('T') ? raw : `${raw}T23:59:59.999Z`;
          const parsed = new Date(iso);
          if (!isNaN(parsed.getTime())) {
            deadlineToSave = parsed;
          }
        }
        // if empty or invalid string, skip updating deadline
      } else if (data.deadline instanceof Date) {
        if (!isNaN(data.deadline.getTime())) {
          deadlineToSave = data.deadline;
        }
      }
    }

    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.targetAmount !== undefined && { targetAmount: data.targetAmount }),
        ...(deadlineToSave !== undefined && { deadline: deadlineToSave }),
        ...(data.minInvestment !== undefined && { minInvestment: data.minInvestment }),
        ...(data.profitSharingPercentage !== undefined && { profitSharingPercentage: data.profitSharingPercentage }),
        ...(data.profitSharingPercentageAfterBEP !== undefined && { profitSharingPercentageAfterBEP: data.profitSharingPercentageAfterBEP }),
        ...(data.prospectusUrl !== undefined && { prospectusUrl: data.prospectusUrl }),
        ...(data.prospectusFileName !== undefined && { prospectusFileName: data.prospectusFileName }),
        ...(data.bankName !== undefined && { bankName: data.bankName }),
        ...(data.bankAccount !== undefined && { accountNumber: data.bankAccount }),
        ...(data.accountHolder !== undefined && { accountHolder: data.accountHolder }),
        financialDocs: {
          ...currentFinancialDocs,
          ...(data.progress !== undefined && { progress: data.progress }),
        },
      },
    });
  }

  async updateBankAccount(projectId: string, ownerId: string, data: {
    bankAccount: string;
    bankName: string;
    accountHolder: string;
  }) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== ownerId) {
      throw new ForbiddenException('You can only update your own projects');
    }

    const currentFinancialDocs = project.financialDocs as any || {};

    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        financialDocs: {
          ...currentFinancialDocs,
          bankAccount: data.bankAccount,
          bankName: data.bankName,
          accountHolder: data.accountHolder,
        },
      },
    });
  }

  async addFinancialReport(projectId: string, ownerId: string, data: {
    type: ReportType;
    fileUrl: string;
    month?: number;
    year?: number;
  }) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== ownerId) {
      throw new ForbiddenException('You can only add reports to your own projects');
    }

    return this.prisma.report.create({
      data: {
        type: data.type,
        fileUrl: data.fileUrl,
        projectId,
      },
    });
  }

  // INVESTOR FEATURES
  async getInvestorPortfolio(investorId: string) {
    const investments = await this.prisma.investment.findMany({
      where: { 
        investorId,
        status: {
          in: [InvestmentStatus.APPROVED, InvestmentStatus.ACTIVE],
        },
      },
      include: {
        project: {
          include: {
            owner: {
              select: {
                id: true,
                email: true,
              },
            },
            dividends: true,
            investments: {
              where: {
                status: {
                  in: [InvestmentStatus.APPROVED, InvestmentStatus.ACTIVE],
                },
              },
              select: {
                amount: true,
              },
            },
            _count: {
              select: {
                investments: true,
              },
            },
          },
        },
        dividendDistributions: {
          where: {
            status: 'PAID',
          },
        },
      },
    });

    // Calculate total invested amount and dividends received
    const portfolio = investments.map(investment => {
      const totalProjectInvestment = investment.project.investments?.reduce((sum: number, inv: any) => sum + inv.amount, 0) || 0;
      const investorShare = totalProjectInvestment > 0 ? investment.amount / totalProjectInvestment : 0;
      const totalDividends = investment.project.dividends.reduce((sum, div) => sum + (div.amount * investorShare), 0);
      const dividendsReceived = investment.dividendDistributions.reduce((sum, dist) => sum + dist.amount, 0);

      return {
        ...investment,
        investorShare: investorShare * 100, // percentage
        totalDividends,
        dividendsReceived,
        project: {
          ...investment.project,
          totalInvestment: totalProjectInvestment,
        },
      };
    });

    // Calculate summary statistics
    const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalDividendsReceived = portfolio.reduce((sum, item) => sum + (item.dividendsReceived || 0), 0);
    // Count both APPROVED and ACTIVE investments as active (since APPROVED investments are actively generating returns)
    const activeInvestments = investments.filter(inv => inv.status === InvestmentStatus.APPROVED || inv.status === InvestmentStatus.ACTIVE).length;
    const roi = totalInvested > 0 ? (totalDividendsReceived / totalInvested) * 100 : 0;

    // Get available projects for investment
    const availableProjects = await this.prisma.project.findMany({
      where: {
        status: ProjectStatus.ONGOING,
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
          },
        },
        investments: {
          where: {
            status: {
              in: [InvestmentStatus.APPROVED, InvestmentStatus.ACTIVE],
            },
          },
          select: {
            amount: true,
          },
        },
      },
    });

    const availableProjectsWithStats = availableProjects.map(project => {
      const totalInvestment = project.investments.reduce((sum, inv) => sum + inv.amount, 0);
      return {
        ...project,
        totalInvestment,
      };
    });

    // Build per-project breakdown for the investor
    const projectMap = new Map<string, {
      projectId: string;
      projectTitle: string;
      totalInvested: number;
      totalReturn: number;
      roi: number;
    }>();

    for (const item of portfolio) {
      const pId = item.project.id;
      const existing = projectMap.get(pId) || {
        projectId: pId,
        projectTitle: item.project.title,
        totalInvested: 0,
        totalReturn: 0,
        roi: 0,
      };
      existing.totalInvested += item.amount;
      // Use proportional dividends (matches dividend history/overall total return shown in UI)
      existing.totalReturn += (item.totalDividends || 0);
      projectMap.set(pId, existing);
    }

    // finalize ROI per project
    const projectBreakdown = Array.from(projectMap.values()).map(p => ({
      ...p,
      roi: p.totalInvested > 0 ? (p.totalReturn / p.totalInvested) * 100 : 0,
    }));

    return {
      totalInvested,
      totalDividendsReceived,
      pendingDividends: 0, // TODO: Calculate pending dividends
      activeInvestments,
      investments: portfolio.map(item => ({
        investment: item,
        project: item.project,
        dividendsReceived: item.dividendsReceived || 0,
        pendingDividends: 0, // TODO: Calculate pending dividends per investment
        roi: item.amount > 0 ? ((item.dividendsReceived || 0) / item.amount) * 100 : 0,
      })),
      availableProjects: availableProjectsWithStats,
      totalReturn: totalDividendsReceived,
      roi,
      activeProjects: activeInvestments,
      projectBreakdown,
    };
  }

  async getInvestmentHistory(investorId: string) {
    return this.prisma.investment.findMany({
      where: { investorId },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getDividendHistory(investorId: string) {
    const investments = await this.prisma.investment.findMany({
      where: { investorId },
      include: {
        project: {
          include: {
            dividends: true,
            investments: {
              select: {
                amount: true,
              },
            },
          },
        },
      },
    });

    const dividendHistory: any[] = [];

    investments.forEach(investment => {
      const totalProjectInvestment = investment.project.investments.reduce((sum, inv) => sum + inv.amount, 0);
      const investorShare = investment.amount / totalProjectInvestment;

      investment.project.dividends.forEach(dividend => {
        dividendHistory.push({
          id: dividend.id,
          projectId: investment.project.id,
          projectTitle: investment.project.title,
          totalDividend: dividend.amount,
          investorDividend: dividend.amount * investorShare,
          investorShare: investorShare * 100,
          date: dividend.date,
          createdAt: dividend.createdAt,
        });
      });
    });

    return dividendHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // ADMIN FEATURES
  async getAllProjectsForAdmin() {
    return this.prisma.project.findMany({
      include: {
        owner: {
          select: {
            id: true,
            email: true,
          },
        },
        investments: {
          include: {
            investor: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
        reports: true,
        dividends: true,
        _count: {
          select: {
            investments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getProjectStatistics() {
    const totalProjects = await this.prisma.project.count();
    const approvedProjects = await this.prisma.project.count({
      where: { status: ProjectStatus.APPROVED },
    });
    const pendingProjects = await this.prisma.project.count({
      where: { status: ProjectStatus.PENDING },
    });
    const totalInvestments = await this.prisma.investment.aggregate({
      _sum: {
        amount: true,
      },
    });
    const totalInvestors = await this.prisma.investment.groupBy({
      by: ['investorId'],
    });

    return {
      totalProjects,
      approvedProjects,
      pendingProjects,
      totalInvestmentAmount: totalInvestments._sum.amount || 0,
      totalInvestors: totalInvestors.length,
    };
  }

  // NEW INVESTMENT WORKFLOW METHODS

  // Create initial investment request (after chat with admin)
  async createInvestmentRequest(investorId: string, projectId: string, chatId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.status !== ProjectStatus.APPROVED) {
      throw new ForbiddenException('Cannot invest in a project that is not approved');
    }

    // Check if investor already has pending investment for this project
    const existingInvestment = await this.prisma.investment.findFirst({
      where: {
        investorId,
        projectId,
        status: {
          in: [InvestmentStatus.PENDING, InvestmentStatus.TRANSFER_PENDING, InvestmentStatus.TRANSFER_UPLOADED],
        },
      },
    });

    if (existingInvestment) {
      throw new BadRequestException('You already have a pending investment for this project');
    }

    const investment = await this.prisma.investment.create({
      data: {
        investorId,
        projectId,
        chatId,
        status: InvestmentStatus.PENDING,
        amount: 0, // Will be set later by admin during approval
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            bankName: true,
            accountNumber: true,
            accountHolder: true,
          },
        },
        investor: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    // Send notification to project owner
    try {
      await this.notificationService.notifyNewInvestmentRequest(
        projectId,
        investment.investor.email,
        0 // Amount will be set during approval
      );
    } catch (error) {
      console.error('Failed to send notification:', error);
      // Don't fail the investment creation if notification fails
    }

    return investment;
  }

  // Get project details for investor (including bank details)
  async getProjectDetailsForInvestor(investorId: string, projectId: string) {
    // Check if investor has pending or approved investment for this project
    const investment = await this.prisma.investment.findFirst({
      where: {
        investorId,
        projectId,
        status: {
          in: [InvestmentStatus.PENDING, InvestmentStatus.TRANSFER_PENDING, InvestmentStatus.TRANSFER_UPLOADED, InvestmentStatus.APPROVED, InvestmentStatus.ACTIVE],
        },
      },
    });

    if (!investment) {
      throw new ForbiddenException('You do not have access to this project details');
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return {
      ...project,
      investment: {
        id: investment.id,
        status: investment.status,
        amount: investment.amount,
      },
    };
  }

  // Upload transfer proof


  // Admin approve investment (simplified workflow)
  async approveInvestment(adminId: string, investmentId: string, data?: {
    amount?: number;
  }) {
    const investment = await this.prisma.investment.findUnique({
      where: { id: investmentId },
      include: {
        project: {
          include: {
            owner: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
        investor: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!investment) {
      throw new NotFoundException('Investment not found');
    }

    if (
      investment.status !== InvestmentStatus.PENDING &&
      investment.status !== InvestmentStatus.TRANSFER_PENDING &&
      investment.status !== InvestmentStatus.TRANSFER_UPLOADED
    ) {
      throw new BadRequestException('Investment must be in pending or transfer pending/uploaded status for approval');
    }

    const updatedInvestment = await this.prisma.investment.update({
      where: { id: investmentId },
      data: {
        amount: data?.amount || investment.amount, // Use provided amount or keep existing
        status: InvestmentStatus.APPROVED,
        approvedBy: adminId,
        approvedAt: new Date(),
      },
      include: {
        project: {
          include: {
            owner: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
        investor: {
          select: {
            id: true,
            email: true,
            fullname: true,
          },
        },
      },
    });

    // Update project's current amount
    await this.prisma.project.update({
      where: { id: investment.project.id },
      data: {
        currentAmount: {
          increment: updatedInvestment.amount,
        },
      },
    });

    // Send notification to investor
    try {
      await this.notificationService.notifyInvestmentApproved(investmentId);
    } catch (error) {
      console.error('Failed to send notification:', error);
      // Don't fail the approval if notification fails
    }

    return updatedInvestment;
  }



  // Admin reject investment
  async rejectInvestment(adminId: string, investmentId: string, data: {
    rejectedReason: string;
  }) {
    const investment = await this.prisma.investment.findUnique({
      where: { id: investmentId },
    });

    if (!investment) {
      throw new NotFoundException('Investment not found');
    }

    if (investment.status === InvestmentStatus.APPROVED || investment.status === InvestmentStatus.ACTIVE) {
      throw new BadRequestException('Cannot reject an already approved investment');
    }

    const updatedInvestment = await this.prisma.investment.update({
      where: { id: investmentId },
      data: {
        status: InvestmentStatus.REJECTED,
        rejectedReason: data.rejectedReason,
        approvedBy: adminId,
        approvedAt: new Date(),
      },
      include: {
        project: {
          select: { id: true, title: true }
        },
        investor: {
          select: { id: true, email: true, fullname: true }
        }
      }
    });

    // Send notification to investor
    try {
      await this.notificationService.notifyInvestmentRejected(investmentId, data.rejectedReason);
    } catch (error) {
      console.error('Failed to send notification:', error);
      // Don't fail the rejection if notification fails
    }

    return updatedInvestment;
  }

  // Get all investments for admin with pagination and filtering
  async getAllInvestmentsForAdmin(page: number = 1, limit: number = 10, status?: InvestmentStatus) {
    const skip = (page - 1) * limit;
    
    const where = status ? { status } : {};
    
    const [investments, total] = await Promise.all([
      this.prisma.investment.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
          investor: {
            select: {
              id: true,
              email: true,
              fullname: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.investment.count({ where }),
    ]);

    // Map investor.fullname (from database) to investor.fullName for frontend consistency
    const investmentsMapped = investments.map((inv: any) => {
      const { fullname, ...restInvestor } = inv.investor || {};
      return {
        ...inv,
        investor: {
          ...restInvestor,
          fullName: fullname ?? null,
        },
      };
    });

    return {
      data: investmentsMapped,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Get pending investments for admin review
  async getPendingInvestments() {
    const investments = await this.prisma.investment.findMany({
      where: {
        status: {
          in: [InvestmentStatus.TRANSFER_UPLOADED],
        },
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
          },
        },
        investor: {
          select: {
            id: true,
            email: true,
            fullname: true,
          },
        },
      },
    });

    return investments.map((inv: any) => {
      const { fullname, ...restInvestor } = inv.investor || {};
      return {
        ...inv,
        investor: {
          ...restInvestor,
          fullName: fullname ?? null,
        },
      };
    });
  }
  
  // Get pending projects count for admin badge
  async getPendingProjectsCount() {
    const count = await this.prisma.project.count({
      where: {
        status: ProjectStatus.PENDING
      }
    });
    
    return { count };
  }

  // Get investor's approved projects (for access control)
  async getInvestorApprovedProjects(investorId: string) {
    const investments = await this.prisma.investment.findMany({
      where: {
        investorId,
        status: {
          in: [InvestmentStatus.APPROVED, InvestmentStatus.ACTIVE],
        },
      },
      include: {
        project: {
          include: {
            owner: {
              select: {
                id: true,
                email: true,
              },
            },
            reports: {
              orderBy: {
                createdAt: 'desc',
              },
            },
            dividends: {
              orderBy: {
                date: 'desc',
              },
            },
            investments: {
              where: {
                status: {
                  in: [InvestmentStatus.APPROVED, InvestmentStatus.ACTIVE],
                },
              },
              select: {
                amount: true,
              },
            },
          },
        },
      },
    });

    // Calculate investor share and dividends for each project
    return investments.map(investment => {
      const totalProjectInvestment = investment.project.investments.reduce((sum, inv) => sum + inv.amount, 0);
      const investorShare = totalProjectInvestment > 0 ? (investment.amount / totalProjectInvestment) * 100 : 0;
      const totalDividends = investment.project.dividends.reduce((sum, div) => sum + (div.amount * (investment.amount / totalProjectInvestment)), 0);

      return {
        ...investment,
        investorShare,
        totalDividends,
        project: {
          ...investment.project,
          totalInvestment: totalProjectInvestment,
        },
      };
    });
  }

  // Get investment details by ID (for admin and investor)
  async getInvestmentById(investmentId: string, userId: string, userRole: Role) {
    const investment = await this.prisma.investment.findUnique({
      where: { id: investmentId },
      include: {
        project: {
          include: {
            owner: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
        investor: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!investment) {
      throw new NotFoundException('Investment not found');
    }

    // Access control
    if (userRole !== Role.ADMIN && userRole !== Role.SUPER_ADMIN) {
      if (investment.investorId !== userId && investment.project.ownerId !== userId) {
        throw new ForbiddenException('You do not have access to this investment');
      }
    }

    return investment;
  }

  // Get all investments for a specific project (for project owner)
  async getProjectInvestments(projectId: string, ownerId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        ownerId: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== ownerId) {
      throw new ForbiddenException('You can only view investments for your own projects');
    }

    return this.prisma.investment.findMany({
      where: { projectId },
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        transferDate: true,
        transferProofUrl: true,
        transferProofFileName: true,
        approvedAt: true,
        rejectedReason: true,
        investor: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Get prospectus information for a project
  async getProspectusInfo(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        prospectusUrl: true,
        prospectusFileName: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (!project.prospectusUrl) {
      throw new NotFoundException('Prospectus not found for this project');
    }

    return {
      prospectusUrl: project.prospectusUrl,
      prospectusFileName: project.prospectusFileName,
    };
  }

  // ============================================================
  // DAPUR PORTFOLIO: mengambil tautan DapurInvestor untuk investor
  // menggunakan data dividen NYATA dari laporan admin pusat
  // ============================================================
  async getDapurPortfolio(investorId: string) {
    // 1. Ambil semua DapurInvestor yang terhubung ke investor ini
    const dapurStakes = await this.prisma.dapurInvestor.findMany({
      where: { investorId },
      include: {
        dapurUnit: {
          select: {
            id: true,
            name: true,
            location: true,
            status: true,
            projectOwner: {
              select: { id: true, fullname: true, email: true },
            },
            adminPusat: {
              select: { id: true, fullname: true, email: true },
            },
            adminDapur: {
              select: { id: true, fullname: true, email: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // 2. Untuk setiap Dapur, ambil total dividen nyata yang sudah diterima investor ini
    const dapurList = await Promise.all(
      dapurStakes.map(async (stake) => {
        const dapur = stake.dapurUnit;

        // Ambil semua DapurDividendDistribution untuk investor ini di dapur ini
        const dividendDistributions = await this.prisma.dapurDividendDistribution.findMany({
          where: {
            investorId,
            dividend: { dapurUnitId: dapur.id },
          },
          include: {
            dividend: {
              select: {
                id: true,
                totalAmount: true,
                period: true,
                description: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        // Total profit nyata yang sudah diterima investor di dapur ini
        const totalProfitReceived = dividendDistributions.reduce(
          (s, d) => s + d.amount,
          0
        );

        // Ambil semua ArusKas untuk menghitung saldo saat ini
        const arusKas = await this.prisma.arusKas.findMany({
          where: { dapurUnitId: dapur.id },
          select: { type: true, amount: true }
        });
        const currentBalance = arusKas.reduce((acc, curr) => {
          return curr.type === 'IN' ? acc + curr.amount : acc - curr.amount;
        }, 0);

        return {
          stakeId: stake.id,
          dapurUnitId: dapur.id,
          dapurUnitName: dapur.name,
          location: dapur.location,
          status: dapur.status,
          projectOwner: dapur.projectOwner,
          adminPusat: dapur.adminPusat,
          adminDapur: dapur.adminDapur,
          investmentAmount: stake.investmentAmount,
          profitSharingPct: stake.profitSharingPct,
          profitSharingPctPreBEP: stake.profitSharingPctPreBEP,
          profitSharingPctPostBEP: stake.profitSharingPctPostBEP,
          currentBalance, // Tambahkan saldo saat ini
          // Total profit nyata (dari laporan admin pusat)
          totalProfitReceived,
          dividendCount: dividendDistributions.length,
          // Riwayat dividen singkat (5 terbaru)
          recentDividends: dividendDistributions.slice(0, 5).map((d) => ({
            dividendId: d.dividendId,
            amount: d.amount,
            percentage: d.percentage,
            period: d.dividend.period,
            description: d.dividend.description,
            reportedAt: d.dividend.createdAt,
          })),
          linkedAt: stake.createdAt,
        };
      })
    );

    // 3. Ringkasan keseluruhan
    const totalInvested = dapurList.reduce((s, d) => s + d.investmentAmount, 0);
    const totalProfitReceived = dapurList.reduce((s, d) => s + d.totalProfitReceived, 0);
    const activeDapur = dapurList.filter(
      (d) => d.status === 'ONGOING' || d.status === 'APPROVED'
    ).length;
    const roiPct = totalInvested > 0 ? (totalProfitReceived / totalInvested) * 100 : 0;

    return {
      totalInvested,
      totalProfitReceived,
      roiPct,
      activeDapur,
      totalDapur: dapurList.length,
      dapur: dapurList,
    };
  }
}