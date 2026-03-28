import { User, CreateUserRequest, UpdateUserRequest, UserFilters, UserListResponse } from '@/types/user.types';

const normalizeApiBase = (): string => {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (raw && raw.length > 0) {
    const noTrailingSlash = raw.replace(/\/+$/, '');
    return noTrailingSlash.endsWith('/api') ? noTrailingSlash : `${noTrailingSlash}/api`;
  }
  return '/api';
};

const API_BASE_URL = normalizeApiBase();

class UserService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    // Get token from stored user object
    const userStr = localStorage.getItem('user');
    let token = null;
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        token = user.access_token;
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async getMyProfile(): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse<User>(response);
  }

  async updateMyProfile(userData: { email?: string; password?: string; fullName?: string }): Promise<User> {
    const backendData: any = { ...userData };
    if (backendData.fullName !== undefined) {
      backendData.fullname = backendData.fullName;
      delete backendData.fullName;
    }
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(backendData),
    });
    return this.handleResponse<User>(response);
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  private getUserRole(): string | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return user.user?.role || null;
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    return null;
  }

  async getAllUsers(filters?: UserFilters): Promise<UserListResponse> {
    const queryParams = new URLSearchParams();
    
    if (filters?.role) queryParams.append('role', filters.role);
    if (filters?.search) queryParams.append('search', filters.search);
    if (filters?.page) queryParams.append('page', filters.page.toString());
    if (filters?.limit) queryParams.append('limit', filters.limit.toString());

    // Use different endpoint based on user role
    const userRole = this.getUserRole();
    // SUPER_ADMIN, PROJECT_OWNER, ADMIN_PUSAT, ADMIN_DAPUR, PRODUKSI use /users (backend scopes access per role)
    const endpoint = (userRole === 'SUPER_ADMIN' || userRole === 'PROJECT_OWNER' || userRole === 'ADMIN_PUSAT' || userRole === 'ADMIN_DAPUR' || userRole === 'PRODUKSI') 
      ? '/users' 
      : '/users/admin-view';
    const url = `${API_BASE_URL}${endpoint}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<UserListResponse>(response);
  }

  async getUserById(id: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<User>(response);
  }

  async createUser(userData: CreateUserRequest): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(userData),
    });

    return this.handleResponse<User>(response);
  }

  async updateUser(id: string, userData: UpdateUserRequest): Promise<User> {
    // Konversi fullName menjadi fullname untuk backend
    const backendData: any = { ...userData };
    if (backendData.fullName !== undefined) {
      backendData.fullname = backendData.fullName;
      delete backendData.fullName;
    }
    
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(backendData),
    });

    return this.handleResponse<User>(response);
  }

  async deleteUser(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'DELETE',
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
  }

  async updateKycDocs(userId: string, kycData: { idCardUrl: string; selfieUrl: string }): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/kyc`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(kycData),
    });

    return this.handleResponse<User>(response);
  }

  async getInvestors(): Promise<User[]> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/users?role=INVESTOR`, {
      method: 'GET',
      headers,
    });
    const result = await this.handleResponse<UserListResponse>(response);
    return result.users;
  }

  async getSuppliers(): Promise<User[]> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/users?role=SUPPLIER`, {
      method: 'GET',
      headers,
    });
    const result = await this.handleResponse<UserListResponse>(response);
    return result.users;
  }
}

export const userService = new UserService();