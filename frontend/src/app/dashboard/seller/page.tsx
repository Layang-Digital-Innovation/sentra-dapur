"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { tradingService } from '@/services/trading.service';

export default function SellerDashboard() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ totalProducts: 0, totalOrders: 0, totalRevenue: 0, pendingShipments: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [top, setTop] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    if (user?.user.role !== 'SUPPLIER') {
      router.push('/dashboard');
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await tradingService.getSellerAnalytics();
        setStats({
          totalProducts: data.totalProducts || 0,
          totalOrders: data.totalOrders || 0,
          totalRevenue: data.totalRevenue || 0,
          pendingShipments: data.pendingShipments || 0,
        });
        setRecent(data.recentOrders || []);
        setTop(data.topProducts || []);
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, isAuthenticated, router]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Seller Dashboard</h1>
      <p className="mt-2 text-gray-600">Welcome back, {user?.user.email}. Here's your sales overview.</p>

      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Total Products</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.totalProducts}</dd>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Total Orders</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.totalOrders}</dd>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">Rp {stats.totalRevenue.toLocaleString()}</dd>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Pending Shipments</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.pendingShipments}</dd>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Recent Orders</h2>
          <div className="mt-4 bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {recent.map((o) => (
                <li key={o.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-indigo-600 truncate">
                        {o.product?.name}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex">
                        <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          o.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 
                          o.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800' : 
                          o.status === 'CONFIRMED' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {o.status}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          Buyer: {o.buyer?.fullname || o.buyer?.email}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <p>Rp {((o.product?.price || 0) * (o.quantity || 1)).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
              {!loading && recent.length === 0 && (
                <li>
                  <div className="px-4 py-4 sm:px-6 text-sm text-gray-600">No orders yet.</div>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-medium text-gray-900">Top Products</h2>
          <div className="mt-4 bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {top.map((p) => (
                <li key={p.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-indigo-600 truncate">
                        {p.name}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex">
                        <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {p.sold} sold
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          Revenue: Rp {p.revenue.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
              {!loading && top.length === 0 && (
                <li>
                  <div className="px-4 py-4 sm:px-6 text-sm text-gray-600">No product stats.</div>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}