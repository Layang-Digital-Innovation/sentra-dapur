'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import chatService from '@/services/chat.service';
import { Message } from '@/types/chat.types';

// Feature flag: disable chat notifications globally while chat is hidden
const CHAT_FEATURE_ENABLED = false;

interface ChatNotificationContextType {
  unreadCount: number;
  unreadChats: Set<string>;
  markChatAsRead: (chatId: string) => void;
  refreshUnreadCount: () => void;
}

// Provide a safe default value so consumers won't throw when provider is absent
const defaultValue: ChatNotificationContextType = {
  unreadCount: 0,
  unreadChats: new Set<string>(),
  markChatAsRead: (_chatId: string) => {},
  refreshUnreadCount: () => {},
};

const ChatNotificationContext = createContext<ChatNotificationContextType>(defaultValue);

interface ChatNotificationProviderProps {
  children: ReactNode;
}

export const ChatNotificationProvider: React.FC<ChatNotificationProviderProps> = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadChats, setUnreadChats] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const { socket, onMessageReceived } = useSocket();

  // Request notification permission and load initial data on mount
  useEffect(() => {
    if (!CHAT_FEATURE_ENABLED) return;

    if (user) {
      refreshUnreadCount();
    }
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [user]);

  // Listen for chat read events
  useEffect(() => {
    if (!CHAT_FEATURE_ENABLED) return;

    if (socket) {
      socket.on('chatRead', (data: { chatId: string, userId: string }) => {
        if (data.userId === user?.user.id) {
          markChatAsRead(data.chatId);
        }
      });

      return () => {
        socket.off('chatRead');
      };
    }
  }, [socket, user]);

  // Listen for new messages
  useEffect(() => {
    if (!CHAT_FEATURE_ENABLED) return;

    onMessageReceived((message) => {
      // Only count as unread if message is not from current user
      if (message.senderId !== user?.user.id) {
        // Only count as unread if not currently viewing the specific chat
        const currentPath = window.location.pathname;
        const isViewingSpecificChat = currentPath.includes(`/chat/${message.chatId}`) || 
                                     (currentPath.includes('/chat') && window.location.search.includes(`chatId=${message.chatId}`));
        
        if (!isViewingSpecificChat) {
          setUnreadChats(prev => new Set([...prev, message.chatId]));
          setUnreadCount(prev => prev + 1);
          
          // Show browser notification if permission granted
          if (Notification.permission === 'granted') {
            const senderName = message.sender?.email || 'Unknown';
            const messageContent = message.content || 'File attachment';
            new Notification('Pesan Baru', {
              body: `${senderName}: ${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}`,
              icon: '/favicon.ico',
              tag: `chat-${message.chatId}` // Prevent duplicate notifications
            });
          }
        }
      }
    });
  }, [user?.user.id, onMessageReceived]);

  const refreshUnreadCount = async () => {
    if (!CHAT_FEATURE_ENABLED) return;

    try {
      if (!user) return;
      
      try {
        const chats = await chatService.getUserChats();
        const unreadChatIds = new Set<string>();
        let totalUnread = 0;

        chats.forEach(chat => {
          if (chat.messages && chat.messages.length > 0) {
            const unreadMessages = chat.messages.filter(
              msg => !msg.isRead && msg.senderId !== user.user.id
            );
            if (unreadMessages.length > 0) {
              unreadChatIds.add(chat.id);
              totalUnread += unreadMessages.length;
            }
          }
        });

        setUnreadChats(unreadChatIds);
        setUnreadCount(totalUnread);
      } catch (chatError) {
        // Silence chat errors while feature is disabled
        // console.debug('Chat feature disabled or endpoint unavailable:', chatError);
      }
    } catch (error) {
      // Silence errors while feature is disabled
      // console.debug('Error refreshing unread count:', error);
    }
  };

  const markChatAsRead = (chatId: string) => {
    if (!CHAT_FEATURE_ENABLED) return;

    setUnreadChats(prev => {
      const newSet = new Set(prev);
      newSet.delete(chatId);
      return newSet;
    });
    
    // Recalculate unread count
    refreshUnreadCount();
  };

  const value: ChatNotificationContextType = CHAT_FEATURE_ENABLED ? {
    unreadCount,
    unreadChats,
    markChatAsRead,
    refreshUnreadCount,
  } : defaultValue;

  return (
    <ChatNotificationContext.Provider value={value}>
      {children}
    </ChatNotificationContext.Provider>
  );
};

export const useChatNotifications = (): ChatNotificationContextType => {
  return useContext(ChatNotificationContext);
};