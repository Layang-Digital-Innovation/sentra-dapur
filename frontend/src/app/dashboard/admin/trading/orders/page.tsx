"use client";

import React, { useEffect, useMemo, useState } from 'react';
import RoleGuard from '@/components/auth/RoleGuard';
import { Role } from '@/types/user.types';
import { tradingService } from '@/services/trading.service';
import chatService from '@/services/chat.service';
import { useRouter } from 'next/navigation';

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [shipSavingId, setShipSavingId] = useState<string | null>(null);
  const [savingFixedId, setSavingFixedId] = useState<string | null>(null);
  const [fixedByOrder, setFixedByOrder] = useState<Record<string, Array<{ key: string; fixedUnitPrice: string; currency: 'IDR'|'USD' }>>>({});
  const [fixedErrorByOrder, setFixedErrorByOrder] = useState<Record<string, string | null>>({});
  const [fixedSavedLocal, setFixedSavedLocal] = useState<Record<string, boolean>>({});
  const [fixedSuccessByOrder, setFixedSuccessByOrder] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await tradingService.adminListOrders();
        setOrders(data || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const getDestinationLabel = (o: any) => {
    if (o?.destinationCountry) return o.destinationCountry;
    const notes: string = o?.notes || '';
    const m = notes.match(/Destination:\s*([^|]+)/i);
    if (m && m[1]) {
      const seg = m[1].trim();
      const country = seg.split(',')[0]?.trim();
      return country || seg || '-';
    }
    return '-';
  };

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    for (const o of orders) {
      const k = o.status || 'UNKNOWN';
      if (!g[k]) g[k] = [];
      g[k].push(o);
    }
    return g;
  }, [orders]);

  const refresh = async () => {
    const data = await tradingService.adminListOrders();
    setOrders(data || []);
  };

  const createShipment = async (orderId: string, method: 'AIR' | 'SEA' | 'EXPRESS') => {
    try {
      setShipSavingId(orderId);
      await tradingService.createShipment(orderId, { method });
      await refresh();
    } finally {
      setShipSavingId(null);
    }
  };

  const saveShipment = async (
    shipmentId: string,
    data: {
      method?: 'AIR' | 'SEA' | 'EXPRESS';
      carrier?: string | null;
      trackingNumber?: string | null;
      trackingUrl?: string | null;
      status?: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED';
      seaPricingMode?: 'CBM' | 'CONTAINER' | null;
      cbmVolume?: number | null;
      containerType?: 'FT20' | 'FT40' | null;
      freightCost?: number | null;
      currency?: string | null;
    }
  ) => {
    try {
      setShipSavingId(shipmentId);
      await tradingService.updateShipment(shipmentId, data);
      await refresh();
    } finally {
      setShipSavingId(null);
    }
  };

  const chatSeller = async (o: any) => {
    const sellerId = o?.product?.seller?.id;
    if (!sellerId) return;
    const title = `Order/Product Discussion - ${o.product?.name || ''}`.trim();
    const res = await chatService.startChatWith(sellerId, { type: 'TRADING_SUPPORT', title });
    const chatId = (res as any).id;
    if (chatId) {
      const priceStr = o.product?.currency==='USD' ? `$ ${Number(o.product?.price||0).toLocaleString('en-US')}` : `Rp ${Number(o.product?.price||0).toLocaleString('id-ID')}`;
      const summary = `Hai Seller, saya admin trading.\nOrder ID: ${o.id}\nProduct: ${o.product?.name}\nPrice: ${priceStr} / ${o.product?.unit}\nQty: ${o.quantity}\nLinks:\n- Product: /dashboard/marketplace/${o.product?.id}\n- Buyer: ${o.buyer?.fullname || o.buyer?.email}`;
      try { await chatService.postMessage(chatId, summary); } catch {}
      router.push(`/dashboard/chat?chatId=${chatId}`);
    }
  };

  const chatBuyer = async (o: any) => {
    const buyerId = o?.buyer?.id;
    if (!buyerId) return;
    const title = `Order Confirmation - ${o.product?.name || ''}`.trim();
    const res = await chatService.startChatWith(buyerId, { type: 'TRADING_SUPPORT', title });
    const chatId = (res as any).id;
    if (chatId) {
      const priceStr = o.product?.currency==='USD' ? `$ ${Number(o.product?.price||0).toLocaleString('en-US')}` : `Rp ${Number(o.product?.price||0).toLocaleString('id-ID')}`;
      const summary = `Halo Buyer, ini admin trading. Konfirmasi terkait pesanan Anda.\nOrder ID: ${o.id}\nProduct: ${o.product?.name}\nPrice: ${priceStr} / ${o.product?.unit}\nQty: ${o.quantity}\nLinks:\n- Product: /dashboard/marketplace/${o.product?.id}`;
      try { await chatService.postMessage(chatId, summary); } catch {}
      router.push(`/dashboard/chat?chatId=${chatId}`);
    }
  };

  const updateStatus = async (id: string, status: 'CONFIRMED' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED') => {
    try {
      setUpdatingId(id);
      await tradingService.updateShipmentStatus; // no-op to satisfy lint if imported; real call below
      await tradingService.updateOrderStatus(id, { status } as any);
      await refresh();
    } finally {
      setUpdatingId(null);
    }
  };

  const statuses = ['DRAFT','PENDING','PRICE_SET','CONFIRMED','SHIPPED','COMPLETED','CANCELLED'] as const;

  const beginFixedForOrder = (o: any) => {
    const items: Array<{ key: string; fixedUnitPrice: string; currency: 'IDR'|'USD' }> = [];
    if (Array.isArray(o.items) && o.items.length > 0) {
      for (const it of o.items) {
        const key = it.id || it.productId || `${o.id}-${(it.product?.id || '')}`;
        items.push({ key, fixedUnitPrice: '', currency: (it.currency || 'USD') as any });
      }
    } else {
      const key = o.product?.id || o.productId || `${o.id}-product`;
      items.push({ key, fixedUnitPrice: '', currency: ((o.product as any)?.currency || 'USD') as any });
    }
    setFixedByOrder((prev)=> ({ ...prev, [o.id]: items }));
  };

  const saveFixedForOrder = async (o: any) => {
    try {
      setSavingFixedId(o.id);
      const entries = fixedByOrder[o.id] || [];
      const payloadItems = entries
        .filter(e => e.fixedUnitPrice && !isNaN(Number(e.fixedUnitPrice)))
        .map(e => ({
          orderItemId: (o.items || []).find((it: any) => (it.id || it.productId) === e.key)?.id,
          productId: (o.items || []).find((it: any) => (it.id || it.productId) === e.key)?.productId || e.key,
          fixedUnitPrice: Number(e.fixedUnitPrice),
          currency: e.currency,
        }));
      if (payloadItems.length === 0) return;
      try {
        await tradingService.setOrderFixedPrices(o.id, { items: payloadItems });
        setFixedErrorByOrder(prev => ({ ...prev, [o.id]: null }));
        setFixedSuccessByOrder(prev => ({ ...prev, [o.id]: 'Fixed prices saved successfully.' }));
        if (typeof window !== 'undefined') {
          try { window.alert('Fixed prices saved successfully.'); } catch {}
        }
        await refresh();
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 404) {
          // Backend endpoint not available; save locally so admin can proceed to Confirm
          setFixedSavedLocal(prev => ({ ...prev, [o.id]: true }));
          setFixedErrorByOrder(prev => ({ ...prev, [o.id]: 'Fixed price endpoint not available on backend. Values kept locally for this session.' }));
          setFixedSuccessByOrder(prev => ({ ...prev, [o.id]: null }));
        } else {
          setFixedErrorByOrder(prev => ({ ...prev, [o.id]: err?.response?.data?.message || 'Failed to save fixed prices' }));
          setFixedSuccessByOrder(prev => ({ ...prev, [o.id]: null }));
        }
      }
    } finally {
      setSavingFixedId(null);
    }
  };

  return (
    <RoleGuard allowedRoles={[Role.ADMIN, Role.ADMIN_TRADING, Role.SUPER_ADMIN]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="text-xl font-semibold text-gray-900">Trading: Orders</div>
          <button onClick={refresh} className="px-3 py-2 rounded border text-sm text-gray-800 hover:bg-gray-50">Refresh</button>
        </div>
        {loading ? (
          <div className="text-sm text-gray-600">Loading orders...</div>
        ) : (
          statuses.filter((s:any) => s !== 'DRAFT' && s !== 'PRICE_SET').map((st) => (
            <div key={st} className="border rounded-xl bg-white overflow-hidden">
              <div className="px-4 py-2 border-b text-sm font-semibold text-gray-900">{st}</div>
              <div className="divide-y">
                {(grouped[st] || []).map((o) => (
                  <div key={o.id} className="p-4">
                    <div className="text-sm font-medium text-gray-900">Order ID: {o.id}</div>
                    <div className="text-xs text-gray-600">Created: {o.createdAt ? new Date(o.createdAt).toLocaleString() : '-'}</div>
                    {Array.isArray(o.items) && o.items.length > 0 ? (
                      <div className="mt-2 text-sm text-gray-800">
                        <div className="font-semibold mb-1">Items</div>
                        <div className="space-y-1">
                          {o.items.map((it: any, idx: number) => (
                            <div key={it.id || idx} className="text-sm text-gray-800">
                              <span className="font-medium">{it.product?.name || it.productName || it.productId}</span>
                              <span className="ml-2 text-gray-700">Qty: {it.quantity}</span>
                              {it.fixedUnitPrice != null && (
                                <span className="ml-2 text-emerald-700">Fixed: {(it.currency==='USD')? `$ ${Number(it.fixedUnitPrice).toLocaleString('en-US')}` : `Rp ${Number(it.fixedUnitPrice).toLocaleString('id-ID')}`}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="mt-2 text-sm text-gray-800">Product: {o.product?.name}</div>
                        <div className="text-sm text-gray-800">Qty: {o.quantity} • Buyer: {o.buyer?.fullname || o.buyer?.email} • Seller: {o.product?.seller?.fullname || o.product?.seller?.email || '-'}</div>
                      </>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {o.product?.seller?.id && (
                        <button onClick={() => chatSeller(o)} className="px-3 py-1.5 rounded bg-green-600 text-white text-sm hover:bg-green-700">Chat Seller</button>
                      )}
                      {o.buyer?.id && (
                        <button onClick={() => chatBuyer(o)} className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">Chat Buyer</button>
                      )}
                      {st === 'PENDING' && (
                        <button onClick={() => beginFixedForOrder(o)} className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50 text-gray-800">Start Input Fixed Prices</button>
                      )}
                      {st === 'PRICE_SET' && (
                        <button onClick={() => updateStatus(o.id, 'CONFIRMED')} disabled={updatingId===o.id} className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50 disabled:opacity-60 text-gray-800">Mark Confirmed</button>
                      )}
                      {st === 'SHIPPED' && (
                        <button onClick={() => updateStatus(o.id, 'COMPLETED')} disabled={updatingId===o.id} className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50 disabled:opacity-60 text-gray-800">Mark Completed</button>
                      )}
                      {st !== 'COMPLETED' && st !== 'CANCELLED' && (
                        <button onClick={() => updateStatus(o.id, 'CANCELLED')} disabled={updatingId===o.id} className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50 disabled:opacity-60 text-red-700">Cancel</button>
                      )}
                    </div>

                    {/* Fixed pricing inputs shown in PENDING (or DRAFT) */}
                    {((st === 'PENDING') || (o.status === 'DRAFT')) && (
                      <div className="mt-3 border-t pt-3">
                        <div className="text-xs text-gray-700 mb-2">Set fixed prices based on destination: {getDestinationLabel(o)}</div>
                        {(!fixedByOrder[o.id]) ? (
                          <button onClick={()=>beginFixedForOrder(o)} className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50 text-gray-800">Start Input Fixed Prices</button>
                        ) : (
                          <div className="space-y-2">
                            {(fixedByOrder[o.id] || []).map((row, idx) => (
                              <div key={row.key} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                                <div className="text-xs text-gray-700 truncate">Item {idx+1}</div>
                                <input
                                  placeholder="Fixed Unit Price"
                                  value={row.fixedUnitPrice}
                                  onChange={(e)=> setFixedByOrder(prev=>{ const next={...prev}; const arr=[...next[o.id]]; arr[idx] = { ...arr[idx], fixedUnitPrice: e.target.value }; next[o.id]=arr; return next; })}
                                  className="border rounded px-2 py-1 text-xs text-gray-800"
                                />
                                <select
                                  value={row.currency}
                                  onChange={(e)=> setFixedByOrder(prev=>{ const next={...prev}; const arr=[...next[o.id]]; arr[idx] = { ...arr[idx], currency: e.target.value as any }; next[o.id]=arr; return next; })}
                                  className="border rounded px-2 py-1 text-xs text-gray-800"
                                >
                                  <option value="IDR">IDR</option>
                                  <option value="USD">USD</option>
                                </select>
                              </div>
                            ))}
                            <div className="flex items-center gap-2">
                              <button onClick={()=>saveFixedForOrder(o)} disabled={savingFixedId===o.id} className="px-3 py-1.5 rounded bg-slate-900 text-white text-sm hover:bg-slate-800 disabled:opacity-60">{savingFixedId===o.id? 'Saving...' : (fixedSavedLocal[o.id] ? 'Saved (Local)' : 'Save Fixed Prices')}</button>
                              <button onClick={()=>updateStatus(o.id, 'CONFIRMED')} disabled={updatingId===o.id} className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50 disabled:opacity-60 text-gray-800">Mark Confirmed</button>
                            </div>
                            {fixedErrorByOrder[o.id] && (
                              <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">{fixedErrorByOrder[o.id]}</div>
                            )}
                            {fixedSuccessByOrder[o.id] && (
                              <div className="mt-2 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1">{fixedSuccessByOrder[o.id]}</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Shipment management */}
                    <div className="mt-3 border-t pt-3">
                      {!o.shipment ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-700">Create shipment:</span>
                          {(['AIR','SEA','EXPRESS'] as const).map(m => (
                            <button key={m} onClick={() => createShipment(o.id, m)} disabled={shipSavingId===o.id} className="px-2 py-1 rounded border text-xs hover:bg-gray-50 disabled:opacity-60 text-gray-800">{m}</button>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-xs text-gray-700">Shipment: {o.shipment.method} • {o.shipment.status}</div>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                            <select defaultValue={o.shipment.method} onChange={(e)=>saveShipment(o.shipment.id, { method: e.target.value as any })} className="border rounded px-2 py-1 text-xs text-gray-800">
                              <option value="AIR">Air</option>
                              <option value="SEA">Sea</option>
                              <option value="EXPRESS">Express</option>
                            </select>
                            <input defaultValue={o.shipment.carrier || ''} onBlur={(e)=>saveShipment(o.shipment.id, { carrier: e.target.value })} placeholder="Carrier (DHL/FedEx/UPS)" className="border rounded px-2 py-1 text-xs text-gray-800" />
                            <input defaultValue={o.shipment.trackingNumber || ''} onBlur={(e)=>saveShipment(o.shipment.id, { trackingNumber: e.target.value })} placeholder="Tracking number" className="border rounded px-2 py-1 text-xs text-gray-800" />
                            <input defaultValue={o.shipment.trackingUrl || ''} onBlur={(e)=>saveShipment(o.shipment.id, { trackingUrl: e.target.value })} placeholder="Tracking URL" className="border rounded px-2 py-1 text-xs text-gray-800" />
                          </div>
                          {o.shipment.method === 'SEA' && (
                            <div className="mt-2 grid grid-cols-1 md:grid-cols-5 gap-2">
                              <div>
                                <label className="block text-[10px] text-gray-500 mb-1">Pricing Mode</label>
                                <select defaultValue={o.shipment.seaPricingMode || ''} onChange={(e)=>saveShipment(o.shipment.id, { seaPricingMode: (e.target.value || null) as any })} className="border rounded px-2 py-1 text-xs text-gray-800 w-full">
                                  <option value="">Select</option>
                                  <option value="CBM">CBM</option>
                                  <option value="CONTAINER">Container</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] text-gray-500 mb-1">CBM Volume</label>
                                <input type="number" step="0.01" defaultValue={o.shipment.cbmVolume ?? ''} onBlur={(e)=>saveShipment(o.shipment.id, { cbmVolume: e.target.value ? Number(e.target.value) : null })} placeholder="e.g. 12.5" className="border rounded px-2 py-1 text-xs text-gray-800 w-full" />
                              </div>
                              <div>
                                <label className="block text-[10px] text-gray-500 mb-1">Container</label>
                                <select defaultValue={o.shipment.containerType || ''} onChange={(e)=>saveShipment(o.shipment.id, { containerType: (e.target.value || null) as any })} className="border rounded px-2 py-1 text-xs text-gray-800 w-full">
                                  <option value="">Select</option>
                                  <option value="FT20">20ft</option>
                                  <option value="FT40">40ft</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] text-gray-500 mb-1">Freight Cost</label>
                                <input type="number" step="0.01" defaultValue={o.shipment.freightCost ?? ''} onBlur={(e)=>saveShipment(o.shipment.id, { freightCost: e.target.value ? Number(e.target.value) : null })} placeholder="e.g. 1500" className="border rounded px-2 py-1 text-xs text-gray-800 w-full" />
                              </div>
                              <div>
                                <label className="block text-[10px] text-gray-500 mb-1">Currency</label>
                                <input defaultValue={o.shipment.currency || 'USD'} onBlur={(e)=>saveShipment(o.shipment.id, { currency: e.target.value })} placeholder="USD" className="border rounded px-2 py-1 text-xs text-gray-800 w-full" />
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-700">Update status:</span>
                            {(['PENDING','IN_TRANSIT','DELIVERED'] as const).map(s => (
                              <button key={s} onClick={()=>saveShipment(o.shipment.id, { status: s })} disabled={shipSavingId===o.shipment.id} className="px-2 py-1 rounded border text-xs hover:bg-gray-50 disabled:opacity-60 text-gray-800">{s}</button>
                            ))}
                          </div>
                          {(o.shipment.trackingUrl || o.shipment.trackingNumber) && (
                            <div className="text-xs">
                              {o.shipment.trackingUrl ? (
                                <a href={o.shipment.trackingUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">Open tracking</a>
                              ) : null}
                              {o.shipment.trackingNumber ? (
                                <span className="ml-2 text-gray-700">No: {o.shipment.trackingNumber}</span>
                              ) : null}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {(!grouped[st] || grouped[st].length===0) && (
                  <div className="p-4 text-sm text-gray-600">No orders.</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </RoleGuard>
  );
}
