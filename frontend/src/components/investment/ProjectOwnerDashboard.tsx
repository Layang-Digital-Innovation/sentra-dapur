'use client';

import React, { useState, useEffect } from 'react';
import { 
  Project, 
  Investment, 
  InvestmentAnalytics,
  InvestmentStatus,
  ProjectStatus,
  PaginatedResponse 
} from '@/types/investment.types';
import investmentService from '@/services/investment.service';
import ProjectForm from './ProjectForm';
import ProjectList from './ProjectList';
import FinancialReportUpload from './FinancialReportUpload';
import ProjectDetailOwner from './ProjectDetailOwner';

interface ProjectOwnerStats {
  totalProjects: number;
  activeProjects: number;
  totalFunding: number;
  totalInvestors: number;
  pendingApprovals: number;
  totalDividends: number;
}

type DashboardView = 'dashboard' | 'create-project' | 'edit-project' | 'upload-report';

const ProjectOwnerDashboard: React.FC = () => {
  const [currentView, setCurrentView] = useState<DashboardView>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [analytics, setAnalytics] = useState<InvestmentAnalytics | null>(null);
  const [stats, setStats] = useState<ProjectOwnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // Dividend distribution state
  const [dividendAmount, setDividendAmount] = useState<string>('');
  const [dividendDate, setDividendDate] = useState<string>('');
  const [afterBEP, setAfterBEP] = useState<boolean>(false);
  const [dividendLoading, setDividendLoading] = useState<boolean>(false);
  const [dividendError, setDividendError] = useState<string | null>(null);
  const [dividendSuccess, setDividendSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
    fetchStats();
  }, [refreshTrigger]);

  useEffect(() => {
    if (selectedProject) {
      fetchProjectInvestments();
      fetchProjectAnalytics();
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await investmentService.getMyProjects();
      setProjects(response);
      
      if (response.length > 0 && !selectedProject) {
        setSelectedProject(response[0]);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await investmentService.getMyProjects();
      
      const totalProjects = response.length;
      const activeProjects = response.filter((p: Project) => p.status === ProjectStatus.ONGOING).length;
      const totalFunding = response.reduce((sum: number, p: Project) => sum + (p.totalInvestment || 0), 0);
      
      // Get total unique investors across all projects (only count approved/active investments)
      const allInvestorIds = new Set();
      let pendingApprovals = 0;
      let totalDividends = 0;
      
      for (const project of response) {
        if (project.investments) {
          const countableStatuses = new Set([
            InvestmentStatus.PENDING,
            InvestmentStatus.TRANSFER_PENDING,
            InvestmentStatus.TRANSFER_UPLOADED,
            InvestmentStatus.APPROVED,
            InvestmentStatus.ACTIVE,
          ]);
          project.investments.forEach((inv: Investment) => {
            const investorId = inv.investorId || inv.investor?.id;
            if (countableStatuses.has(inv.status) && investorId) {
              allInvestorIds.add(investorId);
            }
            if (inv.status === InvestmentStatus.TRANSFER_UPLOADED) {
              pendingApprovals++;
            }
          });
        }
        
        if (project.dividends) {
          totalDividends += project.dividends.reduce((sum: number, div: any) => sum + div.amount, 0);
        }
      }

      setStats({
        totalProjects,
        activeProjects,
        totalFunding,
        totalInvestors: allInvestorIds.size,
        pendingApprovals,
        totalDividends
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchProjectInvestments = async () => {
    if (!selectedProject) return;
    
    try {
      const response: Investment[] = await investmentService.getProjectInvestments(selectedProject.id);
      setInvestments(response);
    } catch (error) {
      console.error('Error fetching project investments:', error);
    }
  };

  const fetchProjectAnalytics = async () => {
    if (!selectedProject) return;
    
    try {
      const response = await investmentService.getInvestmentAnalytics(selectedProject.id);
      setAnalytics(response);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const formatDate = (date: Date | string): string => {
    return new Date(date).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: InvestmentStatus | ProjectStatus): string => {
    if (Object.values(InvestmentStatus).includes(status as InvestmentStatus)) {
      return investmentService.getInvestmentStatusColor(status as InvestmentStatus);
    }
    
    switch (status as ProjectStatus) {
      case ProjectStatus.PENDING: return 'gray';
      case ProjectStatus.ONGOING: return 'green';
      case ProjectStatus.COMPLETED: return 'blue';
      case ProjectStatus.REJECTED: return 'red';
      default: return 'gray';
    }
  };

  const getStatusText = (status: InvestmentStatus | ProjectStatus): string => {
    if (Object.values(InvestmentStatus).includes(status as InvestmentStatus)) {
      return investmentService.getInvestmentStatusText(status as InvestmentStatus);
    }
    
    switch (status as ProjectStatus) {
      case ProjectStatus.PENDING: return 'Pending';
      case ProjectStatus.ONGOING: return 'Aktif';
      case ProjectStatus.COMPLETED: return 'Selesai';
      case ProjectStatus.REJECTED: return 'Ditolak';
      default: return 'Unknown';
    }
  };

  const calculateProgress = (project: Project): number => {
    if (!project.targetAmount) return 0;
    return Math.min(((project.totalInvestment || 0) / project.targetAmount) * 100, 100);
  };

  const handleCreateProject = async (data: any) => {
    try {
      await investmentService.createProject(data);
      setCurrentView('dashboard');
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const handleUpdateProject = async (data: any) => {
    if (!selectedProject) return;
    
    try {
      await investmentService.updateProject(selectedProject.id, data);
      setCurrentView('dashboard');
      setSelectedProject(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setCurrentView('edit-project');
  };

  const handleDistributeDividend = async () => {
    if (!selectedProject) return;
    setDividendError(null);
    setDividendSuccess(null);

    const amountNum = Number(dividendAmount);
    if (!amountNum || amountNum <= 0) {
      setDividendError('Jumlah dividen harus lebih dari 0');
      return;
    }
    if (!dividendDate) {
      setDividendError('Tanggal dividen harus diisi');
      return;
    }

    try {
      setDividendLoading(true);
      await investmentService.distributeDividend(selectedProject.id, {
        amount: amountNum,
        date: new Date(dividendDate),
        afterBEP,
      });
      setDividendSuccess('Dividen berhasil didistribusikan');
      setDividendAmount('');
      setDividendDate('');
      setAfterBEP(false);
      // Refresh related data
      fetchProjectAnalytics();
      fetchProjectInvestments();
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error distributing dividend:', error);
      setDividendError('Gagal mendistribusikan dividen. Silakan coba lagi.');
    } finally {
      setDividendLoading(false);
    }
  };

  const handleViewProject = (project: Project) => {
    setSelectedProject(project);
  };

  const handleUploadSuccess = (reportId: string) => {
    setCurrentView('dashboard');
    setSelectedProject(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  // Helper untuk menampilkan nominal besar agar tidak overflow pada kartu
  const formatCurrencyCompact = (amount: number): string => {
    if (amount >= 1_000_000_000_000) {
      const v = Number((amount / 1_000_000_000_000).toFixed(1)).toLocaleString('id-ID');
      return `Rp ${v} Triliun`;
    }
    if (amount >= 1_000_000_000) {
      const v = Number((amount / 1_000_000_000).toFixed(1)).toLocaleString('id-ID');
      return `Rp ${v} Miliar`;
    }
    if (amount >= 1_000_000) {
      const v = Number((amount / 1_000_000).toFixed(1)).toLocaleString('id-ID');
      return `Rp ${v} Juta`;
    }
    if (amount >= 1_000) {
      const v = Number((amount / 1_000).toFixed(1)).toLocaleString('id-ID');
      return `Rp ${v} Ribu`;
    }
    return formatCurrency(amount);
  };
  
  // Tentukan kelas font yang adaptif berdasarkan panjang string
  const bigNumberClass = (display: string): string => {
    const len = display.length;
    if (len > 18) return 'text-lg sm:text-xl md:text-2xl lg:text-3xl';
    if (len > 14) return 'text-xl md:text-2xl lg:text-3xl';
    return 'text-2xl lg:text-3xl';
  };
  
  // Tentukan kelas font yang lebih kecil untuk tampilan compact
  const compactNumberClass = (display: string): string => {
    const len = display.length;
    if (len > 18) return 'text-sm sm:text-base md:text-lg';
    if (len > 14) return 'text-base sm:text-lg';
    return 'text-lg sm:text-xl';
  };
  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Header with Create Project Button */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-8 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold mb-1">Dashboard Project Owner</h1>
            <p className="text-blue-100">Kelola proyek dan pendanaan Anda dengan mudah</p>
          </div>
          <button
            onClick={() => setCurrentView('create-project')}
            className="mt-4 md:mt-0 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Buat Proyek Baru
          </button>
        </div>
      </div>

      {/* Stats Cards with Improved Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-600 mb-1">Total Proyek</p>
              <p className="text-2xl font-bold text-gray-900 truncate">{stats?.totalProjects || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-600 mb-1">Proyek Aktif</p>
              <p className="text-2xl font-bold text-gray-900 truncate">{stats?.activeProjects || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-slate-800 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-600 mb-1">Total Pendanaan</p>
              <p className="text-lg font-bold text-gray-900 truncate">{formatCurrency(stats?.totalFunding || 0)}</p>
            </div>
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-4">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-indigo-500 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-600 mb-1">Jumlah Investor</p>
              <p className="text-2xl font-bold text-gray-900 truncate">{stats?.totalInvestors || 0}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-600 mb-1">Pending Approval</p>
              <p className="text-2xl font-bold text-gray-900 truncate">{stats?.pendingApprovals || 0}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-4">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-emerald-500 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-600 mb-1">Total Dividen</p>
              <p className="text-lg font-bold text-gray-900 truncate">{formatCurrency(stats?.totalDividends || 0)}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-4">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Proyek Saya</h2>
          <span className="text-sm text-gray-500">{projects.length} proyek total</span>
        </div>
        
        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div key={project.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
                   onClick={() => handleViewProject(project)}>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-semibold text-gray-900 text-lg truncate flex-1 mr-2">{project.title}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium bg-${getStatusColor(project.status)}-100 text-${getStatusColor(project.status)}-800 flex-shrink-0`}>
                    {getStatusText(project.status)}
                  </span>
                </div>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{project.description}</p>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Target:</span>
                    <span className="font-medium truncate ml-2 text-black">{formatCurrency(project.targetAmount || 0)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Terkumpul:</span>
                    <span className="font-medium text-green-600 truncate ml-2">{formatCurrency(project.totalInvestment || 0)}</span>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{calculateProgress(project).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${calculateProgress(project)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-sm text-gray-500 pt-2 border-t">
                    <span className="truncate">Dibuat: {formatDate(project.createdAt)}</span>
                    <span className="flex-shrink-0 ml-2">{project.investments?.length || 0} investor</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada proyek</h3>
            <p className="text-gray-500 mb-6">Mulai dengan membuat proyek pertama Anda</p>
            <button
              onClick={() => setCurrentView('create-project')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Buat Proyek Pertama
            </button>
          </div>
        )}
      </div>

      {/* Project Detail Section */}
      {selectedProject && (
        <ProjectDetailOwner
          project={selectedProject}
          investments={investments}
          reports={selectedProject.reports || []}
          onClose={() => setSelectedProject(null)}
          onEdit={(project) => {
            setSelectedProject(project);
            setCurrentView('edit-project');
          }}
          onUploadReport={(project) => {
            setSelectedProject(project);
            setCurrentView('upload-report');
          }}
        />
      )}

      {/* Analytics Section */}
      {selectedProject && analytics && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 mb-2">Analytics - {selectedProject.title}</h2>
          <p className="text-sm text-gray-600 mb-6">Ringkasan metrik performa proyek.</p>
          {/* Compact analytics list instead of cards */}
          <div className="divide-y divide-gray-200">
            <div className="py-3 flex items-baseline justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-700">Total Investasi</p>
                <p className="text-[11px] text-gray-500">Total dana yang telah masuk</p>
              </div>
              {(() => {
                const val = analytics.project.currentAmount || 0;
                const display = formatCurrencyCompact(val);
                const full = formatCurrency(val);
                return (
                  <p className={`font-bold text-gray-900 ${compactNumberClass(display)} truncate whitespace-nowrap overflow-hidden text-ellipsis`} title={full}>
                    {display}
                  </p>
                );
              })()}
            </div>
          
            <div className="py-3 flex items-baseline justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-700">Total Investor</p>
                <p className="text-[11px] text-gray-500">Jumlah investor yang berpartisipasi</p>
              </div>
              <p className="font-bold text-gray-900 text-lg sm:text-xl truncate whitespace-nowrap">
                {analytics.analytics.totalInvestors}
              </p>
            </div>
          
            <div className="py-3 flex items-baseline justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-700">Rata-rata Investasi</p>
                <p className="text-[11px] text-gray-500">Rata-rata dana per investor</p>
              </div>
              {(() => {
                const total = analytics.project.currentAmount || 0;
                const investors = analytics.analytics.totalInvestors;
                const avg = investors > 0 ? total / investors : 0;
                const display = formatCurrencyCompact(avg);
                const full = formatCurrency(avg);
                return (
                  <p className={`font-bold text-gray-900 ${compactNumberClass(display)} truncate whitespace-nowrap overflow-hidden text-ellipsis`} title={full}>
                    {display}
                  </p>
                );
              })()}
            </div>
          
            <div className="py-3 flex items-baseline justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-700">ROI Rata-rata</p>
                <p className="text-[11px] text-gray-500">Perbandingan dividen terhadap total investasi</p>
              </div>
              <p className="font-bold text-gray-900 text-lg sm:text-xl truncate whitespace-nowrap">
                {analytics.project.currentAmount && analytics.analytics.totalDividendsDistributed 
                  ? ((analytics.analytics.totalDividendsDistributed / analytics.project.currentAmount) * 100).toFixed(2)
                  : '0.00'}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dividend Distribution Section */}
      {selectedProject && (
        <div className="bg-white rounded-xl shadow-lg p-5 md:p-8 border border-gray-100">
          <div className="flex items-center mb-6">
            <div className="bg-blue-100 p-2 rounded-full mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Distribusi Dividen - {selectedProject.title}</h2>
          </div>
          
          <div className="bg-gray-50 p-4 md:p-6 rounded-lg mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Jumlah Dividen Total</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <span className="text-gray-500 sm:text-sm">Rp</span>
                  </div>
                  <input
                    type="number"
                    value={dividendAmount}
                    onChange={(e) => setDividendAmount(e.target.value)}
                    min={0}
                    placeholder="Masukkan jumlah dividen total"
                    className="w-full pl-12 md:pl-16 p-2.5 md:p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-black text-sm md:text-base relative z-0"
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  <strong>Ini adalah jumlah total dividen</strong> yang akan dibagikan kepada semua investor secara proporsional berdasarkan persentase kepemilikan mereka.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tanggal Distribusi</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="date"
                    value={dividendDate}
                    onChange={(e) => setDividendDate(e.target.value)}
                    className="w-full pl-12 md:pl-14 p-2.5 md:p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-black text-sm md:text-base relative z-0"
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <label className="flex items-center p-4 border border-gray-200 rounded-lg bg-white">
                <input
                  id="afterBEP"
                  type="checkbox"
                  checked={afterBEP}
                  onChange={(e) => setAfterBEP(e.target.checked)}
                  className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="ml-3">
                  <span className="font-medium text-gray-800">Gunakan profit sharing setelah BEP</span>
                  <p className="text-sm text-gray-600 mt-1">Persentase profit sharing setelah BEP akan digunakan untuk perhitungan distribusi.</p>
                </div>
              </label>
            </div>
          </div>

          {dividendError && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg">
              <div className="flex">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {dividendError}
              </div>
            </div>
          )}
          
          {dividendSuccess && (
            <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-r-lg">
              <div className="flex">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {dividendSuccess}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm text-gray-600 max-w-lg space-y-2">
              <p>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <strong>Cara Perhitungan:</strong>
              </p>
              <ol className="list-decimal ml-6 space-y-1">
                <li>Persentase kepemilikan investor = Nilai investasi investor / Total nilai investasi semua investor</li>
                <li>Persentase distribusi = Persentase kepemilikan × Persentase bagi hasil</li>
                <li>Jumlah dividen investor = Jumlah dividen total × (Persentase distribusi / 100)</li>
              </ol>
              <p className="mt-2">
                <strong>Opsi Setelah BEP:</strong> Jika diaktifkan, sistem akan menggunakan persentase bagi hasil setelah BEP ({selectedProject?.profitSharingPercentageAfterBEP || 0}%) sebagai pengganti persentase bagi hasil normal ({selectedProject?.profitSharingPercentage || 0}%).
              </p>
            </div>
            
            <button
              onClick={handleDistributeDividend}
              disabled={dividendLoading || !dividendAmount || !dividendDate}
              className={`px-3 py-2 md:px-6 md:py-3 rounded-lg font-medium transition-colors flex items-center text-sm md:text-base ${
                dividendLoading || !dividendAmount || !dividendDate 
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
              }`}
            >
              {dividendLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Memproses...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                  </svg>
                  Distribusikan Dividen
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return renderDashboard();
      
      case 'create-project':
        return (
          <ProjectForm
            onSubmit={handleCreateProject}
            onCancel={() => setCurrentView('dashboard')}
          />
        );
      
      case 'edit-project':
        return selectedProject ? (
          <ProjectForm
            initialData={selectedProject}
            onSubmit={handleUpdateProject}
            onCancel={() => setCurrentView('dashboard')}
            isEdit={true}
          />
        ) : null;
      
      case 'upload-report':
        return selectedProject ? (
          <FinancialReportUpload
            projectId={selectedProject.id}
            onUploadComplete={handleUploadSuccess}
          />
        ) : null;
      
      default:
        return renderDashboard();
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-lg p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-2 lg:px-2 py-8">
        {/* Content */}
        {renderContent()}
      </div>
    </div>
  );
};

export default ProjectOwnerDashboard;