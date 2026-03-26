"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import authService from '@/services/auth.service';
import { FiCheck, FiX, FiEye, FiClock, FiDollarSign, FiUser, FiCalendar, FiMessageSquare } from 'react-icons/fi';
import chatService from '@/services/chat.service';

interface Project {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'COMPLETED';
  createdAt: string;
  owner: {
    id: string;
    email: string;
  };
  _count: {
    investments: number;
  };
}

export default function AdminProjectsPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    if (user?.user.role !== 'ADMIN' && user?.user.role !== 'SUPER_ADMIN' && user?.user.role !== 'ADMIN_INVESTMENT') {
      router.push('/dashboard');
      return;
    }

    fetchProjects();
  }, [user, isAuthenticated, router]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      
      // Use AuthService to get token
      const token = authService.getToken();
      
      if (!token) {
        console.error('No authentication token found');
        router.push('/login');
        return;
      }

      console.log('Fetching projects with token:', token ? 'Token present' : 'No token');

      const response = await fetch('/api/investment/admin/projects', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('Projects data received:', data);
        
        // Log first project to see data structure
        if (data && data.length > 0) {
          console.log('First project data:', data[0]);
          console.log('Target amount:', data[0].targetAmount, 'Type:', typeof data[0].targetAmount);
          console.log('Deadline:', data[0].deadline, 'Type:', typeof data[0].deadline);
        }
        
        setProjects(data);
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = await response.text();
        }
        
        console.error('Failed to fetch projects:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          url: response.url
        });
        
        if (response.status === 401) {
          authService.logout();
          router.push('/login');
        }
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'Unknown'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReject = async (projectId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      setProcessing(true);
      
      // Use AuthService to get token
      const token = authService.getToken();
      
      if (!token) {
        console.error('No authentication token found');
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/investment/projects/${projectId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        // Refresh projects list
        await fetchProjects();
        setShowModal(false);
        setSelectedProject(null);
        setActionType(null);
      } else {
        const errorData = await response.text();
        console.error('Failed to update project status:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        
        if (response.status === 401) {
          authService.logout();
          router.push('/login');
        }
      }
    } catch (error) {
      console.error('Error updating project status:', error);
    } finally {
      setProcessing(false);
    }
  };

  const openModal = (project: Project, action: 'approve' | 'reject') => {
    setSelectedProject(project);
    setActionType(action);
    setShowModal(true);
  };

  const formatCurrency = (amount: number | string | null | undefined) => {
    // Handle invalid or missing amount
    if (amount === null || amount === undefined || amount === '' || isNaN(Number(amount))) {
      return 'Rp 0';
    }
    
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numericAmount)) {
      return 'Rp 0';
    }
    
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(numericAmount);
  };

  const formatDate = (dateString: string | null | undefined) => {
    // Handle invalid or missing date
    if (!dateString || dateString === '' || dateString === 'null' || dateString === 'undefined') {
      return 'Tanggal tidak tersedia';
    }
    
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Tanggal tidak valid';
    }
    
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { color: 'bg-amber-100 text-amber-800', text: 'Menunggu Persetujuan' },
      APPROVED: { color: 'bg-green-100 text-green-800', text: 'Disetujui' },
      REJECTED: { color: 'bg-red-100 text-red-800', text: 'Ditolak' },
      ACTIVE: { color: 'bg-blue-100 text-blue-800', text: 'Aktif' },
      COMPLETED: { color: 'bg-gray-100 text-gray-800', text: 'Selesai' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const chatWithOwner = async (project: Project) => {
    try {
      const title = `Investment Project - ${project.title}`;
      const res = await chatService.startChatWith(project.owner.id, { type: 'INVESTMENT_INQUIRY', title });
      const chatId = (res as any).id;
      if (chatId) {
        const summary = `Halo Project Owner, saya admin investment. Diskusi terkait proyek Anda.\nProject: ${project.title}\nTarget: ${formatCurrency(project.targetAmount)}\nLink: /dashboard/projects`;
        try { await chatService.postMessage(chatId, summary); } catch {}
        router.push(`/dashboard/investment-chat?chatId=${chatId}`);
      }
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Gagal memulai chat dengan Project Owner');
    }
  };

  if (loading) {
    return (
      <div className="py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const pendingProjects = projects.filter(p => p.status === 'PENDING');
  const approvedProjects = projects.filter(p => p.status === 'APPROVED' || p.status === 'ACTIVE');
  const rejectedProjects = projects.filter(p => p.status === 'REJECTED');

  return (
    <div className="py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Kelola Proyek</h1>
        <p className="mt-2 text-gray-600">Approve atau tolak proyek yang diajukan oleh project owner</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FiClock className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Menunggu Persetujuan</p>
              <p className="text-2xl font-semibold text-gray-900">{pendingProjects.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FiCheck className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Disetujui</p>
              <p className="text-2xl font-semibold text-gray-900">{approvedProjects.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FiX className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Ditolak</p>
              <p className="text-2xl font-semibold text-gray-900">{rejectedProjects.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FiDollarSign className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Proyek</p>
              <p className="text-2xl font-semibold text-gray-900">{projects.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Projects Section */}
      {pendingProjects.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Proyek Menunggu Persetujuan</h2>
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {pendingProjects.map((project) => (
                <li key={project.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {project.title}
                        </h3>
                        {getStatusBadge(project.status)}
                      </div>
                      <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                        {project.description}
                      </p>
                      <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                        <div className="flex items-center">
                          <FiDollarSign className="mr-1 h-4 w-4" />
                          Target: {formatCurrency(project.targetAmount)}
                        </div>
                        <div className="flex items-center">
                          <FiUser className="mr-1 h-4 w-4" />
                          {project.owner.email}
                        </div>
                        <div className="flex items-center">
                          <FiCalendar className="mr-1 h-4 w-4" />
                          Deadline: {formatDate(project.deadline)}
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex space-x-2">
                      <button
                        onClick={() => openModal(project, 'approve')}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <FiCheck className="mr-1 h-4 w-4" />
                        Setujui
                      </button>
                      <button
                        onClick={() => openModal(project, 'reject')}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <FiX className="mr-1 h-4 w-4" />
                        Tolak
                      </button>
                      <button
                        onClick={() => chatWithOwner(project)}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <FiMessageSquare className="mr-1 h-4 w-4" />
                        Chat Owner
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* All Projects Section */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Semua Proyek</h2>
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {projects.map((project) => (
              <li key={project.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {project.title}
                      </h3>
                      {getStatusBadge(project.status)}
                    </div>
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                      {project.description}
                    </p>
                    <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                      <div className="flex items-center">
                        <FiDollarSign className="mr-1 h-4 w-4" />
                        Target: {formatCurrency(project.targetAmount)}
                      </div>
                      <div className="flex items-center">
                        <FiUser className="mr-1 h-4 w-4" />
                        {project.owner.email}
                      </div>
                      <div className="flex items-center">
                        <FiCalendar className="mr-1 h-4 w-4" />
                        Deadline: {formatDate(project.deadline)}
                      </div>
                      <div className="flex items-center">
                        <FiEye className="mr-1 h-4 w-4" />
                        {project._count.investments} investor
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 flex space-x-2">
                    {project.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => openModal(project, 'approve')}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          <FiCheck className="mr-1 h-4 w-4" />
                          Setujui
                        </button>
                        <button
                          onClick={() => openModal(project, 'reject')}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <FiX className="mr-1 h-4 w-4" />
                          Tolak
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => chatWithOwner(project)}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <FiMessageSquare className="mr-1 h-4 w-4" />
                      Chat Owner
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showModal && selectedProject && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${
                actionType === 'approve' ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {actionType === 'approve' ? (
                  <FiCheck className={`h-6 w-6 text-green-600`} />
                ) : (
                  <FiX className={`h-6 w-6 text-red-600`} />
                )}
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">
                {actionType === 'approve' ? 'Setujui Proyek' : 'Tolak Proyek'}
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Apakah Anda yakin ingin {actionType === 'approve' ? 'menyetujui' : 'menolak'} proyek "{selectedProject.title}"?
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={() => handleApproveReject(selectedProject.id, actionType === 'approve' ? 'APPROVED' : 'REJECTED')}
                  disabled={processing}
                  className={`px-4 py-2 ${
                    actionType === 'approve' 
                      ? 'bg-green-500 hover:bg-green-600' 
                      : 'bg-red-500 hover:bg-red-600'
                  } text-white text-base font-medium rounded-md w-24 mr-2 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    actionType === 'approve' ? 'focus:ring-green-500' : 'focus:ring-red-500'
                  } disabled:opacity-50`}
                >
                  {processing ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto"></div>
                  ) : (
                    actionType === 'approve' ? 'Setujui' : 'Tolak'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedProject(null);
                    setActionType(null);
                  }}
                  disabled={processing}
                  className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-24 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}