"use client";

import React from 'react';
import Chat from '@/components/chat/Chat';
import { SocketProvider } from '@/contexts/SocketContext';

const AdminChatPage = () => {
  return (
    <SocketProvider>
      <div className="h-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Chat</h1>
        </div>
        <div className="h-[calc(100vh-200px)]">
          <Chat />
        </div>
      </div>
    </SocketProvider>
  );
};

export default AdminChatPage;