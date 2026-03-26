import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvestmentStatus, DividendStatus, Role } from '@prisma/client';

@Injectable()
export class InvestmentHistoryService {
  constructor(private prisma: PrismaService) {}

  // Get investment history for an investor
  async getInvestorHistory(investorId: string) {
    const investments = await this.prisma.investment.findMany({
      where: { investorId },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            owner: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
        dividendDistributions: {
          include: {
            dividend: {
              select: {
                id: true,
                amount: true,
                date: true,
              },
            },
          },
        },

      },
      orderBy: { createdAt: 'desc' },
    });

    return investments.map(investment => ({
      ...investment,
      totalDividendsReceived: investment.dividendDistributions
        .filter(dist => dist.status === DividendStatus.PAID)
        .reduce((sum, dist) => sum + dist.amount, 0),
      pendingDividends: investment.dividendDistributions
        .filter(dist => dist.status === DividendStatus.PENDING)
        .reduce((sum, dist) => sum + dist.amount, 0),
    }));
  }

  // Get profit sharing history for an investor
  async getInvestorProfitSharing(investorId: string, projectId?: string) {
    const where: any = { investorId };
    if (projectId) {
      where.investment = { projectId };
    }

    const dividendDistributions = await this.prisma.dividendDistribution.findMany({
      where,
      include: {
        dividend: {
          include: {
            project: {
              select: {
                id: true,
                title: true,
                description: true,
              },
            },
          },
        },
        investment: {
          select: {
            id: true,
            amount: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return dividendDistributions;
  }

  // Get investment summary for an investor
  async getInvestorSummary(investorId: string) {
    const investments = await this.prisma.investment.findMany({
      where: { 
        investorId,
        status: {
          in: [InvestmentStatus.APPROVED, InvestmentStatus.ACTIVE],
        },
      },
      include: {
        dividendDistributions: true,
      },
    });

    const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalDividendsReceived = investments
      .flatMap(inv => inv.dividendDistributions)
      .filter(dist => dist.status === DividendStatus.PAID)
      .reduce((sum, dist) => sum + dist.amount, 0);
    const pendingDividends = investments
      .flatMap(inv => inv.dividendDistributions)
      .filter(dist => dist.status === DividendStatus.PENDING)
      .reduce((sum, dist) => sum + dist.amount, 0);

    // Count both APPROVED and ACTIVE investments as active (since APPROVED investments are actively generating returns)
    const activeInvestments = investments.filter(inv => inv.status === InvestmentStatus.APPROVED || inv.status === InvestmentStatus.ACTIVE).length;
    const totalProjects = investments.length;

    return {
      totalInvested,
      totalDividendsReceived,
      pendingDividends,
      activeInvestments,
      totalProjects,
      roi: totalInvested > 0 ? (totalDividendsReceived / totalInvested) * 100 : 0,
    };
  }

  // Get project investment analytics for project owner
  async getProjectInvestmentAnalytics(projectId: string, ownerId: string) {
    // Verify project ownership
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        title: true,
        targetAmount: true,
        currentAmount: true,
        status: true,
        ownerId: true,
        investments: {
          where: {
            status: {
              in: [InvestmentStatus.APPROVED, InvestmentStatus.ACTIVE],
            },
          },
          select: {
            id: true,
            amount: true,
            createdAt: true,
            investor: {
              select: {
                id: true,
                email: true,
              },
            },
            dividendDistributions: {
              select: {
                id: true,
                amount: true,
                status: true,
              },
            },
          },
        },
        dividends: {
          select: {
            id: true,
            distributions: {
              select: {
                id: true,
                amount: true,
                status: true,
                investor: {
                  select: {
                    id: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!project || project.ownerId !== ownerId) {
      throw new Error('Project not found or access denied');
    }

    const totalInvestments = project.investments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalInvestors = project.investments.length;
    const totalDividendsDistributed = project.dividends
      .flatMap(dividend => dividend.distributions)
      .filter(dist => dist.status === DividendStatus.PAID)
      .reduce((sum, dist) => sum + dist.amount, 0);

    const investorBreakdown = project.investments.map(investment => ({
      investor: investment.investor,
      investmentAmount: investment.amount,
      investmentDate: investment.createdAt,
      dividendsReceived: investment.dividendDistributions
        .filter(dist => dist.status === DividendStatus.PAID)
        .reduce((sum, dist) => sum + dist.amount, 0),
      pendingDividends: investment.dividendDistributions
        .filter(dist => dist.status === DividendStatus.PENDING)
        .reduce((sum, dist) => sum + dist.amount, 0),
    }));

    return {
      project: {
        id: project.id,
        title: project.title,
        targetAmount: project.targetAmount,
        currentAmount: project.currentAmount,
        status: project.status,
      },
      analytics: {
        totalInvestments,
        totalInvestors,
        totalDividendsDistributed,
        fundingProgress: project.targetAmount && project.targetAmount > 0 ? (totalInvestments / project.targetAmount) * 100 : 0,
      },
      investorBreakdown,
      dividendHistory: project.dividends,
    };
  }

  // Get all investment activities for admin
  async getAllInvestmentActivities(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [investments, total] = await Promise.all([
      this.prisma.investment.findMany({
        skip,
        take: limit,
        include: {
          investor: {
            select: {
              id: true,
              email: true,
            },
          },
          project: {
            select: {
              id: true,
              title: true,
              description: true,
              owner: {
                  select: {
                    id: true,
                    email: true,
                  },
                },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.investment.count(),
    ]);

    return {
      investments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}