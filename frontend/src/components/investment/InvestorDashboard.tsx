'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

import { 
  Project, 
  Investment, 
  InvestorPortfolio as InvestorPortfolioType, 
  InvestmentStatus, 
  PaginatedResponse 
} from '@/types/investment.types';
import investmentService from '@/services/investment.service';
import ProjectBrowser from './ProjectBrowser';
import InvestorPortfolio from './InvestorPortfolio';
import ProjectDetail from './ProjectDetail';
import DirectInvestmentForm from './DirectInvestmentForm';
import { subscriptionService } from '@/services/subscription.service';
import MicroInvestorManagement from './MicroInvestorManagement';
import MicroInvestorDashboard from './MicroInvestorDashboard';
import { Role } from '@/types/user.types';

interface DashboardStats {
  totalInvestment: number;
  totalReturn: number;
  totalDividends?: number;
  activeInvestments: number;
  pendingInvestments: number;
  roi: number;
}

interface DapurStake {
  stakeId: string;
  dapurUnitId: string;
  dapurUnitName: string;
  location: string | null;
  status: string;
  investmentAmount: number;
  profitSharingPctPreBEP: number;
  profitSharingPctPostBEP: number;
  profitSharingPct: number;
  totalProfitReceived: number;   // dari laporan nyata admin pusat
  dividendCount: number;
  recentDividends: {
    dividendId: string;
    amount: number;
    percentage: number;
    period: string | null;
    description: string | null;
    reportedAt: string;
  }[];
  linkedAt: string;
}

interface DapurPortfolioData {
  totalInvested: number;
  totalProfitReceived: number;   // dari laporan nyata admin pusat
  roiPct: number;
  activeDapur: number;
  totalDapur: number;
  dapur: DapurStake[];
}

type DashboardView = 'overview' | 'browse' | 'portfolio' | 'investments' | 'micro-investors';

