"use client";

import React, { useEffect, useMemo, useState } from 'react';
import RoleGuard from '@/components/auth/RoleGuard';
import { Role } from '@/types/user.types';
import { tradingService } from '@/services/trading.service';

export default function TradingAdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    totalProducts: number;
    pendingProducts: number;
    totalOrders: number;
    totalRevenue: number;
    ordersByStatus: Record<string, number>;
  } | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [analytics, allOrders, allProducts] = await Promise.all([
          tradingService.getAdminTradingAnalytics(),
          tradingService.adminListOrders(),
          tradingService.adminListProducts(),
        ]);
        setStats(analytics);
        setOrders(allOrders || []);
        setProducts(allProducts || []);
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const Card: React.FC<{ title: string; value: string | number; }> = ({ title, value }) => (
    <div className="rounded-xl border bg-white p-5">
      <div className="text-sm text-gray-600">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  );

  // Derived metrics from orders/products
  const last30dRevenueSeries = useMemo(() => {
    const now = new Date();
    const days: { date: string; value: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, value: 0 });
    }
    const priceByProduct: Record<string, number> = {};
    for (const p of products) {
      if (p?.id != null) priceByProduct[p.id] = Number(p.price || 0);
    }
    const seriesMap = new Map(days.map((x) => [x.date, x]));
    for (const o of orders) {
      // Count revenue for SHIPPED or COMPLETED; fallback: CONFIRMED
      if (!['SHIPPED', 'COMPLETED', 'CONFIRMED'].includes(o.status)) continue;
      const created = o.createdAt ? new Date(o.createdAt) : null;
      if (!created) continue;
      const k = created.toISOString().slice(0, 10);
      const item = seriesMap.get(k);
      if (!item) continue;
      const unit = o.product?.price ?? priceByProduct[o.productId as string] ?? 0;
      item.value += Number(unit) * Number(o.quantity || 0);
    }
    return days;
  }, [orders, products]);

  const topProducts = useMemo(() => {
    const map: Record<string, { id: string; name: string; orders: number; revenue: number }> = {};
    for (const o of orders) {
      const id = o.product?.id || o.productId;
      if (!id) continue;
      if (!map[id]) map[id] = { id, name: o.product?.name || 'Unknown', orders: 0, revenue: 0 };
      map[id].orders += 1;
      const unit = Number(o.product?.price || 0);
      map[id].revenue += unit * Number(o.quantity || 0);
    }
    return Object.values(map).sort((a, b) => b.orders - a.orders).slice(0, 5);
  }, [orders]);

  const statusBreakdown = useMemo(() => {
    const base: Record<string, number> = { PENDING: 0, CONFIRMED: 0, SHIPPED: 0, COMPLETED: 0, CANCELLED: 0 };
    for (const o of orders) base[o.status] = (base[o.status] || 0) + 1;
    return base;
  }, [orders]);

  // Group revenue by currency for display (e.g., USD, IDR)
  const revenueByCurrency = useMemo(() => {
    const totals: Record<string, number> = {};
    const priceByProduct: Record<string, { price: number; currency: string }> = {};
    for (const p of products) {
      if (p?.id != null) priceByProduct[p.id] = { price: Number(p.price || 0), currency: (p as any).currency || 'USD' };
    }
    for (const o of orders) {
      if (!['SHIPPED', 'COMPLETED', 'CONFIRMED'].includes(o.status)) continue;
      const meta = priceByProduct[o.productId as string] || { price: Number(o.product?.price || 0), currency: (o.product as any)?.currency || 'USD' };
      const currency = (o.product as any)?.currency || meta.currency || 'USD';
      const unit = Number((o.product as any)?.price ?? meta.price ?? 0);
      totals[currency] = (totals[currency] || 0) + unit * Number(o.quantity || 0);
    }
    return totals;
  }, [orders, products]);

  // Simple Donut Chart component
  const DonutChart: React.FC<{ data: { label: string; value: number; color: string }[]; total?: number }>= ({ data, total }) => {
    const sum = total ?? data.reduce((acc, d) => acc + d.value, 0);
    let cum = 0;
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    return (
      <svg viewBox="0 0 120 120" className="w-full h-full">
        <circle cx="60" cy="60" r={radius} fill="transparent" stroke="#f3f4f6" strokeWidth="16" />
        {data.map((d, i) => {
          const frac = sum > 0 ? d.value / sum : 0;
          const dash = circumference * frac;
          const gap = circumference - dash;
          const rot = (cum / sum) * 360;
          cum += d.value;
          return (
            <circle
              key={i}
              cx="60" cy="60" r={radius}
              fill="transparent"
              stroke={d.color}
              strokeWidth="16"
              strokeDasharray={`${dash} ${gap}`}
              transform={`rotate(-90 ${60} ${60}) rotate(${rot} ${60} ${60})`}
            />
          );
        })}
        <text x="60" y="60" textAnchor="middle" dominantBaseline="middle" className="fill-gray-900 text-xl font-semibold">
          {sum}
        </text>
      </svg>
    );
  };

  // Simple Line Chart component
  const LineChart: React.FC<{ series: { date: string; value: number }[] }>= ({ series }) => {
    const w = 520, h = 200, pad = 28;
    const xs = series.map(s => new Date(s.date).getTime());
    const ys = series.map(s => s.value);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = 0, maxY = Math.max(1, Math.max(...ys));
    const scaleX = (t: number) => pad + ((t - minX) / (maxX - minX || 1)) * (w - pad * 2);
    const scaleY = (v: number) => h - pad - ((v - minY) / (maxY - minY || 1)) * (h - pad * 2);
    const path = series.map((s, i) => `${i===0?'M':'L'} ${scaleX(new Date(s.date).getTime())} ${scaleY(s.value)}`).join(' ');
    // Compute 6 x-axis ticks (including first and last)
    const ticks: number[] = [];
    const steps = 5;
    for (let i = 0; i <= steps; i++) ticks.push(minX + ((maxX - minX) / steps) * i);
    const formatDate = (ms: number) => {
      const d = new Date(ms);
      return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
    };
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
        <rect x={0} y={0} width={w} height={h} fill="white" />
        {/* Axes */}
        <line x1={pad} y1={h-pad} x2={w-pad} y2={h-pad} stroke="#e5e7eb" />
        <line x1={pad} y1={pad} x2={pad} y2={h-pad} stroke="#e5e7eb" />
        {/* X ticks */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={scaleX(t)} y1={h-pad} x2={scaleX(t)} y2={h-pad+4} stroke="#9ca3af" />
            <text x={scaleX(t)} y={h-pad+16} textAnchor="middle" className="fill-gray-500 text-[10px]">{formatDate(t)}</text>
          </g>
        ))}
        {/* Series */}
        <path d={path} fill="none" stroke="#7c3aed" strokeWidth={2.5} />
        {series.map((s, i) => (
          <circle key={i} cx={scaleX(new Date(s.date).getTime())} cy={scaleY(s.value)} r={2.5} fill="#7c3aed" />
        ))}
      </svg>
    );
  };

  // Simple Bar Chart component
  const BarChart: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
    const w = 520, h = 200, pad = 28;
    const maxV = Math.max(1, ...data.map(d => d.value));
    const barW = (w - pad * 2) / (data.length || 1);
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
        {data.map((d, i) => {
          const x = pad + i * barW + 6;
          const bh = ((d.value / maxV) * (h - pad * 2));
          const y = h - pad - bh;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW - 12} height={bh} fill="#4f46e5" rx={6} />
              <text x={x + (barW-12)/2} y={h - pad/2} textAnchor="middle" className="fill-gray-600 text-[10px]">{d.label.length>10? d.label.slice(0,10)+'…' : d.label}</text>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <RoleGuard allowedRoles={[Role.ADMIN, Role.ADMIN_TRADING, Role.SUPER_ADMIN]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Trading Admin Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">Ringkasan aktivitas marketplace trading.</p>
        </div>

        {loading && <div className="text-sm text-gray-600">Loading your dashboard...</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}

        {stats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card title="Total Products" value={stats.totalProducts} />
              <Card title="Pending Products" value={stats.pendingProducts} />
              <Card title="Total Orders" value={stats.totalOrders} />
              {/* Multi-currency revenue: render a compact card per currency */}
              <div className="rounded-xl border bg-white p-5">
                <div className="text-sm text-gray-600">Total Revenue</div>
                <div className="mt-2 space-y-1">
                  {(Object.entries(revenueByCurrency as Record<string, number>) || []).map(([ccy, amt]) => (
                    <div key={ccy} className="text-base font-semibold text-gray-900">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: ccy as any }).format(Number(amt || 0))}
                    </div>
                  ))}
                  {Object.keys(revenueByCurrency || {}).length === 0 && (
                    <div className="text-base font-semibold text-gray-900">0</div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2 rounded-xl border bg-white p-5 overflow-hidden">
                <div className="text-sm font-semibold text-gray-900 mb-3">Orders by Status</div>
                <div className="grid grid-cols-2 gap-4 min-w-0">
                  <div className="h-48 min-w-0"><DonutChart data={[
                    { label: 'PENDING', value: statusBreakdown.PENDING, color: '#f59e0b' },
                    { label: 'CONFIRMED', value: statusBreakdown.CONFIRMED, color: '#2563eb' },
                    { label: 'SHIPPED', value: statusBreakdown.SHIPPED, color: '#10b981' },
                    { label: 'COMPLETED', value: statusBreakdown.COMPLETED, color: '#16a34a' },
                    { label: 'CANCELLED', value: statusBreakdown.CANCELLED, color: '#6b7280' },
                  ]} /></div>
                  <div className="text-sm grid grid-cols-1 gap-2 content-start min-w-0">
                    {Object.entries(statusBreakdown).map(([k,v]) => (
                      <div key={k} className="flex items-center justify-between border rounded-lg px-3 py-2 overflow-hidden">
                        <span className="text-gray-600 truncate mr-2">{k}</span>
                        <span className="font-semibold text-gray-900 flex-shrink-0">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="lg:col-span-3 rounded-xl border bg-white p-5">
                <div className="text-sm font-semibold text-gray-900 mb-3">30-Day Revenue Trend</div>
                <div className="h-56">
                  <LineChart series={last30dRevenueSeries} />
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-white p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-gray-900">Top Products (by Orders)</div>
                <div className="text-xs text-gray-500">Last 30 days</div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="h-56">
                  <BarChart data={topProducts.map(p => ({ label: p.name, value: p.orders }))} />
                </div>
                <div className="space-y-2">
                  {topProducts.map((p) => (
                    <div key={p.id} className="border rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{p.name}</div>
                        <div className="text-xs text-gray-600">{p.orders} orders</div>
                      </div>
                      <div className="text-sm font-semibold text-gray-900">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'USD' }).format(p.revenue)}</div>
                    </div>
                  ))}
                  {topProducts.length === 0 && (
                    <div className="text-sm text-gray-600">No data.</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </RoleGuard>
  );
}
