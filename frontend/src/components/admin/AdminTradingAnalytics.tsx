"use client";

import React, { useEffect, useState } from 'react';
import { tradingService } from '@/services/trading.service';

export default function AdminTradingAnalytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    totalProducts: number;
    pendingProducts: number;
    totalOrders: number;
    ordersByStatus: Record<string, number>;
    totalRevenue: number;
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const d = await tradingService.getAdminTradingAnalytics();
        setData(d);
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xl font-semibold text-gray-900">Trading Analytics</div>
        <div className="text-sm text-gray-600">Kelola produk dan pesanan</div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Total Products</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{data?.totalProducts ?? (loading ? '…' : 0)}</dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Pending Products</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{data?.pendingProducts ?? (loading ? '…' : 0)}</dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Total Orders</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{data?.totalOrders ?? (loading ? '…' : 0)}</dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">Rp {(data?.totalRevenue ?? 0).toLocaleString()}</dd>
          </div>
        </div>
      </div>

      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-4">
          <div className="text-sm font-medium text-gray-900 mb-2">Orders by Status</div>
          <div className="flex flex-wrap gap-2">
            {['PENDING','CONFIRMED','SHIPPED','COMPLETED','CANCELLED'].map((k) => (
              <span key={k} className="inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs text-gray-800">
                <span className="font-semibold">{k}</span>
                <span className="text-gray-600">{data?.ordersByStatus?.[k] ?? 0}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
