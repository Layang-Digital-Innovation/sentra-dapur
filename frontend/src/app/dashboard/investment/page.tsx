'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import InvestorDashboard from '@/components/investment/InvestorDashboard';
import ProjectOwnerDashboard from '@/components/investment/ProjectOwnerDashboard';

const InvestmentDashboardPage: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const userRole = user.user.role;

  // Redirect based on user role
  if (userRole === 'INVESTOR') {
    return <InvestorDashboard />;
  } else if (userRole === 'PROJECT_OWNER') {
    return <ProjectOwnerDashboard />;
  } else {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">
            You don't have permission to access the investment dashboard.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Only INVESTOR and PROJECT_OWNER roles can access this feature.
          </p>
        </div>
      </div>
    );
  }
};

export default InvestmentDashboardPage;