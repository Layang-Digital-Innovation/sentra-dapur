'use client';

import React, { useState, useEffect } from 'react';
import { 
  Investment, 
  InvestmentStatus, 
  PaginatedResponse,
  InvestmentAnalytics 
} from '@/types/investment.types';
import { User } from '@/types/user.types';
import investmentService from '@/services/investment.service';
import chatService from '@/services/chat.service';
import { useRouter } from 'next/navigation';

interface AdminStats {
  totalInvestments: number;
  pendingApproval: number;
  approvedToday: number;
  rejectedToday: number;
}

type FilterStatus = 'all' | InvestmentStatus;

const AdminInvestmentPanel: React.FC = () => {
  const router = useRouter();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalData, setApprovalData] = useState({
    approved: true,
    rejectedReason: '',
    amount: 0
  });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchInvestments();
    fetchStats();
  }, [currentPage, filterStatus]);

  const fetchInvestments = async () => {
    try {
      setLoading(true);
      const response: PaginatedResponse<Investment> = await investmentService.getAllInvestments(
        currentPage, 
        10, 
        filterStatus === 'all' ? undefined : filterStatus
      );

      setInvestments(response.data);
      setTotalPages(response.totalPages);
    } catch (error) {
      console.error('Error fetching investments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Get all investments to calculate stats
      const allInvestments = await investmentService.getAllInvestments(1, 1000);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const pendingApproval = allInvestments.data.filter(
        inv => inv.status === InvestmentStatus.PENDING
      ).length;
      
      const approvedToday = allInvestments.data.filter(
        inv => inv.status === InvestmentStatus.APPROVED && 
              inv.approvedAt && 
              new Date(inv.approvedAt) >= today
      ).length;
      
      const rejectedToday = allInvestments.data.filter(
        inv => inv.status === InvestmentStatus.REJECTED && 
              inv.updatedAt && 
              new Date(inv.updatedAt) >= today
      ).length;

      setStats({
        totalInvestments: allInvestments.data.length,
        pendingApproval,
        approvedToday,
        rejectedToday
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: InvestmentStatus): string => {
    return investmentService.getInvestmentStatusColor(status);
  };

  const getStatusText = (status: InvestmentStatus): string => {
    return investmentService.getInvestmentStatusText(status);
  };

  const chatWithInvestor = async (investment: Investment) => {
    try {
      const investorId = (investment as any)?.investor?.id;
      if (!investorId) return;
      const title = `Investment - ${investment.project?.title || investment.projectId}`;
      const res = await chatService.startChatWith(investorId, { type: 'INVESTMENT_INQUIRY', title });
      const chatId = (res as any).id;
      if (chatId) {
        const amountStr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(investment.amount || 0);
        const summary = `Halo Investor, ini admin investment. Diskusi terkait investasi Anda.\nProject: ${investment.project?.title || investment.projectId}\nJumlah: ${amountStr}\nStatus: ${investment.status}`;
        try { await chatService.postMessage(chatId, summary); } catch {}
        router.push(`/dashboard/investment-chat?chatId=${chatId}`);
      }
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Gagal memulai chat dengan investor');
    }
  };

  const handleApprovalClick = (investment: Investment, approved: boolean) => {
    setSelectedInvestment(investment);
    setApprovalData({
      approved,
      rejectedReason: '',
      amount: investment.amount || 0
    });
    setShowApprovalModal(true);
  };

  const handleApprovalSubmit = async () => {
    if (!selectedInvestment) return;

    if (!approvalData.approved && !approvalData.rejectedReason.trim()) {
      alert('Alasan penolakan harus diisi');
      return;
    }

    try {
      setProcessing(true);
      
      if (approvalData.approved) {
        // Approve with original investment amount
        await investmentService.approveInvestmentWithAmount(
          selectedInvestment.id,
          { amount: selectedInvestment.amount || 0 }
        );
      } else {
        // For rejection, use existing method
        await investmentService.approveInvestment(
          selectedInvestment.id,
          false,
          approvalData.rejectedReason
        );
      }
      
      setShowApprovalModal(false);
      setSelectedInvestment(null);
      setApprovalData({ approved: true, rejectedReason: '', amount: 0 });
      
      // Refresh data
      fetchInvestments();
      fetchStats();
      
      alert(`Investasi berhasil ${approvalData.approved ? 'disetujui' : 'ditolak'}`);
    } catch (error: any) {
      console.error('Error processing approval:', error);
      alert(error.response?.data?.message || 'Gagal memproses approval');
    } finally {
      setProcessing(false);
    }
  };

  const renderStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Total Investasi</p>
            <p className="text-2xl font-bold text-gray-900">{stats?.totalInvestments || 0}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-amber-600 rounded-md flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Pending Approval</p>
            <p className="text-2xl font-bold text-yellow-600">{stats?.pendingApproval || 0}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Disetujui Hari Ini</p>
            <p className="text-2xl font-bold text-green-600">{stats?.approvedToday || 0}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Ditolak Hari Ini</p>
            <p className="text-2xl font-bold text-red-600">{stats?.rejectedToday || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFilters = () => (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h3 className="text-lg font-semibold text-gray-900">Filter Investasi</h3>
        <div className="w-full sm:w-auto flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm rounded-md font-medium ${
              filterStatus === 'all'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-900 border border-gray-300'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setFilterStatus(InvestmentStatus.PENDING)}
            className={`px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm rounded-md font-medium ${
              filterStatus === InvestmentStatus.PENDING
                ? 'bg-yellow-600 text-white'
                : 'text-gray-600 hover:text-gray-900 border border-gray-300'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilterStatus(InvestmentStatus.TRANSFER_UPLOADED)}
            className={`px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm rounded-md font-medium ${
              filterStatus === InvestmentStatus.TRANSFER_UPLOADED
                ? 'bg-slate-900 text-white'
                : 'text-gray-600 hover:text-gray-900 border border-gray-300'
            }`}
          >
            Perlu Review
          </button>
          <button
            onClick={() => setFilterStatus(InvestmentStatus.APPROVED)}
            className={`px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm rounded-md font-medium ${
              filterStatus === InvestmentStatus.APPROVED
                ? 'bg-green-600 text-white'
                : 'text-gray-600 hover:text-gray-900 border border-gray-300'
            }`}
          >
            Disetujui
          </button>
          <button
            onClick={() => setFilterStatus(InvestmentStatus.REJECTED)}
            className={`px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm rounded-md font-medium ${
              filterStatus === InvestmentStatus.REJECTED
                ? 'bg-red-600 text-white'
                : 'text-gray-600 hover:text-gray-900 border border-gray-300'
            }`}
          >
            Ditolak
          </button>
        </div>
      </div>
    </div>
  );



  // Function to view project details
  const [selectedProjectForDetails, setSelectedProjectForDetails] = useState<any>(null);
  const [showProjectDetailsModal, setShowProjectDetailsModal] = useState(false);

  const handleViewProjectDetails = async (project: any) => {
    try {
      // Jika project memiliki ID, ambil data lengkap dari server
      if (project && project.id) {
        const projectId = project.id;
        // Ambil data proyek lengkap dari server
        const projectData = await investmentService.getProjectById(projectId);
        if (projectData) {
          // Pastikan data penting tersedia
          const enhancedProjectData = {
            ...projectData,
            // Pastikan minimumInvestment tersedia
            minInvestment: projectData.minInvestment || project.minInvestment,
            // Pastikan informasi rekening tersedia
            bankName: projectData.bankName || project.bankName,
            accountNumber: projectData.accountNumber || project.accountNumber,
            accountHolder: projectData.accountHolder || project.accountHolder
          };
          setSelectedProjectForDetails(enhancedProjectData);
        } else {
          // Jika gagal mengambil data lengkap, gunakan data yang ada
          setSelectedProjectForDetails(project);
        }
      } else {
        // Jika tidak ada ID, gunakan data yang ada
        setSelectedProjectForDetails(project);
      }
      setShowProjectDetailsModal(true);
    } catch (error) {
      console.error('Error fetching project details:', error);
      // Jika terjadi error, tetap tampilkan data yang ada
      setSelectedProjectForDetails(project);
      setShowProjectDetailsModal(true);
    }
  };

  // Fungsi untuk memformat nilai numerik dengan aman
  const safeFormatCurrency = (value: any): string => {
    if (value === undefined || value === null || isNaN(Number(value))) {
      return 'Tidak tersedia';
    }
    return formatCurrency(Number(value));
  };

  // Fungsi untuk memformat tanggal dengan aman (tanpa waktu)
  const safeFormatDate = (date: any): string => {
    if (!date) return 'Tidak tersedia';
    
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return 'Tidak tersedia';
      
      // Format tanggal tanpa waktu
      const options: Intl.DateTimeFormatOptions = { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric'
      };
      return new Intl.DateTimeFormat('id-ID', options).format(dateObj);
    } catch (error) {
      return 'Tidak tersedia';
    }
  };

  // Fungsi untuk menampilkan persentase dengan aman
  const safeFormatPercentage = (value: any): string => {
    if (value === undefined || value === null || isNaN(Number(value))) {
      return 'Tidak tersedia';
    }
    return `${value}%`;
  };

  const renderProjectDetailsModal = () => (
    showProjectDetailsModal && selectedProjectForDetails && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-900">
              Detail Proyek
            </h3>
            <button 
              onClick={() => setShowProjectDetailsModal(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-6">
            {/* Informasi Dasar Proyek */}
            <div>
              <h4 className="text-lg font-medium text-gray-900">{selectedProjectForDetails.title || 'Tidak ada judul'}</h4>
              <p className="text-sm text-gray-600 mt-1">{selectedProjectForDetails.description || 'Tidak ada deskripsi'}</p>
            </div>
            
            {/* Informasi Finansial */}
            <div>
              <h5 className="text-md font-medium text-gray-900 mb-3">Informasi Finansial</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Target Pendanaan</p>
                  <p className="text-base font-medium text-gray-900">{safeFormatCurrency(selectedProjectForDetails.targetAmount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Dana Terkumpul</p>
                  <p className="text-base font-medium text-gray-900">{safeFormatCurrency(selectedProjectForDetails.currentAmount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Investasi Minimum</p>
                  <p className="text-base font-medium text-gray-900">{safeFormatCurrency(selectedProjectForDetails.minInvestment)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Bagi Hasil Sebelum BEP</p>
                  <p className="text-base font-medium text-gray-900">{safeFormatPercentage(selectedProjectForDetails.profitSharingPercentage)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Bagi Hasil Setelah BEP</p>
                  <p className="text-base font-medium text-gray-900">{safeFormatPercentage(selectedProjectForDetails.profitSharingPercentageAfterBEP)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <p className="text-base font-medium text-gray-900">{selectedProjectForDetails.status || 'Tidak tersedia'}</p>
                </div>
              </div>
            </div>
            
            {/* Informasi Waktu */}
            <div>
              <h5 className="text-md font-medium text-gray-900 mb-3">Informasi Waktu</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Tenggat Waktu</p>
                  <p className="text-base font-medium text-gray-900">{safeFormatDate(selectedProjectForDetails.deadline)}</p>
                </div>
              </div>
            </div>
            
            {/* Informasi Rekening Project Owner */}
            <div>
              <h5 className="text-md font-medium text-gray-900 mb-3">Informasi Rekening Project Owner</h5>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Nama Bank</p>
                    <p className="text-base font-medium text-gray-900">
                      {selectedProjectForDetails.bankName || selectedProjectForDetails.owner?.bankName || 'Tidak tersedia'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Nomor Rekening</p>
                    <p className="text-base font-medium text-gray-900">
                      {selectedProjectForDetails.accountNumber || 'Tidak tersedia'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Nama Pemilik Rekening</p>
                    <p className="text-base font-medium text-gray-900">
                      {selectedProjectForDetails.accountHolder || 'Tidak tersedia'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* File Prospektus */}
            <div>
              <h5 className="text-md font-medium text-gray-900 mb-3">File Prospektus</h5>
              <div className="bg-gray-50 p-4 rounded-lg">
                {selectedProjectForDetails.prospectusUrl ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Prospektus Proyek</span>
                    <a 
                      href={selectedProjectForDetails.prospectusUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium hover:bg-blue-200 inline-flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Unduh
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Tidak ada file prospektus tersedia</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setShowProjectDetailsModal(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    )
  );

  const renderInvestmentList = () => (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Daftar Investasi</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Investor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Proyek
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Detail Proyek
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
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {investments.map((investment) => (
              <tr key={investment.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {investment.investor.fullName || 'Tidak ada nama'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {investment.investor.email}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {investment.project.title}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleViewProjectDetails(investment.project)}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium hover:bg-blue-200"
                  >
                    Lihat Detail
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(investment.amount)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium bg-${getStatusColor(investment.status)}-100 text-${getStatusColor(investment.status)}-800`}>
                    {getStatusText(investment.status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(investment.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  {investment.status === InvestmentStatus.PENDING && (
                    <>
                      <button
                        onClick={() => handleApprovalClick(investment, true)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Setujui
                      </button>
                      <button
                        onClick={() => handleApprovalClick(investment, false)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Tolak
                      </button>
                    </>
                  )}
                  

                  
                  {investment.rejectedReason && (
                    <span className="text-xs text-red-600" title={investment.rejectedReason}>
                      Lihat Alasan
                    </span>
                  )}
                  <button
                    onClick={() => chatWithInvestor(investment)}
                    className="ml-2 inline-flex items-center px-2 py-1.5 rounded bg-indigo-600 text-white text-xs hover:bg-indigo-700"
                  >
                    Chat Investor
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
        <div className="text-sm text-gray-500">
          Halaman {currentPage} dari {totalPages}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 text-gray-800 hover:bg-gray-50"
          >
            Sebelumnya
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 text-gray-800 hover:bg-gray-50"
          >
            Selanjutnya
          </button>
        </div>
      </div>
    </div>
  );

  const renderApprovalModal = () => (
    showApprovalModal && selectedInvestment && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {approvalData.approved ? 'Setujui' : 'Tolak'} Investasi
          </h3>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600">Investor: {selectedInvestment.investor.fullName || 'Tidak ada nama'}</p>
            <p className="text-sm text-gray-600">Email: {selectedInvestment.investor.email}</p>
            <p className="text-sm text-gray-600">Proyek: {selectedInvestment.project.title}</p>
            <p className="text-sm text-gray-600">Jumlah: {formatCurrency(selectedInvestment.amount)}</p>
          </div>

          {approvalData.approved && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 font-medium">
                Investasi akan disetujui dengan jumlah yang sama seperti yang diminta oleh investor.
              </p>
            </div>
          )}

          {!approvalData.approved && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alasan Penolakan
              </label>
              <textarea
                value={approvalData.rejectedReason}
                onChange={(e) => setApprovalData(prev => ({ ...prev, rejectedReason: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Masukkan alasan penolakan..."
                required
              />
            </div>
          )}

          <div className="flex space-x-3">
            <button
              onClick={handleApprovalSubmit}
              disabled={processing}
              className={`flex-1 py-2 px-4 rounded-md font-medium ${
                approvalData.approved
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-red-600 text-white hover:bg-red-700'
              } disabled:opacity-50`}
            >
              {processing ? 'Memproses...' : (approvalData.approved ? 'Setujui' : 'Tolak')}
            </button>
            <button
              onClick={() => setShowApprovalModal(false)}
              className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    )
  );

  if (loading && investments.length === 0) {
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
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel - Kelola Investasi</h1>
            <p className="text-gray-600 mt-1">Kelola approval dan monitoring investasi</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {renderStats()}

      {/* Filters */}
      {renderFilters()}

      {/* Investment List */}
      {renderInvestmentList()}

      {/* Trading Analytics removed from Investment Admin Panel */}

      {/* Approval Modal */}
      {renderApprovalModal()}

      {/* Project Details Modal */}
      {renderProjectDetailsModal()}
    </div>
  );
};

export default AdminInvestmentPanel;