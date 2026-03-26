import { io, Socket } from 'socket.io-client';
import { API_URL } from '@/utils/constants';

class SocketService {
  private socket: Socket | null = null;
  private token: string | null = null;

  connect(token: string): void {
    // Chat sementara dinonaktifkan, jangan inisialisasi websocket
    console.warn('SocketService.connect() is disabled temporarily');
    this.token = token;
    // No websocket initialization while chat feature is disabled
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  subscribeToEvent(event: string, callback: (...args: any[]) => void): void {
    if (!this.socket) {
      console.warn('SocketService.subscribeToEvent() called but socket disabled');
      return;
    }
    this.socket.on(event, callback);
  }
  
  joinChat(chatId: string): void {
    if (!this.socket) {
      console.warn('SocketService.joinChat() called but socket disabled');
      return;
    }
    this.socket.emit('join_chat', { chatId });
  }
  
  leaveChat(chatId: string): void {
    if (!this.socket) {
      console.warn('SocketService.leaveChat() called but socket disabled');
      return;
    }
    this.socket.emit('leave_chat', { chatId });
  }

  unsubscribeFromEvent(event: string, callback?: (...args: any[]) => void): void {
    if (!this.socket) {
      console.warn('SocketService.unsubscribeFromEvent() called but socket disabled');
      return;
    }
    
    if (callback) {
      this.socket.off(event, callback);
    } else {
      this.socket.off(event);
    }
  }

  emitEvent(event: string, ...args: any[]): void {
    if (!this.socket) {
      console.warn('SocketService.emitEvent() called but socket disabled');
      return;
    }
    this.socket.emit(event, ...args);
  }

  isConnected(): boolean {
    return false;
  }

  reconnect(): void {
    console.warn('SocketService.reconnect() is disabled temporarily');
  }
}

const socketService = new SocketService();
export default socketService;