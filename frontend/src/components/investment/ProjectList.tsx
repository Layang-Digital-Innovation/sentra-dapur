'use client';

import React, { useState, useEffect } from 'react';
import { Project, ProjectStatus } from '@/types/investment.types';
import investmentService from '@/services/investment.service';

interface ProjectListProps {
  onEditProject: (project: Project) => void;
  onViewProject: (project: Project) => void;
  refreshTrigger?: number;
}

const ProjectList: React.FC<ProjectListProps> = ({
  onEditProject,
  onViewProject,
  refreshTrigger = 0,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, [refreshTrigger]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await investmentService.getMyProjects();
      setProjects(response);
    } catch (err) {
      setError('Gagal memuat daftar proyek');
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: ProjectStatus): string => {
    switch (status) {
      case ProjectStatus.PENDING:
        return 'bg-amber-100 text-amber-800';
      case ProjectStatus.APPROVED:
        return 'bg-green-100 text-green-800';
      case ProjectStatus.REJECTED:
        return 'bg-red-100 text-red-800';
      case ProjectStatus.ONGOING:
        return 'bg-blue-100 text-blue-800';
      case ProjectStatus.COMPLETED:
        return 'bg-slate-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: ProjectStatus): string => {
    switch (status) {
      case ProjectStatus.PENDING:
        return 'Menunggu Persetujuan';
      case ProjectStatus.APPROVED:
        return 'Disetujui';
      case ProjectStatus.REJECTED:
        return 'Ditolak';
      case ProjectStatus.ONGOING:
        return 'Sedang Berjalan';
      case ProjectStatus.COMPLETED:
        return 'Selesai';
      default:
        return status;
    }
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

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Proyek Saya</h2>
        <span className="text-sm text-gray-600">
          {projects.length} proyek
        </span>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Belum Ada Proyek</h3>
          <p className="text-gray-600">Mulai dengan membuat proyek pertama Anda</p>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
            <div key={project.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {project.title}
                  </h3>
                  <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                    {project.description}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                  {getStatusText(project.status)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Target Dana</p>
                  <p className="font-semibold text-gray-900">
                    {project.targetAmount 
                      ? formatCurrency(project.targetAmount)
                      : 'Tidak ditentukan'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Dana Terkumpul</p>
                  <p className="font-semibold text-black">
                    {formatCurrency(project.totalInvestment || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Deadline</p>
                  <p className="font-semibold text-gray-900">
                    {project.deadline 
                      ? formatDate(project.deadline)
                      : 'Tidak ditentukan'
                    }
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              {project.targetAmount && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress Pendanaan</span>
                    <span>
                      {calculateProgress(project.totalInvestment || 0, project.targetAmount).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${calculateProgress(project.totalInvestment || 0, project.targetAmount)}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                <span>Dibuat: {formatDate(project.createdAt)}</span>
                <span>{project.investments?.length || 0} investor</span>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => onViewProject(project)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Lihat Detail
                </button>
                <button
                  onClick={() => onEditProject(project)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Edit Proyek
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectList;