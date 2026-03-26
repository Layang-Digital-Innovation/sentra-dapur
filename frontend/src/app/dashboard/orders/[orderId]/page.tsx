"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import RoleGuard from '@/components/auth/RoleGuard';
import { Role } from '@/types/user.types';
import { tradingService } from '@/services/trading.service';

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const sp = useSearchParams();
  const router = useRouter();
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!orderId) return;
      setLoading(true);
      setError(null);
      try {
        const data = await tradingService.getOrder(String(orderId));
        setOrder(data || null);
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load order');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [orderId]);

  const priceMode = String(order?.priceMode || '').toUpperCase();
  const isFixed = priceMode === 'FIXED';

  const parsedDestination = useMemo(() => {
    if (!order?.notes) return null;
    try {
      const text = String(order.notes);
      // Example pattern: "Destination: Country, State, City Postal | Address: ... | Incoterm: ..."
      const destMatch = text.match(/Destination:\s*([^|]+)/i);
      const addrMatch = text.match(/Address:\s*([^|]+)/i);
      const incMatch = text.match(/Incoterm:\s*([^|]+)/i);
      const dest = destMatch ? destMatch[1].trim() : undefined;
      const addr = addrMatch ? addrMatch[1].trim() : undefined;
      const inc = incMatch ? incMatch[1].trim() : undefined;
      return { destinationLine: dest, addressLineFromNotes: addr, incotermFromNotes: inc };
    } catch { return null; }
  }, [order?.notes]);

  const totals = useMemo(() => {
    const res: Record<string, number> = {};
    if (!order) return res;
    // If backend returns multi-item, prefer item-based totals
    if (Array.isArray((order as any).items) && (order as any).items.length > 0) {
      const items = (order as any).items as any[];
      for (const it of items) {
        const cur = it.currency || 'USD';
        const val = (isFixed ? it.fixedUnitPrice : it.unitPriceEstimate) ?? 0;
        res[cur] = (res[cur] || 0) + Number(val) * Number(it.quantity || 0);
      }
      return res;
    }
    // Single-item order: use backend order fields
    const cur = (order as any).currency || 'USD';
    const total = Number((order as any).totalPrice || 0);
    if (total > 0) res[cur] = total;
    return res;
  }, [order, isFixed]);

  const created = sp?.get('created') === '1';

  return (
    <RoleGuard allowedRoles={[Role.BUYER, Role.SUPPLIER, Role.ADMIN, Role.SUPER_ADMIN]}>
      <div className="py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-gray-900">Order Detail</h1>
          <button onClick={()=>router.back()} className="px-3 py-1.5 rounded border text-sm text-gray-800 hover:bg-gray-50">Back</button>
        </div>

        {created && (
          <div className="mb-3 rounded border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm px-3 py-2">
            Draft order was created. Admin will set fixed prices based on your destination.
          </div>
        )}

        {loading && <div>Loading...</div>}
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {order && (
          <div className="space-y-4">
            <div className="border rounded-xl bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">Order ID: {order.id}</div>
                {(() => {
                  const s = order.status as string;
                  const cls = s==='CONFIRMED' ? 'bg-blue-100 text-blue-700 border-blue-200' : s==='SHIPPED' ? 'bg-amber-100 text-amber-800 border-amber-200' : s==='COMPLETED' ? 'bg-green-100 text-green-700 border-green-200' : s==='CANCELLED' ? 'bg-red-100 text-red-700 border-red-200' : s==='PRICE_SET' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : s==='DRAFT' ? 'bg-gray-100 text-gray-700 border-gray-200' : 'bg-gray-100 text-gray-700 border-gray-200';
                  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>{s}</span>;
                })()}
              </div>
              <div className="mt-1 text-xs text-gray-600">Created: {order.createdAt ? new Date(order.createdAt).toLocaleString() : '-'}</div>

              <div className="mt-3">
                {Array.isArray(order.items) && order.items.length > 0 ? (
                  <div className="text-sm text-gray-800">
                    <div className="font-semibold mb-2">Items</div>
                    <div className="space-y-1">
                      {order.items.map((it: any, idx: number) => (
                        <div key={it.id || idx} className="text-sm text-gray-800">
                          <span className="font-medium">{it.product?.name || it.productName || it.productId}</span>
                          <span className="ml-2 text-gray-700">Qty: {it.quantity}</span>
                          {it.fixedUnitPrice != null ? (
                            <span className="ml-2 text-emerald-700">Fixed: {(it.currency==='USD')? `$ ${Number(it.fixedUnitPrice).toLocaleString('en-US')}` : `Rp ${Number(it.fixedUnitPrice).toLocaleString('id-ID')}`}</span>
                          ) : (
                            it.unitPriceEstimate != null && it.currency && (
                              <span className="ml-2 text-gray-600">Est.: {(it.currency==='USD')? `$ ${Number(it.unitPriceEstimate).toLocaleString('en-US')}` : `Rp ${Number(it.unitPriceEstimate).toLocaleString('id-ID')}`}</span>
                            )
                          )}
                        </div>
                      ))}
                    </div>
                    {isFixed && (
                      <div className="mt-2 text-xs text-emerald-700 font-medium">Fixed Price by Admin based on destination</div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-800">Product: {order.product?.name} • Qty: {order.quantity}</div>
                )}
              </div>

              <div className="mt-4 border-t pt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-sm font-semibold text-gray-900 mb-1">Destination</div>
                  <div className="text-xs text-gray-700">
                    <div>Country: {order.destinationCountry || (parsedDestination?.destinationLine?.split(',')[0]?.trim() || '-') }</div>
                    <div>State/Province: {order.destinationState || (parsedDestination?.destinationLine?.split(',')[1]?.trim() || '-') }</div>
                    <div>City: {order.destinationCity || (() => {
                      const seg = parsedDestination?.destinationLine?.split(',')[2]?.trim() || '';
                      return seg || '-';
                    })() }</div>
                    <div>Address: {order.addressLine || parsedDestination?.addressLineFromNotes || '-'}</div>
                    <div>Postal Code: {order.postalCode || '-'}</div>
                    <div>Incoterm: {order.incoterm || parsedDestination?.incotermFromNotes || '-'}</div>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900 mb-1">Totals</div>
                  <div className="text-xs text-gray-800 space-y-1">
                    {Object.keys(totals).length === 0 ? (
                      <div className="text-gray-500">-</div>
                    ) : (
                      Object.entries(totals).map(([cur, val]) => (
                        <div key={cur} className="flex items-center justify-between">
                          <span>{isFixed ? `${cur} Fixed Total` : `${cur} Estimated Total`}</span>
                          <span className="font-semibold">{cur === 'USD' ? `$ ${val.toLocaleString('en-US')}` : `Rp ${val.toLocaleString('id-ID')}`}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {order.notes && (
                <div className="mt-3 text-xs text-gray-700">Notes: {order.notes}</div>
              )}

              {order.shipment && (
                <div className="mt-3 text-xs text-gray-700">
                  <div>Shipment: {order.shipment.method} • {order.shipment.status}</div>
                  {(order.shipment.trackingUrl || order.shipment.trackingNumber) && (
                    <div className="mt-1">
                      {order.shipment.trackingUrl ? (
                        <a href={order.shipment.trackingUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">Track shipment</a>
                      ) : null}
                      {order.shipment.trackingNumber ? (
                        <span className="ml-2 text-gray-700">Tracking No: {order.shipment.trackingNumber}</span>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
