import axiosInstance from '@/utils/axiosConfig';

export const dashboardService = {
  async getDashboard() {
    const { data } = await axiosInstance.get('/dashboard');
    return data;
  },
  async getSummary() {
    const { data } = await axiosInstance.get('/dashboard/summary');
    return data;
  },
  async getStats() {
    const { data } = await axiosInstance.get('/dashboard/stats');
    return data;
  },
  async getUserAnalytics() {
    const { data } = await axiosInstance.get('/dashboard/analytics/users');
    return data as {
      totalUsers: number;
      usersByRole: { role: string; count: number }[];
      recentUsers: { id: string; email: string; role: string; createdAt: string }[];
      userGrowth: { month: string; value: number }[];
    };
  },
  async getSubscriptionAnalytics(params?: { currency?: string }) {
    const query = new URLSearchParams();
    if (params?.currency) query.set('currency', params.currency);
    const { data } = await axiosInstance.get(`/dashboard/analytics/subscriptions${query.toString() ? `?${query.toString()}` : ''}`);
    return data as {
      totalSubscriptions: number;
      activeSubscriptions: number;
      subscriptionsByPlan: { plan: string; count: number }[];
      recentSubscriptions: any[];
      totalRevenue: number;
      revenueByProvider: { provider: string; amount: number; count: number }[];
      revenueByCurrency: { currency: string; amount: number; count: number }[];
      currency: string | null;
    };
  },
  async getRevenueAnalytics() {
    const { data } = await axiosInstance.get('/dashboard/analytics/revenue');
    return data as {
      totalRevenue: number;
      monthlyRevenue: { month: string; value: number }[];
      revenueByType: { type: string; amount: number; count: number }[];
      recentPayments: { id: string; createdAt: string; amount: number; user?: { email: string; role: string } }[];
    };
  },
};
