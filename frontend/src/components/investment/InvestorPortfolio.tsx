'use client';

import React, { useState, useEffect } from 'react';
import { InvestorDashboardData, InvestmentHistoryItem, DividendHistoryItem } from '@/types/investment.types';
import investmentService from '@/services/investment.service';

// ============================================================
// Types untuk Dapur Portfolio (sinkron dengan backend)
// ============================================================
interface RecentDividend {
  dividendId: string;
  amount: number;
  percentage: number;
  period: string | null;
  description: string | null;
  reportedAt: string;
}

interface DapurStake {
  stakeId: string;
  dapurUnitId: string;
  dapurUnitName: string;
  location: string | null;
  status: string;
  projectOwner: { id: string; fullname: string; email: string } | null;
  adminPusat: { id: string; fullname: string; email: string } | null;
  adminDapur: { id: string; fullname: string; email: string } | null;
  investmentAmount: number;
  profitSharingPct: number;
  profitSharingPctPreBEP: number;
  profitSharingPctPostBEP: number;
  totalProfitReceived: number;    // dari laporan nyata admin pusat
  dividendCount: number;
  recentDividends: RecentDividend[];
  linkedAt: string;
}

interface DapurPortfolio {
  totalInvested: number;
  totalProfitReceived: number;  // dari laporan nyata admin pusat
  roiPct: number;
  activeDapur: number;
  totalDapur: number;
  dapur: DapurStake[];
}

