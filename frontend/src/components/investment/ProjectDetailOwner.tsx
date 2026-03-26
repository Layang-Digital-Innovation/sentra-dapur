'use client';

import React, { useState } from 'react';
import { Project, ProjectStatus, Investment, Report } from '@/types/investment.types';
import investmentService from '@/services/investment.service';
import { FiDownload, FiEdit, FiUpload, FiBarChart2, FiUsers, FiDollarSign, FiCalendar, FiClock, FiPercent } from 'react-icons/fi';

interface ProjectDetailOwnerProps {
  project: Project;
  investments: Investment[];
  reports?: Report[];
  onClose: () => void;
  onEdit: (project: Project) => void;
  onUploadReport: (project: Project) => void;
}

const ProjectDetailOwner: React.FC<ProjectDetailOwnerProps> = ({
  project,
  investments,
  reports = [],
  onClose,
  onEdit,
  onUploadReport,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'investments' | 'reports'>('overview');
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

  const formatCurrency = (amount: number | undefined): string => {
    if (amount === undefined) return 'Rp0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string | Date | undefined): string => {
    if (!date) return '-';
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

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Project Header with Actions */}
      <div className="border-b border-gray-200 pb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{project.title}</h2>
            <p className="text-gray-600 mt-2">{project.description}</p>
          </div>
          <div className="w-full sm:w-auto flex flex-wrap items-center gap-2">
            <button 
              onClick={() => onEdit(project)}
              className="inline-flex items-center px-2.5 py-1.5 text-xs md:px-3 md:py-2 md:text-sm border border-blue-600 font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50"
            >
              <FiEdit className="mr-2" />
              Edit
            </button>
            <button 
              onClick={() => onUploadReport(project)}
              className="inline-flex items-center px-2.5 py-1.5 text-xs md:px-3 md:py-2 md:text-sm border border-green-600 font-medium rounded-md text-green-600 bg-white hover:bg-green-50"
            >
              <FiUpload className="mr-2" />
              Upload Laporan
            </button>
          </div>
        </div>
        <div className="mt-4 flex items-center">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(project.status)}`}>
            {getStatusText(project.status)}
          </span>
          <span className="ml-4 text-sm text-gray-500">
            <FiCalendar className="inline mr-1" />
            Dibuat: {formatDate(project.createdAt)}
          </span>
        </div>
      </div>

      {/* Project Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <FiDollarSign className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Target Pendanaan</p>
              <h3 className="text-xl font-bold text-gray-900">{formatCurrency(project.targetAmount)}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <FiBarChart2 className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Terkumpul</p>
              <h3 className="text-xl font-bold text-gray-900">{formatCurrency(project.totalInvestment)}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-slate-100 text-amber-600">
              <FiUsers className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Jumlah Investor</p>
              <h3 className="text-xl font-bold text-gray-900">{project._count?.investments || 0}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Funding Progress */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress Pendanaan</h3>
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Terkumpul</span>
            <span className="font-medium text-black">{formatCurrency(project.totalInvestment)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${calculateProgress()}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Target: {formatCurrency(project.targetAmount)}</span>
            <span className="font-medium text-blue-600">{calculateProgress().toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Project Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Detail Proyek</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-gray-600">
                <FiClock className="mr-2" />
                <span>Deadline</span>
              </div>
              <span className="font-medium text-gray-900">{project.deadline ? formatDate(project.deadline) : '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center text-gray-600">
                <FiPercent className="mr-2" />
                <span>Bagi Hasil (Sebelum BEP)</span>
              </div>
              <span className="font-medium text-green-600">{project.profitSharingPercentage || 0}%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center text-gray-600">
                <FiPercent className="mr-2" />
                <span>Bagi Hasil (Setelah BEP)</span>
              </div>
              <span className="font-medium text-green-600">{project.profitSharingPercentageAfterBEP ? `${project.profitSharingPercentageAfterBEP}%` : '0%'}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center text-gray-600">
                <FiDollarSign className="mr-2" />
                <span>Minimum Investasi</span>
              </div>
              <span className="font-medium text-gray-900">{project.minInvestment ? formatCurrency(project.minInvestment) : 'Rp0'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Informasi Bank</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Bank</span>
              <span className="font-medium text-gray-900">{project.bankName || '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Nomor Rekening</span>
              <span className="font-medium text-gray-900">{project.accountNumber || '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Atas Nama</span>
              <span className="font-medium text-gray-900">{project.accountHolder || '-'}</span>
            </div>
            {project.prospectusUrl && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={handleDownloadProspectus}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FiDownload className="mr-2" />
                  Download Prospektus
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderInvestments = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Daftar Investor</h3>
      
      {investments.length > 0 ? (
        <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Investor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jumlah
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tanggal
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {investments.map((investment) => (
                <tr key={investment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {investment.investor?.email?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {investment.investor?.email || 'Unknown User'}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {investment.investor?.id || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(investment.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium bg-${investmentService.getInvestmentStatusColor(investment.status)}-100 text-${investmentService.getInvestmentStatusColor(investment.status)}-800`}>
                      {investmentService.getInvestmentStatusText(investment.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(investment.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 bg-white rounded-lg shadow-sm border border-gray-200">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <p className="text-gray-500">Belum ada investasi untuk proyek ini</p>
        </div>
      )}
    </div>
  );

  const renderReports = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-900">Laporan Keuangan</h3>
        <button 
          onClick={() => onUploadReport(project)}
          className="inline-flex items-center px-2.5 py-1.5 text-xs md:px-3 md:py-2 md:text-sm border border-green-600 font-medium rounded-md text-green-600 bg-white hover:bg-green-50"
        >
          <FiUpload className="mr-2" />
          Upload Laporan Baru
        </button>
      </div>
      
      {reports.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {reports.map((report) => (
              <li key={report.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {report.type === 'INCOME_STATEMENT' ? 'Laporan Laba Rugi' : 
                       report.type === 'BALANCE_SHEET' ? 'Neraca Keuangan' : 
                       report.type === 'CASH_FLOW' ? 'Arus Kas' : 
                       report.type === 'BANK_STATEMENT' ? 'Rekening Koran' : 'Laporan Keuangan'}
                    </p>
                    <p className="text-sm text-gray-500">{formatDate(report.createdAt)}</p>
                  </div>
                  <a 
                    href={getFullFileUrl(report.fileUrl)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-2.5 py-1.5 text-[11px] md:text-sm border border-gray-300 shadow-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <FiDownload className="mr-2" />
                    Download
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-center py-8 bg-white rounded-lg shadow-sm border border-gray-200">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500">Belum ada laporan keuangan untuk proyek ini</p>
          <button 
            onClick={() => onUploadReport(project)}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FiUpload className="mr-2" />
            Upload Laporan
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-gray-50 rounded-xl shadow-lg p-6">
      {/* Close Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('investments')}
            className={`${
              activeTab === 'investments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
          >
            Investasi
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`${
              activeTab === 'reports'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
          >
            Laporan
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'investments' && renderInvestments()}
      {activeTab === 'reports' && renderReports()}
    </div>
  );
};

export default ProjectDetailOwner;