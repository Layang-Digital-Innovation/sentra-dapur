import { Controller, Get, Put, Param, Query, Request, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // Get notifications for current user
  @Get()
  async getMyNotifications(
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.notificationService.getUserNotifications(
      req.user.id,
      parseInt(page),
      parseInt(limit),
    );
  }

  // Get unread notification count
  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    const count = await this.notificationService.getUnreadCount(req.user.id);
    return { count };
  }

  // Mark specific notification as read
  @Put(':id/read')
  async markAsRead(@Param('id') notificationId: string, @Request() req) {
    await this.notificationService.markAsRead(notificationId, req.user.id);
    return { success: true };
  }

  // Mark all notifications as read
  @Put('mark-all-read')
  async markAllAsRead(@Request() req) {
    await this.notificationService.markAllAsRead(req.user.id);
    return { success: true };
  }
}