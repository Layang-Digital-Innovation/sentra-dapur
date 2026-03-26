'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import ProjectBrowser from '@/components/investment/ProjectBrowser';
import ProjectDetail from '@/components/investment/ProjectDetail';
import { Project } from '@/types/investment.types';
import { subscriptionService } from '@/services/subscription.service';
// Removed chat-related imports while chat feature is hidden
// Removed: import { chatService } from '@/services/chat.service';
// Removed: import { ChatType } from '@/types/chat.types';

const BrowseProjectsPage: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [isTrial, setIsTrial] = useState(false);

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const role = user?.user?.role;
        if (role !== 'INVESTOR') {
          setIsTrial(false);
          return;
        }
        const sub: any = await subscriptionService.getMySubscription();
        const extractPlan = (obj: any): string | null => {
          if (!obj || typeof obj !== 'object') return null;
          const candidates = [
            obj.plan,
            obj?.current?.plan,
            obj?.subscription?.plan,
            obj?.data?.plan,
            obj?.activeSubscription?.plan,
          ].filter(Boolean);
          return (candidates[0] ?? null) as string | null;
        };
        const plan = (extractPlan(sub) || '').toString().toUpperCase();
        setIsTrial(plan === 'TRIAL');
      } catch (error) {
        console.error('Error checking subscription:', error);
        setIsTrial(false);
      }
    };

    if (user) {
      checkSubscription();
    }
  }, [user]);

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

  // Fitur chat disembunyikan sementara: nonaktifkan pembuatan chat saat klik Invest
  const handleInvestClick = async (project: Project) => {
    alert('Fitur chat sedang disembunyikan sementara. Silakan gunakan opsi investasi langsung jika tersedia atau hubungi admin.');
  };
  const handleViewDetails = (project: Project) => {
    setSelectedProject(project);
  };

  const handleCloseDetails = () => {
    setSelectedProject(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Browse Investment Projects</h1>
            <p className="text-gray-600 mt-1">Temukan peluang investasi yang menarik</p>
          </div>
        </div>
      </div>

      {/* Trial alert or Project Browser */}
      {isTrial ? (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-start gap-2 text-sm text-amber-800 bg-yellow-50 border border-amber-200 rounded p-4">
            <svg className="w-5 h-5 mt-0.5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 8a1 1 0 112 0v5a1 1 0 11-2 0V8zm1-4a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
            </svg>
            <div>
              <div className="font-medium">Akun Anda masih dalam masa trial. Upgrade sekarang untuk dapat melihat semua proyek.</div>
              <div className="mt-3">
                <Link href="/dashboard/subscription" className="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700">
                  Upgrade sekarang
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <ProjectBrowser
          onInvestClick={handleInvestClick}
          onViewDetails={handleViewDetails}
          isTrial={false}
        />
      )}

      {/* Project Detail Modal */}
      {selectedProject && (
        <ProjectDetail
          projectId={selectedProject.id}
          onClose={handleCloseDetails}
          onInvestClick={handleInvestClick}
        />
      )}
    </div>
  );
};

export default BrowseProjectsPage;