const InvestorPortfolio: React.FC = () => {
  const [portfolio, setPortfolio] = useState<InvestorDashboardData | null>(null);
  const [investments, setInvestments] = useState<InvestmentHistoryItem[]>([]);
  const [dividends, setDividends] = useState<DividendHistoryItem[]>([]);
  const [dapurPortfolio, setDapurPortfolio] = useState<DapurPortfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'dapur' | 'investments' | 'dividends'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showDividendModal, setShowDividendModal] = useState(false);
  const [dividendProject, setDividendProject] = useState<{ id: string; title: string } | null>(null);
  const [expandedDapur, setExpandedDapur] = useState<string | null>(null);

  useEffect(() => {
    fetchPortfolioData();
  }, []);

  const fetchPortfolioData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [portfolioResponse, investmentsResponse, dividendsResponse, dapurResponse] = await Promise.all([
        investmentService.getInvestorPortfolio(),
        investmentService.getInvestmentHistory(),
        investmentService.getDividendHistory(),
        investmentService.getDapurPortfolio().catch(() => null),
      ]);

      const portfolioItems = (portfolioResponse.investments || []).map((item: any) => ({
        id: item.investment.id,
        amount: item.investment.amount,
        investorId: item.investment.investorId,
        investor: item.investment.investor,
        projectId: item.investment.projectId,
        project: { ...item.project, totalInvestment: item.project.totalInvestment || 0 },
        investorShare: item.investment.investorShare || 0,
        totalDividends: item.dividendsReceived || 0,
        createdAt: new Date(item.investment.createdAt)
      }));

      const totalDividendsReceivedCalc = (dividendsResponse || []).reduce(
        (sum: number, d: any) => sum + (d.investorDividend || 0), 0
      );

      // Gunakan data nyata dari DapurPortfolio jika ada
      const totalInvestedCalc = (dapurResponse?.totalInvested ?? 0) > 0
        ? dapurResponse.totalInvested
        : portfolioResponse.totalInvested || 0;

      const totalProfitCalc = dapurResponse?.totalProfitReceived ?? totalDividendsReceivedCalc;
      const roiCalc = dapurResponse?.roiPct ?? (totalInvestedCalc > 0 ? (totalDividendsReceivedCalc / totalInvestedCalc) * 100 : 0);

      const dashboardData: InvestorDashboardData = {
        portfolio: portfolioItems,
        totalInvested: totalInvestedCalc,
        totalDividendsReceived: totalDividendsReceivedCalc,
        activeInvestments: portfolioResponse.activeInvestments || 0,
        availableProjects: portfolioResponse.availableProjects || [],
        totalReturn: totalProfitCalc,
        roi: roiCalc,
        activeProjects: portfolioResponse.activeProjects || 0,
        projectBreakdown: portfolioResponse.projectBreakdown || []
      };

      setPortfolio(dashboardData);
      setInvestments(investmentsResponse);
      setDividends(dividendsResponse);
      setDapurPortfolio(dapurResponse);
    } catch (err) {
      setError('Gagal memuat data portofolio');
      console.error('Error fetching portfolio:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

  const formatDate = (date: Date | string): string =>
    new Date(date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

  const formatPercentage = (value: number): string =>
    `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

  const getReturnColor = (value: number): string => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getDapurStatusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      ONGOING: { label: 'Berjalan', cls: 'bg-green-100 text-green-800' },
      APPROVED: { label: 'Disetujui', cls: 'bg-blue-100 text-blue-800' },
      PENDING: { label: 'Menunggu', cls: 'bg-yellow-100 text-yellow-800' },
      COMPLETED: { label: 'Selesai', cls: 'bg-purple-100 text-purple-800' },
      CLOSED: { label: 'Ditutup', cls: 'bg-gray-100 text-gray-800' },
      REJECTED: { label: 'Ditolak', cls: 'bg-red-100 text-red-800' },
    };
    const s = map[status] || { label: status, cls: 'bg-gray-100 text-gray-600' };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${s.cls}`}>
        {s.label}
      </span>
    );
  };

  const openDividendModal = (projectId: string, projectTitle: string) => {
    setDividendProject({ id: projectId, title: projectTitle });
    setShowDividendModal(true);
  };

  const closeDividendModal = () => {
    setShowDividendModal(false);
    setDividendProject(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {[1, 2, 3].map((i) => (
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
          <button onClick={fetchPortfolioData} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER: Overview Tab
  // ============================================================
  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Investasi</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(portfolio?.totalInvested || 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Bagi Hasil</p>
              <p className={`text-2xl font-bold ${getReturnColor(portfolio?.totalReturn || 0)}`}>
                {formatCurrency(portfolio?.totalReturn || 0)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">dari laporan admin pusat</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">ROI Aktual</p>
              <p className={`text-2xl font-bold ${getReturnColor(portfolio?.roi || 0)}`}>
                {formatPercentage(portfolio?.roi || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Per-Project Breakdown */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Portofolio per Proyek</h3>
        {(portfolio?.projectBreakdown && portfolio.projectBreakdown.length > 0) ? (
          <>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Cari proyek..."
                className="w-full md:w-64 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-600"
              />
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">Baris per halaman:</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setCurrentPage(1); }}
                  className="border border-gray-300 rounded-md px-2 py-1 text-gray-600"
                >
                  {[5, 10, 20, 50].map(size => <option key={size} value={size}>{size}</option>)}
                </select>
              </div>
            </div>
            {(() => {
              const rows = portfolio.projectBreakdown || [];
              const filtered = rows.filter(r => r.projectTitle.toLowerCase().includes(searchQuery.toLowerCase()));
              const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
              const safePage = Math.min(currentPage, totalPages);
              const start = (safePage - 1) * pageSize;
              const paged = filtered.slice(start, start + pageSize);
              return (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proyek</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Investasi</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Bagi Hasil</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ROI</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paged.map((row) => (
                          <tr key={row.projectId} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.projectTitle}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(row.totalInvested)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(row.totalReturn)}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${getReturnColor(row.roi)}`}>{formatPercentage(row.roi)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <button onClick={() => openDividendModal(row.projectId, row.projectTitle)} className="inline-flex items-center px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">Detail</button>
                            </td>
                          </tr>
                        ))}
                        {paged.length === 0 && (
                          <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">Tidak ada data</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4 text-sm">
                    <div className="text-gray-600">Menampilkan {filtered.length === 0 ? 0 : start + 1}–{Math.min(start + pageSize, filtered.length)} dari {filtered.length}</div>
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-1 border rounded disabled:opacity-50 text-gray-600" onClick={() => setCurrentPage(1)} disabled={safePage === 1}>«</button>
                      <button className="px-3 py-1 border rounded disabled:opacity-50 text-gray-600" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>Sebelumnya</button>
                      <span className="px-2 text-gray-600">Hal {safePage}/{totalPages}</span>
                      <button className="px-3 py-1 border rounded disabled:opacity-50 text-gray-600" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>Berikutnya</button>
                      <button className="px-3 py-1 border rounded disabled:opacity-50 text-gray-600" onClick={() => setCurrentPage(totalPages)} disabled={safePage === totalPages}>»</button>
                    </div>
                  </div>
                </>
              );
            })()}
          </>
        ) : (
          <div className="text-sm text-gray-500">Belum ada data portofolio per proyek.</div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Aktivitas Terbaru</h3>
          <button onClick={() => setActiveTab('dividends')} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Lihat semua</button>
        </div>
        <div className="space-y-4">
          {[...investments.slice(0, 3), ...dividends.slice(0, 5)]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5)
            .map((item, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${'amount' in item ? 'bg-blue-100' : 'bg-green-100'}`}>
                    {'amount' in item ? (
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>
                    ) : (
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    )}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{'amount' in item ? 'Investasi' : 'Bagi Hasil'}</p>
                    <p className="text-xs text-gray-500">{formatDate(item.createdAt)}</p>
                  </div>
                </div>
                <p className={`text-sm font-semibold ${'amount' in item ? 'text-blue-600' : 'text-green-600'}`}>
                  {'amount' in item ? '-' : '+'}{formatCurrency('amount' in item ? item.amount : item.investorDividend)}
                </p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );

  // ============================================================
  // RENDER: Dapur Tab — bagi hasil nyata dari admin pusat
  // ============================================================
  const renderDapur = () => {
    if (!dapurPortfolio) {
      return (
        <div className="bg-white rounded-lg shadow-lg p-6 text-center py-12">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <p className="text-gray-500">Data dapur tidak tersedia.</p>
        </div>
      );
    }

    const { dapur, totalInvested, totalProfitReceived, roiPct, activeDapur, totalDapur } = dapurPortfolio;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow p-5 border-l-4 border-blue-500">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Dapur</p>
            <p className="text-2xl font-bold text-gray-900">{totalDapur}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5 border-l-4 border-green-500">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Dapur Aktif</p>
            <p className="text-2xl font-bold text-green-700">{activeDapur}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5 border-l-4 border-indigo-500">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Modal</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(totalInvested)}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5 border-l-4 border-emerald-500">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Bagi Hasil</p>
            <p className="text-xl font-bold text-emerald-700">{formatCurrency(totalProfitReceived)}</p>
            <p className="text-xs text-gray-400 mt-1">ROI: {roiPct.toFixed(2)}%</p>
          </div>
        </div>

        {/* Dapur List */}
        {dapur.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Belum Ada Tautan Dapur</h4>
            <p className="text-gray-500 text-sm">Anda belum ditautkan ke Dapur manapun. Hubungi Admin Pusat atau Project Owner.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {dapur.map((stake) => (
              <div key={stake.stakeId} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                {/* Card Header */}
                <div
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => setExpandedDapur(expandedDapur === stake.stakeId ? null : stake.stakeId)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white font-bold text-lg shadow">
                      {stake.dapurUnitName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-semibold text-gray-900">{stake.dapurUnitName}</h4>
                        {getDapurStatusBadge(stake.status)}
                        {stake.dividendCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                            ✓ {stake.dividendCount}x bagi hasil
                          </span>
                        )}
                      </div>
                      {stake.location && <p className="text-xs text-gray-500 mt-0.5">📍 {stake.location}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden md:block">
                      <p className="text-xs text-gray-500">Modal Investasi</p>
                      <p className="text-base font-bold text-blue-700">{formatCurrency(stake.investmentAmount)}</p>
                    </div>
                    <div className="text-right hidden md:block">
                      <p className="text-xs text-gray-500">Proporsi Bagi Hasil</p>
                      <p className="text-base font-bold text-gray-800">{stake.profitSharingPct.toFixed(2)}%</p>
                    </div>
                    <div className="text-right hidden md:block">
                      <p className="text-xs text-gray-500">Total Bagi Hasil</p>
                      <p className={`text-base font-bold ${stake.totalProfitReceived > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                        {formatCurrency(stake.totalProfitReceived)}
                      </p>
                    </div>
                    <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedDapur === stake.stakeId ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded Detail */}
                {expandedDapur === stake.stakeId && (
                  <div className="border-t border-gray-100 px-5 pb-5">
                    {/* Mobile summary */}
                    <div className="grid grid-cols-3 gap-3 md:hidden mt-4 mb-4">
                      <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-blue-500 mb-1">Modal</p>
                        <p className="text-sm font-bold text-blue-800">{formatCurrency(stake.investmentAmount)}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500 mb-1">% Bagi Hasil</p>
                        <p className="text-sm font-bold text-gray-800">{stake.profitSharingPct.toFixed(2)}%</p>
                      </div>
                      <div className="bg-emerald-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-emerald-500 mb-1">Total Diterima</p>
                        <p className="text-sm font-bold text-emerald-800">{formatCurrency(stake.totalProfitReceived)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      {/* Proporsi Bagi Hasil */}
                      <div>
                        <h5 className="text-sm font-semibold text-gray-700 mb-3">Proporsi Bagi Hasil</h5>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center bg-gray-50 rounded-lg p-3">
                            <span className="text-sm text-gray-600">Pra-BEP</span>
                            <span className="text-sm font-bold text-gray-900">{stake.profitSharingPctPreBEP.toFixed(2)}%</span>
                          </div>
                          <div className="flex justify-between items-center bg-gray-50 rounded-lg p-3">
                            <span className="text-sm text-gray-600">Pasca-BEP</span>
                            <span className="text-sm font-bold text-gray-900">{stake.profitSharingPctPostBEP.toFixed(2)}%</span>
                          </div>
                          <div className="flex justify-between items-center bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <span className="text-sm font-semibold text-gray-700">Proporsi Umum</span>
                            <span className="text-sm font-bold text-blue-700">{stake.profitSharingPct.toFixed(2)}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Riwayat Bagi Hasil Nyata */}
                      <div>
                        <h5 className="text-sm font-semibold text-gray-700 mb-3">
                          Riwayat Bagi Hasil
                          <span className="ml-2 text-xs font-normal text-gray-400">dari laporan admin pusat</span>
                        </h5>
                        {stake.recentDividends.length === 0 ? (
                          <div className="bg-gray-50 rounded-lg p-4 text-center">
                            <p className="text-sm text-gray-400">Belum ada laporan bagi hasil</p>
                            <p className="text-xs text-gray-300 mt-1">Admin Pusat belum melaporkan bagi hasil untuk dapur ini</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {stake.recentDividends.map((div) => (
                              <div key={div.dividendId} className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="text-sm font-semibold text-emerald-800">+{formatCurrency(div.amount)}</p>
                                    {div.period && <p className="text-xs text-emerald-600">{div.period}</p>}
                                    {div.description && <p className="text-xs text-gray-500">{div.description}</p>}
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-gray-400">{formatDate(div.reportedAt)}</p>
                                    <p className="text-xs text-gray-500">{div.percentage.toFixed(1)}% dari total</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Manajemen */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <h5 className="text-sm font-semibold text-gray-700 mb-3">Manajemen Dapur</h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {stake.projectOwner && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-1">Project Owner</p>
                            <p className="text-sm font-medium text-gray-800">{stake.projectOwner.fullname || stake.projectOwner.email}</p>
                          </div>
                        )}
                        {stake.adminPusat && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-1">Admin Pusat</p>
                            <p className="text-sm font-medium text-gray-800">{stake.adminPusat.fullname || stake.adminPusat.email}</p>
                          </div>
                        )}
                        {stake.adminDapur && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-1">Admin Dapur</p>
                            <p className="text-sm font-medium text-gray-800">{stake.adminDapur.fullname || stake.adminDapur.email}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 text-right">
                      <span className="text-xs text-gray-400">Ditautkan sejak {formatDate(stake.linkedAt)}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // RENDER: Investments Tab
  // ============================================================
  const renderInvestments = () => (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Riwayat Investasi</h3>
      {investments.length === 0 ? (
        <div className="text-center py-8">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
          <h4 className="text-lg font-medium text-gray-900 mb-2">Belum Ada Investasi</h4>
          <p className="text-gray-600">Mulai investasi pada proyek yang tersedia</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proyek</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jumlah</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {investments.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{inv.project?.title || 'Unknown'}</div>
                    <div className="text-sm text-gray-500">{inv.project?.status || ''}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{formatCurrency(inv.amount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(inv.createdAt)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Aktif</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ============================================================
  // RENDER: Dividends Tab
  // ============================================================
  const renderDividends = () => (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Riwayat Bagi Hasil (Proyek)</h3>
      {dividends.length === 0 ? (
        <div className="text-center py-8">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <h4 className="text-lg font-medium text-gray-900 mb-2">Belum Ada Bagi Hasil</h4>
          <p className="text-gray-600">Bagi hasil akan muncul setelah proyek mulai memberikan hasil</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proyek</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jumlah</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Periode</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dividends.map((div) => (
                <tr key={div.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{div.projectTitle || 'Unknown'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">{formatCurrency(div.investorDividend)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(div.createdAt)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(div.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ============================================================
  // MAIN RENDER
  // ============================================================
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Portofolio Investasi</h1>
          <div className="text-sm text-gray-600">
            {portfolio?.activeInvestments || 0} investasi aktif
            {dapurPortfolio && dapurPortfolio.totalDapur > 0 && (
              <span className="ml-2 text-orange-600">· {dapurPortfolio.totalDapur} dapur</span>
            )}
          </div>
        </div>
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-1 overflow-x-auto">
            {([
              { key: 'overview', label: 'Overview' },
              { key: 'dapur', label: `🍳 Dapur${dapurPortfolio && dapurPortfolio.totalDapur > 0 ? ` (${dapurPortfolio.totalDapur})` : ''}` },
              { key: 'investments', label: `Investasi (${investments.length})` },
              { key: 'dividends', label: `Bagi Hasil (${dividends.length})` },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === tab.key ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'dapur' && renderDapur()}
      {activeTab === 'investments' && renderInvestments()}
      {activeTab === 'dividends' && renderDividends()}

      {showDividendModal && dividendProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={closeDividendModal}></div>
          <div className="relative bg-white rounded-lg shadow-2xl w-11/12 max-w-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Riwayat Bagi Hasil</h3>
                <p className="text-sm text-gray-600">Proyek: {dividendProject.title}</p>
              </div>
              <button onClick={closeDividendModal} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Periode</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jumlah</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dividends.filter(d => String(d.projectId) === String(dividendProject.id)).map((d) => (
                    <tr key={d.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatDate(d.createdAt)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatDate(d.date)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">{formatCurrency(d.investorDividend)}</td>
                    </tr>
                  ))}
                  {dividends.filter(d => String(d.projectId) === String(dividendProject.id)).length === 0 && (
                    <tr><td colSpan={3} className="px-6 py-8 text-center text-sm text-gray-500">Belum ada bagi hasil untuk proyek ini.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-right">
              <button onClick={closeDividendModal} className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestorPortfolio;