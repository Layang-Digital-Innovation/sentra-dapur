import React, { useState, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  CircularProgress,
  Box,
  SelectChangeEvent,
  Avatar,
  Typography,
  Chip,
  Autocomplete,
  Grid,
  Divider
} from '@mui/material';
import { Chat, ChatType, Role, User } from '@/types/chat.types';
import chatService from '@/services/chat.service';
import { useAuth } from '@/hooks/useAuth';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';

interface NewChatModalProps {
  open: boolean;
  onClose: () => void;
  onChatCreated?: (chat: Chat) => void;
  isAdmin?: boolean;
}

const NewChatModal: React.FC<NewChatModalProps> = ({ open, onClose, onChatCreated, isAdmin }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [chatType, setChatType] = useState<ChatType>(ChatType.SUPPORT);
  const [loading, setLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string>('');

  useEffect(() => {
    if (open) {
      if (isAdmin) {
        loadAvailableUsers();
      }
      setError(null);
    }
  }, [open, isAdmin]);

  const loadAvailableUsers = async () => {
    try {
      const users = await chatService.getAvailableUsers();
      setAvailableUsers(users);
    } catch (error) {
      console.error('Failed to load available users:', error);
      setError('Gagal memuat daftar pengguna');
    }
  };

  const handleChatTypeChange = (event: SelectChangeEvent) => {
    setChatType(event.target.value as ChatType);
  };

  const handleUserSelect = (_event: React.SyntheticEvent, value: User | null) => {
    setSelectedUser(value);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Judul percakapan diperlukan');
      return;
    }

    if (!message.trim()) {
      setError('Pesan awal diperlukan');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!user?.user) {
        setError('Anda harus login terlebih dahulu');
        return;
      }

      let newChat: Chat;
      
      if (isAdmin) {
        if (!selectedUser) {
          setError('Pilih pengguna untuk memulai percakapan');
          return;
        }
        
        newChat = await chatService.getOrCreateChat({
          title,
          firstMessage: message,
          userId: selectedUser.id,
          projectId: projectId || undefined
        });
      } else {
        newChat = await chatService.getOrCreateChat({
          title,
          firstMessage: message,
          type: chatType
        });
      }
      
      if (onChatCreated) {
        onChatCreated(newChat);
      }
      
      resetForm();
      onClose();
    } catch (error) {
      console.error('Failed to create chat:', error);
      setError('Gagal membuat percakapan baru');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setChatType(ChatType.SUPPORT);
    setSelectedUser(null);
    setProjectId('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Mulai Percakapan Baru</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Judul Percakapan"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
            error={error === 'Judul percakapan diperlukan'}
            helperText={error === 'Judul percakapan diperlukan' ? error : ''}
          />

          {isAdmin ? (
            <Autocomplete
              options={availableUsers}
              getOptionLabel={(option) => 
                option.profile?.fullName || option.name || option.email || `User ${option.id.substring(0, 8)}`
              }
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar 
                      src={option.profile?.photoUrl} 
                      sx={{ width: 32, height: 32 }}
                    >
                      {(option.profile?.fullName || option.name || option.email || '?')[0].toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="body1">
                        {option.profile?.fullName || option.name || option.email || `User ${option.id.substring(0, 8)}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.role}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}
              value={selectedUser}
              onChange={handleUserSelect}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Pilih Pengguna"
                  error={error === 'Pilih pengguna untuk memulai percakapan'}
                  helperText={error === 'Pilih pengguna untuk memulai percakapan' ? error : ''}
                />
              )}
            />
          ) : (
            <FormControl fullWidth>
              <InputLabel>Tipe Percakapan</InputLabel>
              <Select
                value={chatType}
                label="Tipe Percakapan"
                onChange={handleChatTypeChange}
              >
                <MenuItem value={ChatType.SUPPORT}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SupportAgentIcon color="primary" />
                    <Typography>Dukungan</Typography>
                  </Box>
                </MenuItem>
                <MenuItem value={ChatType.TRADING}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BusinessIcon color="primary" />
                    <Typography>Trading</Typography>
                  </Box>
                </MenuItem>
                <MenuItem value={ChatType.INVESTMENT}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon color="primary" />
                    <Typography>Investasi</Typography>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          )}

          <TextField
            label="Pesan Awal"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            multiline
            rows={4}
            fullWidth
            required
            error={error === 'Pesan awal diperlukan'}
            helperText={error === 'Pesan awal diperlukan' ? error : ''}
          />

          {error && error !== 'Judul percakapan diperlukan' && 
           error !== 'Pesan awal diperlukan' && 
           error !== 'Pilih pengguna untuk memulai percakapan' && (
            <Box sx={{ color: 'error.main', mt: 1 }}>
              {error}
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Batal
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Memproses...' : 'Mulai Percakapan'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewChatModal;