"use client";

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import FinancialReportUpload from '@/components/investment/FinancialReportUpload';

export default function ReportsPage() {
  const { user } = useAuth();

  if (!user || user.user.role !== 'PROJECT_OWNER') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">
            Only project owners can access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
        <p className="text-gray-600">Upload and manage your project financial reports</p>
      </div>
      
      <FinancialReportUpload />
    </div>
  );
}