import React, { useEffect, useRef, useState } from 'react';
import { Avatar, Box, Chip, CircularProgress, Paper, Typography, useTheme, Badge, Tooltip } from '@mui/material';
import { Message, MessageType, User, Role } from '@/types/chat.types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import ChatInput from './ChatInput';
import { useAuth } from '@/hooks/useAuth';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import DoneIcon from '@mui/icons-material/Done';

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (content: string, files?: File[]) => Promise<void>;
  chatTitle?: string;
  chatSubtitle?: string;
  isTyping?: boolean;
  isClosed?: boolean;
  typingUser?: User | null;
  onMarkAsRead?: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  isLoading,
  onSendMessage,
  chatTitle,
  chatSubtitle,
  isTyping = false,
  isClosed = false,
  typingUser,
  onMarkAsRead
}) => {
  const theme = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    scrollToBottom();
    if (messages.length > 0 && onMarkAsRead) {
      onMarkAsRead();
    }
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    if (!hasScrolled) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const getBubbleColors = (message: Message) => {
    const isAdminSender = message.sender?.role === Role.ADMIN || message.sender?.role === Role.SUPER_ADMIN;
    // High-contrast palettes
    const adminBg = '#16a34a'; // green-600
    const otherBg = '#f3f4f6'; // gray-100 for better blue link visibility
    const adminText = '#ffffff';
    const otherText = '#111827'; // gray-900
    return {
      bg: isAdminSender ? adminBg : otherBg,
      color: isAdminSender ? adminText : otherText,
      isAdmin: isAdminSender,
    };
  };

  const formatMessageTime = (timestamp: string | Date) => {
    return format(new Date(timestamp), 'HH:mm', { locale: id });
  };

  const formatMessageDate = (timestamp: string | Date) => {
    return format(new Date(timestamp), 'EEEE, d MMMM yyyy', { locale: id });
  };

  const isNewDay = (current: Message, previous: Message | null) => {
    if (!previous) return true;
    
    const currentDate = new Date(current.createdAt);
    const previousDate = new Date(previous.createdAt);
    
    return (
      currentDate.getDate() !== previousDate.getDate() ||
      currentDate.getMonth() !== previousDate.getMonth() ||
      currentDate.getFullYear() !== previousDate.getFullYear()
    );
  };

  const renderMessageContent = (message: Message) => {
    switch (message.type) {
      case MessageType.TEXT:
        return <Typography variant="body1">{message.content}</Typography>;
      
      case MessageType.IMAGE:
        return (
          <Box sx={{ mt: 1 }}>
            <img 
              src={message.attachments?.[0]?.fileUrl} 
              alt="Gambar" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '300px', 
                borderRadius: theme.shape.borderRadius 
              }} 
            />
            {message.content && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                {message.content}
              </Typography>
            )}
          </Box>
        );
      
      case MessageType.DOCUMENT:
        return (
          <Box sx={{ mt: 1 }}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                cursor: 'pointer',
              }}
              onClick={() => {
                if (message.attachments?.[0]?.fileUrl) {
                  window.open(message.attachments[0].fileUrl, '_blank');
                }
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {message.attachments?.[0]?.originalName || 'Dokumen'}
              </Typography>
              {message.content && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {message.content}
                </Typography>
              )}
            </Paper>
          </Box>
        );
      
      case MessageType.FILE:
        return (
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {(message.attachments || []).map((att, idx) => (
              <Paper
                key={`${message.id}-att-${idx}`}
                variant="outlined"
                sx={{
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {att.originalName || att.fileName || 'Attachment'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {Math.round((att.fileSize || 0) / 1024)} KB
                  </Typography>
                </Box>
                <Chip
                  component="a"
                  clickable
                  href={att.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  label="Buka"
                  color="default"
                  variant="outlined"
                  size="small"
                />
              </Paper>
            ))}
            {message.content && (
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {message.content}
              </Typography>
            )}
          </Box>
        );
      
      case MessageType.SYSTEM:
        return (
          <Chip 
            label={message.content} 
            color="default" 
            variant="outlined" 
            size="small" 
          />
        );
      
      default:
        return <Typography variant="body1">{message.content}</Typography>;
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: theme.palette.background.default,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.background.paper,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar 
            sx={{ 
              mr: 1.5, 
              bgcolor: theme.palette.primary.main,
              width: 40,
              height: 40
            }}
          >
            {chatTitle?.charAt(0) || 'C'}
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight="bold">
              {chatTitle || 'Percakapan'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isTyping ? 
                `${typingUser?.profile?.fullName || typingUser?.name || 'Seseorang'} sedang mengetik...` : 
                chatSubtitle || (isClosed ? 'Percakapan ditutup' : 'Online')}
            </Typography>
          </Box>
        </Box>
        {isClosed && (
          <Chip 
            label="Ditutup" 
            color="error" 
            size="small"
            sx={{ 
              borderRadius: '16px',
              fontWeight: 'bold'
            }} 
          />
        )}
      </Box>

      {/* Messages */}
      <Box
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : messages.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography color="text.secondary">
              Belum ada pesan. Mulai percakapan sekarang!
            </Typography>
          </Box>
        ) : (
          messages.map((message, index) => {
            const isCurrentUser = message.sender?.id === user?.user.id;
            const previousMessage = index > 0 ? messages[index - 1] : null;
            const showDateSeparator = isNewDay(message, previousMessage);
            
            return (
              <React.Fragment key={message.id}>
                {showDateSeparator && (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      my: 2,
                    }}
                  >
                    <Chip
                      label={formatMessageDate(message.createdAt)}
                      variant="outlined"
                      size="small"
                    />
                  </Box>
                )}
                
                {message.type === MessageType.SYSTEM ? (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      my: 2,
                    }}
                  >
                    {renderMessageContent(message)}
                  </Box>
                ) : (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: isCurrentUser ? 'row-reverse' : 'row',
                      alignItems: 'flex-end',
                      mb: 2,
                    }}
                  >
                    {!isCurrentUser && (
                      <Avatar
                        src={message.sender?.avatar || undefined}
                        sx={{ mr: 1, width: 36, height: 36 }}
                      >
                        {message.sender?.name?.charAt(0) || 'U'}
                      </Avatar>
                    )}
                    
                    <Box
                      sx={{
                        maxWidth: '70%',
                        // admin = green, others = purple, readable text
                        ...(getBubbleColors(message)),
                        bgcolor: getBubbleColors(message).bg,
                        color: getBubbleColors(message).color,
                        borderRadius: isCurrentUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        p: 2,
                        ...(isCurrentUser ? { ml: 1 } : { mr: 1 }),
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                        position: 'relative',
                        '&:hover': {
                          boxShadow: '0 3px 8px rgba(0,0,0,0.15)',
                          transition: 'all 0.2s ease'
                        },
                        '& a': {
                          color: getBubbleColors(message).isAdmin ? 'inherit' : theme.palette.primary.main,
                          textDecoration: 'underline',
                        }
                      }}
                    >
                    {!isCurrentUser && (
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ color: theme.palette.primary.main }}>
                        {message.sender?.name || 'Pengguna'}
                      </Typography>
                    )}
                    
                    {renderMessageContent(message)}
                    
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        textAlign: 'right',
                        mt: 1,
                        opacity: 0.7,
                        fontSize: '0.7rem'
                      }}
                    >
                      {formatMessageTime(message.createdAt)}
                    </Typography>
                  </Box>
                  </Box>
                )}
              </React.Fragment>
            );
          })
        )}
        
        {isTyping && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              mt: 1,
            }}
          >
            <Avatar sx={{ width: 24, height: 24, mr: 1 }} />
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                bgcolor: theme.palette.background.paper,
                borderRadius: 2,
                p: 1,
                px: 2,
              }}
            >
              <Typography variant="body2">Sedang mengetik</Typography>
              <Box
                sx={{
                  display: 'flex',
                  ml: 1,
                  '& > span': {
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    bgcolor: theme.palette.text.secondary,
                    mx: 0.25,
                    animation: 'typing-dot 1.4s infinite ease-in-out both',
                  },
                  '& > span:nth-of-type(1)': {
                    animationDelay: '0s',
                  },
                  '& > span:nth-of-type(2)': {
                    animationDelay: '0.2s',
                  },
                  '& > span:nth-of-type(3)': {
                    animationDelay: '0.4s',
                  },
                  '@keyframes typing-dot': {
                    '0%, 80%, 100%': {
                      transform: 'scale(0)',
                    },
                    '40%': {
                      transform: 'scale(1)',
                    },
                  },
                }}
              >
                <span />
                <span />
                <span />
              </Box>
            </Box>
          </Box>
        )}
        
        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      <Box
        sx={{
          p: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.background.paper,
        }}
      >
        <ChatInput onSendMessage={onSendMessage} disabled={isClosed} />
      </Box>
    </Box>
  );
};

export default ChatWindow;