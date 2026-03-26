import axios, { AxiosProgressEvent } from 'axios';
import { ReportType } from '@/types/investment.types';

// Normalisasi base URL agar tidak jatuh ke localhost di production
const normalizeApiBase = (): string => {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (raw && raw.length > 0) {
    const noTrailingSlash = raw.replace(/\/+$/, '');
    return noTrailingSlash.endsWith('/api') ? noTrailingSlash : `${noTrailingSlash}/api`;
  }
  const isProd = process.env.NODE_ENV === 'production';
  return isProd ? '/api' : 'http://localhost:3001/api';
};
const API_URL = normalizeApiBase();

const apiClient = axios.create({
  baseURL: API_URL,
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const user = localStorage.getItem('user');
  if (user) {
    const userData = JSON.parse(user);
    const token = userData.access_token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export interface FileUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  url: string;
  uploadedAt: string;
}

export interface FinancialReport {
  id: string;
  projectId: string;
  reportType: ReportType;
  title: string;
  description?: string;
  file: UploadedFile;
  uploadedBy: string;
  uploadedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

class FileUploadService {
  /**
   * Upload a file with progress tracking
   */
  async uploadFile(
    file: File,
    onProgress?: (progress: FileUploadProgress) => void
  ): Promise<UploadedFile> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiClient.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress: FileUploadProgress = {
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total),
            };
            onProgress(progress);
          }
        },
      });

      return response.data;
    } catch (error) {
      console.error('File upload failed:', error);
      throw new Error('Failed to upload file');
    }
  }

  /**
   * Upload financial report
   */
  async uploadFinancialReport(data: {
    projectId: string;
    reportType: string;
    title: string;
    description?: string;
    file: File;
  }, onProgress?: (progress: FileUploadProgress) => void): Promise<FinancialReport> {
    try {
      // First upload the file to the financial-report endpoint
      const formData = new FormData();
      formData.append('file', data.file);

      const uploadResponse = await apiClient.post('/upload/financial-report', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress: FileUploadProgress = {
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total),
            };
            onProgress(progress);
          }
        },
      });

      // Then create the financial report record
      const reportData = {
        projectId: data.projectId,
        reportType: data.reportType,
        title: data.title,
        description: data.description,
        fileUrl: uploadResponse.data.url,
        fileName: uploadResponse.data.filename,
        fileSize: uploadResponse.data.size,
        mimeType: uploadResponse.data.mimetype,
      };

      const response = await apiClient.post('/financial-reports', reportData);
      return response.data;
    } catch (error) {
      console.error('Financial report upload failed:', error);
      throw new Error('Failed to upload financial report');
    }
  }

  /**
   * Get financial reports for a project
   */
  async getFinancialReports(projectId: string): Promise<FinancialReport[]> {
    try {
      const response = await apiClient.get(`/financial-reports/project/${projectId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch financial reports:', error);
      throw new Error('Failed to fetch financial reports');
    }
  }

  /**
   * Get all financial reports for the current user's projects
   */
  async getMyFinancialReports(): Promise<FinancialReport[]> {
    try {
      const response = await apiClient.get('/financial-reports/my-reports');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch financial reports:', error);
      throw new Error('Failed to fetch financial reports');
    }
  }

  /**
   * Delete a financial report
   */
  async deleteFinancialReport(reportId: string): Promise<void> {
    try {
      await apiClient.delete(`/financial-reports/${reportId}`);
    } catch (error) {
      console.error('Failed to delete financial report:', error);
      throw new Error('Failed to delete financial report');
    }
  }

  /**
   * Download a file
   */
  async downloadFile(fileUrl: string, filename: string): Promise<void> {
    try {
      const url = (fileUrl || '').startsWith('http')
        ? fileUrl
        : `${window.location.origin}${(fileUrl || '').startsWith('/') ? '' : '/'}${fileUrl || ''}`;
      // Open the file in a new tab; browser will handle viewing/downloading the PDF
      window.open(url, '_blank');
    } catch (error) {
      console.error('File download failed:', error);
      throw new Error('Failed to download file');
    }
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File, options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
  } = {}): { isValid: boolean; error?: string } {
    const { maxSize = 10 * 1024 * 1024, allowedTypes = ['application/pdf'] } = options;

    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`,
      };
    }

    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `File type must be one of: ${allowedTypes.join(', ')}`,
      };
    }

    return { isValid: true };
  }
}

export const fileUploadService = new FileUploadService();