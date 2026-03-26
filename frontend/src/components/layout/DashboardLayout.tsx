'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Role } from '@/types/user.types';
import NotificationBell from '@/components/notification/NotificationBell';
import InvestorDashboard from '@/components/investment/InvestorDashboard';
import AdminInvestmentPanel from '@/components/investment/AdminInvestmentPanel';
import ProjectOwnerDashboard from '@/components/investment/ProjectOwnerDashboard';

type DashboardType = 'investor' | 'admin' | 'project-owner';

interface DashboardLayoutProps {
  children?: React.ReactNode;
  defaultDashboard?: DashboardType;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ 
  children, 
  defaultDashboard 
}) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [currentDashboard, setCurrentDashboard] = useState<DashboardType>(
    defaultDashboard || getDashboardByRole(user?.user?.role as Role)
  );

  function getDashboardByRole(role?: Role): DashboardType {
    switch (role) {
      case Role.ADMIN:
      case Role.ADMIN_INVESTMENT:
      case Role.ADMIN_TRADING:
        return 'admin';
      case Role.PROJECT_OWNER:
        return 'project-owner';
      case Role.INVESTOR:
      default:
        return 'investor';
    }
  }

  const handleLogout = async () => {
    try {
      logout(); // AuthContext already handles redirect to home page
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const canAccessDashboard = (dashboard: DashboardType): boolean => {
    if (!user) return false;
    
    switch (dashboard) {
      case 'admin':
        return user.user.role === Role.ADMIN || user.user.role === Role.ADMIN_INVESTMENT || user.user.role === Role.ADMIN_TRADING;
      case 'project-owner':
        return user.user.role === Role.PROJECT_OWNER || user.user.role === Role.ADMIN || user.user.role === Role.ADMIN_INVESTMENT;
      case 'investor':
        return user.user.role === Role.INVESTOR || user.user.role === Role.ADMIN || user.user.role === Role.ADMIN_INVESTMENT;
      default:
        return false;
    }
  };

  const getDashboardTitle = (dashboard: DashboardType): string => {
    switch (dashboard) {
      case 'admin':
        return 'Admin Panel';
      case 'project-owner':
        return 'Project Owner Dashboard';
      case 'investor':
        return 'Investor Dashboard';
      default:
        return 'Dashboard';
    }
  };

  const renderDashboardContent = () => {
    if (children) {
      return children;
    }

    switch (currentDashboard) {
      case 'admin':
        return <AdminInvestmentPanel />;
      case 'project-owner':
        return <ProjectOwnerDashboard />;
      case 'investor':
        return <InvestorDashboard />;
      default:
        return <InvestorDashboard />;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Navigation */}
      <div className="md:hidden bg-white border-b border-gray-200">
        <div className="px-4 py-3">
          <div className="flex space-x-4 overflow-x-auto no-scrollbar scroll-smooth pb-1">
            {canAccessDashboard('investor') && (
              <button
                onClick={() => setCurrentDashboard('investor')}
                className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                  currentDashboard === 'investor'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                Investor
              </button>
            )}
            
            {canAccessDashboard('project-owner') && (
              <button
                onClick={() => setCurrentDashboard('project-owner')}
                className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                  currentDashboard === 'project-owner'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                Project Owner
              </button>
            )}
            
            {canAccessDashboard('admin') && (
              <button
                onClick={() => setCurrentDashboard('admin')}
                className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                  currentDashboard === 'admin'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                Admin
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-2 sm:px-2 lg:px-2 pt-2 pb-2">
        {/* Dashboard Title */}
        <div className="mb-2">
          <h2 className="text-3xl font-bold text-gray-900">
            {getDashboardTitle(currentDashboard)}
          </h2>
          <p className="mt-1 text-gray-600">
            Selamat datang, {user.user.fullName || user.user.email}! Kelola investasi Anda dengan mudah.
          </p>
        </div>

        {/* Dashboard Content */}
        {renderDashboardContent()}
      </main>
    </div>
  );
};

export default DashboardLayout;