'use client';

import React from 'react';
import Chat from '@/components/chat/Chat';
import { SocketProvider } from '@/contexts/SocketContext';

export default function ChatPage() {
  return (
    <SocketProvider>
      <div className="w-full h-full">
        <h1 className="text-2xl font-bold mb-4">Chat Center</h1>
        <div className="h-[calc(100vh-200px)]">
          <Chat />
        </div>
      </div>
    </SocketProvider>
  );
}