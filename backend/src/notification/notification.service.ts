import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface NotificationData {
  userId: string;
  title: string;
  message: string;
  type: 'INVESTMENT_REQUEST' | 'INVESTMENT_APPROVED' | 'INVESTMENT_REJECTED' | 'TRANSFER_UPLOADED' | 'DIVIDEND_DISTRIBUTED' | 'NEW_PROJECT';
  relatedId?: string; // Investment ID, Project ID, etc.
  metadata?: any;
}

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  // Create a new notification
  async createNotification(data: NotificationData) {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: data.type,
          relatedId: data.relatedId,
          metadata: data.metadata,
          isRead: false,
        },
      });

      // Here you could add real-time notification logic (WebSocket, Push notifications, etc.)
      // For now, we'll just store in database

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Notify project owner about new investment request
  async notifyNewInvestmentRequest(projectId: string, investorName: string, amount: number) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { owner: true },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    return this.createNotification({
      userId: project.ownerId,
      title: 'New Investment Request',
      message: `${investorName} has requested to invest $${amount.toLocaleString()} in your project "${project.title}"`,
      type: 'INVESTMENT_REQUEST',
      relatedId: projectId,
      metadata: {
        projectId,
        investorName,
        amount,
      },
    });
  }

  // Notify project owner about transfer proof upload
  async notifyTransferProofUploaded(investmentId: string) {
    const investment = await this.prisma.investment.findUnique({
      where: { id: investmentId },
      include: {
        investor: true,
        project: true,
      },
    });

    if (!investment) {
      throw new Error('Investment not found');
    }

    return this.createNotification({
      userId: investment.project.ownerId,
      title: 'Transfer Proof Uploaded',
      message: `${investment.investor.email} has uploaded transfer proof for their investment in "${investment.project.title}"`,
      type: 'TRANSFER_UPLOADED',
      relatedId: investmentId,
      metadata: {
        investmentId,
        projectId: investment.projectId,
        investorName: investment.investor.email,
        amount: investment.amount,
      },
    });
  }

  // Notify investor about investment approval
  async notifyInvestmentApproved(investmentId: string) {
    const investment = await this.prisma.investment.findUnique({
      where: { id: investmentId },
      include: {
        investor: true,
        project: true,
      },
    });

    if (!investment) {
      throw new Error('Investment not found');
    }

    return this.createNotification({
      userId: investment.investorId,
      title: 'Investment Approved',
      message: `Your investment of $${investment.amount.toLocaleString()} in "${investment.project.title}" has been approved!`,
      type: 'INVESTMENT_APPROVED',
      relatedId: investmentId,
      metadata: {
        investmentId,
        projectId: investment.projectId,
        projectTitle: investment.project.title,
        amount: investment.amount,
      },
    });
  }

  // Notify investor about investment rejection
  async notifyInvestmentRejected(investmentId: string, reason: string) {
    const investment = await this.prisma.investment.findUnique({
      where: { id: investmentId },
      include: {
        investor: true,
        project: true,
      },
    });

    if (!investment) {
      throw new Error('Investment not found');
    }

    return this.createNotification({
      userId: investment.investorId,
      title: 'Investment Rejected',
      message: `Your investment in "${investment.project.title}" has been rejected. Reason: ${reason}`,
      type: 'INVESTMENT_REJECTED',
      relatedId: investmentId,
      metadata: {
        investmentId,
        projectId: investment.projectId,
        projectTitle: investment.project.title,
        amount: investment.amount,
        reason,
      },
    });
  }

  // Notify investors about dividend distribution
  async notifyDividendDistributed(dividendId: string) {
    const dividend = await this.prisma.dividend.findUnique({
      where: { id: dividendId },
      include: {
        project: true,
        distributions: {
          include: {
            investor: true,
          },
        },
      },
    });

    if (!dividend) {
      throw new Error('Dividend not found');
    }

    // Create notifications for all investors
    const notifications = dividend.distributions.map(distribution =>
      this.createNotification({
        userId: distribution.investorId,
        title: 'Dividend Distributed',
        message: `You have received a dividend of $${distribution.amount.toLocaleString()} from "${dividend.project.title}"`,
        type: 'DIVIDEND_DISTRIBUTED',
        relatedId: dividendId,
        metadata: {
          dividendId,
          projectId: dividend.projectId,
          projectTitle: dividend.project.title,
          amount: distribution.amount,
          percentage: distribution.percentage,
        },
      })
    );

    return Promise.all(notifications);
  }

  // Get notifications for a user
  async getUserNotifications(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({
        where: { userId },
      }),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      unreadCount: await this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    };
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  // Get unread notification count
  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }
}