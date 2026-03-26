import React, { useState, useEffect, useCallback } from 'react';
import { Box, Paper, useTheme, useMediaQuery, Typography, Snackbar, Alert, CircularProgress, Button } from '@mui/material';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';
import { Chat as ChatType, Message, ChatStatus, Role } from '@/types/chat.types';
import chatService from '@/services/chat.service';
import socketService from '@/services/socket.service';
import { useAuth } from '@/hooks/useAuth';
import NewChatModal from './NewChatModal';
import { toast } from 'react-hot-toast';

// Feature flag: disable chat feature globally
const CHAT_FEATURE_ENABLED = false;

const Chat: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const isAdmin = user?.user.role === Role.ADMIN || user?.user.role === Role.SUPER_ADMIN;
  
  const [chats, setChats] = useState<ChatType[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [showSidebar, setShowSidebar] = useState(!isMobile);
  const [error, setError] = useState<string | null>(null);

  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);

  // Inisialisasi koneksi socket
  useEffect(() => {
    if (!CHAT_FEATURE_ENABLED) return; // disable semua inisialisasi saat chat disembunyikan

    if (user) {
      socketService.connect(user.access_token);
      
      // Setup socket event listeners
      socketService.subscribeToEvent('new_message', handleNewMessage);
      socketService.subscribeToEvent('user_typing', handleUserTyping);
      socketService.subscribeToEvent('messages_read', handleMessagesRead);
      socketService.subscribeToEvent('unread_count', handleUnreadCount);
      socketService.subscribeToEvent('new_chat_created', handleNewChat);
      
      // Load chats
      loadChats();
      
      // Load unread counts
      refreshUnreadCount();
    }
    
    return () => {
      if (!CHAT_FEATURE_ENABLED) return;
      socketService.unsubscribeFromEvent('new_message', handleNewMessage);
      socketService.unsubscribeFromEvent('user_typing', handleUserTyping);
      socketService.unsubscribeFromEvent('messages_read', handleMessagesRead);
      socketService.unsubscribeFromEvent('unread_count', handleUnreadCount);
      socketService.unsubscribeFromEvent('new_chat_created', handleNewChat);
      socketService.disconnect();
    };
  }, [user]);

  // Responsive sidebar
  useEffect(() => {
    setShowSidebar(!isMobile || !selectedChatId);
  }, [isMobile, selectedChatId]);

  // Load chats
  const loadChats = async () => {
    if (!CHAT_FEATURE_ENABLED) return; // guard
    if (!user) return;
    
    setIsLoadingChats(true);
    setError(null);
    
    try {
      let loadedChats: ChatType[];
      
      // Admin dan non-admin menggunakan getUserChats karena getAdminChats sudah dihapus
      loadedChats = await chatService.getUserChats();
      
      setChats(loadedChats);
      
      // Auto-select first chat if none selected
      if (loadedChats.length > 0 && !selectedChatId) {
        handleSelectChat(loadedChats[0].id);
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
      setError('Gagal memuat daftar percakapan');
      toast.error('Gagal memuat daftar percakapan');
    } finally {
      setIsLoadingChats(false);
    }
  };

  // Load messages for selected chat
  const loadMessages = async (chatId: string) => {
    if (!CHAT_FEATURE_ENABLED) return; // guard
    setIsLoading(true);
    
    try {
      const chat = await chatService.getChatById(chatId);
      setMessages(chat.messages || []);
      
      // Join chat room via socket
      socketService.joinChat(chatId);
      
      // Mark messages as read
      if (chat.unreadCount && chat.unreadCount > 0) {
        await chatService.markMessagesAsRead(chatId);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error('Gagal memuat pesan');
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh unread message counts
  const refreshUnreadCount = async () => {
    if (!CHAT_FEATURE_ENABLED) return; // guard
    try {
      const counts = await chatService.getUnreadCount();
      setUnreadCounts(prev => Object.assign({}, prev, counts));
    } catch (error) {
      console.error('Failed to get unread counts:', error);
    }
  };

  // Handle chat selection
  const handleSelectChat = (chatId: string) => {
    if (!CHAT_FEATURE_ENABLED) return; // guard
    if (selectedChatId) {
      socketService.leaveChat(selectedChatId);
    }
    
    setSelectedChatId(chatId);
    loadMessages(chatId);
    
    // On mobile, hide sidebar when chat is selected
    if (isMobile) {
      setShowSidebar(false);
    }
  };

  // Handle sending a message
  const handleSendMessage = async (content: string, files?: File[]) => {
    if (!CHAT_FEATURE_ENABLED) return; // guard
    if (!selectedChatId) return;
    
    try {
      let newMessage: Message;
      
      const userId = user?.user.id || '';
      
      // sendMessageWithFile sudah dihapus, gunakan sendMessage saja yang sekarang mendukung file
      newMessage = await chatService.sendMessage(selectedChatId, content, files && files.length > 0 ? [files[0]] : undefined);
      
      setMessages(prev => [...prev, newMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Gagal mengirim pesan');
    }
  };

  // Handle new chat creation
  const handleNewChat = useCallback((chat: ChatType) => {
    if (!CHAT_FEATURE_ENABLED) return; // guard
    setChats(prev => [chat, ...prev]);
    handleSelectChat(chat.id);
  }, []);

  // Memulai chat baru dengan admin
  const startChatWithAdmin = async () => {
    if (!CHAT_FEATURE_ENABLED) {
      toast('Fitur chat sedang disembunyikan sementara');
      return;
    }
    setIsNewChatModalOpen(true);
  };

  // Memulai chat baru sebagai admin dengan pengguna
  const startChatAsAdmin = async (userId: string) => {
    if (!CHAT_FEATURE_ENABLED) {
      toast('Fitur chat sedang disembunyikan sementara');
      return;
    }
    setIsNewChatModalOpen(true);
  };

  // Socket event handlers
  const handleNewMessage = useCallback((message: Message) => {
    if (!CHAT_FEATURE_ENABLED) return; // guard
    if (selectedChatId === message.chatId) {
      setMessages(prev => [...prev, message]);
      chatService.markMessagesAsRead(message.chatId);
    }
    
    // Update chat list to show latest message
    setChats(prev => {
      const updatedChats = [...prev];
      const chatIndex = updatedChats.findIndex(c => c.id === message.chatId);
      
      if (chatIndex !== -1) {
        const updatedChat = { ...updatedChats[chatIndex] };
        updatedChat.lastMessage = message;
        
        // Move chat to top of list
        updatedChats.splice(chatIndex, 1);
        updatedChats.unshift(updatedChat);
      }
      
      return updatedChats;
    });
    
    // Update unread count if not in current chat
    if (selectedChatId !== message.chatId) {
      setUnreadCounts(prev => ({
        ...prev,
        [message.chatId]: (prev[message.chatId] || 0) + 1
      }));
    }
  }, [selectedChatId]);

  const handleUserTyping = useCallback((data: { chatId: string; isTyping: boolean }) => {
    if (!CHAT_FEATURE_ENABLED) return; // guard
    if (selectedChatId === data.chatId) {
      setIsTyping(data.isTyping);
    }
  }, [selectedChatId]);

  const handleMessagesRead = useCallback((data: { chatId: string }) => {
    if (!CHAT_FEATURE_ENABLED) return; // guard
    if (selectedChatId === data.chatId) {
      // Update read status for messages in current chat
      setMessages(prev => 
        prev.map(msg => ({
          ...msg,
          isRead: true
        }))
      );
    }
  }, [selectedChatId]);

  const handleUnreadCount = useCallback((counts: Record<string, number>) => {
    if (!CHAT_FEATURE_ENABLED) return; // guard
    setUnreadCounts(counts);
  }, []);

  const handleChatAssigned = useCallback((chat: ChatType) => {
    if (!CHAT_FEATURE_ENABLED) return; // guard
    setChats(prev => {
      const exists = prev.some(c => c.id === chat.id);
      
      if (exists) {
        return prev.map(c => c.id === chat.id ? chat : c);
      } else {
        return [chat, ...prev];
      }
    });
  }, []);

  // Get current chat title
  const getCurrentChatTitle = () => {
    if (!selectedChatId) return '';
    const currentChat = chats.find(chat => chat.id === selectedChatId);
    return currentChat?.title || 'Percakapan Tanpa Judul';
  };

  // Mendapatkan subtitle untuk chat yang dipilih
  const getCurrentChatSubtitle = () => {
    if (!selectedChatId) return '';
    
    const currentChat = chats.find(chat => chat.id === selectedChatId);
    if (!currentChat) return '';
    
    // Jika ada project, tampilkan title project (bukan name)
    if (currentChat.project?.title) {
      return `Project: ${currentChat.project.title}`;
    }
    
    // Jika tidak ada project, tampilkan tipe chat
    return `Tipe: ${currentChat.type}`;
  };

  // Check if current chat is closed
  const isCurrentChatClosed = () => {
    if (!selectedChatId) return false;
    const currentChat = chats.find(chat => chat.id === selectedChatId);
    return currentChat?.status === 'CLOSED';
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'row' }}>
      {/* Sidebar */}
      {showSidebar && (
        <Box
          sx={{
            width: { xs: '100%', md: '33.333%', lg: '25%' },
            height: '100%',
            flexShrink: 0
          }}
        >
          <Paper 
            elevation={0} 
            sx={{ 
              height: '100%', 
              borderRadius: 0,
              borderRight: `1px solid ${theme.palette.divider}` 
            }}
          >
            <ChatSidebar
              chats={chats}
              selectedChatId={selectedChatId}
              onSelectChat={handleSelectChat}
              unreadCounts={unreadCounts}
              onStartChatWithAdmin={startChatWithAdmin}
              onStartChatAsAdmin={startChatAsAdmin}
              onOpenNewChat={() => setIsNewChatModalOpen(true)}
              isLoading={isLoadingChats}
            />
          </Paper>
        </Box>
      )}
      
      {/* Chat Window */}
      <Box
        sx={{
          flexGrow: 1,
          height: '100%',
          display: 'flex',
          width: showSidebar ? { xs: '0%', md: '66.667%', lg: '75%' } : '100%'
        }}
      >
        {selectedChatId ? (
          <ChatWindow
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
            chatTitle={getCurrentChatTitle()}
            chatSubtitle={getCurrentChatSubtitle()}
            isTyping={isTyping}
            typingUser={typingUser ? chats.find(c => c.id === selectedChatId)?.admin : null}
            isClosed={isCurrentChatClosed()}
            onMarkAsRead={() => chatService.markMessagesAsRead(selectedChatId || '')}
          />
        ) : (
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              width: '100%',
              bgcolor: theme.palette.background.default
            }}
          >
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="h6">Pilih percakapan</Typography>
                <Typography variant="body2" color="text.secondary">
                  Pilih percakapan dari daftar atau mulai percakapan baru
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary" 
                  sx={{ mt: 2 }}
                  onClick={() => setIsNewChatModalOpen(true)}
                >
                  Mulai Percakapan Baru
                </Button>
              </Box>
            </Box>
        )}
      </Box>

      {/* New Chat Modal */}
      <NewChatModal
        open={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        onChatCreated={handleNewChat}
        isAdmin={isAdmin}
      />
    </Box>
  );
};

export default Chat;