"use client";

import React from 'react';
import Chat from '@/components/chat/Chat';
import { SocketProvider } from '@/contexts/SocketContext';

const ProjectOwnerChatPage = () => {
  return (
    <SocketProvider>
      <div className="h-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Project Owner Chat</h1>
          <p className="text-gray-600">Communicate with investors and get project support</p>
        </div>
        <div className="h-[calc(100vh-200px)]">
          <Chat />
        </div>
      </div>
    </SocketProvider>
  );
};

export default ProjectOwnerChatPage;