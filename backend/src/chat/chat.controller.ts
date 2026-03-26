import { Body, Controller, Get, Post, Param, Query, UseGuards, Request, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { ChatGateway } from './chat.gateway';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService, private gateway: ChatGateway) {}

  @Post('start')
  async start(@Request() req, @Body() body: { type?: string; projectId?: string; title?: string }) {
    return this.chatService.startChat(req.user.id, {
      type: body.type as any,
      projectId: body.projectId,
      title: body.title,
    });
  }

  @Post('start-with')
  async startWith(@Request() req, @Body() body: { targetUserId: string; type?: string; title?: string }) {
    return this.chatService.startChatWithUser(req.user.id, body.targetUserId, {
      type: body.type as any,
      title: body.title,
    });
  }

  @Get('my')
  async myChats(@Request() req) {
    return this.chatService.listMyChats(req.user.id);
  }

  @Get(':id/messages')
  async getMessages(
    @Request() req,
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getMessages(id, req.user.id, { cursor, limit: limit ? Number(limit) : undefined });
  }

  @Post(':id/messages')
  async postMessage(@Request() req, @Param('id') id: string, @Body('content') content: string) {
    const msg = await this.chatService.postMessage(id, req.user.id, content);
    // broadcast
    this.gateway.server.to(id).emit('message', { chatId: id, message: msg });
    return msg;
  }

  @Post(':id/attachments')
  @UseInterceptors(FilesInterceptor('files', 10, {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const dest = join(process.cwd(), 'uploads', 'chat-attachments');
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const filename = `chat-${uniqueSuffix}${extname(file.originalname)}`;
        cb(null, filename);
      },
    }),
    fileFilter: (req, file, cb) => {
      // allow images and documents
      if (file.mimetype.match(/\/(jpg|jpeg|png|gif|pdf|doc|docx|xls|xlsx|txt)$/)) cb(null, true);
      else cb(new Error('Unsupported file type'), false);
    },
    limits: { fileSize: 15 * 1024 * 1024 },
  }))
  async uploadAttachments(
    @Request() req,
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const list = (files || []).map((f) => ({
      fileName: f.filename,
      originalName: f.originalname,
      fileSize: f.size,
      mimeType: f.mimetype,
      fileUrl: `/uploads/chat-attachments/${f.filename}`,
    }));
    const msg = await this.chatService.addMessageAttachments(id, req.user.id, list);
    this.gateway.server.to(id).emit('message', { chatId: id, message: msg });
    return msg;
  }
}
