import axiosInstance from '@/utils/axiosConfig';

export interface ChatListItem {
  id: string;
  type?: 'TRADING_SUPPORT' | 'INVESTMENT_INQUIRY' | 'GENERAL_SUPPORT';
  title: string;
  lastMessage: string;
  lastMessageAt: string | null;
  participants: Array<{ id: string; fullname: string; role: string }>
  unreadCount?: number;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string | null;
  createdAt: string;
  sender?: { id: string; fullname: string; role: string };
  attachments?: Array<{ id: string; fileName: string; originalName: string; fileSize: number; mimeType: string; fileUrl: string }>;
}

class ChatService {
  async startChat(payload: { type?: 'TRADING_SUPPORT' | 'INVESTMENT_INQUIRY' | 'GENERAL_SUPPORT'; projectId?: string; title?: string }) {
    const { data } = await axiosInstance.post('/chat/start', payload);
    return data as { id: string };
  }

  async startChatWith(targetUserId: string, payload?: { type?: 'TRADING_SUPPORT' | 'INVESTMENT_INQUIRY' | 'GENERAL_SUPPORT'; title?: string }) {
    const { data } = await axiosInstance.post('/chat/start-with', { targetUserId, ...(payload || {}) });
    return data as { id: string };
  }

  async listMyChats() {
    const { data } = await axiosInstance.get('/chat/my');
    return data as ChatListItem[];
  }

  async getMessages(chatId: string, opts?: { cursor?: string; limit?: number }) {
    const qs = new URLSearchParams();
    if (opts?.cursor) qs.set('cursor', opts.cursor);
    if (opts?.limit) qs.set('limit', String(opts.limit));
    const { data } = await axiosInstance.get(`/chat/${chatId}/messages${qs.toString() ? `?${qs.toString()}` : ''}`);
    return data as ChatMessage[];
  }

  async postMessage(chatId: string, content: string) {
    const { data } = await axiosInstance.post(`/chat/${chatId}/messages`, { content });
    return data as ChatMessage;
  }

  async uploadAttachments(chatId: string, files: File[]) {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    const { data } = await axiosInstance.post(`/chat/${chatId}/attachments`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data as ChatMessage;
  }
}

export default new ChatService();