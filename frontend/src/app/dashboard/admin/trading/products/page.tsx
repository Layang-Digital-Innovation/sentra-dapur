"use client";

import React, { useEffect, useMemo, useState } from 'react';
import RoleGuard from '@/components/auth/RoleGuard';
import { Role } from '@/types/user.types';
import { tradingService } from '@/services/trading.service';
import chatService from '@/services/chat.service';
import { useRouter } from 'next/navigation';

export default function AdminTradingProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectReasonById, setRejectReasonById] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tradingService.adminListProducts();
      setProducts(data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const chatSeller = async (p: any) => {
    if (!p?.seller?.id) return;
    const title = `Product Discussion - ${p.name}`;
    const res = await chatService.startChatWith(p.seller.id, { type: 'TRADING_SUPPORT', title });
    const chatId = (res as any).id;
    if (chatId) {
      const priceStr = p.currency==='USD' ? `$ ${Number(p.price||0).toLocaleString('en-US')}` : `Rp ${Number(p.price||0).toLocaleString('id-ID')}`;
      const summary = `Hi Seller, saya admin trading. Ingin konfirmasi terkait produk Anda.\nProduct: ${p.name}\nPrice: ${priceStr} / ${p.unit}\nLink: /dashboard/marketplace/${p.id}`;
      try { await chatService.postMessage(chatId, summary); } catch {}
      router.push(`/dashboard/chat?chatId=${chatId}`);
    }
  };

  useEffect(() => { load(); }, []);

  const approve = async (id: string) => {
    try {
      setProcessing(id);
      await tradingService.approveProduct(id);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Approval failed');
    } finally {
      setProcessing(null);
    }
  };

  const reject = async (id: string) => {
    try {
      setProcessing(id);
      await tradingService.rejectProduct(id, rejectReasonById[id] || '');
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Rejection failed');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <RoleGuard allowedRoles={[Role.ADMIN, Role.ADMIN_TRADING, Role.SUPER_ADMIN]}>
      <div className="py-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">Trading Products (Admin)</h1>
        {loading && <div>Loading...</div>}
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div className="space-y-3">
          {products.map((p) => (
            <div key={p.id} className="border rounded-lg p-4 bg-white">
              <div className="flex items-start gap-3">
                {(() => {
                  const cover = (p.images || []).find((img: any) => img.isCover) || (p.images || [])[0];
                  return cover ? (
                    <img src={cover.url} alt={p.name} className="h-20 w-20 object-cover rounded" />
                  ) : (
                    <div className="h-20 w-20 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs">No Image</div>
                  );
                })()}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      {p.seller?.SellerProfile?.companyLogo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.seller.SellerProfile.companyLogo} alt="logo" className="h-6 w-6 rounded-full object-cover border" />
                      ) : null}
                      <span>{p.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-800">
                      <span>Status:</span>
                      <span
                        className={`px-2 py-0.5 rounded-full border font-medium ${
                          p.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800 border-yellow-300'
                            : p.status === 'APPROVED'
                            ? 'bg-green-100 text-green-800 border-green-300'
                            : 'bg-gray-100 text-gray-700 border-gray-300'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600">Seller: {p.seller?.fullname || p.seller?.email}</div>
                  {(p.seller?.SellerProfile?.companyName) && (
                    <div className="text-xs text-gray-800">Company: {p.seller.SellerProfile.companyName}</div>
                  )}
                  <div className="text-sm text-gray-600">{p.description}</div>
                  <div className="text-sm text-gray-800">Price: {(p.currency === 'USD' ? `$ ${Number(p.price||0).toLocaleString('en-US')}` : `Rp ${Number(p.price||0).toLocaleString('id-ID')}`)} / {p.unit}</div>
                  <div className="text-xs text-gray-500">Weight: {p.weight} • Volume: {p.volume}</div>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <a href={`/dashboard/admin/trading/company/${p.seller?.id || ''}`} className="inline-flex text-xs px-2 py-1.5 rounded bg-slate-50 text-amber-700 border border-purple-200 hover:bg-slate-100">Detail Company</a>
                    {p.seller?.id && (
                      <button onClick={() => chatSeller(p)} className="inline-flex text-xs px-2 py-1.5 rounded bg-green-600 text-white hover:bg-green-700">Chat Seller</button>
                    )}
                  </div>
                  {p.status === 'PENDING' && (
                    <div className="mt-2 flex items-center gap-2">
                      <button onClick={() => approve(p.id)} disabled={processing===p.id} className="px-3 py-1.5 rounded bg-green-600 text-white text-xs hover:bg-green-700 disabled:opacity-60">{processing===p.id? 'Processing...' : 'Approve'}</button>
                      <input className="border rounded px-2 py-1 text-xs text-gray-800" placeholder="Reject reason" value={rejectReasonById[p.id] || ''} onChange={(e)=>setRejectReasonById(prev=>({...prev,[p.id]: e.target.value}))} />
                      <button onClick={() => reject(p.id)} disabled={processing===p.id} className="px-3 py-1.5 rounded bg-red-600 text-white text-xs hover:bg-red-700 disabled:opacity-60">Reject</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {!loading && products.length === 0 && <div className="text-sm text-gray-600">No products found.</div>}
        </div>
      </div>
    </RoleGuard>
  );
}
