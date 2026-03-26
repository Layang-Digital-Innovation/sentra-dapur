'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import type { Socket } from 'socket.io-client';
import type { Chat, Message } from '@/types/chat.types';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinChat: (chatId: string) => void;
  leaveChat: (chatId: string) => void;
  sendMessage: (data: any) => void;
  markMessagesAsRead: (chatId: string) => void;
  startTyping: (chatId: string) => void;
  stopTyping: (chatId: string) => void;
  getChats: () => void;
  onMessageReceived: (callback: (message: Message) => void) => void;
  onMessagesMarkedRead: (callback: (data: { chatId: string; userId: string }) => void) => void;
  onUserTyping: (callback: (data: { chatId: string; userId: string; userEmail: string }) => void) => void;
  onUserStoppedTyping: (callback: (data: { chatId: string; userId: string }) => void) => void;
  onChatList: (callback: (chats: Chat[]) => void) => void;
  onNewChatCreated: (callback: (chat: Chat) => void) => void;
  onChatAssigned: (callback: (data: { chatId: string; adminId: string }) => void) => void;
  onError: (callback: (error: { message: string; code?: string }) => void) => void;
}

// Safe default (no-op) implementation while chat feature is disabled
const defaultValue: SocketContextType = {
  socket: null,
  isConnected: false,
  joinChat: () => {},
  leaveChat: () => {},
  sendMessage: () => {},
  markMessagesAsRead: () => {},
  startTyping: () => {},
  stopTyping: () => {},
  getChats: () => {},
  onMessageReceived: () => {},
  onMessagesMarkedRead: () => {},
  onUserTyping: () => {},
  onUserStoppedTyping: () => {},
  onChatList: () => {},
  onNewChatCreated: () => {},
  onChatAssigned: () => {},
  onError: () => {},
};

const SocketContext = createContext<SocketContextType>(defaultValue);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  // Chat/WebSocket di-nonaktifkan: Provider hanya mengembalikan nilai default tanpa koneksi
  return <SocketContext.Provider value={defaultValue}>{children}</SocketContext.Provider>;
};

export const useSocket = (): SocketContextType => {
  // Kembalikan stub yang aman meskipun diakses tanpa provider
  return useContext(SocketContext);
};