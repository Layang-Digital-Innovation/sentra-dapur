'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import InvestorPortfolio from '@/components/investment/InvestorPortfolio';

const PortfolioPage: React.FC = () => {
  const { user } = useAuth();

  if (!user || user.user.role !== 'INVESTOR') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">
            Only investors can access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Investment Portfolio</h1>
            <p className="text-gray-600 mt-1">Kelola dan pantau investasi Anda</p>
          </div>
        </div>
      </div>

      {/* Portfolio Component */}
      <InvestorPortfolio />
    </div>
  );
};

export default PortfolioPage;