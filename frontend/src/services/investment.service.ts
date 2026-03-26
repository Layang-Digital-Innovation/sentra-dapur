import axios from 'axios';
import {
  Project,
  Investment,
  Report,
  Dividend,
  CreateProjectRequest,
  UpdateProjectRequest,
  UpdateBankAccountRequest,
  AddFinancialReportRequest,
  DistributeDividendRequest,
  InvestInProjectRequest,
  PortfolioItem,
  InvestmentHistoryItem,
  DividendHistoryItem,
  ProjectStatistics,
  ProjectFilters,
  ApiResponse,
  ProjectStatus,
  ReportType,
  InvestmentRequestData,
  ApproveInvestmentData,
  InvestmentAnalytics,
  InvestorPortfolio,
  Notification,
  InvestmentStatus,
  PaginatedResponse,
  NotificationResponse,
} from '../types/investment.types';

const getApiBase = () => {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  return raw.replace(/\/+$/, '').endsWith('/api') ? raw.replace(/\/+$/, '') : `${raw.replace(/\/+$/, '')}/api`;
};
const API_BASE = getApiBase();
const API_URL = `${API_BASE}/investment`;
const INVESTMENT_HISTORY_API_URL = `${API_BASE}/investment-history`;

// Create axios instance with auth interceptor
const apiClient = axios.create({
  baseURL: API_URL,
});

// Create axios instance for investment-history endpoints
const investmentHistoryClient = axios.create({
  baseURL: INVESTMENT_HISTORY_API_URL,
});

// Add auth token to requests
const addAuthInterceptor = (client: any) => {
  client.interceptors.request.use((config: any) => {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      config.headers.Authorization = `Bearer ${userData.access_token}`;
    }
    return config;
  });
};

addAuthInterceptor(apiClient);
addAuthInterceptor(investmentHistoryClient);

class InvestmentService {
  // GENERAL PROJECT ENDPOINTS
  async getProjects(filters?: ProjectFilters): Promise<Project[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    
    const response = await apiClient.get(`/projects?${params.toString()}`);
    return response.data;
  }

  async getProjectById(id: string): Promise<Project> {
    const response = await apiClient.get(`/projects/${id}`);
    return response.data;
  }

  // PROJECT OWNER ENDPOINTS
  async createProject(data: CreateProjectRequest): Promise<Project> {
    const response = await apiClient.post('/projects', data);
    return response.data;
  }

  async getMyProjects(): Promise<Project[]> {
    const response = await apiClient.get('/my-projects');
    return response.data;
  }

  async updateProject(projectId: string, data: UpdateProjectRequest): Promise<Project> {
    const response = await apiClient.patch(`/projects/${projectId}`, data);
    return response.data;
  }

  async updateBankAccount(projectId: string, data: UpdateBankAccountRequest): Promise<Project> {
    const response = await apiClient.patch(`/projects/${projectId}/bank-account`, data);
    return response.data;
  }

  async addFinancialReport(projectId: string, data: AddFinancialReportRequest): Promise<Report> {
    const response = await apiClient.post(`/projects/${projectId}/reports`, data);
    return response.data;
  }

  async distributeDividend(projectId: string, data: DistributeDividendRequest): Promise<Dividend> {
    const response = await apiClient.post(`/projects/${projectId}/dividends`, data);
    return response.data;
  }

  // INVESTOR ENDPOINTS
  async investInProject(projectId: string, data: InvestInProjectRequest): Promise<Investment> {
    const response = await apiClient.post(`/projects/${projectId}/invest`, data);
    return response.data;
  }

  async getPortfolio(): Promise<PortfolioItem[]> {
    const response = await apiClient.get('/portfolio');
    return response.data;
  }



  async getDividendHistory(): Promise<DividendHistoryItem[]> {
    const response = await apiClient.get('/dividend-history');
    return response.data;
  }

  // ADMIN ENDPOINTS
  async getAllProjectsForAdmin(): Promise<Project[]> {
    const response = await apiClient.get('/admin/projects');
    return response.data;
  }

  async getProjectStatistics(): Promise<ProjectStatistics> {
    const response = await apiClient.get('/admin/statistics');
    return response.data;
  }
  
  async getPendingProjectsCount(): Promise<{ count: number }> {
    const response = await apiClient.get('/admin/pending-projects-count');
    return response.data;
  }

  async updateProjectStatus(projectId: string, status: ProjectStatus): Promise<Project> {
    const response = await apiClient.put(`/projects/${projectId}/status`, { status });
    return response.data;
  }

