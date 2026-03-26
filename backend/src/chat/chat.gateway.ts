import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Injectable, Logger } from '@nestjs/common';
import { ChatService } from './chat.service';

interface AuthedSocket extends Socket {
  user?: { id: string; email?: string; role?: string };
}

@Injectable()
@WebSocketGateway({ namespace: '/chat', cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger('ChatGateway');

  constructor(private jwt: JwtService, private chatService: ChatService) {}

  async handleConnection(client: AuthedSocket) {
    try {
      const token = this.extractToken(client);
      const payload = this.jwt.verify(token);
      client.user = { id: payload.sub || payload.id, email: payload.email, role: payload.role };
      this.logger.log(`Socket connected ${client.id} user=${client.user.id}`);
    } catch (e) {
      this.logger.warn(`Unauthorized socket: ${e?.message}`);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: AuthedSocket) {
    this.logger.log(`Socket disconnected ${client.id}`);
  }

  @SubscribeMessage('joinRoom')
  async onJoinRoom(client: AuthedSocket, payload: { chatId: string }) {
    if (!client.user) return client.disconnect(true);
    const { chatId } = payload || {};
    if (!chatId) return;
    // Ensure participant
    await this.chatService.ensureParticipant(chatId, client.user.id);
    client.join(chatId);
    client.emit('joined', { chatId });
  }

  @SubscribeMessage('typing')
  async onTyping(client: AuthedSocket, payload: { chatId: string; typing: boolean }) {
    if (!client.user) return;
    const { chatId, typing } = payload || ({} as any);
    if (!chatId) return;
    client.to(chatId).emit('typing', { chatId, userId: client.user.id, typing: !!typing });
  }

  @SubscribeMessage('sendMessage')
  async onSendMessage(client: AuthedSocket, payload: { chatId: string; content: string }) {
    if (!client.user) return client.disconnect(true);
    const { chatId, content } = payload || ({} as any);
    if (!chatId || !content) return;
    // Persist and broadcast
    const msg = await this.chatService.postMessage(chatId, client.user.id, content);
    this.server.to(chatId).emit('message', { chatId, message: msg });
    return { ok: true };
  }

  private extractToken(client: Socket): string {
    // Try header first
    const auth = (client.handshake.headers['authorization'] || client.handshake.headers['Authorization']) as string | undefined;
    if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
    // Then query
    const qtoken = (client.handshake.query?.token as string) || '';
    if (qtoken) return qtoken;
    throw new Error('Missing token');
  }
}
