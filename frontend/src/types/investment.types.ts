// Investment Module Types and Interfaces

export enum ProjectStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  CLOSED = 'CLOSED'
}

export enum InvestmentStatus {
  PENDING = 'PENDING',
  TRANSFER_PENDING = 'TRANSFER_PENDING',
  TRANSFER_UPLOADED = 'TRANSFER_UPLOADED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ACTIVE = 'ACTIVE',
}

export enum DividendStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
}

export enum Role {
  INVESTOR = 'INVESTOR',
  PROJECT_OWNER = 'PROJECT_OWNER',
  ADMIN = 'ADMIN',
}

export enum ReportType {
  INCOME_STATEMENT = 'INCOME_STATEMENT',
  BALANCE_SHEET = 'BALANCE_SHEET',
  CASH_FLOW = 'CASH_FLOW',
  BANK_STATEMENT = 'BANK_STATEMENT',
}

// Base interfaces
import { User as UserType } from './user.types';

export interface User extends UserType {}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  ownerId: string;
  owner: User;
  targetAmount?: number;
  deadline?: Date;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  profitSharingPercentage?: number;
  profitSharingPercentageAfterBEP?: number;
  minInvestment?: number;
  prospectusUrl?: string;
  prospectusFileName?: string;
  financialDocs?: {
    targetAmount?: number;
    deadline?: Date;
    bankAccount?: string;
    bankName?: string;
    accountHolder?: string;
    progress?: number;
  };
  investments: Investment[];
  reports: Report[];
  dividends: Dividend[];
  totalInvestment?: number;
  _count?: {
    investments: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Investment {
  id: string;
  amount: number;
  investorId: string;
  investor: User;
  projectId: string;
  project: Project;
  status: InvestmentStatus;
  transferProofUrl?: string;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedReason?: string;
  chatId?: string;
  dividendDistributions?: DividendDistribution[];
  investorShare?: number; // percentage
  totalDividends?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Report {
  id: string;
  type: ReportType;
  fileUrl: string;
  projectId: string;
  project?: Project;
  createdAt: Date;
}

export interface Dividend {
  id: string;
  amount: number;
  date: Date;
  projectId: string;
  project?: Project;
  createdAt: Date;
}

// Request/Response interfaces for API calls

// Project Owner interfaces
export interface CreateProjectRequest {
  title: string;
  description: string;
  targetAmount?: number;
  deadline?: Date;
  bankAccount?: string;
  bankName?: string;
  accountHolder?: string;
  profitSharingPercentage?: number;
  profitSharingPercentageAfterBEP?: number;
  minInvestment?: number;
  prospectusUrl?: string;
  prospectusFileName?: string;
}

export interface UpdateProjectRequest {
  title?: string;
  description?: string;
  targetAmount?: number;
  deadline?: Date | string;
  minInvestment?: number;
  progress?: number;
}

export interface UpdateBankAccountRequest {
  bankAccount: string;
  bankName: string;
  accountHolder: string;
}

export interface AddFinancialReportRequest {
  type: ReportType;
  fileUrl: string;
  month?: number;
  year?: number;
}

export interface DistributeDividendRequest {
  amount: number;
  date: Date;
  afterBEP?: boolean;
}

// Investor interfaces
export interface InvestInProjectRequest {
  amount: number;
}

export interface PortfolioItem {
  id: string;
  amount: number;
  investorId: string;
  investor: User;
  projectId: string;
  project: Project & {
    totalInvestment: number;
  };
  investorShare: number; // percentage
  totalDividends: number;
  createdAt: Date;
}

export interface InvestmentHistoryItem {
  id: string;
  amount: number;
  investorId: string;
  projectId: string;
  project: {
    id: string;
    title: string;
    status: ProjectStatus;
  };
  createdAt: Date;
}

export interface DividendHistoryItem {
  id: string;
  projectId: string;
  projectTitle: string;
  totalDividend: number;
  investorDividend: number;
  investorShare: number;
  date: Date;
  createdAt: Date;
}

// Admin interfaces
export interface ProjectStatistics {
  totalProjects: number;
  approvedProjects: number;
  pendingProjects: number;
  totalInvestmentAmount: number;
  totalInvestors: number;
}

// Filter and query interfaces
export interface ProjectFilters {
  status?: ProjectStatus;
  search?: string;
  ownerId?: string;
}

export interface InvestmentFilters {
  projectId?: string;
  investorId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

// Component props interfaces
export interface ProjectCardProps {
  project: Project;
  showInvestButton?: boolean;
  showEditButton?: boolean;
  onInvest?: (projectId: string) => void;
  onEdit?: (projectId: string) => void;
}

export interface InvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onInvest: (amount: number) => void;
}

export interface ProjectFormProps {
  initialData?: Partial<Project>;
  onSubmit: (data: CreateProjectRequest | UpdateProjectRequest) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface FileUploadProps {
  onFileSelect: (file: File) => void;
  acceptedTypes?: string[];
  maxSize?: number; // in MB
  isLoading?: boolean;
}

// API Response interfaces
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface NotificationResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  unreadCount: number;
}

// Error interfaces
export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

// Form validation interfaces
export interface ProjectFormErrors {
  title?: string;
  description?: string;
  targetAmount?: string;
  deadline?: string;
  bankAccount?: string;
  bankName?: string;
  accountHolder?: string;
  profitSharingPercentage?: string;
  profitSharingPercentageAfterBEP?: string;
  minInvestment?: string;
  prospectus?: string;
}

export interface InvestmentFormErrors {
  amount?: string;
}

// Dashboard data interfaces
export interface ProjectOwnerDashboardData {
  projects: Project[];
  totalProjects: number;
  totalInvestmentReceived: number;
  totalDividendsDistributed: number;
  pendingProjects: number;
}

export interface InvestorDashboardData {
  portfolio: PortfolioItem[];
  totalInvested: number;
  totalDividendsReceived: number;
  activeInvestments: number;
  availableProjects: Project[];
  totalReturn: number;
  roi: number;
  activeProjects: number;
  projectBreakdown?: ProjectPortfolioBreakdown[];
}

// New interfaces for enhanced backend features
export interface DividendDistribution {
  id: string;
  amount: number;
  percentage: number;
  status: DividendStatus;
  dividendId: string;
  dividend?: Dividend;
  investorId: string;
  investor: User;
  investmentId: string;
  investment?: Investment;
  paidAt?: Date;
  paymentProof?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  userId: string;
  user?: User;
  isRead: boolean;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

// Enhanced request/response interfaces
export interface InvestmentRequestData {
  projectId: string;
  amount: number;
}

export interface ApproveInvestmentData {
  investmentId: string;
  approved: boolean;
  rejectedReason?: string;
}

export interface InvestmentAnalytics {
  project: {
    id: string;
    title: string;
    targetAmount?: number;
    currentAmount?: number;
    status: ProjectStatus;
  };
  analytics: {
    totalInvestments: number;
    totalInvestors: number;
    totalDividendsDistributed: number;
    fundingProgress: number;
  };
  investorBreakdown: Array<{
    investor: User;
    investmentAmount: number;
    investmentDate: Date;
    dividendsReceived: number;
    pendingDividends: number;
  }>;
}

export interface InvestorPortfolio {
  totalInvested: number;
  totalDividendsReceived: number;
  pendingDividends: number;
  activeInvestments: number;
  investments: Array<{
    investment: Investment;
    project: Project;
    dividendsReceived: number;
    pendingDividends: number;
    roi: number;
  }>;
  availableProjects: Project[];
  totalReturn?: number;
  roi?: number;
  activeProjects?: number;
  projectBreakdown?: ProjectPortfolioBreakdown[];
}

export interface ProjectPortfolioBreakdown {
  projectId: string;
  projectTitle: string;
  totalInvested: number;
  totalReturn: number;
  roi: number; // percentage
}

// Chat/Communication interfaces (for investor-admin chat)
export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  projectId?: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
}

export interface ChatConversation {
  id: string;
  participants: User[];
  projectId?: string;
  projectTitle?: string;
  lastMessage?: ChatMessage;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}