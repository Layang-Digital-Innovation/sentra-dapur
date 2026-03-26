"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import RoleGuard from '@/components/auth/RoleGuard';
import { Role } from '@/types/user.types';
import chatService, { ChatListItem, ChatMessage } from '@/services/chat.service';
import { io, Socket } from 'socket.io-client';
import authService from '@/services/auth.service';
import { useSearchParams } from 'next/navigation';

export default function ChatPage() {
  const searchParams = useSearchParams();
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [creating, setCreating] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Connect socket
  useEffect(() => {
    const token = authService.getToken();
    if (!token) return;
    const s = io(`${API_BASE}/chat`, { query: { token } });
    socketRef.current = s;

    s.on('connect', () => {
      if (activeChatId) s.emit('joinRoom', { chatId: activeChatId });
    });

    s.on('message', ({ chatId, message }: { chatId: string; message: ChatMessage }) => {
      if (chatId === activeChatId) {
        setMessages((prev) => [...prev, message]);
        scrollToBottom();
      }
      // refresh sidebar last message/unread
      setChats((prev) => prev.map(c => c.id===chatId ? { ...c, lastMessage: message.content || '[attachment]', lastMessageAt: message.createdAt, unreadCount: c.id===activeChatId ? 0 : (c.unreadCount||0)+1 } : c));
    });

    s.on('typing', ({ chatId, userId, typing }: any) => {
      if (chatId === activeChatId) {
        setTypingUsers((prev) => ({ ...prev, [userId]: typing }));
      }
    });

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const newTradingChat = async () => {
    try {
      setCreating(true);
      const res = await chatService.startChat({ type: 'TRADING_SUPPORT', title: 'Support - Trading' });
      const id = res.id;
      setChats((prev)=>[{ id, title: 'Support - Trading', lastMessage: '', lastMessageAt: null, participants: [] as any[] }, ...prev]);
      setActiveChatId(id);
    } finally {
      setCreating(false);
    }
  };

  // Load chats
  useEffect(() => {
    (async () => {
      const data = await chatService.listMyChats();
      setChats(data);
      // Prefer chatId from URL if present
      const qId = searchParams.get('chatId');
      if (qId && data.some(c => c.id === qId)) {
        setActiveChatId(qId);
      } else if (!activeChatId && data.length) {
        setActiveChatId(data[0].id);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load messages when chat changes
  useEffect(() => {
    (async () => {
      if (!activeChatId) return;
      setLoading(true);
      try {
        const data = await chatService.getMessages(activeChatId, { limit: 50 });
        setMessages(data);
        if (socketRef.current) socketRef.current.emit('joinRoom', { chatId: activeChatId });
        scrollToBottom();
      } finally {
        setLoading(false);
      }
    })();
  }, [activeChatId]);

  const othersTyping = useMemo(() => Object.values(typingUsers).some(Boolean), [typingUsers]);

  const send = async () => {
    if (!input.trim() || !activeChatId) return;
    const content = input.trim();
    setInput('');
    // try socket first for realtime
    const s = socketRef.current;
    if (s && s.connected) {
      s.emit('sendMessage', { chatId: activeChatId, content });
    } else {
      // fallback REST
      const msg = await chatService.postMessage(activeChatId, content);
      setMessages((prev) => [...prev, msg]);
    }
    scrollToBottomSoon();
  };

  const onUploadFiles = async (files: FileList | null) => {
    if (!files || !activeChatId) return;
    try {
      setUploading(true);
      const arr = Array.from(files);
      const msg = await chatService.uploadAttachments(activeChatId, arr);
      setMessages((prev) => [...prev, msg]);
      scrollToBottomSoon();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onType = (val: string) => {
    setInput(val);
    if (socketRef.current && activeChatId) {
      socketRef.current.emit('typing', { chatId: activeChatId, typing: true });
      // stop typing indicator after short delay
      setTimeout(() => socketRef.current?.emit('typing', { chatId: activeChatId, typing: false }), 800);
    }
  };

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    });
  };
  const scrollToBottomSoon = () => setTimeout(scrollToBottom, 50);

  return (
    <RoleGuard allowedRoles={[Role.BUYER, Role.SUPPLIER, Role.ADMIN, Role.ADMIN_INVESTMENT, Role.ADMIN_TRADING, Role.SUPER_ADMIN]}>
      <div className="py-6 grid grid-cols-1 lg:grid-cols-5 gap-4 h-[calc(100vh-120px)]">
        {/* Sidebar */}
        <div className="lg:col-span-2 border rounded-xl bg-white overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b text-sm font-semibold text-gray-900 flex items-center justify-between">
            <div>Chats</div>
            <button onClick={newTradingChat} disabled={creating} className="px-2 py-1.5 rounded border text-xs text-gray-800 hover:bg-gray-50 disabled:opacity-60">{creating? 'Creating...' : 'New Trading Support Chat'}</button>
          </div>
          <div className="flex-1 overflow-auto">
            {chats.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveChatId(c.id)}
                className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 ${activeChatId===c.id?'bg-gray-50':''}`}
              >
                <div className="text-sm font-medium text-gray-900 truncate">{c.title || 'Support Chat'}</div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-600 truncate max-w-[75%]">{c.lastMessage}</div>
                  {c.unreadCount ? (
                    <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[10px]">{c.unreadCount}</span>
                  ) : null}
                </div>
                <div className="text-[11px] text-gray-500">{c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleString() : ''}</div>
              </button>
            ))}
            {chats.length===0 && (
              <div className="p-4 text-sm text-gray-600">
                <div>Tidak ada chat.</div>
                <button onClick={newTradingChat} disabled={creating} className="mt-2 px-3 py-1.5 rounded bg-slate-900 text-white text-xs hover:bg-slate-800 disabled:opacity-60">{creating? 'Creating...' : 'Start Trading Support Chat'}</button>
              </div>
            )}
          </div>
        </div>

        {/* Window */}
        <div className="lg:col-span-3 border rounded-xl bg-white flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b text-sm font-semibold text-gray-900 flex items-center justify-between">
            <div>{chats.find((x)=>x.id===activeChatId)?.title || 'Support Chat'}</div>
          </div>
          <div ref={listRef} className="flex-1 overflow-auto px-4 py-3 space-y-2 bg-gray-50">
            {loading && <div className="text-xs text-gray-500">Loading messages...</div>}
            {messages.map((m) => {
              const isMine = m.senderId===authService.getCurrentUser()?.user.id;
              const role = m.sender?.role || '';
              const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
              const roleLabel = role === 'BUYER' ? 'BUYER' : role === 'SUPPLIER' ? 'SUPPLIER' : isAdmin ? 'ADMIN' : (role || 'USER');
              const nameLabel = m.sender?.fullname || '';
              return (
                <div key={m.id} className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${isMine ? 'ml-auto bg-slate-900 text-white' : isAdmin ? 'bg-green-50 border border-green-200 text-green-900' : 'bg-white border text-gray-800'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isAdmin ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-800'}`}>{isMine ? (roleLabel || 'ME') : roleLabel}</span>
                    {!isMine && nameLabel && <span className="text-[11px] font-medium truncate">{nameLabel}</span>}
                    {isMine && <span className="text-[11px] font-medium truncate">You</span>}
                  </div>
                  {m.content && <div className="mt-1 whitespace-pre-wrap">{m.content}</div>}
                  {m.attachments && m.attachments.length>0 && (
                    <div className="mt-2 space-y-1">
                      {m.attachments.map((a)=> (
                        <a key={a.id} href={a.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline break-all">
                          {a.originalName} ({Math.ceil(a.fileSize/1024)} KB)
                        </a>
                      ))}
                    </div>
                  )}
                  <div className={`mt-1 text-[10px] ${isMine ? 'text-purple-100' : 'text-gray-500'}`}>{new Date(m.createdAt).toLocaleTimeString()}</div>
                </div>
              );
            })}
            {othersTyping && <div className="text-xs text-gray-500">Admin is typing...</div>}
          </div>
          <div className="p-3 border-t flex items-center gap-2">
            <input ref={fileInputRef} type="file" multiple onChange={(e)=>onUploadFiles(e.target.files)} className="hidden" />
            <button onClick={()=>fileInputRef.current?.click()} disabled={!activeChatId || uploading} className="px-2 py-2 rounded-lg border text-sm hover:bg-gray-50 disabled:opacity-60 text-gray-800">{uploading ? 'Uploading...' : 'Attach'}</button>
            <input
              className="flex-1 border rounded-lg px-3 py-2 text-sm text-gray-800"
              placeholder="Type a message..."
              value={input}
              onChange={(e)=>onType(e.target.value)}
              onKeyDown={(e)=>{ if (e.key==='Enter') send(); }}
            />
            <button onClick={send} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800">Send</button>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
