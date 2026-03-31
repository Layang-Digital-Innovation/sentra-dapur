"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AuthProvider } from "@/contexts/AuthContext";
// import { SocketProvider } from '@/contexts/SocketContext'; // chat dinonaktifkan sementara
// import { ChatNotificationProvider } from '@/contexts/ChatNotificationContext'; // chat disembunyikan sementara
import DashboardNavbar from '@/components/dashboard/DashboardNavbar';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import DashboardFooter from '@/components/dashboard/DashboardFooter';
import BottomNav from '@/components/dashboard/BottomNav';
import { subscriptionService } from '@/services/subscription.service';
import { CartProvider } from '@/contexts/CartContext';

// Dashboard content component
function DashboardContent({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!isAuthenticated()) {
        router.replace('/login');
        return;
      }
      try {
        // Determine expiry strictly by the user's current subscription/trial period end
        const sub = await subscriptionService.getMySubscription();
        const endStr = sub?.status === 'TRIAL'
          ? (sub?.trialEndsAt || sub?.expiresAt)
          : (sub?.currentPeriodEnd || sub?.expiresAt);
        const isExpired = endStr ? (new Date(endStr).getTime() < Date.now()) : false;
        setExpired(!!isExpired);
      } catch {
        // If API errored or no subscription info, do not block
        setExpired(false);
      } finally {
        setCheckingAccess(false);
      }
    };
    const timeoutId = setTimeout(run, 100);
    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, router]);

  if (!isAuthenticated()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-slate-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Block dashboard when subscription expired, except for subscription page
  const onSubscriptionPage = pathname === '/dashboard/subscription';
  const showLock = !checkingAccess && expired && !onSubscriptionPage;

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleMobileMenuClose = () => {
    setIsMobileMenuOpen(false);
  };

  const handleSidebarToggle = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* New Navbar */}
      <DashboardNavbar 
        onMobileMenuToggle={handleMobileMenuToggle}
        isMobileMenuOpen={isMobileMenuOpen}
        onSidebarToggle={handleSidebarToggle}
        isSidebarCollapsed={isSidebarCollapsed}
      />

      {/* New Sidebar */}
      <DashboardSidebar 
        isMobileMenuOpen={isMobileMenuOpen}
        onMobileMenuClose={handleMobileMenuClose}
        isCollapsed={isSidebarCollapsed}
      />

      {/* Main content */}
        <div className={`${isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'} pt-0 flex-1 flex flex-col transition-all duration-300`}>
        <main className="flex-1 pb-14 md:pb-0">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
        
        {/* Dashboard Footer */}
        <DashboardFooter />
      </div>
      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {showLock && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-center">
            <div className="text-xl font-semibold text-black">Subscription expired</div>
            <p className="mt-2 text-sm text-gray-700">Akses Anda telah berakhir. Silahkan lakukan perpanjangan langganan untuk melanjutkan.</p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button onClick={()=>router.push('/dashboard/subscriptions')} className="px-4 py-2 rounded bg-slate-900 text-white hover:bg-slate-800">Perpanjang sekarang</button>
              <button onClick={()=>router.push('/support')} className="px-4 py-2 rounded border hover:bg-gray-50 text-gray-800">Butuh bantuan?</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Main layout component with AuthProvider
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <DashboardContent>{children}</DashboardContent>
    </CartProvider>
  );
}