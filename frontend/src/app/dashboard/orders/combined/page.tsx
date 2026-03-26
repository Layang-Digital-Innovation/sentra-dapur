"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import RoleGuard from '@/components/auth/RoleGuard';
import { Role } from '@/types/user.types';
import { tradingService } from '@/services/trading.service';

export default function CombinedOrdersPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const idsParam = sp?.get('ids') || '';
  const ids = useMemo(() => (idsParam ? idsParam.split(',').map(s => s.trim()).filter(Boolean) : []), [idsParam]);
  const created = sp?.get('created') === '1';

  useEffect(() => {
    const load = async () => {
      if (!ids.length) { setLoading(false); return; }
      setLoading(true);
      setError(null);
      try {
        const results = await Promise.all(ids.map(id => tradingService.getOrder(id).catch(()=>null)));
        setOrders(results.filter(Boolean) as any[]);
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [ids]);

  const totals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const o of orders) {
      const cur = (o as any).currency || 'USD';
      const total = Number((o as any).totalPrice || 0);
      map[cur] = (map[cur] || 0) + total;
    }
    return map;
  }, [orders]);

  return (
    <RoleGuard allowedRoles={[Role.BUYER, Role.SUPPLIER, Role.ADMIN, Role.SUPER_ADMIN]}>
      <div className="py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-gray-900">Order Detail</h1>
          <button onClick={()=>router.back()} className="px-3 py-1.5 rounded border text-sm text-gray-800 hover:bg-gray-50">Back</button>
        </div>

        {created && (
          <div className="mb-3 rounded border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm px-3 py-2">
            {ids.length} orders were created from your cart. Admin will set fixed prices based on your destination.
          </div>
        )}

        {loading && <div>Loading...</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="border rounded-lg p-4 bg-white">
              <div className="flex items-start justify-between">
                <div className="text-sm text-gray-700">Order ID: {o.id}</div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border bg-gray-100 text-gray-700 border-gray-200">{o.status}</span>
              </div>
              <div className="mt-2 text-sm text-gray-800">Product: {o.product?.name} • Qty: {o.quantity}</div>
              {o.notes && <div className="text-xs text-gray-600 mt-1">Notes: {o.notes}</div>}
            </div>
          ))}
          {!loading && orders.length === 0 && (
            <div className="text-sm text-gray-600">No orders found.</div>
          )}
        </div>

        <div className="mt-4 border rounded-xl bg-white p-4">
          <div className="text-sm font-semibold text-gray-900 mb-1">Totals</div>
          <div className="text-xs text-gray-800 space-y-1">
            {Object.keys(totals).length === 0 ? (
              <div className="text-gray-500">-</div>
            ) : (
              Object.entries(totals).map(([cur, val]) => (
                <div key={cur} className="flex items-center justify-between">
                  <span>{cur} Total</span>
                  <span className="font-semibold">{cur === 'USD' ? `$ ${val.toLocaleString('en-US')}` : `Rp ${val.toLocaleString('id-ID')}`}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
