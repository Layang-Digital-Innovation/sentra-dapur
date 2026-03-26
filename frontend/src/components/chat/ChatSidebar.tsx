import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Avatar,
  Badge,
  IconButton,
  Divider,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Chip,
  Menu,
  MenuItem,
  Tooltip,
  useTheme,
  InputAdornment
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  FilterList as FilterListIcon,
  PersonAdd as PersonAddIcon,
  Close as CloseIcon,
  Circle as CircleIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Chat, ChatStatus, Role } from '@/types/chat.types';
import { useAuth } from '@/hooks/useAuth';

interface ChatSidebarProps {
  chats: Chat[];
  selectedChatId: string | null;
  unreadCounts: Record<string, number>;
  onSelectChat: (chatId: string) => void;
  onStartChatWithAdmin: () => void;
  onStartChatAsAdmin: (userId: string) => void;
  onOpenNewChat: () => void;
  isLoading?: boolean;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  chats,
  selectedChatId,
  unreadCounts,
  onSelectChat,
  onStartChatWithAdmin,
  onStartChatAsAdmin,
  onOpenNewChat,
  isLoading = false
}) => {
  const theme = useTheme();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed'>('all');

  const isAdmin = user?.user.role === Role.ADMIN || user?.user.role === Role.SUPER_ADMIN;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };

  const handleFilterSelect = (status: 'all' | 'active' | 'closed') => {
    setStatusFilter(status);
    handleFilterClose();
  };

  const formatLastMessageTime = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return format(date, 'HH:mm', { locale: id });
    } else if (diffInDays < 7) {
      return format(date, 'EEEE', { locale: id });
    } else {
      return format(date, 'dd/MM/yyyy', { locale: id });
    }
  };

  const filteredChats = chats
    .filter(chat => {
      // Filter berdasarkan status
      if (statusFilter === 'active' && chat.status === ChatStatus.CLOSED) return false;
      if (statusFilter === 'closed' && chat.status !== ChatStatus.CLOSED) return false;
      
      // Filter berdasarkan pencarian
      const searchLower = searchTerm.toLowerCase();
      return (
        chat.title?.toLowerCase().includes(searchLower) ||
        (typeof chat.lastMessage === 'object' && chat.lastMessage?.content?.toLowerCase().includes(searchLower)) ||
        (chat.investor?.email?.toLowerCase().includes(searchLower) || 
         chat.projectOwner?.email?.toLowerCase().includes(searchLower) || 
         chat.buyer?.email?.toLowerCase().includes(searchLower) || 
         chat.seller?.email?.toLowerCase().includes(searchLower) || 
         chat.admin?.email?.toLowerCase().includes(searchLower))
      );
    })
    .sort((a, b) => {
      // Urutkan berdasarkan waktu pesan terakhir (terbaru di atas)
      const dateA = typeof a.lastMessage === 'object' && a.lastMessage?.createdAt ? 
        new Date(a.lastMessage.createdAt) : new Date(a.createdAt);
      const dateB = typeof b.lastMessage === 'object' && b.lastMessage?.createdAt ? 
        new Date(b.lastMessage.createdAt) : new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        bgcolor: theme.palette.background.paper,
        borderRight: `1px solid ${theme.palette.divider}`,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="h6" fontWeight="bold">
          Percakapan
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Filter percakapan">
            <IconButton 
              size="small" 
              onClick={handleFilterClick}
              color={statusFilter !== 'all' ? 'primary' : 'default'}
            >
              <FilterListIcon />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={filterAnchorEl}
            open={Boolean(filterAnchorEl)}
            onClose={handleFilterClose}
          >
            <MenuItem 
              onClick={() => handleFilterSelect('all')}
              selected={statusFilter === 'all'}
            >
              Semua
            </MenuItem>
            <MenuItem 
              onClick={() => handleFilterSelect('active')}
              selected={statusFilter === 'active'}
            >
              Aktif
            </MenuItem>
            <MenuItem 
              onClick={() => handleFilterSelect('closed')}
              selected={statusFilter === 'closed'}
            >
              Ditutup
            </MenuItem>
          </Menu>
          <Tooltip title="Percakapan baru">
            <IconButton 
              size="small" 
              color="primary"
              onClick={onOpenNewChat}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Search */}
      <Box sx={{ p: 2 }}>
        <TextField
          fullWidth
          placeholder="Cari percakapan..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: searchTerm ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => setSearchTerm('')}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
            sx: {
              borderRadius: '24px',
              '& fieldset': {
                borderColor: theme.palette.divider,
              },
            }
          }}
        />
      </Box>

      {/* Quick Actions */}
      {!isAdmin && (
        <Box sx={{ px: 2, mb: 2 }}>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            startIcon={<PersonAddIcon />}
            onClick={onStartChatWithAdmin}
            sx={{ 
              borderRadius: '24px',
              textTransform: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            Hubungi Admin
          </Button>
        </Box>
      )}

      {/* Chat List */}
      <List sx={{ flexGrow: 1, overflow: 'auto', px: 1 }}>
        {isLoading ? (
          // Tampilkan loading state
          Array.from({ length: 3 }).map((_, index) => (
            <ListItemButton
              key={`loading-${index}`}
              sx={{
                borderRadius: '12px',
                mb: 0.5,
                opacity: 0.7,
                animation: 'pulse 1.5s infinite ease-in-out',
                '@keyframes pulse': {
                  '0%': { opacity: 0.6 },
                  '50%': { opacity: 0.8 },
                  '100%': { opacity: 0.6 },
                },
              }}
              disabled
            >
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: theme.palette.grey[300] }} />
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ 
                    height: 16, 
                    width: '70%', 
                    bgcolor: theme.palette.grey[300], 
                    borderRadius: 1 
                  }} />
                }
                secondary={
                  <Box sx={{ 
                    height: 12, 
                    width: '90%', 
                    bgcolor: theme.palette.grey[300], 
                    borderRadius: 1,
                    mt: 0.5
                  }} />
                }
              />
            </ListItemButton>
          ))
        ) : filteredChats.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography color="text.secondary">
              {searchTerm ? 'Tidak ada percakapan yang cocok' : 'Belum ada percakapan'}
            </Typography>
          </Box>
        ) : (
          filteredChats.map(chat => {
            const isSelected = selectedChatId === chat.id;
            const unreadCount = unreadCounts[chat.id] || 0;
            const isClosed = chat.status === ChatStatus.CLOSED;
            
            return (
              <ListItemButton
                key={chat.id}
                selected={isSelected}
                onClick={() => onSelectChat(chat.id)}
                sx={{
                  borderRadius: '12px',
                  mb: 0.5,
                  '&.Mui-selected': {
                    bgcolor: `${theme.palette.primary.main}15`,
                    '&:hover': {
                      bgcolor: `${theme.palette.primary.main}25`,
                    },
                  },
                  '&:hover': {
                    bgcolor: theme.palette.action.hover,
                  },
                }}
              >
                <ListItemAvatar>
                  <Badge
                    color="primary"
                    badgeContent={unreadCount}
                    invisible={unreadCount === 0}
                    overlap="circular"
                  >
                    <Avatar 
                      sx={{ 
                        bgcolor: isClosed ? theme.palette.grey[400] : theme.palette.primary.main,
                        opacity: isClosed ? 0.7 : 1
                      }}
                    >
                      {chat.title?.charAt(0) || 'C'}
                    </Avatar>
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography 
                        variant="subtitle2" 
                        noWrap 
                        fontWeight={unreadCount > 0 ? 'bold' : 'normal'}
                        sx={{ 
                          maxWidth: '70%',
                          color: isClosed ? theme.palette.text.secondary : 'inherit'
                        }}
                      >
                        {chat.title || 'Percakapan'}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{ fontSize: '0.7rem' }}
                      >
                        {typeof chat.lastMessage === 'object' && chat.lastMessage?.createdAt 
                          ? formatLastMessageTime(chat.lastMessage.createdAt)
                          : formatLastMessageTime(chat.createdAt)}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        noWrap
                        sx={{ 
                          flex: 1,
                          fontWeight: unreadCount > 0 ? 'medium' : 'normal',
                          opacity: isClosed ? 0.7 : 1
                        }}
                      >
                        {typeof chat.lastMessage === 'object' && chat.lastMessage?.content 
                          ? chat.lastMessage.content 
                          : 'Belum ada pesan'}
                      </Typography>
                      {isClosed && (
                        <Chip 
                          label="Ditutup" 
                          size="small" 
                          variant="outlined"
                          sx={{ 
                            height: 20, 
                            fontSize: '0.6rem',
                            borderRadius: '10px'
                          }} 
                        />
                      )}
                    </Box>
                  }
                />
              </ListItemButton>
            );
          })
        )}
      </List>

      {/* Tombol untuk membuka modal chat baru */}
      {/* Modal akan dibuka dari komponen Chat.tsx */}
    </Box>
  );
};

export default ChatSidebar;