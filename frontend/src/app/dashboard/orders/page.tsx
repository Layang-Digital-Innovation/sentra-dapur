"use client";

import React, { useEffect, useState } from 'react';
import RoleGuard from '@/components/auth/RoleGuard';
import { Role } from '@/types/user.types';
import { useAuth } from '@/contexts/AuthContext';
import { tradingService } from '@/services/trading.service';

export default function OrdersPage() {
  const { user } = useAuth();
  const role = user?.user.role as Role | undefined;
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await tradingService.getOrders();
        setOrders(data || []);
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const title = role === 'SUPPLIER' ? 'Orders (Seller)' : role === 'BUYER' ? 'My Orders' : 'Orders';

  return (
    <RoleGuard allowedRoles={[Role.BUYER, Role.SUPPLIER, Role.ADMIN, Role.SUPER_ADMIN]}>
      <div className="py-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">{title}</h1>
        {loading && <div>Loading...</div>}
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="border rounded-lg p-4 bg-white">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">Order ID: {o.id}</div>
                    {(() => {
                      const s = o.status as string;
                      const cls = s==='CONFIRMED' ? 'bg-blue-100 text-blue-700 border-blue-200' : s==='SHIPPED' ? 'bg-amber-100 text-amber-800 border-amber-200' : s==='COMPLETED' ? 'bg-green-100 text-green-700 border-green-200' : s==='CANCELLED' ? 'bg-red-100 text-red-700 border-red-200' : s==='PRICE_SET' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : s==='DRAFT' ? 'bg-gray-100 text-gray-700 border-gray-200' : 'bg-gray-100 text-gray-700 border-gray-200';
                      return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>{s}</span>;
                    })()}
                  </div>
                  {Array.isArray(o.items) && o.items.length > 0 ? (
                    <div className="mt-2 text-sm text-gray-800">
                      <div className="font-semibold mb-1">Items</div>
                      <div className="space-y-1">
                        {o.items.map((it: any, idx: number) => (
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
                      {String(o.priceMode||'').toUpperCase()==='FIXED' && (
                        <div className="mt-2 text-xs text-emerald-700 font-medium">Fixed Price by Admin based on destination</div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="text-sm mt-1 text-gray-800">Product: {o.product?.name}</div>
                      <div className="text-xs text-gray-600">Qty: {o.quantity} • Buyer: {o.buyer?.fullname || o.buyer?.email} • Seller: {o.product?.seller?.fullname || o.product?.seller?.email}</div>
                      <div className="text-xs mt-1 text-gray-800">
                        {(() => {
                          const cur = (o as any).currency as 'USD'|'IDR'|undefined;
                          const unit = Number((o as any).pricePerUnit || 0);
                          const total = Number((o as any).totalPrice || 0);
                          if (unit > 0 && total > 0 && cur) {
                            return <span className="text-emerald-700">Fixed: {cur==='USD' ? `$ ${unit.toLocaleString('en-US')}` : `Rp ${unit.toLocaleString('id-ID')}`} • Total: {cur==='USD' ? `$ ${total.toLocaleString('en-US')}` : `Rp ${total.toLocaleString('id-ID')}`}</span>;
                          }
                          const est = (o.product?.prices || []).find((p: any) => !!p?.price);
                          if (est) {
                            return <span className="text-gray-600">Est.: {est.currency==='USD' ? `$ ${Number(est.price).toLocaleString('en-US')}` : `Rp ${Number(est.price).toLocaleString('id-ID')}`}</span>;
                          }
                          return null;
                        })()}
                      </div>
                    </>
                  )}
                </div>
              </div>
              {o.notes && <div className="text-xs text-gray-600 mt-1">Notes: {o.notes}</div>}
              {o.shipment && (
                <div className="text-xs text-gray-700 mt-2">
                  <div>Shipment: {o.shipment.method} • {o.shipment.status}</div>
                  {(o.shipment.trackingUrl || o.shipment.trackingNumber) && (
                    <div className="mt-1">
                      {o.shipment.trackingUrl ? (
                        <a href={o.shipment.trackingUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">Track shipment</a>
                      ) : null}
                      {o.shipment.trackingNumber ? (
                        <span className="ml-2 text-gray-700">Tracking No: {o.shipment.trackingNumber}</span>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {!loading && orders.length === 0 && <div className="text-sm text-gray-600">No orders found.</div>}
        </div>
      </div>
    </RoleGuard>
  );
}