const InvestorDashboard: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<DashboardView>('overview');

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [portfolio, setPortfolio] = useState<InvestorPortfolioType | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [dapurPortfolio, setDapurPortfolio] = useState<DapurPortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showInvestmentForm, setShowInvestmentForm] = useState(false);
  const [selectedProjectForInvestment, setSelectedProjectForInvestment] = useState<Project | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [isTrialInvestor, setIsTrialInvestor] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [refreshTrigger]);

  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const role = user?.user?.role;
        if (role !== 'INVESTOR') {
          setIsTrialInvestor(false);
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
        const onTrial = plan === 'TRIAL';
        setIsTrialInvestor(onTrial);
      } catch {
        setIsTrialInvestor(false);
      }
    };
    loadSubscription();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [
        portfolioResponse,
        investmentHistoryResponse,
        dividendsHistoryResponse,
        dapurResponse,
      ] = await Promise.all([
        investmentService.getInvestorPortfolio(),
        investmentService.getInvestmentHistory(),
        investmentService.getDividendHistory(),
        investmentService.getDapurPortfolio().catch(() => null),
      ]);

      setPortfolio(portfolioResponse);
      setInvestments(investmentHistoryResponse);
      setDapurPortfolio(dapurResponse);

      const pendingInvestments = investmentHistoryResponse.filter(
        (inv: Investment) =>
          inv.status === InvestmentStatus.PENDING ||
          inv.status === InvestmentStatus.TRANSFER_PENDING ||
          inv.status === InvestmentStatus.TRANSFER_UPLOADED
      ).length;

      const totalDividendsReceived = (dividendsHistoryResponse || []).reduce(
        (sum, d) => sum + (d.investorDividend || 0),
        0
      );

      // Prioritaskan total investasi dari Dapur Portfolio jika tersedia
      const totalInvestedDapur = dapurResponse?.totalInvested ?? 0;
      const totalInvested = totalInvestedDapur > 0
        ? totalInvestedDapur
        : portfolioResponse.totalInvested || 0;

      const totalReturn = dapurResponse?.totalProfitReceived ?? totalDividendsReceived;
      const roiCalc = dapurResponse?.roiPct ?? (totalInvested > 0 ? (totalDividendsReceived / totalInvested) * 100 : 0);

      setStats({
        totalInvestment: totalInvested,
        totalReturn,
        totalDividends: totalDividendsReceived,
        activeInvestments: dapurResponse?.activeDapur ?? portfolioResponse.activeInvestments,
        pendingInvestments: dapurResponse ? dapurResponse.totalDapur : pendingInvestments,
        roi: roiCalc,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkNotificationAsRead = async (notificationId: string) => {
    try {
      await investmentService.markNotificationAsRead(notificationId);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleInvestClick = (project: Project) => {
    if (!user) return;
    
    setSelectedProjectForInvestment(project);
    setShowInvestmentForm(true);
  };

  const handleInvestmentSuccess = () => {
    setShowInvestmentForm(false);
    setSelectedProjectForInvestment(null);
    setRefreshTrigger(prev => prev + 1); // Refresh dashboard data
  };

  const handleInvestmentCancel = () => {
    setShowInvestmentForm(false);
    setSelectedProjectForInvestment(null);
  };

  const handleViewDetails = (project: Project) => {
    setSelectedProject(project);
  };

  const handleCloseDetails = () => {
    setSelectedProject(null);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatCompactCurrency = (amount: number): string => {
    const formatOptionalDecimal = (value: number): string =>
      value.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
    const formatNoDecimal = (value: number): string =>
      value.toLocaleString('id-ID', { maximumFractionDigits: 0 });

    if (amount >= 1_000_000_000) {
      const billions = amount / 1_000_000_000;
      return `Rp ${formatOptionalDecimal(billions)}M`;
    } else if (amount >= 1_000_000) {
      const millions = amount / 1_000_000;
      return `Rp ${formatOptionalDecimal(millions)}Jt`;
    } else if (amount >= 1_000) {
      const thousands = amount / 1_000;
      return `Rp ${formatNoDecimal(thousands)}rb`;
    }
    return formatCurrency(amount);
  };

  const formatDate = (date: Date | string): string => {
    return new Date(date).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPercentage = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getReturnColor = (value: number): string => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getStatusColor = (status: InvestmentStatus): string => {
    return investmentService.getInvestmentStatusColor(status);
  };

  const getStatusText = (status: InvestmentStatus): string => {
    return investmentService.getInvestmentStatusText(status);
  };

  const renderInvestments = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Riwayat Investasi</h2>
        <div className="flex space-x-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-600"
          >
            <option value="">Semua Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Disetujui</option>
            <option value="REJECTED">Ditolak</option>
            <option value="ACTIVE">Aktif</option>
            <option value="COMPLETED">Selesai</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proyek
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Return
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {investments
                .filter(investment => 
                  statusFilter === '' || 
                  investment.status === statusFilter
                )
                .map((investment) => (
                <tr key={investment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {investment.project.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        {investment.project.description?.substring(0, 50)}...
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(investment.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium bg-${getStatusColor(investment.status)}-100 text-${getStatusColor(investment.status)}-800`}>
                      {getStatusText(investment.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(investment.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {investment.totalDividends ? formatCurrency(investment.totalDividends) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Notifikasi</h2>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6v-2H4v2zM4 15h8v-2H4v2zM4 11h8V9H4v2z" />
          </svg>
          <p className="text-gray-500 text-lg">Notifikasi sudah dipindahkan ke navbar</p>
          <p className="text-gray-400 text-sm mt-2">Gunakan ikon notifikasi di navbar untuk melihat notifikasi Anda</p>
        </div>
      </div>
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow duration-300">
          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-full">
                  Investasi
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Total Investasi</p>
              <div className="flex flex-col">
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 break-words leading-tight" title={formatCurrency(stats?.totalInvestment || 0)}>
                  {formatCompactCurrency(stats?.totalInvestment || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatCurrency(stats?.totalInvestment || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow duration-300">
          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
                  Profit Sharing
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Total Profit Sharing</p>
              <div className="flex flex-col">
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600 break-words leading-tight" title={formatCurrency(stats?.totalReturn || 0)}>
                  {formatCompactCurrency(stats?.totalReturn || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatCurrency(stats?.totalReturn || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow duration-300">
          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-rose-500 rounded-lg flex items-center justify-center shadow-lg">
                  {/* Dapur / kitchen icon */}
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-orange-600 font-medium bg-orange-50 px-2 py-1 rounded-full">
                  Dapur Aktif
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Dapur Diinvestasi</p>
              <div className="flex flex-col">
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 break-words leading-tight">
                  {dapurPortfolio?.totalDapur ?? 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {(dapurPortfolio?.activeDapur ?? 0)} aktif
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow duration-300">
          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-full">
                  Est. Return
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">ROI Aktual</p>
              <div className="flex flex-col">
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-indigo-600 break-words leading-tight">
                  {(dapurPortfolio?.roiPct ?? stats?.roi ?? 0).toFixed(2)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  dari bagi hasil nyata
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daftar Dapur yang Diinvestasi */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">🍳 Dapur yang Diinvestasi</h3>
          <button
            onClick={() => setCurrentView('portfolio')}
            className="text-orange-600 hover:text-orange-800 text-sm font-medium"
          >
            Lihat Semua
          </button>
        </div>
        {(!dapurPortfolio || dapurPortfolio.dapur.length === 0) ? (
          <div className="text-center py-8 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <p className="text-sm">Belum ada dapur yang ditautkan</p>
            <p className="text-xs mt-1">Hubungi Admin Pusat atau Project Owner</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dapurPortfolio.dapur.slice(0, 4).map((stake) => {
              const statusColors: Record<string, string> = {
                ONGOING: 'bg-green-100 text-green-800',
                APPROVED: 'bg-blue-100 text-blue-800',
                PENDING: 'bg-yellow-100 text-yellow-700',
                COMPLETED: 'bg-purple-100 text-purple-800',
                CLOSED: 'bg-gray-100 text-gray-600',
                REJECTED: 'bg-red-100 text-red-700',
              };
              return (
                <div key={stake.stakeId} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                      {stake.dapurUnitName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-gray-900">{stake.dapurUnitName}</h4>
                      <p className="text-xs text-gray-500">
                        Modal: {formatCompactCurrency(stake.investmentAmount)}
                        {stake.location ? ` · ${stake.location}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[stake.status] || 'bg-gray-100 text-gray-600'}`}>
                      {stake.status === 'ONGOING' ? 'Berjalan' : stake.status === 'APPROVED' ? 'Disetujui' : stake.status === 'PENDING' ? 'Menunggu' : stake.status}
                    </span>
                    <span className="text-xs font-medium text-emerald-600">
                      {stake.profitSharingPct.toFixed(1)}% bagi hasil
                    </span>
                    {stake.totalProfitReceived > 0 && (
                      <span className="text-xs font-semibold text-green-700">
                        +{formatCompactCurrency(stake.totalProfitReceived)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {dapurPortfolio.dapur.length > 4 && (
              <p className="text-xs text-center text-gray-400 pt-1">+{dapurPortfolio.dapur.length - 4} dapur lainnya</p>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Aksi Cepat</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {!isTrialInvestor && (
            <button
              onClick={() => setCurrentView('browse')}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <div className="text-center">
                <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-sm font-medium text-gray-900">Cari Proyek</p>
                <p className="text-xs text-gray-500">Browse proyek investasi</p>
              </div>
            </button>
          )}

          <button
            onClick={() => setCurrentView('portfolio')}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <div className="text-center">
              <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-sm font-medium text-gray-900">Portofolio</p>
              <p className="text-xs text-gray-500">Lihat investasi Anda</p>
            </div>
          </button>

          <button
            onClick={() => alert('Fitur chat dengan admin akan segera tersedia')}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-slate-800 hover:bg-slate-50 transition-colors"
          >
            <div className="text-center">
              <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm font-medium text-gray-900">Chat Admin</p>
              <p className="text-xs text-gray-500">Konsultasi investasi</p>
            </div>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ringkasan Performa Dapur</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-orange-50 rounded-xl p-4">
            <h4 className="text-xs font-medium text-orange-600 mb-1">Total Dapur</h4>
            <p className="text-2xl font-bold text-gray-900">{dapurPortfolio?.totalDapur ?? 0}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <h4 className="text-xs font-medium text-green-600 mb-1">Dapur Aktif</h4>
            <p className="text-2xl font-bold text-green-700">{dapurPortfolio?.activeDapur ?? 0}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4">
            <h4 className="text-xs font-medium text-blue-600 mb-1">Total Modal</h4>
            <p className="text-xl font-bold text-blue-800">{formatCompactCurrency(dapurPortfolio?.totalInvested ?? 0)}</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4">
            <h4 className="text-xs font-medium text-emerald-600 mb-1">Total Bagi Hasil</h4>
            <p className="text-xl font-bold text-emerald-700">{formatCompactCurrency(dapurPortfolio?.totalProfitReceived ?? 0)}</p>
          </div>
        </div>
        {dapurPortfolio && dapurPortfolio.dapur.some(d => d.dividendCount > 0) && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-sm text-emerald-700 font-medium">
              ✓ {dapurPortfolio.dapur.filter(d => d.dividendCount > 0).length} dapur sudah menerima bagi hasil
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    // If the user is a MICRO_INVESTOR, they only see their siloed dashboard
    if (user?.user?.role === Role.MICRO_INVESTOR) {
      return <MicroInvestorDashboard />;
    }

    switch (currentView) {
      case 'overview':
        return renderOverview();
      
      case 'browse':
        if (isTrialInvestor) {
          return (
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-start gap-2 text-sm text-amber-800 bg-yellow-50 border border-amber-200 rounded p-4">
                  <svg className="w-5 h-5 mt-0.5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 8a1 1 0 112 0v5a1 1 0 11-2 0V8zm1-4a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <div className="font-medium">Akun Anda masih trial. Upgrade untuk melihat semua proyek.</div>
                    <div className="text-gray-700">Untuk akses penuh, silakan upgrade langganan.</div>
                    <div className="mt-3">
                      <Link href="/dashboard/subscription" className="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700">
                        Upgrade sekarang
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        }
        return (
          <ProjectBrowser
            onInvestClick={handleInvestClick}
            onViewDetails={handleViewDetails}
            isTrial={false}
          />
        );
      
      case 'portfolio':
        return <InvestorPortfolio />;
      
      case 'investments':
         return renderInvestments();
      
      case 'micro-investors':
        return <MicroInvestorManagement />;
       
       default:
         return renderOverview();
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
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {user?.user?.role === Role.MICRO_INVESTOR ? 'Dashboard Micro-Investor' : 'Dashboard Investor'}
            </h1>
            <p className="text-gray-600 mt-1">
              {user?.user?.role === Role.MICRO_INVESTOR ? 'Monitor performance investasi silo Anda' : 'Kelola investasi dan portofolio Anda'}
            </p>
          </div>
          
          <div className="w-full sm:w-auto flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCurrentView('overview')}
              className={`px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm rounded-md font-medium ${
                currentView === 'overview'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setCurrentView('browse')}
              className={`px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm rounded-md font-medium ${
                currentView === 'browse'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Cari Proyek
            </button>

            <button
              onClick={() => setCurrentView('portfolio')}
              className={`px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm rounded-md font-medium ${
                currentView === 'portfolio'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Portofolio
            </button>
            <button
              onClick={() => setCurrentView('investments')}
              className={`px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm rounded-md font-medium ${
                currentView === 'investments'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Riwayat Investasi
            </button>

            {user?.user?.role === Role.INVESTOR && (
              <button
                onClick={() => setCurrentView('micro-investors')}
                className={`px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm rounded-md font-medium ${
                  currentView === 'micro-investors'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Micro-Investors
              </button>
            )}

          </div>
        </div>
      </div>

      {/* Content */}
      {renderContent()}

      {/* Project Detail Modal */}
      {selectedProject && (
        <ProjectDetail
          projectId={selectedProject.id}
          onClose={handleCloseDetails}
          onInvestClick={handleInvestClick}
        />
      )}

      {/* Direct Investment Form Modal */}
      {showInvestmentForm && selectedProjectForInvestment && (
        <DirectInvestmentForm
          project={selectedProjectForInvestment}
          onSuccess={handleInvestmentSuccess}
          onCancel={handleInvestmentCancel}
        />
      )}
    </div>
  );
};

export default InvestorDashboard;