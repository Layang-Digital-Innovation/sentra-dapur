import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatStatus, ChatType, MessageType, Role } from '@prisma/client';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async ensureParticipant(chatId: string, userId: string) {
    const exists = await this.prisma.chatParticipant.findFirst({ where: { chatId, userId } });
    if (!exists) throw new UnauthorizedException('Not a participant of this chat');
  }

  async startChat(requesterId: string, payload: { type?: ChatType; projectId?: string; title?: string }) {
    // Determine requester role to route chat to proper admins
    const requester = await this.prisma.user.findUnique({ where: { id: requesterId }, select: { role: true } });
    const isInvestmentUser = requester?.role === Role.INVESTOR || requester?.role === Role.PROJECT_OWNER;
    const isTradingUser = requester?.role === Role.BUYER || requester?.role === Role.SUPPLIER;
    const type = payload.type || (isInvestmentUser ? ChatType.INVESTMENT_INQUIRY : ChatType.TRADING_SUPPORT);

    // Create chat
    const chat = await this.prisma.chat.create({
      data: {
        type,
        status: ChatStatus.ACTIVE,
        projectId: payload.projectId || null,
        title: payload.title || null,
        participants: {
          create: [{ userId: requesterId }],
        },
      },
    });

    // Add admin participants based on requester segment
    const admins = await this.prisma.user.findMany({
      where: {
        OR: [
          // SUPER_ADMIN always included
          { role: Role.SUPER_ADMIN },
          // specialized admins by requester segment
          ...(isInvestmentUser ? [{ role: (Role as any).ADMIN_INVESTMENT }] : []),
          ...(isTradingUser ? [{ role: (Role as any).ADMIN_TRADING }] : []),
        ] as any,
      },
    });
    if (admins.length) {
      await this.prisma.chatParticipant.createMany({
        data: admins.map((a) => ({ chatId: chat.id, userId: a.id })),
        skipDuplicates: true,
      });
    }

    return this.getChatById(chat.id, requesterId);
  }

  async startChatWithUser(requesterId: string, targetUserId: string, payload: { type?: ChatType; title?: string }) {
    if (requesterId === targetUserId) {
      // fallback to normal start if same user
      return this.startChat(requesterId, { type: payload.type, title: payload.title });
    }

    // Determine type default based on requester role
    const requester = await this.prisma.user.findUnique({ where: { id: requesterId }, select: { role: true } });
    const isInvestmentUser = requester?.role === Role.INVESTOR || requester?.role === Role.PROJECT_OWNER;
    const type = payload.type || (isInvestmentUser ? ChatType.INVESTMENT_INQUIRY : ChatType.TRADING_SUPPORT);

    // Create chat with both requester and target
    const chat = await this.prisma.chat.create({
      data: {
        type,
        status: ChatStatus.ACTIVE,
        title: payload.title || null,
        participants: {
          create: [{ userId: requesterId }, { userId: targetUserId }],
        },
      },
    });

    // Ensure admins also included for visibility if requester is not a regular admin
    const admins = await this.prisma.user.findMany({
      where: {
        OR: [
          { role: Role.SUPER_ADMIN },
          { role: (Role as any).ADMIN_TRADING },
          ...(type === ChatType.INVESTMENT_INQUIRY ? [{ role: (Role as any).ADMIN_INVESTMENT }] : []),
        ] as any,
      },
    });
    if (admins.length) {
      await this.prisma.chatParticipant.createMany({
        data: admins.map((a) => ({ chatId: chat.id, userId: a.id })),
        skipDuplicates: true,
      });
    }

    return this.getChatById(chat.id, requesterId);
  }

  async getChatById(chatId: string, requesterId: string) {
    await this.ensureParticipant(chatId, requesterId);
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        participants: { include: { user: true } },
      },
    });
    if (!chat) throw new NotFoundException('Chat not found');
    return chat;
  }

  async listMyChats(userId: string) {
    const items = await this.prisma.chat.findMany({
      where: { participants: { some: { userId } } },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        participants: { include: { user: true } },
      },
    });
    // compute unread per chat based on participant.lastReadAt
    const result = [] as any[];
    for (const c of items) {
      const participant = c.participants.find((p) => p.userId === userId) as any;
      const lastReadAt: Date | null = participant?.lastReadAt || null;
      const unreadCount = await this.prisma.message.count({
        where: {
          chatId: c.id,
          createdAt: lastReadAt ? { gt: lastReadAt } : undefined,
          NOT: { senderId: userId },
        },
      });
      result.push({
        id: c.id,
        type: c.type,
        title: c.title || this.defaultTitle(c.participants.map((p) => p.user)),
        lastMessage: c.lastMessage || '',
        lastMessageAt: c.lastMessageAt || null,
        participants: c.participants.map((p) => ({ id: p.user.id, fullname: p.user.fullname, role: p.user.role })),
        unreadCount,
      });
    }
    return result;
  }

  defaultTitle(users: Array<{ fullname: string; role: Role }>) {
    const admin = users.find((u) => [Role.ADMIN, (Role as any).ADMIN_INVESTMENT, (Role as any).ADMIN_TRADING, Role.SUPER_ADMIN].includes(u.role as any));
    return admin ? `Chat with Admin` : `Support Chat`;
  }

  async getMessages(chatId: string, userId: string, params?: { cursor?: string; limit?: number }) {
    await this.ensureParticipant(chatId, userId);
    const take = Math.min(params?.limit || 20, 50);
    const where = { chatId } as any;
    const cursor = params?.cursor ? { id: params.cursor } : undefined;
    const items = await this.prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      ...(cursor ? { cursor, skip: 1 } : {}),
      include: { sender: true, attachments: true },
    });
    // mark as read now
    await this.prisma.chatParticipant.updateMany({
      where: { chatId, userId },
      data: { lastReadAt: new Date(), lastReadMessageId: items.length ? items[items.length - 1].id : undefined },
    });
    return items.reverse();
  }

  async postMessage(chatId: string, userId: string, content: string) {
    await this.ensureParticipant(chatId, userId);
    const msg = await this.prisma.message.create({
      data: {
        chatId,
        senderId: userId,
        content,
        type: MessageType.TEXT,
      },
      include: { sender: true },
    });
    await this.prisma.chat.update({
      where: { id: chatId },
      data: { lastMessage: content, lastMessageAt: new Date() },
    });
    return msg;
  }

  async addMessageAttachments(chatId: string, userId: string, files: Array<{ fileName: string; originalName: string; fileSize: number; mimeType: string; fileUrl: string }>) {
    await this.ensureParticipant(chatId, userId);
    const message = await this.prisma.message.create({
      data: {
        chatId,
        senderId: userId,
        type: 'FILE' as any,
        attachments: {
          create: files.map((f) => ({
            fileName: f.fileName,
            originalName: f.originalName,
            fileSize: f.fileSize,
            mimeType: f.mimeType,
            fileUrl: f.fileUrl,
          })),
        },
      },
      include: { attachments: true, sender: true },
    });
    await this.prisma.chat.update({ where: { id: chatId }, data: { lastMessage: '[attachment]', lastMessageAt: new Date() } });
    return message;
  }
}
