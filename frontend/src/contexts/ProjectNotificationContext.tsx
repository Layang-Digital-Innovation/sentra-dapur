'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import InvestmentService from '@/services/investment.service';
import { useAuth } from './AuthContext';

interface ProjectNotificationContextType {
  pendingProjectsCount: number;
  refreshPendingCount: () => void;
}

const ProjectNotificationContext = createContext<ProjectNotificationContextType | undefined>(undefined);

export const ProjectNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pendingProjectsCount, setPendingProjectsCount] = useState(0);
  const { user } = useAuth();

  const fetchPendingProjectsCount = async () => {
    if (!user || (user.user.role !== 'ADMIN' && user.user.role !== 'SUPER_ADMIN')) {
      setPendingProjectsCount(0);
      return;
    }

    try {
      const response = await InvestmentService.getPendingProjectsCount();
      setPendingProjectsCount(response.count);
    } catch (error) {
      console.error('Error fetching pending projects count:', error);
      setPendingProjectsCount(0);
    }
  };

  useEffect(() => {
    fetchPendingProjectsCount();
    
    // Poll for new pending projects every 30 seconds
    const interval = setInterval(fetchPendingProjectsCount, 30000);
    
    return () => clearInterval(interval);
  }, [user]);

  const refreshPendingCount = () => {
    fetchPendingProjectsCount();
  };

  const value: ProjectNotificationContextType = {
    pendingProjectsCount,
    refreshPendingCount,
  };

  return (
    <ProjectNotificationContext.Provider value={value}>
      {children}
    </ProjectNotificationContext.Provider>
  );
};

export const useProjectNotifications = (): ProjectNotificationContextType => {
  const context = useContext(ProjectNotificationContext);
  if (!context) {
    throw new Error('useProjectNotifications must be used within a ProjectNotificationProvider');
  }
  return context;
};