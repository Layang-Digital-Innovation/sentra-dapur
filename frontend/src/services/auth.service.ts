import axiosInstance from '@/utils/axiosConfig';

// Gunakan path relatif agar tidak double 'api' ketika baseURL adalah '/api'
const API_URL = '/auth';

export interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    role: string;
    fullName?: string | null;
  };
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: string;
}

export interface LoginData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

class AuthService {
  async login(data: LoginData): Promise<LoginResponse> {
    const response = await axiosInstance.post(`${API_URL}/login`, data, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.data.access_token) {
      localStorage.setItem('user', JSON.stringify(response.data));
      
      // Set cookies for middleware authentication
      document.cookie = `auth_token=${response.data.access_token}; path=/; max-age=86400`;
      document.cookie = `user_role=${response.data.user.role}; path=/; max-age=86400`;
    }
    return response.data;
  }

  async register(data: RegisterData): Promise<any> {
    return axiosInstance.post(`${API_URL}/register`, data, {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  logout(): void {
    localStorage.removeItem('user');
    
    // Clear cookies
    document.cookie = 'auth_token=; path=/; max-age=0';
    document.cookie = 'user_role=; path=/; max-age=0';

    // Dispatch a global event to notify React context/components about logout
    if (typeof window !== 'undefined') {
      try {
        const event = new Event('auth:logout');
        window.dispatchEvent(event);
      } catch (e) {
        // no-op: in very old browsers, Event constructor may fail
        // fallback using CustomEvent
        try {
          const event = new CustomEvent('auth:logout');
          window.dispatchEvent(event);
        } catch (_) {
          // still no-op
        }
      }
    }
  }

  getCurrentUser(): LoginResponse | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  }

  getToken(): string | null {
    const user = this.getCurrentUser();
    return user?.access_token || null;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getUserRole(): string | null {
    const user = this.getCurrentUser();
    return user?.user.role || null;
  }
}

export default new AuthService();