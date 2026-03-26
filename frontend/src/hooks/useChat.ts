import { useState, useEffect, useCallback } from 'react';
import socketService from '@/utils/socketService';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
  type?: string;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  role: string;
  online?: boolean;
  lastMessage?: Message;
  unreadCount?: number;
  projectName?: string;
}

interface UseChatReturn {
  messages: Message[];
  contacts: Contact[];
  selectedContact: Contact | null;
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string, type?: string) => Promise<void>;
  selectContact: (contact: Contact) => void;
  markAsRead: (senderId: string) => Promise<void>;
  setTypingStatus: (isTyping: boolean) => void;
  typingContacts: Record<string, boolean>;
}

export function useChat(): UseChatReturn {
  const { user, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [typingContacts, setTypingContacts] = useState<Record<string, boolean>>({});

  // Inisialisasi koneksi WebSocket
  useEffect(() => {
    setIsLoading(true);
    
    if (!isAuthenticated()) {
      setError('Anda belum login. Silakan login untuk mengakses fitur chat.');
      setIsLoading(false);
      return;
    }
    
    // Ambil token dari localStorage (disimpan sebagai objek user)
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      setError('Token tidak ditemukan. Silakan login kembali.');
      setIsLoading(false);
      return;
    }
    
    try {
      const userData = JSON.parse(userStr);
      const token = userData.access_token;
      
      if (!token) {
        setError('Token tidak valid. Silakan login kembali.');
        setIsLoading(false);
        return;
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
      setError('Terjadi kesalahan saat memproses data pengguna. Silakan login kembali.');
      setIsLoading(false);
      return;
    }

    // Connect to WebSocket dengan token yang benar
    try {
      const userData = JSON.parse(userStr);
      const token = userData.access_token;
      const socket = socketService.connect(token);
    } catch (err) {
      console.error('Failed to connect to WebSocket:', err);
      setError('Gagal terhubung ke server chat.');
    }

    // Load contacts
    loadContacts();
    
    // Setup polling untuk memperbarui kontak secara berkala (setiap 10 detik)
    const contactsInterval = setInterval(() => {
      console.log('Refreshing contacts list...');
      loadContacts();
    }, 10000);

    // Setup event listeners
    socketService.on('receive_message', handleNewMessage);
    socketService.on('typing_status', handleTypingStatus);
    socketService.on('user_status', handleUserStatus);

    return () => {
      // Cleanup
      clearInterval(contactsInterval);
      socketService.off('receive_message', handleNewMessage);
      socketService.off('typing_status', handleTypingStatus);
      socketService.off('user_status', handleUserStatus);
      socketService.disconnect();
    };
  }, []);

  // Load contacts
  const loadContacts = async () => {
    setIsLoading(true);
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        throw new Error('User data not found');
      }
      
      const userData = JSON.parse(userStr);
      const token = userData.access_token;
      
      const response = await fetch('/api/chat/contacts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }

      const data = await response.json();
      if (data.success) {
        setContacts(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch contacts');
      }
    } catch (err) {
      console.error('Error loading contacts:', err);
      setError('Gagal memuat daftar kontak.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load messages for a contact
  const loadMessages = async (contactId: string) => {
    setIsLoading(true);
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        throw new Error('User data not found');
      }
      
      const userData = JSON.parse(userStr);
      const token = userData.access_token;
      
      const response = await fetch(`/api/chat/messages?contactId=${contactId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      if (data.success) {
        setMessages(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch messages');
      }
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Gagal memuat pesan.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle new message
  const handleNewMessage = useCallback((message: Message) => {
    // Update messages if from current contact
    if (selectedContact && 
        (message.senderId === selectedContact.id || message.receiverId === selectedContact.id)) {
      setMessages(prev => [...prev, message]);
      
      // Mark as read if it's from the selected contact
      if (message.senderId === selectedContact.id && !message.read) {
        markAsRead(message.senderId);
      }
    }

    // Update contacts with last message
    setContacts(prev => {
      return prev.map(contact => {
        if (contact.id === message.senderId || contact.id === message.receiverId) {
          return {
            ...contact,
            lastMessage: message,
            unreadCount: contact.id === message.senderId && !message.read 
              ? (contact.unreadCount || 0) + 1 
              : contact.unreadCount
          };
        }
        return contact;
      });
    });
  }, [selectedContact]);

  // Handle typing status
  const handleTypingStatus = useCallback((data: { userId: string; isTyping: boolean }) => {
    setTypingContacts(prev => ({
      ...prev,
      [data.userId]: data.isTyping
    }));
  }, []);

  // Handle user status
  const handleUserStatus = useCallback((data: { userId: string; status: 'online' | 'offline' }) => {
    console.log('User status update received:', data);
    
    // Update status pengguna yang sudah ada di daftar kontak
    setContacts(prev => {
      // Cek apakah kontak dengan userId tersebut ada di daftar
      const contactExists = prev.some(contact => contact.id === data.userId);
      
      // Jika kontak tidak ada, reload daftar kontak
      if (!contactExists) {
        console.log(`Contact with ID ${data.userId} not found, reloading contacts...`);
        loadContacts();
        return prev;
      }
      
      return prev.map(contact => {
        if (contact.id === data.userId) {
          console.log(`Updating status for ${contact.name} to ${data.status}`);
          return {
            ...contact,
            online: data.status === 'online'
          };
        }
        return contact;
      });
    });
    
    // Reload contacts untuk memastikan status terbaru
    loadContacts();
  }, []);

  // Select a contact
  const selectContact = (contact: Contact) => {
    setSelectedContact(contact);
    loadMessages(contact.id);
    
    // Mark messages as read
    if (contact.unreadCount && contact.unreadCount > 0) {
      markAsRead(contact.id);
    }
  };

  // Send message
  const sendMessage = async (content: string, type: string = 'text') => {
    if (!selectedContact) {
      setError('Tidak ada kontak yang dipilih.');
      return;
    }

    try {
      // Dapatkan ID pengguna saat ini dari localStorage
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        throw new Error('User data not found');
      }
      
      const userData = JSON.parse(userStr);
      const currentUserId = userData.id;
      
      // Optimistic update dengan ID pengguna yang benar
      const tempId = `temp-${Date.now()}`;
      const tempMessage: Message = {
        id: tempId,
        senderId: currentUserId, // Gunakan ID pengguna yang sebenarnya
        receiverId: selectedContact.id,
        content,
        type,
        timestamp: new Date().toISOString(),
        read: false
      };

      setMessages(prev => [...prev, tempMessage]);

      console.log('Sending message to:', selectedContact.id, 'from:', currentUserId);
      
      // Send via WebSocket
      const result = await socketService.sendMessage(selectedContact.id, content, type);
      
      // Update with actual message from server
      setMessages(prev => 
        prev.map(msg => msg.id === tempId ? result as Message : msg)
      );
      
      // Reload contacts to update lastMessage in admin dashboard
      loadContacts();
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Gagal mengirim pesan.');
      
      // Remove failed message
      setMessages(prev => prev.filter(msg => msg.id !== `temp-${Date.now()}`));
    }
  };

  // Mark messages as read
  const markAsRead = async (senderId: string) => {
    try {
      await socketService.markMessagesAsRead(senderId);
      
      // Update local messages
      setMessages(prev => 
        prev.map(msg => 
          msg.senderId === senderId && !msg.read 
            ? { ...msg, read: true } 
            : msg
        )
      );
      
      // Update unread count in contacts
      setContacts(prev => 
        prev.map(contact => 
          contact.id === senderId 
            ? { ...contact, unreadCount: 0 } 
            : contact
        )
      );
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  };

  // Set typing status
  const setTypingStatus = (isTyping: boolean) => {
    if (!selectedContact) return;
    socketService.sendTypingStatus(selectedContact.id, isTyping);
  };

  return {
    messages,
    contacts,
    selectedContact,
    isLoading,
    error,
    sendMessage,
    selectContact,
    markAsRead,
    setTypingStatus,
    typingContacts
  };
}