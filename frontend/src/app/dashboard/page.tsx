"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const handleRedirect = async () => {
      if (!isAuthenticated()) {
        router.replace('/login');
        return;
      }

      // Redirect to role-specific dashboard with a delay
      if (user?.user.role) {
        const timeoutId = setTimeout(() => {
          switch (user.user.role) {
            case 'SUPER_ADMIN':
              router.replace('/dashboard/super-admin');
              break;
            case 'ADMIN':
              router.replace('/dashboard/admin');
              break;
            case 'INVESTOR':
              router.replace('/dashboard/investor');
              break;
            case 'PROJECT_OWNER':
              router.replace('/dashboard/project-owner');
              break;
            case 'ADMIN_PUSAT':
              router.replace('/dashboard/admin-pusat');
              break;
            case 'ADMIN_DAPUR':
            case 'AKUNTAN':
              router.replace('/dashboard/admin-dapur');
              break;
            case 'PRODUKSI':
            case 'AHLI_GIZI':
            case 'CHEF':
              router.replace('/dashboard/produksi');
              break;
            case 'GUDANG':
              router.replace('/dashboard/admin-dapur/gudang/bahan');
              break;
            case 'BUYER':
              router.replace('/dashboard/buyer');
              break;
            case 'SUPPLIER':
              router.replace('/dashboard/supplier');
              break;
            default:
              // Stay on generic dashboard
              break;
          }
        }, 200);
        
        return () => clearTimeout(timeoutId);
      }
    };

    handleRedirect();
  }, [user, isAuthenticated, router]);

  return (
    <div className="py-6">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      <p className="mt-4">Loading your dashboard...</p>
    </div>
  );
}