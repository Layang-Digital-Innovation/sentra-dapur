import { io, Socket } from 'socket.io-client';
import { Message, Chat } from '@/types/chat.types';
import authService from '@/services/auth.service';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect() {
    // Chat sementara dinonaktifkan, jangan inisialisasi websocket
    console.warn('utils/socketService.connect() is disabled temporarily');
    return;
  }

  disconnect() {
    if (!this.socket) return;
    this.socket.disconnect();
    this.socket = null;
  }

  private setupListeners() {
    // Dinonaktifkan sementara
    return;
  }

  // Event emitters
  joinChat(chatId: string) {
    // Dinonaktifkan sementara
    console.warn('utils/socketService.joinChat() called but disabled');
  }

  leaveChat(chatId: string) {
    // Dinonaktifkan sementara
    console.warn('utils/socketService.leaveChat() called but disabled');
  }

  sendMessage(chatId: string, content: string) {
    // Dinonaktifkan sementara
    console.warn('utils/socketService.sendMessage() called but disabled');
  }

  markMessagesRead(chatId: string) {
    // Dinonaktifkan sementara
    console.warn('utils/socketService.markMessagesRead() called but disabled');
  }

  startTyping(chatId: string) {
    // Dinonaktifkan sementara
    console.warn('utils/socketService.startTyping() called but disabled');
  }

  stopTyping(chatId: string) {
    // Dinonaktifkan sementara
    console.warn('utils/socketService.stopTyping() called but disabled');
  }

  getChats() {
    // Dinonaktifkan sementara
    console.warn('utils/socketService.getChats() called but disabled');
  }

  // Event listeners
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  off(event: string, callback: Function) {
    if (!this.listeners.has(event)) return;
    
    const callbacks = this.listeners.get(event);
    if (!callbacks) return;
    
    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }

  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (!callbacks) return;
    
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${event} listener:`, error);
      }
    });
  }

  isConnected() {
    return false;
  }
}

const socketService = new SocketService();
export default socketService;