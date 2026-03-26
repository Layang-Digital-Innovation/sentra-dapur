"use client";

import React from 'react';
import Chat from '@/components/chat/Chat';
import { SocketProvider } from '@/contexts/SocketContext';

const SellerChatPage = () => {
  return (
    <SocketProvider>
      <div className="h-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Seller Chat</h1>
          <p className="text-gray-600">Communicate with buyers and provide customer support</p>
        </div>
        <div className="h-[calc(100vh-200px)]">
          <Chat />
        </div>
      </div>
    </SocketProvider>
  );
};

export default SellerChatPage;