  // UTILITY METHODS
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(2)}%`;
  }

  formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(dateObj);
  }

  getProjectStatusColor(status: ProjectStatus): string {
    switch (status) {
      case ProjectStatus.PENDING:
        return 'yellow';
      case ProjectStatus.APPROVED:
        return 'green';
      case ProjectStatus.REJECTED:
        return 'red';
      case ProjectStatus.ONGOING:
        return 'blue';
      case ProjectStatus.COMPLETED:
        return 'purple';
      case ProjectStatus.CLOSED:
        return 'gray';
      default:
        return 'gray';
    }
  }

  getProjectStatusText(status: ProjectStatus): string {
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
      case ProjectStatus.CLOSED:
        return 'Ditutup';
      default:
        return 'Tidak Diketahui';
    }
  }

  getReportTypeText(type: ReportType): string {
    switch (type) {
      case ReportType.INCOME_STATEMENT:
        return 'Laporan Laba Rugi';
      case ReportType.BALANCE_SHEET:
        return 'Neraca';
      case ReportType.CASH_FLOW:
        return 'Laporan Arus Kas';
      case ReportType.BANK_STATEMENT:
        return 'Rekening Koran';
      default:
        return 'Laporan Keuangan';
    }
  }

  calculateInvestmentProgress(project: Project): number {
    if (!project.targetAmount) return 0;
    
    const totalInvested = project.investments?.reduce((sum, inv) => sum + inv.amount, 0) || 0;
    return Math.min((totalInvested / project.targetAmount) * 100, 100);
  }

  calculateTotalInvestment(project: Project): number {
    return project.investments?.reduce((sum, inv) => sum + inv.amount, 0) || 0;
  }

  calculateInvestorShare(investment: Investment, totalProjectInvestment: number): number {
    if (totalProjectInvestment === 0) return 0;
    return (investment.amount / totalProjectInvestment) * 100;
  }

  isProjectInvestable(project: Project): boolean {
    const isClosed = project.status === ProjectStatus.CLOSED;
    const deadlinePassed = this.isProjectDeadlinePassed(project);
    const fullyFunded = project.targetAmount ? ((project.totalInvestment || 0) >= project.targetAmount) : false;
    return project.status === ProjectStatus.APPROVED && !isClosed && !deadlinePassed && !fullyFunded;
  }

  isProjectDeadlinePassed(project: Project): boolean {
    if (!project.deadline) return false;
    return new Date(project.deadline) < new Date();
  }

  getDaysUntilDeadline(project: Project): number | null {
    if (!project.deadline) return null;
    
    const deadline = new Date(project.deadline);
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  // Validation methods
  validateProjectData(data: CreateProjectRequest | UpdateProjectRequest): string[] {
    const errors: string[] = [];

    if ('title' in data && (!data.title || data.title.trim().length < 3)) {
      errors.push('Judul proyek harus minimal 3 karakter');
    }

    if ('description' in data && (!data.description || data.description.trim().length < 10)) {
      errors.push('Deskripsi proyek harus minimal 10 karakter');
    }

    if ('targetAmount' in data && data.targetAmount && data.targetAmount <= 0) {
      errors.push('Target dana harus lebih dari 0');
    }

    if ('deadline' in data && data.deadline && new Date(data.deadline) <= new Date()) {
      errors.push('Deadline harus di masa depan');
    }

    return errors;
  }

  validateInvestmentAmount(amount: number, project: Project): string[] {
    const errors: string[] = [];

    if (amount <= 0) {
      errors.push('Jumlah investasi harus lebih dari 0');
    }

    const minInvestment = project.minInvestment || 100000; // fallback 100k if not set
    if (amount < minInvestment) {
      errors.push(`Investasi minimum adalah ${this.formatCurrency(minInvestment)}`);
    }

    if (project.targetAmount) {
      const currentInvestment = this.calculateTotalInvestment(project);
      const remainingAmount = project.targetAmount - currentInvestment;
      
      if (amount > remainingAmount) {
        errors.push(`Jumlah investasi melebihi sisa target (${this.formatCurrency(remainingAmount)})`);
      }
    }

    return errors;
  }

  validateBankAccount(data: UpdateBankAccountRequest): string[] {
    const errors: string[] = [];

    if (!data.bankAccount || data.bankAccount.trim().length < 8) {
      errors.push('Nomor rekening harus minimal 8 digit');
    }

    if (!data.bankName || data.bankName.trim().length < 2) {
      errors.push('Nama bank harus diisi');
    }

    if (!data.accountHolder || data.accountHolder.trim().length < 2) {
      errors.push('Nama pemegang rekening harus diisi');
    }

    return errors;
  }

  // ENHANCED INVESTMENT WORKFLOW METHODS
  async requestInvestment(data: { projectId: string; chatId: string }): Promise<Investment> {
    const response = await apiClient.post('/request', data);
    return response.data;
  }

  async approveInvestment(investmentId: string, approved: boolean, rejectedReason?: string): Promise<Investment> {
    const response = await apiClient.post(`/${investmentId}/approve`, {
      approved,
      rejectedReason,
    });
    return response.data;
  }

  async approveInvestmentWithAmount(investmentId: string, data: { amount: number }): Promise<Investment> {
    const response = await apiClient.post(`/${investmentId}/approve`, data);
    return response.data;
  }

  // Admin assign investor to project (new flow)
  async assignInvestorToProject(data: {
    investorId: string;
    projectId: string;
    amount: number;
    chatId?: string;
  }): Promise<Investment> {
    const response = await apiClient.post('admin/assign-investor', data);
    return response.data;
  }

  // INVESTMENT HISTORY & ANALYTICS
  async getInvestmentAnalytics(projectId: string): Promise<InvestmentAnalytics> {
    const response = await investmentHistoryClient.get(`/project/${projectId}/analytics`);
    return response.data;
  }

  async getInvestorPortfolio(): Promise<InvestorPortfolio> {
    const response = await apiClient.get('/portfolio');
    return response.data;
  }

  async getDapurPortfolio(): Promise<any> {
    const response = await apiClient.get('/dapur-portfolio');
    return response.data;
  }

  async getInvestmentHistory(): Promise<Investment[]> {
    const response = await apiClient.get(`/investment-history`);
    return response.data;
  }

  async getAllInvestments(page: number = 1, limit: number = 10, status?: InvestmentStatus): Promise<PaginatedResponse<Investment>> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (status) params.append('status', status);

    const response = await apiClient.get(`/admin/all?${params.toString()}`);
    return response.data;
  }

  // NOTIFICATION METHODS
  async getNotifications(page: number = 1, limit: number = 10): Promise<NotificationResponse> {
    const user = localStorage.getItem('user');
    let token = null;
    if (user) {
      const userData = JSON.parse(user);
      token = userData.access_token;
    }
    
    const response = await axios.get(`${API_BASE}/notifications?page=${page}&limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    const user = localStorage.getItem('user');
    let token = null;
    if (user) {
      const userData = JSON.parse(user);
      token = userData.access_token;
    }
    
    await axios.put(`${API_BASE}/notifications/${notificationId}/read`, {}, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getUnreadNotificationCount(): Promise<{ count: number }> {
    const user = localStorage.getItem('user');
    let token = null;
    if (user) {
      const userData = JSON.parse(user);
      token = userData.access_token;
    }
    
    const response = await axios.get(`${API_BASE}/notifications/unread-count`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }

  // Get investments for a specific project (for project owners)
  async getProjectInvestments(projectId: string): Promise<Investment[]> {
    const response = await apiClient.get(`/projects/${projectId}/investments`);
    return response.data;
  }

  // UTILITY METHODS FOR STATUS
  getInvestmentStatusText(status: InvestmentStatus): string {
    const statusMap = {
      [InvestmentStatus.PENDING]: 'Menunggu Konfirmasi',
      [InvestmentStatus.TRANSFER_PENDING]: 'Menunggu Transfer',
      [InvestmentStatus.TRANSFER_UPLOADED]: 'Bukti Transfer Diunggah',
      [InvestmentStatus.APPROVED]: 'Disetujui',
      [InvestmentStatus.REJECTED]: 'Ditolak',
      [InvestmentStatus.ACTIVE]: 'Aktif',
    };
    return statusMap[status] || status;
  }

  getInvestmentStatusColor(status: InvestmentStatus): string {
    const colorMap = {
      [InvestmentStatus.PENDING]: 'yellow',
      [InvestmentStatus.TRANSFER_PENDING]: 'blue',
      [InvestmentStatus.TRANSFER_UPLOADED]: 'purple',
      [InvestmentStatus.APPROVED]: 'green',
      [InvestmentStatus.REJECTED]: 'red',
      [InvestmentStatus.ACTIVE]: 'green',
    };
    return colorMap[status] || 'gray';
  }
}

export default new InvestmentService();