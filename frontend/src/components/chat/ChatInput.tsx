import React, { useState, useRef } from 'react';
import { 
  Box, 
  IconButton, 
  InputBase, 
  Paper, 
  Tooltip, 
  CircularProgress,
  Badge,
  useTheme
} from '@mui/material';
import { 
  Send as SendIcon, 
  AttachFile as AttachFileIcon,
  Close as CloseIcon
} from '@mui/icons-material';

interface ChatInputProps {
  onSendMessage: (content: string, files?: File[]) => Promise<void>;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, disabled = false }) => {
  const theme = useTheme();
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if ((!message.trim() && files.length === 0) || isSubmitting || disabled) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSendMessage(message, files.length > 0 ? files : undefined);
      setMessage('');
      setFiles([]);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {files.length > 0 && (
        <Box 
          sx={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 1, 
            mb: 2,
            maxHeight: '120px',
            overflowY: 'auto',
            p: 1
          }}
        >
          {files.map((file, index) => (
            <Paper
              key={index}
              variant="outlined"
              sx={{
                p: 1,
                px: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                maxWidth: '100%',
                borderRadius: '8px',
                bgcolor: theme.palette.background.default,
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: theme.palette.action.hover,
                }
              }}
            >
              <Box 
                sx={{ 
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '200px',
                  fontSize: '0.875rem'
                }}
              >
                {file.name}
              </Box>
              <IconButton 
                size="small" 
                onClick={() => handleRemoveFile(index)}
                disabled={isSubmitting}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Paper>
          ))}
        </Box>
      )}
      
      <Paper
        variant="outlined"
        sx={{
          p: '2px 4px',
          display: 'flex',
          alignItems: 'center',
          borderRadius: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          },
          transition: 'all 0.3s ease',
        }}
      >
        <Tooltip title="Lampirkan file">
          <IconButton 
            color="primary" 
            sx={{ p: '10px' }} 
            onClick={handleAttachClick}
            disabled={disabled || isSubmitting}
          >
            <Badge badgeContent={files.length} color="primary" invisible={files.length === 0}>
              <AttachFileIcon />
            </Badge>
          </IconButton>
        </Tooltip>
        
        <InputBase
          sx={{ ml: 1, flex: 1 }}
          placeholder={disabled ? "Percakapan ditutup" : "Ketik pesan..."}
          value={message}
          onChange={handleMessageChange}
          onKeyPress={handleKeyPress}
          multiline
          maxRows={4}
          disabled={disabled || isSubmitting}
          inputProps={{ 'aria-label': 'ketik pesan' }}
        />
        
        <IconButton 
          color="primary" 
          sx={{ 
            p: '10px',
            bgcolor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            '&:hover': {
              bgcolor: theme.palette.primary.dark,
            },
            '&.Mui-disabled': {
              bgcolor: theme.palette.action.disabledBackground,
              color: theme.palette.action.disabled,
            },
            transition: 'all 0.2s ease',
            ml: 1
          }} 
          onClick={handleSubmit}
          disabled={(!message.trim() && files.length === 0) || disabled || isSubmitting}
        >
          {isSubmitting ? <CircularProgress size={24} color="inherit" /> : <SendIcon />}
        </IconButton>
      </Paper>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        multiple
      />
    </Box>
  );
};

export default ChatInput;