'use client';

import React, { useState, useEffect } from 'react';
import { Project, Report, ProjectStatus } from '@/types/investment.types';
import investmentService from '@/services/investment.service';

interface ProjectDetailProps {
  projectId: string;
  onClose: () => void;
  onInvestClick: (project: Project) => void;
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({
  projectId,
  onClose,
  onInvestClick,
}) => {
  const [project, setProject] = useState<Project | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'prospectus' | 'reports' | 'updates'>('overview');

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchProjectDetails();
  }, [projectId]);

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      const response = await investmentService.getProjectById(projectId);
      setProject(response);
      
      // Fetch reports if available
      if (response.reports) {
        setReports(response.reports);
      }
    } catch (error) {
      console.error('Error fetching project details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFullFileUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${BACKEND_URL}${url}`;
  };

  const handleDownloadProspectus = async () => {
    if (!project?.id) return;
    
    try {
      const downloadUrl = `${BACKEND_URL}/api/investment/projects/${project.id}/prospectus`;
      
      // Create a temporary link element and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading prospectus:', error);
      alert('Gagal mengunduh prospektus. Silakan coba lagi.');
    }
  };



  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string | Date): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: ProjectStatus): string => {
    switch (status) {
      case ProjectStatus.ONGOING:
        return 'bg-green-100 text-green-800';
      case ProjectStatus.PENDING:
        return 'bg-amber-100 text-amber-800';
      case ProjectStatus.APPROVED:
        return 'bg-blue-100 text-blue-800';
      case ProjectStatus.COMPLETED:
        return 'bg-blue-100 text-blue-800';
      case ProjectStatus.REJECTED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: ProjectStatus): string => {
    switch (status) {
      case ProjectStatus.ONGOING:
        return 'Sedang Berjalan';
      case ProjectStatus.PENDING:
        return 'Menunggu Persetujuan';
      case ProjectStatus.APPROVED:
        return 'Disetujui';
      case ProjectStatus.COMPLETED:
        return 'Selesai';
      case ProjectStatus.REJECTED:
        return 'Ditolak';
      default:
        return 'Tidak Diketahui';
    }
  };

  const calculateProgress = (): number => {
    if (!project || !project.targetAmount) return 0;
    const currentAmount = project.totalInvestment || 0;
    return Math.min((currentAmount / project.targetAmount) * 100, 100);
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Project Header */}
      <div className="border-b border-gray-200 pb-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{project?.title}</h2>
            <p className="text-gray-900 mt-2">{project?.description}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(project?.status || ProjectStatus.PENDING)}`}>
            {getStatusText(project?.status || ProjectStatus.PENDING)}
          </span>
        </div>
      </div>

      {/* Funding Progress */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress Pendanaan</h3>
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-900">Terkumpul</span>
            <span className="font-medium">{formatCurrency(project?.totalInvestment || 0)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${calculateProgress()}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-900">Target: {formatCurrency(project?.targetAmount || 0)}</span>
            <span className="font-medium text-blue-600">{calculateProgress().toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Project Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Detail Proyek</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-900">Deadline:</span>
              <span className="font-medium text-black">{project?.deadline ? formatDate(project.deadline) : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-900">Jumlah Investor:</span>
              <span className="font-medium text-black">{project?._count?.investments || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-900">Bagi Hasil:</span>
              <span className="font-medium text-green-700">{project?.profitSharingPercentage || 0}%</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Informasi Pemilik</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-900">Nama:</span>
              <span className="font-medium text-black">{project?.owner?.email?.split('@')[0] || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-900">Email:</span>
              <span className="font-medium text-black">{project?.owner?.email || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-900">Dibuat:</span>
              <span className="font-medium text-black">{project?.createdAt ? formatDate(project.createdAt) : '-'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bank Account Information */}
      {(project?.financialDocs?.bankName || project?.bankName) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Informasi Rekening Project Owner
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <p className="text-sm text-blue-600 font-medium mb-1">Nama Bank</p>
              <p className="font-semibold text-gray-900">
                {project?.financialDocs?.bankName || project?.bankName || '-'}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <p className="text-sm text-blue-600 font-medium mb-1">Nomor Rekening</p>
              <p className="font-semibold text-gray-900 font-mono">
                {project?.financialDocs?.bankAccount || project?.accountNumber || '-'}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <p className="text-sm text-blue-600 font-medium mb-1">Atas Nama</p>
              <p className="font-semibold text-gray-900">
                {project?.financialDocs?.accountHolder || project?.accountHolder || '-'}
              </p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-100 border-l-4 border-blue-500 rounded-r-lg">
            <div className="flex items-start">
              <svg className="w-4 h-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-xs font-semibold text-blue-800">Informasi Transfer</p>
                <p className="text-xs text-blue-700 mt-1">Gunakan informasi rekening ini untuk transfer dana investasi setelah mendapat persetujuan dari admin.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Investment Action */}
      {project?.status === ProjectStatus.ONGOING && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-900">Tertarik untuk Berinvestasi?</h3>
              <p className="text-blue-700 mt-1">
                Hubungi admin untuk memulai proses investasi di proyek ini.
              </p>
              {project && (
                <p className="text-xs text-gray-600 mt-2">Min investasi: {investmentService.formatCurrency(project.minInvestment || 100000)}</p>
              )}
            </div>
            {project && investmentService.isProjectInvestable(project) ? (
              <button
                onClick={() => project && onInvestClick(project)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Investasi Sekarang
              </button>
            ) : (
              <button
                disabled
                className="bg-gray-200 text-gray-500 px-6 py-3 rounded-lg cursor-not-allowed font-medium"
              >
                Tidak Tersedia
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderProspectus = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Prospektus Proyek</h3>
      
      {project?.prospectusUrl ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="text-lg font-medium text-gray-900">
                    {project.prospectusFileName || 'Prospektus Proyek'}
                  </h4>
                  <p className="text-gray-600">Dokumen prospektus lengkap untuk proyek ini</p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h5 className="font-medium text-gray-900 mb-2">Informasi Prospektus:</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-900">Format:</span>
                    <span className="font-medium text-black">PDF</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-900">Nama File:</span>
                    <span className="font-medium text-black">{project.prospectusFileName || 'prospektus.pdf'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-900">Status:</span>
                    <span className="font-medium text-green-700">Tersedia</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col space-y-3 ml-6">
              <button
                onClick={handleDownloadProspectus}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium text-center flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Download</span>
              </button>
            </div>
          </div>
          
          {/* Download Section */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <div className="text-center">
              <svg className="w-16 h-16 text-blue-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h4 className="text-lg font-medium text-gray-900 mb-2">Prospektus Proyek</h4>
              <p className="text-gray-600 mb-4">
                Unduh dokumen prospektus lengkap untuk melihat detail investasi ini.
              </p>
              <button
                onClick={handleDownloadProspectus}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium inline-flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Download Prospektus</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500">Prospektus belum tersedia untuk proyek ini</p>
          <p className="text-gray-400 text-sm mt-2">Pemilik proyek belum mengunggah dokumen prospektus</p>
        </div>
      )}
    </div>
  );

  const renderReports = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Laporan Keuangan</h3>
      
      {reports.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500">Belum ada laporan keuangan yang tersedia</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {reports.map((report) => (
            <div key={report.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-lg font-medium text-gray-900">Laporan {report.type}</h4>
                  <p className="text-gray-600 mt-1">Laporan keuangan untuk proyek ini</p>
                  <div className="flex items-center mt-3 space-x-4">
                    <span className="text-sm text-gray-500">
                      Tipe: {report.type}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatDate(report.createdAt)}
                    </span>
                  </div>
                </div>
                {report.fileUrl && (
                  <a
                    href={report.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Download PDF
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderUpdates = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Update Proyek</h3>
      
      <div className="text-center py-12">
        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-gray-500">Fitur update proyek akan segera tersedia</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <p className="text-gray-500">Proyek tidak ditemukan</p>
            <button
              onClick={onClose}
              className="mt-4 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-900">Detail Proyek</h1>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('prospectus')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'prospectus'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Prospektus
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'reports'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Laporan Keuangan
            </button>
            <button
              onClick={() => setActiveTab('updates')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'updates'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Update Proyek
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'prospectus' && renderProspectus()}
          {activeTab === 'reports' && renderReports()}
          {activeTab === 'updates' && renderUpdates()}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;