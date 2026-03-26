const normalizeApiBase = (): string => {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (raw && raw.length > 0) {
    const noTrailingSlash = raw.replace(/\/+$/, '');
    return noTrailingSlash.endsWith('/api') ? noTrailingSlash : `${noTrailingSlash}/api`;
  }
  const isProd = process.env.NODE_ENV === 'production';
  return isProd ? '/api' : 'http://localhost:3001/api';
};

const API_BASE_URL = normalizeApiBase();

export interface UploadedFile {
  originalName: string;
  filename: string;
  url: string;
  size: number;
  mimetype: string;
}

export interface UploadResponse {
  message: string;
  files: UploadedFile[];
}

class UploadService {
  private getAuthHeaders(): Record<string, string> {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return {
        'Authorization': `Bearer ${user.access_token}`,
      };
    }
    return {};
  }

  async uploadProductImages(files: FileList): Promise<UploadResponse> {
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    const response = await fetch(`${API_BASE_URL}/upload/product-image`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(errorData.message || 'Upload failed');
    }

    return response.json();
  }

  async uploadKycDocuments(files: FileList): Promise<UploadResponse> {
    const formData = new FormData();
    
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    const response = await fetch(`${API_BASE_URL}/upload/kyc`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(errorData.message || 'Upload failed');
    }

    return response.json();
  }

  async uploadCompanyLogo(file: File): Promise<{ message: string; file: UploadedFile }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/upload/company-logo`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(errorData.message || 'Upload failed');
    }

    return response.json();
  }

  async uploadCompanyProfile(file: File): Promise<{ message: string; file: UploadedFile }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/upload/company-profile`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(errorData.message || 'Upload failed');
    }

    return response.json();
  }

  async uploadDapurBranding(file: File, type: 'logo' | 'signature'): Promise<{ message: string; file: UploadedFile }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/upload/dapur-branding?type=${type}`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(errorData.message || 'Upload failed');
    }

    return response.json();
  }

  async uploadEvidence(file: File): Promise<{ message: string; file: UploadedFile }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/upload/evidence`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(errorData.message || 'Upload failed');
    }

    return response.json();
  }
}

export const uploadService = new UploadService();