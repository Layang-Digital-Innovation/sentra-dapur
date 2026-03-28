import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, PaymentStatus, PaymentType, Currency } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getInvestorDashboard(userId: string) {
    const investments = await this.prisma.investment.findMany({
      where: { investorId: userId },
      include: {
        project: true,
      },
    });

    const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const projectCount = new Set(investments.map(inv => inv.projectId)).size;

    return {
      totalInvested,
      projectCount,
      investments,
    };
  }

  async getProjectOwnerDashboard(userId: string) {
    const projects = await this.prisma.project.findMany({
      where: { ownerId: userId },
      include: {
        investments: true,
        dividends: true,
      },
    });

    const totalRaised = projects.reduce(
      (sum, project) => sum + project.investments.reduce((s, inv) => s + inv.amount, 0),
      0
    );

    const totalDividends = projects.reduce(
      (sum, project) => sum + project.dividends.reduce((s, div) => s + div.amount, 0),
      0
    );

    return {
      projectCount: projects.length,
      totalRaised,
      totalDividends,
      projects,
    };
  }

  async getBuyerDashboard(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { buyerId: userId },
      include: {
        product: true,
        shipment: true,
      },
    });

    const totalSpent = orders.reduce((sum, order: any) => sum + (order.totalPrice || 0), 0);

    return {
      orderCount: orders.length,
      totalSpent,
      orders,
    };
  }

  async getSellerDashboard(userId: string) {
    const products = await this.prisma.product.findMany({
      where: { sellerId: userId },
      include: {
        orders: true,
      },
    });

    const totalSales = products.reduce((sum, product: any) => sum + product.orders.reduce((s: number, order: any) => s + (order.totalPrice || 0), 0), 0);

    const orderCount = products.reduce(
      (sum, product) => sum + product.orders.length,
      0
    );

    return {
      productCount: products.length,
      orderCount,
      totalSales,
      products,
    };
  }

  async getAdminDashboard() {
    const [
      userCount,
      investorCount,
      projectOwnerCount,
      buyerCount,
      sellerCount,
      projectCount,
      orderCount,
      activeSubscriptions,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: Role.INVESTOR } }),
      this.prisma.user.count({ where: { role: Role.PROJECT_OWNER } }),
      this.prisma.user.count({ where: { role: Role.BUYER } }),
      this.prisma.user.count({ where: { role: Role.SUPPLIER } }),
      this.prisma.project.count(),
      this.prisma.order.count(),
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    ]);

    return {
      userCount,
      investorCount,
      projectOwnerCount,
      buyerCount,
      sellerCount,
      projectCount,
      orderCount,
      activeSubscriptions,
    };
  }

  // Summary methods
  async getInvestorSummary(userId: string) {
    const investments = await this.prisma.investment.findMany({
      where: { investorId: userId },
    });
    
    const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const projectCount = new Set(investments.map(inv => inv.projectId)).size;
    
    return {
      totalInvested,
      projectCount,
      investmentCount: investments.length,
    };
  }
  
  async getProjectOwnerSummary(userId: string) {
    const projects = await this.prisma.project.findMany({
      where: { ownerId: userId },
      include: {
        investments: true,
        dividends: true,
      },
    });
    
    const totalRaised = projects.reduce(
      (sum, project) => sum + project.investments.reduce((s, inv) => s + inv.amount, 0),
      0
    );
    
    const totalDividends = projects.reduce(
      (sum, project) => sum + project.dividends.reduce((s, div) => s + div.amount, 0),
      0
    );
    
    return {
      projectCount: projects.length,
      totalRaised,
      totalDividends,
    };
  }
  
  async getAdminSummary() {
    const [
      userCount,
      projectCount,
      totalInvestments,
      activeSubscriptions,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.project.count(),
      this.prisma.investment.aggregate({
        _sum: { amount: true },
      }),
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    ]);
    
    return {
      userCount,
      projectCount,
      totalInvestments: totalInvestments._sum.amount || 0,
      activeSubscriptions,
    };
  }
  
  // Stats methods
  async getInvestorStats(userId: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const investments = await this.prisma.investment.findMany({
      where: {
        investorId: userId,
        createdAt: { gte: sixMonthsAgo },
      },
      orderBy: { createdAt: 'asc' },
    });
    
    const dividends = await this.prisma.dividend.findMany({
      where: {
        project: {
          investments: {
            some: {
              investorId: userId
            }
          }
        },
        createdAt: { gte: sixMonthsAgo },
      },
      orderBy: { createdAt: 'asc' },
    });
    
    return {
      investmentTrend: this.groupByMonth(investments, 'amount'),
      dividendTrend: this.groupByMonth(dividends, 'amount'),
    };
  }
  
  async getProjectOwnerStats(userId: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const projects = await this.prisma.project.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    
    const projectIds = projects.map(p => p.id);
    
    const investments = await this.prisma.investment.findMany({
      where: {
        projectId: { in: projectIds },
        createdAt: { gte: sixMonthsAgo },
      },
      orderBy: { createdAt: 'asc' },
    });
    
    const dividends = await this.prisma.dividend.findMany({
      where: {
        projectId: { in: projectIds },
        createdAt: { gte: sixMonthsAgo },
      },
      orderBy: { createdAt: 'asc' },
    });
    
    return {
      investmentTrend: this.groupByMonth(investments, 'amount'),
      dividendTrend: this.groupByMonth(dividends, 'amount'),
    };
  }
  
  async getAdminStats() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const users = await this.prisma.user.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      orderBy: { createdAt: 'asc' },
    });
    
    const investments = await this.prisma.investment.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      orderBy: { createdAt: 'asc' },
    });
    
    const subscriptions = await this.prisma.subscription.findMany({
      where: { startedAt: { gte: sixMonthsAgo } },
      orderBy: { startedAt: 'asc' },
    });
    
    return {
      userGrowth: this.groupByMonth(users),
      investmentTrend: this.groupByMonth(investments, 'amount'),
      subscriptionTrend: this.groupByMonth(subscriptions),
    };
  }
  
  // SUPER_ADMIN Analytics Methods
  async getUserAnalytics() {
    const [
      totalUsers,
      usersByRole,
      recentUsers,
      userGrowthData
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: { role: true },
      }),
      this.prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
        },
      }),
      this.prisma.user.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return {
      totalUsers,
      usersByRole: usersByRole.map(item => ({
        role: item.role,
        count: item._count.role,
      })),
      recentUsers,
      userGrowth: this.groupByMonth(userGrowthData),
    };
  }

  async getSubscriptionAnalytics(currency?: 'IDR' | 'USD') {
    const [
      totalSubscriptions,
      activeSubscriptions,
      subscriptionsByPlan,
      recentSubscriptions,
      revenueAll,
      revenueByProvider,
      revenueByCurrency,
    ] = await Promise.all([
      this.prisma.subscription.count(),
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.subscription.groupBy({
        by: ['plan'],
        _count: { plan: true },
      }),
      this.prisma.subscription.findMany({
        take: 10,
        orderBy: { startedAt: 'desc' },
        include: {
          dapurUnit: {
            select: {
              name: true,
              projectOwner: { select: { email: true, role: true } },
            },
          },
        },
      }),
      // Total recurring revenue (optionally filtered by currency)
      this.prisma.payment.aggregate({
        where: {
          status: PaymentStatus.PAID,
          paymentType: PaymentType.RECURRING,
          ...(currency ? { currency: (Currency as any)[currency] as Currency } : {}),
        },
        _sum: { amount: true },
      }),
      // Breakdown by provider
      this.prisma.payment.groupBy({
        by: ['provider'],
        where: {
          status: PaymentStatus.PAID,
          paymentType: PaymentType.RECURRING,
          ...(currency ? { currency: (Currency as any)[currency] as Currency } : {}),
        },
        _sum: { amount: true },
        _count: { provider: true },
      }),
      // Breakdown by currency
      this.prisma.payment.groupBy({
        by: ['currency'],
        where: {
          status: PaymentStatus.PAID,
          paymentType: PaymentType.RECURRING,
        },
        _sum: { amount: true },
        _count: { currency: true },
      }),
    ]);

    return {
      totalSubscriptions,
      activeSubscriptions,
      subscriptionsByPlan: subscriptionsByPlan.map(item => ({
        plan: item.plan,
        count: item._count.plan,
      })),
      recentSubscriptions,
      totalRevenue: revenueAll._sum.amount || 0,
      revenueByProvider: revenueByProvider.map(r => ({
        provider: r.provider,
        amount: r._sum.amount || 0,
        count: r._count.provider,
      })),
      revenueByCurrency: revenueByCurrency.map(r => ({
        currency: r.currency,
        amount: r._sum.amount || 0,
        count: r._count.currency,
      })),
      currency: currency || null,
    };
  }

  async getRevenueAnalytics() {
    const [
      totalRevenue,
      monthlyRevenue,
      revenueByType,
      recentPayments
    ] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { status: PaymentStatus.PAID },
        _sum: { amount: true },
      }),
      this.prisma.payment.findMany({
        where: {
          status: PaymentStatus.PAID,
          createdAt: {
            gte: new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000), // Last 12 months
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.payment.groupBy({
        by: ['paymentType'],
        where: { status: PaymentStatus.PAID },
        _sum: { amount: true },
        _count: { paymentType: true },
      }),
      this.prisma.payment.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        where: { status: PaymentStatus.PAID },
        include: {
          user: {
            select: { email: true, role: true },
          },
        },
      }),
    ]);

    return {
      totalRevenue: totalRevenue._sum.amount || 0,
      monthlyRevenue: this.groupByMonth(monthlyRevenue, 'amount'),
      revenueByType: revenueByType.map(item => ({
        type: item.paymentType,
        amount: item._sum.amount || 0,
        count: item._count.paymentType,
      })),
      recentPayments,
    };
  }

  private groupByMonth(items: any[], valueField?: string) {
    const monthlyData = {};
    
    items.forEach(item => {
      const date = new Date(item.createdAt);
      const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
      
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = valueField ? 0 : 1;
      } else {
        monthlyData[monthYear] += valueField ? item[valueField] : 1;
      }
    });
    
    return Object.entries(monthlyData).map(([month, value]) => ({
      month,
      value,
    }));
  }
}