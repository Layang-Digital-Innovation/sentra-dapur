'use client';

import React, { useState, useEffect } from 'react';
import { Project, ProjectStatus, ProjectFilters } from '@/types/investment.types';
import investmentService from '@/services/investment.service';

// Fungsi untuk memformat nominal besar menjadi lebih ringkas
const formatCurrencyCompact = (amount: number): string => {
  if (amount >= 1000000000) {
    return `Rp${(amount / 1000000000).toFixed(1)} M`;
  } else if (amount >= 1000000) {
    return `Rp${(amount / 1000000).toFixed(1)} Jt`;
  } else if (amount >= 1000) {
    return `Rp${(amount / 1000).toFixed(1)} Rb`;
  } else {
    return `Rp${amount}`;
  }
};

interface ProjectBrowserProps {
  onInvestClick: (project: Project) => void;
  onViewDetails: (project: Project) => void;
  isTrial?: boolean;
}

const ProjectBrowser: React.FC<ProjectBrowserProps> = ({
  onInvestClick,
  onViewDetails,
  isTrial = false,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProjectFilters>({
    status: ProjectStatus.APPROVED,
    search: '',
  });

  useEffect(() => {
    fetchProjects();
  }, [filters]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await investmentService.getProjects(filters);
      setProjects(response);
    } catch (err) {
      setError('Gagal memuat daftar proyek');
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({
      ...prev,
      search: e.target.value,
    }));
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date | string): string => {
    return new Date(date).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const calculateProgress = (currentAmount: number, targetAmount: number): number => {
    return Math.min((currentAmount / targetAmount) * 100, 100);
  };

  const getDaysRemaining = (deadline: Date | string): number => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-2 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center py-8">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Terjadi Kesalahan</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchProjects}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {isTrial && (
        <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Akun Anda masih dalam masa trial. <a href="/subscription" className="font-medium text-yellow-700 underline hover:text-amber-700">Upgrade sekarang</a> untuk dapat melihat semua proyek.
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Header and Search */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Proyek Investasi</h2>
          <span className="text-sm text-gray-600">
            {projects.length} proyek tersedia
          </span>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Cari proyek..."
              value={filters.search}
              onChange={handleSearchChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as ProjectStatus }))}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value={ProjectStatus.APPROVED}>Disetujui</option>
              <option value={ProjectStatus.ONGOING}>Sedang Berjalan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak Ada Proyek</h3>
          <p className="text-gray-600">Belum ada proyek yang sesuai dengan filter Anda</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
              {/* Project Header */}
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                    {project.title}
                  </h3>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                    {project.status === ProjectStatus.APPROVED ? 'Terbuka' : 'Terdanai'}
                  </span>
                </div>
                
                <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                  {project.description}
                </p>

                {/* Financial Info */}
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Target Dana:</span>
                    <span className="font-semibold text-gray-900">
                      {project.targetAmount 
                        ? formatCurrency(project.targetAmount)
                        : 'Tidak ditentukan'
                      }
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Terkumpul:</span>
                    <span className="font-semibold text-blue-600">
                      {formatCurrency(project.totalInvestment || 0)}
                    </span>
                  </div>

                  {project.targetAmount && (
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>
                          {calculateProgress(project.totalInvestment || 0, project.targetAmount).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${calculateProgress(project.totalInvestment || 0, project.targetAmount)}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Additional Info */}
                <div className="flex justify-between text-xs text-gray-500 mb-4">
                  <span>{project.investments?.length || 0} investor</span>
                  {project.deadline && (
                    <span>
                      {getDaysRemaining(project.deadline)} hari tersisa
                    </span>
                  )}
                </div>

                {/* Owner Info */}
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600">
                      {project.owner?.email?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">
                      {project.owner?.email?.split('@')[0] || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500">Project Owner</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="px-6 py-4 bg-gray-50 border-t">
                <div className="flex w-full justify-between items-center mb-3">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-700">Min investasi:</span>
                    <span className="text-sm font-bold text-blue-700">{formatCurrencyCompact(project.minInvestment || 100000)}</span>
                  </div>
                  {project.deadline && (
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-medium text-gray-700">Deadline:</span>
                      <span className="text-sm font-medium text-gray-900">{investmentService.formatDate(project.deadline)}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-700">Profit sharing:</span>
                    <span className="text-sm font-bold text-green-700">{project.profitSharingPercentage || 0}% / {project.profitSharingPercentageAfterBEP || 0}%</span>
                    <span className="text-xs text-gray-500">(sebelum/setelah BEP)</span>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => onViewDetails(project)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                  >
                    Lihat Detail
                  </button>
                  {investmentService.isProjectInvestable(project) ? (
                    <button
                      onClick={() => onInvestClick(project)}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                    >
                      Investasi
                    </button>
                  ) : (
                    <button
                      disabled
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-500 rounded-md cursor-not-allowed text-sm font-medium"
                    >
                      Tidak Tersedia
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectBrowser;