'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Role } from '@/types/user.types';

const AdminDashboardPage: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const role = user?.user?.role as Role | undefined;
    if (role === Role.ADMIN_TRADING) {
      router.replace('/dashboard/admin/trading');
    }
  }, [router, user?.user?.role]);

  return <DashboardLayout defaultDashboard="admin" />;
};

export default AdminDashboardPage;