import axios from 'axios';

const getApiBase = () => {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  return raw.replace(/\/+$/, '').endsWith('/api') ? raw.replace(/\/+$/, '') : `${raw.replace(/\/+$/, '')}/api`;
};

const API_BASE = getApiBase();
const API_URL = `${API_BASE}/investor`;

const apiClient = axios.create({
  baseURL: API_URL,
});

apiClient.interceptors.request.use((config: any) => {
  const user = localStorage.getItem('user');
  if (user) {
    const userData = JSON.parse(user);
    config.headers.Authorization = `Bearer ${userData.access_token}`;
  }
  return config;
});

export interface MicroInvestor {
  id: string;
  userId: string;
  parentInvestorId: string;
  dapurUnitId: string;
  internalSharePct: number;
  isActive: boolean;
  createdAt: string;
  user: {
    fullname: string;
    email: string;
    whatsapp?: string;
  };
  dapurUnit: {
    name: string;
  };
}

export interface Wallet {
  balance: number;
}

export interface DividendLog {
  id: string;
  amount: number;
  type: string;
  createdAt: string;
}

class MicroInvestmentService {
  async setupMicroInvestor(data: { userId: string; dapurUnitId: string; internalSharePct: number }) {
    const response = await apiClient.post('/setup-micro', data);
    return response.data;
  }

  async getMyMicros(): Promise<MicroInvestor[]> {
    const response = await apiClient.get('/my-micros');
    return response.data;
  }

  async getWallet(): Promise<Wallet> {
    const response = await apiClient.get('/wallet');
    return response.data;
  }

  async getDividendLogs(): Promise<DividendLog[]> {
    const response = await apiClient.get('/dividend-logs');
    return response.data;
  }
}

export const microInvestmentService = new MicroInvestmentService();
