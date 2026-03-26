"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useRouter } from 'next/navigation';
import RoleGuard from '@/components/auth/RoleGuard';
import { Role } from '@/types/user.types';
import { dashboardService } from '@/services/dashboard.service';
import InvestmentService from '@/services/investment.service';
import { tradingService } from '@/services/trading.service';
import { 
  FiUsers, 
  FiActivity, 
  FiDollarSign, 
  FiShield,
  FiTrendingUp,
  FiAlertTriangle,
  FiServer,
  FiDatabase,
  FiCpu,
  FiHardDrive
} from 'react-icons/fi';

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalProjects: number;
  totalInvestments: number;
  totalRevenue: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  serverUptime: string;
  databaseSize: string;
  cpuUsage: number;
  memoryUsage: number;
}

interface RecentActivity {
  id: string;
  type: 'user_registration' | 'project_created' | 'investment_made' | 'system_alert';
  description: string;
  timestamp: string;
  severity?: 'low' | 'medium' | 'high';
}

const SuperAdminDashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const { isSuperAdmin } = usePermissions();
  const router = useRouter();
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalProjects: 0,
    totalInvestments: 0,
    totalRevenue: 0,
    systemHealth: 'healthy',
    serverUptime: '-',
    databaseSize: '-',
    cpuUsage: 0,
    memoryUsage: 0
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currency, setCurrency] = useState<string>('USD');
  const [revenueByProvider, setRevenueByProvider] = useState<{ provider: string; amount: number; count: number }[]>([]);
  const [revenueByCurrency, setRevenueByCurrency] = useState<{ currency: string; amount: number; count: number }[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<{ month: string; value: number }[]>([]);
  // Recent activity search & pagination
  const [activitySearch, setActivitySearch] = useState('');
  const [activityPage, setActivityPage] = useState(1);
  const [activityPageSize, setActivityPageSize] = useState(10);
  const filteredActivities = useMemo(() => {
    const q = activitySearch.trim().toLowerCase();
    const list = (recentActivity || []).filter(a => !q || a.description.toLowerCase().includes(q));
    return list;
  }, [recentActivity, activitySearch]);
  const activityTotalPages = Math.max(1, Math.ceil(filteredActivities.length / activityPageSize));
  const pagedActivities = useMemo(() => filteredActivities.slice((activityPage - 1) * activityPageSize, activityPage * activityPageSize), [filteredActivities, activityPage, activityPageSize]);

  // Investor investments list (server pagination)
  const [invPage, setInvPage] = useState(1);
  const [invLimit, setInvLimit] = useState(10);
  const [invSearch, setInvSearch] = useState('');
  const [invLoading, setInvLoading] = useState(false);
  const [invData, setInvData] = useState<{ items: any[]; total: number }>({ items: [], total: 0 });
  const invFiltered = useMemo(() => {
    const q = invSearch.trim().toLowerCase();
    const list = invData.items.filter((i: any) => {
      const name = (i?.investor?.fullname ?? i?.investor?.fullName ?? i?.investor?.name ?? '') as string;
      const email = (i?.investor?.email ?? '') as string;
      const project = (i?.project?.title ?? '') as string;
      return !q || name.toLowerCase().includes(q) || email.toLowerCase().includes(q) || project.toLowerCase().includes(q);
    });
    return list;
  }, [invData.items, invSearch]);

  // Buyer orders (client pagination)
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderPage, setOrderPage] = useState(1);
  const [orderLimit, setOrderLimit] = useState(10);
  const ordersFiltered = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return (orders || []).filter((o: any) => !q || (o?.buyer?.email || '').toLowerCase().includes(q) || (o?.product?.name || '').toLowerCase().includes(q));
  }, [orders, orderSearch]);
  const ordersTotalPages = Math.max(1, Math.ceil(ordersFiltered.length / orderLimit));
  const pagedOrders = useMemo(() => ordersFiltered.slice((orderPage - 1) * orderLimit, orderPage * orderLimit), [ordersFiltered, orderPage, orderLimit]);

  // Yearly revenue summary from monthly data
  const yearlyRevenue = useMemo(() => {
    const map: Record<string, number> = {};
    (monthlyRevenue || []).forEach(m => {
      const year = (m.month || '').split('-')[0] || 'Unknown';
      map[year] = (map[year] || 0) + (m.value || 0);
    });
    return Object.entries(map).map(([year, value]) => ({ year, value }));
  }, [monthlyRevenue]);

  const monthlyMax = useMemo(() => Math.max(1, ...monthlyRevenue.map(x => x.value || 0)), [monthlyRevenue]);
  const yearlyMax = useMemo(() => Math.max(1, ...yearlyRevenue.map(x => x.value || 0)), [yearlyRevenue]);
  const fmt = useMemo(() => new Intl.NumberFormat('en-US', { style: 'currency', currency }), [currency]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    if (!isSuperAdmin()) {
      router.push('/dashboard');
      return;
    }
    
    const load = async () => {
      try {
        setLoading(true);
        const [userAnalytics, subscriptionAnalytics, revenueAnalytics, adminDashboard] = await Promise.all([
          dashboardService.getUserAnalytics(),
          dashboardService.getSubscriptionAnalytics({ currency }),
          dashboardService.getRevenueAnalytics(),
          dashboardService.getDashboard(),
        ]);

        setSystemStats(prev => ({
          ...prev,
          totalUsers: userAnalytics.totalUsers,
          activeUsers: subscriptionAnalytics.activeSubscriptions,
          totalProjects: adminDashboard.projectCount ?? 0,
          totalInvestments: 0,
          // Revenue displayed on the platform dashboard should reflect subscription revenue in selected currency
          totalRevenue: subscriptionAnalytics.totalRevenue || 0,
          serverUptime: prev.serverUptime,
          databaseSize: prev.databaseSize,
          cpuUsage: prev.cpuUsage,
          memoryUsage: prev.memoryUsage,
        }));

        if (subscriptionAnalytics.currency) {
          setCurrency(subscriptionAnalytics.currency);
        }

        setRevenueByProvider(subscriptionAnalytics.revenueByProvider || []);
        setRevenueByCurrency(subscriptionAnalytics.revenueByCurrency || []);
        setMonthlyRevenue(revenueAnalytics.monthlyRevenue || []);

        const userActivities: RecentActivity[] = (userAnalytics.recentUsers || []).map((u: any, idx: number) => ({
          id: `user-${u.id}`,
          type: 'user_registration',
          description: `New user registered: ${u.email}`,
          timestamp: new Date(u.createdAt).toLocaleString(),
        }));

        const paymentActivities: RecentActivity[] = (revenueAnalytics.recentPayments || []).map((p: any) => ({
          id: `pay-${p.id}`,
          type: 'investment_made',
          description: `Payment of ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p.amount / 100)} by ${p.user?.email || 'user'}`,
          timestamp: new Date(p.createdAt).toLocaleString(),
        }));

        setRecentActivity([
          ...userActivities,
          ...paymentActivities,
        ].slice(0, 10));
      } catch (e) {
        // keep defaults on error
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAuthenticated, isSuperAdmin, router, currency]);

  useEffect(() => {
    const loadInv = async () => {
      try {
        setInvLoading(true);
        const res = await InvestmentService.getAllInvestments(invPage, invLimit);
        const items = (res?.data as any[]) || [];
        const total = res?.total ?? items.length;
        setInvData({ items, total });
      } catch {
        setInvData({ items: [], total: 0 });
      } finally {
        setInvLoading(false);
      }
    };
    loadInv();
  }, [invPage, invLimit]);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setOrdersLoading(true);
        const res = await tradingService.adminListOrders();
        setOrders(res || []);
      } catch {
        setOrders([]);
      } finally {
        setOrdersLoading(false);
      }
    };
    loadOrders();
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registration': return <FiUsers className="h-4 w-4" />;
      case 'project_created': return <FiActivity className="h-4 w-4" />;
      case 'investment_made': return <FiDollarSign className="h-4 w-4" />;
      case 'system_alert': return <FiAlertTriangle className="h-4 w-4" />;
      default: return <FiActivity className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <RoleGuard allowedRoles={[Role.SUPER_ADMIN]}>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <FiShield className="mr-3 h-8 w-8 text-blue-600" />
              Super Admin Dashboard
            </h1>
            <p className="text-gray-600 mt-2">
              Complete system overview and management
            </p>
          </div>

          {/* Controls */}
          <div className="mb-4 flex items-center gap-3">
            <label className="text-sm text-gray-600">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="border rounded px-2 py-1 text-sm text-gray-600"
            >
              <option value="USD">USD</option>
              <option value="IDR">IDR</option>
            </select>
          </div>

          {/* Business Metrics (live) */}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{systemStats.totalUsers.toLocaleString()}</p>
                </div>
                <FiUsers className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Subscriptions</p>
                  <p className="text-2xl font-bold text-gray-900">{systemStats.activeUsers.toLocaleString()}</p>
                </div>
                <FiActivity className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Projects</p>
                  <p className="text-2xl font-bold text-gray-900">{systemStats.totalProjects.toLocaleString()}</p>
                </div>
                <FiTrendingUp className="h-8 w-8 text-amber-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(systemStats.totalRevenue / 100)}
                  </p>
                </div>
                <FiDollarSign className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          {/* Revenue breakdown and charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Revenue by Provider</h2>
              </div>
              <div className="p-6 space-y-2 text-sm text-gray-800">
                {(loading ? [] : revenueByProvider).map((item) => (
                  <div key={item.provider} className="flex items-center justify-between">
                    <span className="uppercase text-gray-600">{item.provider || 'UNKNOWN'}</span>
                    <span className="font-medium">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(item.amount / 100)}
                      <span className="ml-2 text-xs text-gray-500">({item.count})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Revenue by Currency</h2>
              </div>
              <div className="p-6 space-y-2 text-sm text-gray-800">
                {(loading ? [] : revenueByCurrency).map((item) => (
                  <div key={item.currency} className="flex items-center justify-between">
                    <span className="uppercase text-gray-600">{item.currency}</span>
                    <span className="font-medium">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: item.currency || 'USD' }).format(item.amount / 100)}
                      <span className="ml-2 text-xs text-gray-500">({item.count})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Monthly and Yearly Revenue Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Monthly Revenue</h2>
                <span className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700">{currency}</span>
              </div>
              <div className="p-6">
                <div className="h-56 flex items-end gap-2">
                  {(monthlyRevenue || []).map((m) => {
                    const heightPct = Math.round(((m.value || 0) / monthlyMax) * 100);
                    return (
                      <div key={m.month} className="flex-1 flex flex-col items-center group" title={`${m.month}: ${fmt.format((m.value || 0) / 100)}`}>
                        <div
                          className="w-full rounded-t bg-gradient-to-t from-indigo-400 to-purple-400 shadow-sm group-hover:from-indigo-500 group-hover:to-purple-500 transition-colors"
                          style={{ height: `${heightPct}%` }}
                        />
                        <div className="text-[10px] text-gray-600 mt-1 truncate w-full text-center">{m.month}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                  <span>Max: {fmt.format(monthlyMax / 100)}</span>
                  <span>Total: {fmt.format(((monthlyRevenue || []).reduce((s, x) => s + (x.value || 0), 0)) / 100)}</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Yearly Revenue</h2>
                <span className="text-xs px-2 py-1 rounded bg-green-50 text-green-700">{currency}</span>
              </div>
              <div className="p-6">
                <div className="h-56 flex items-end gap-4">
                  {yearlyRevenue.map((y: { year: string; value: number }) => {
                    const heightPct = Math.round(((y.value || 0) / yearlyMax) * 100);
                    return (
                      <div key={y.year} className="flex-1 flex flex-col items-center group" title={`${y.year}: ${fmt.format((y.value || 0) / 100)}`}>
                        <div
                          className="w-8 md:w-10 rounded-t bg-gradient-to-t from-emerald-400 to-teal-400 shadow-sm group-hover:from-emerald-500 group-hover:to-teal-500 transition-colors"
                          style={{ height: `${heightPct}%` }}
                        />
                        <div className="text-xs text-gray-700 mt-2">{y.year}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                  <span>Max: {fmt.format(yearlyMax / 100)}</span>
                  <span>Total: {fmt.format((yearlyRevenue.reduce((s, x) => s + (x.value || 0), 0)) / 100)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity with search & pagination */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent System Activity</h2>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <input
                  value={activitySearch}
                  onChange={(e) => { setActivitySearch(e.target.value); setActivityPage(1); }}
                  placeholder="Search activity..."
                  className="border rounded px-3 py-2 text-sm w-full md:w-64 text-gray-600"
                />
                <select value={activityPageSize} onChange={(e)=>{ setActivityPageSize(parseInt(e.target.value)); setActivityPage(1); }} className="border rounded px-2 py-1 text-sm text-gray-600">
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
              </div>
              <div className="space-y-4">
                {(loading ? [] : pagedActivities).map((activity: RecentActivity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 ${getSeverityColor(activity.severity)}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{activity.description}</p>
                      <p className="text-xs text-gray-500">{activity.timestamp}</p>
                    </div>
                    {activity.severity && (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        activity.severity === 'high' ? 'bg-red-100 text-red-800' :
                        activity.severity === 'medium' ? 'bg-amber-100 text-amber-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {activity.severity}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-4 text-sm">
                <span className="text-gray-600">Page {activityPage} of {activityTotalPages}</span>
                <div className="flex items-center gap-2">
                  <button disabled={activityPage<=1} onClick={()=>setActivityPage(p=>Math.max(1,p-1))} className="px-3 py-1 rounded border disabled:opacity-50 text-gray-600">Prev</button>
                  <button disabled={activityPage>=activityTotalPages} onClick={()=>setActivityPage(p=>Math.min(activityTotalPages,p+1))} className="px-3 py-1 rounded border disabled:opacity-50 text-gray-600">Next</button>
                </div>
              </div>
            </div>
          </div>

          {/* Investors table */}
          <div className="mt-8 bg-white rounded-lg shadow">
            <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h2 className="text-lg font-semibold text-gray-900">Investors (Investments)</h2>
              <div className="w-full sm:w-auto flex flex-col sm:flex-row sm:items-center gap-2 text-gray-600">
                <input value={invSearch} onChange={(e)=>{ setInvSearch(e.target.value); }} className="border rounded px-3 py-1.5 text-xs md:text-sm text-gray-600 w-full sm:w-64" placeholder="Search investor/project" />
                <select value={invLimit} onChange={(e)=>{ setInvLimit(parseInt(e.target.value)); setInvPage(1); }} className="border rounded px-2 py-1 text-xs md:text-sm text-gray-600 w-full sm:w-auto">
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
            <div className="p-4 md:p-6 overflow-x-auto">
              <table className="min-w-full text-xs md:text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="py-2 pr-4 whitespace-nowrap">Investor</th>
                    <th className="py-2 pr-4 whitespace-nowrap">Project</th>
                    <th className="py-2 pr-4 whitespace-nowrap">Amount</th>
                    <th className="py-2 pr-4 whitespace-nowrap">Status</th>
                    <th className="py-2 pr-4 whitespace-nowrap">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(invLoading ? [] : invFiltered).map((i: any) => (
                    <tr key={i.id} className="border-t">
                      <td className="py-2 pr-4 text-gray-600">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-600 truncate max-w-[180px]">{(i?.investor?.fullname ?? i?.investor?.fullName ?? i?.investor?.name) || '-'}</span>
                          <span className="text-[11px] md:text-xs text-gray-600 truncate max-w-[200px]">{i?.investor?.email || '-'}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-4 text-gray-600 truncate max-w-[200px]">{i?.project?.title || '-'}</td>
                      <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(i?.amount || 0)}</td>
                      <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">{i?.status || '-'}</td>
                      <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">{i?.createdAt ? new Date(i.createdAt).toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-4 text-xs md:text-sm gap-2">
                <span className="text-gray-600">Page {invPage}</span>
                <div className="flex items-center gap-2">
                  <button disabled={invPage<=1 || invLoading} onClick={()=>setInvPage(p=>Math.max(1,p-1))} className="px-2 py-1 md:px-3 md:py-1 rounded border disabled:opacity-50 text-gray-600">Prev</button>
                  <button disabled={invLoading || (invData.items.length < invLimit)} onClick={()=>setInvPage(p=>p+1)} className="px-2 py-1 md:px-3 md:py-1 rounded border disabled:opacity-50 text-gray-600">Next</button>
                </div>
              </div>
            </div>
          </div>

          {/* Buyers orders table */}
          <div className="mt-8 bg-white rounded-lg shadow">
            <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h2 className="text-lg font-semibold text-gray-900">Buyers (Orders)</h2>
              <div className="w-full sm:w-auto flex flex-col sm:flex-row sm:items-center gap-2 text-gray-600">
                <input value={orderSearch} onChange={(e)=>{ setOrderSearch(e.target.value); setOrderPage(1); }} className="border rounded px-3 py-1.5 text-xs md:text-sm text-gray-600 w-full sm:w-64" placeholder="Search buyer/product" />
                <select value={orderLimit} onChange={(e)=>{ setOrderLimit(parseInt(e.target.value)); setOrderPage(1); }} className="border rounded px-2 py-1 text-xs md:text-sm text-gray-600 w-full sm:w-auto">
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
            <div className="p-4 md:p-6 overflow-x-auto">
              <table className="min-w-full text-xs md:text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="py-2 pr-4 whitespace-nowrap">Buyer</th>
                    <th className="py-2 pr-4 whitespace-nowrap">Product</th>
                    <th className="py-2 pr-4 whitespace-nowrap">Quantity</th>
                    <th className="py-2 pr-4 whitespace-nowrap">Total</th>
                    <th className="py-2 pr-4 whitespace-nowrap">Status</th>
                    <th className="py-2 pr-4 whitespace-nowrap">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(ordersLoading ? [] : pagedOrders).map((o: any) => (
                    <tr key={o.id} className="border-t">
                      <td className="py-2 pr-4 text-gray-600 truncate max-w-[200px]">{o?.buyer?.email || '-'}</td>
                      <td className="py-2 pr-4 text-gray-600 truncate max-w-[200px]">{o?.product?.name || '-'}</td>
                      <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">{o?.quantity || '-'}</td>
                      <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">{new Intl.NumberFormat('en-US', { style: 'currency', currency: o?.currency || 'USD' }).format(((o?.total || 0)))}</td>
                      <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">{o?.status || '-'}</td>
                      <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">{o?.createdAt ? new Date(o.createdAt).toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-4 text-xs md:text-sm gap-2">
                <span className="text-gray-600">Page {orderPage} of {ordersTotalPages}</span>
                <div className="flex items-center gap-2">
                  <button disabled={orderPage<=1} onClick={()=>setOrderPage(p=>Math.max(1,p-1))} className="px-2 py-1 md:px-3 md:py-1 rounded border disabled:opacity-50 text-gray-600">Prev</button>
                  <button disabled={orderPage>=ordersTotalPages} onClick={()=>setOrderPage(p=>Math.min(ordersTotalPages,p+1))} className="px-2 py-1 md:px-3 md:py-1 rounded border disabled:opacity-50 text-gray-600">Next</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
};

export default SuperAdminDashboard;