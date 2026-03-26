"use client";

import React, { useEffect, useMemo, useState } from 'react';
import RoleGuard from '@/components/auth/RoleGuard';
import { Role } from '@/types/user.types';
import { tradingService } from '@/services/trading.service';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import chatService from '@/services/chat.service';
import { useCart } from '@/contexts/CartContext';

const AddToCartButton: React.FC<{ p: any; quantity?: number; currency?: 'IDR'|'USD' }>
  = ({ p, quantity = 1, currency }) => {
  const { addItem } = useCart();
  const getPriceFor = (prod: any, c: 'IDR'|'USD'): number | null => {
    const code = String(c).toUpperCase();
    const row = (prod?.prices || []).find((x: any) => String(x?.currency || x?.currencyCode || x?.code || '').toUpperCase() === code);
    if (!row) return null;
    const raw = row.price ?? row.amount ?? row.value ?? (row.priceCents != null ? row.priceCents / 100 : null);
    return raw != null ? Number(raw) : null;
  };
  const onAdd = () => {
    const selCur: 'IDR'|'USD'|null = currency ?? ((getPriceFor(p,'IDR')!=null) ? 'IDR' : ((getPriceFor(p,'USD')!=null) ? 'USD' : null));
    const unitPriceEstimate = selCur ? getPriceFor(p, selCur) : null;
    const img = (() => {
      const BACKEND_BASE = (typeof process !== 'undefined' && process.env && (process.env.NEXT_PUBLIC_BACKEND_URL as string)) || 'http://localhost:3001';
      const cover = (p.images || []).find((img: any) => img.isCover) || (p.images || [])[0];
      const url: string | undefined = cover?.url ? (cover.url.startsWith('http') ? cover.url : `${BACKEND_BASE}${cover.url}`) : undefined;
      return url;
    })();
    addItem({
      productId: p.id,
      name: p.name,
      unit: p.unit,
      imageUrl: img,
      currency: selCur,
      unitPriceEstimate: unitPriceEstimate ?? null,
    }, Math.max(1, quantity || 1));
  };
  return (
    <button onClick={onAdd} className="w-full px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700">Add to Cart</button>
  );
};

export default function MarketplacePage() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [quantityById, setQuantityById] = useState<Record<string, number>>({});
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [currencyById, setCurrencyById] = useState<Record<string, 'IDR'|'USD'>>({});
  const [search, setSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [sort, setSort] = useState<'newest'|'price_asc'|'price_desc'>('newest');
  const [placingOrderId, setPlacingOrderId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await tradingService.getApprovedProducts();
        setProducts(data || []);
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const getPriceFor = (p: any, c: 'IDR'|'USD'): number | null => {
    const code = String(c).toUpperCase();
    const row = (p?.prices || []).find((x: any) => String(x?.currency || x?.currencyCode || x?.code || '').toUpperCase() === code);
    if (!row) return null;
    const raw = row.price ?? row.amount ?? row.value ?? (row.priceCents != null ? row.priceCents / 100 : null);
    return raw != null ? Number(raw) : null;
  };

  const placeOrder = async (productId: string) => {
    const qty = quantityById[productId] || 1;
    const notes = notesById[productId] || '';
    const prod = products.find((x)=>x.id===productId);
    const selectedCurrency = currencyById[productId] || ((getPriceFor(prod,'IDR')!=null)?'IDR':'USD');
    try {
      setPlacingOrderId(productId);
      await tradingService.createOrder({ productId, quantity: qty, notes, currency: selectedCurrency });
      // Start a support chat and redirect user to chat window
      const title = prod ? `Order Inquiry - ${prod.name}` : 'Order Inquiry';
      const chat = await chatService.startChat({ type: 'TRADING_SUPPORT', title });
      // Post initial context message about the order
      const currency = selectedCurrency;
      const unitPrice = getPriceFor(prod, currency) || 0;
      const priceStr = currency==='USD' ? `$ ${unitPrice.toLocaleString('en-US')}` : `Rp ${unitPrice.toLocaleString('id-ID')}`;
      const unit = prod?.unit || '';
      const productLink = `/dashboard/marketplace/${productId}`;
      const companyLink = prod?.seller?.id ? `/dashboard/marketplace/company/${prod.seller.id}` : '';
      const summary = `Order created\nProduct: ${prod?.name || productId}\nPrice: ${priceStr} / ${unit}\nQuantity: ${qty} ${unit}\nNotes: ${notes || '-'}\nProduct link: ${productLink}${companyLink ? `\nCompany link: ${companyLink}` : ''}`;
      try { await chatService.postMessage(chat.id, summary); } catch {}
      router.push(`/dashboard/chat?chatId=${chat.id}`);
      setNotesById((prev) => ({ ...prev, [productId]: '' }));
      setQuantityById((prev) => ({ ...prev, [productId]: 1 }));
      setCurrencyById((prev) => ({ ...prev, [productId]: selectedCurrency }));
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to create order');
    } finally {
      setPlacingOrderId(null);
    }
  };

  const filtered = useMemo(() => {
    let arr = [...products];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.seller?.fullname?.toLowerCase().includes(q) ||
        p.seller?.email?.toLowerCase().includes(q)
      );
    }
    if (unitFilter) {
      arr = arr.filter(p => (p.unit || '').toLowerCase() === unitFilter.toLowerCase());
    }
    if (companyFilter) {
      const cf = companyFilter.toLowerCase();
      arr = arr.filter(p => (p.seller?.SellerProfile?.companyName || '').toLowerCase() === cf);
    }
    // Simple sort by IDR if available, else USD
    const priceValue = (p: any) => (getPriceFor(p,'IDR') ?? getPriceFor(p,'USD') ?? 0);
    if (sort === 'price_asc') arr.sort((a,b)=> priceValue(a) - priceValue(b));
    if (sort === 'price_desc') arr.sort((a,b)=> priceValue(b) - priceValue(a));
    // newest default by createdAt desc already from server, keep order
    return arr;
  }, [products, search, unitFilter, companyFilter, sort]);

  const companyOptions = useMemo(() => {
    const set = new Set<string>();
    (products || []).forEach((p: any) => {
      const name = p?.seller?.SellerProfile?.companyName;
      if (name) set.add(name);
    });
    return Array.from(set).sort((a,b)=> a.localeCompare(b));
  }, [products]);

  const formatPrices = (p: any) => {
    const idr = getPriceFor(p,'IDR');
    const usd = getPriceFor(p,'USD');
    const parts: string[] = [];
    if (idr != null) parts.push(`Rp ${idr.toLocaleString('id-ID')}`);
    if (usd != null) parts.push(`$ ${usd.toLocaleString('en-US')}`);
    return `${parts.join(' | ')} / ${p.unit}`;
  };

  const getCoverUrl = (p: any) => {
    const BACKEND_BASE = (typeof process !== 'undefined' && process.env && (process.env.NEXT_PUBLIC_BACKEND_URL as string)) || 'http://localhost:3001';
    const cover = (p.images || []).find((img: any) => img.isCover) || (p.images || [])[0];
    if (!cover?.url) return undefined;
    const url: string = cover.url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${BACKEND_BASE}${url}`;
  };

  return (
    <RoleGuard allowedRoles={[Role.BUYER]}>
      <div className="py-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">Marketplace</h1>
        {loading && <div>Loading...</div>}
        {error && <div className="text-red-600 text-sm">{error}</div>}

        {/* Filters & Search */}
        <div className="mb-4 grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            className="border rounded-lg px-3 py-2 text-sm text-gray-800 col-span-2"
            placeholder="Search product, seller, description..."
            value={search}
            onChange={(e)=>setSearch(e.target.value)}
          />
          <select className="border rounded-lg px-3 py-2 text-sm text-gray-800" value={unitFilter} onChange={(e)=>setUnitFilter(e.target.value)}>
            <option value="">All Units</option>
            <option value="KG">KG</option>
            <option value="TON">TON</option>
            <option value="LITER">LITER</option>
            <option value="PCS">PCS</option>
          </select>
          <select className="border rounded-lg px-3 py-2 text-sm text-gray-800" value={companyFilter} onChange={(e)=>setCompanyFilter(e.target.value)}>
            <option value="">All Companies</option>
            {companyOptions.map((c)=> (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select className="border rounded-lg px-3 py-2 text-sm text-gray-800" value={sort} onChange={(e)=>setSort(e.target.value as any)}>
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <div key={p.id} className="group border rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
              <Link href={`/dashboard/marketplace/${p.id}`} className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {getCoverUrl(p) ? (
                  <img src={getCoverUrl(p)!} alt={p.name} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-500 text-xs">No Image</div>
                )}
                <div className="p-4">
                  <div className="text-base font-semibold text-gray-900 truncate">{p.name}</div>
                  <div className="text-xs text-gray-600 line-clamp-2 min-h-[32px]">{p.description}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900">
                      {(() => {
                        const idr = getPriceFor(p,'IDR');
                        const usd = getPriceFor(p,'USD');
                        return (
                          <div className="flex items-center flex-wrap gap-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-50 text-amber-800 border border-amber-200">
                              <span>IDR</span>
                              <span>{idr != null ? `Rp ${idr.toLocaleString('id-ID')}` : '-'}</span>
                            </span>
                            <span className="text-gray-400">|</span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                              <span>USD</span>
                              <span>{usd != null ? `$ ${usd.toLocaleString('en-US')}` : '-'}</span>
                            </span>
                            <span className="ml-1 text-xs text-gray-600">/ {p.unit}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 text-gray-700 border border-gray-200 text-[11px]">
                      <svg className="w-3.5 h-3.5 text-gray-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 100-2 1 1 0 000 2zm1 2a1 1 0 10-2 0v5a1 1 0 102 0v-5z" clipRule="evenodd" />
                      </svg>
                      <span>Prices shown are estimates based on origin country. Final pricing will be adjusted by admin for the destination country.</span>
                    </div>
                  </div>
                  {/* company info moved below to avoid nested Link */}
                </div>
              </Link>
              <div className="px-4 pb-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      {p.seller?.SellerProfile?.companyLogo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.seller.SellerProfile.companyLogo} alt="logo" className="h-8 w-8 rounded-full object-cover border" />
                      ) : null}
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{p.seller?.SellerProfile?.companyName || p.seller?.fullname || '-'}</div>
                        <div className="text-xs text-gray-600 truncate">{p.seller?.email}</div>
                      </div>
                    </div>
                    <Link href={`/dashboard/marketplace/company/${p?.seller?.id || ''}`} className="text-xs text-blue-600 hover:text-blue-800">Company</Link>
                  </div>
                  {(() => {
                    const hasIDR = (p?.prices||[]).some((x:any)=>String(x?.currency||x?.currencyCode||x?.code||'').toUpperCase()==='IDR');
                    const hasUSD = (p?.prices||[]).some((x:any)=>String(x?.currency||x?.currencyCode||x?.code||'').toUpperCase()==='USD');
                    const selected = currencyById[p.id] || (hasIDR ? 'IDR' : 'USD');
                    const qty = quantityById[p.id] ?? 1;
                    return <AddToCartButton p={p} currency={selected as any} quantity={qty} />;
                  })()}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-600">Qty</label>
                      <input
                        type="number"
                        min={1}
                        className="border rounded px-2 py-1 text-sm w-20 text-gray-800"
                        placeholder="Qty"
                        value={quantityById[p.id] ?? 1}
                        onChange={(e) => setQuantityById((prev) => ({ ...prev, [p.id]: Number(e.target.value) }))}
                      />
                    </div>
                    {(() => {
                      const hasIDR = (p?.prices||[]).some((x:any)=>String(x?.currency||x?.currencyCode||x?.code||'').toUpperCase()==='IDR');
                      const hasUSD = (p?.prices||[]).some((x:any)=>String(x?.currency||x?.currencyCode||x?.code||'').toUpperCase()==='USD');
                      const selected = currencyById[p.id] || (hasIDR ? 'IDR' : 'USD');
                      if (!(hasIDR || hasUSD)) return null;
                      if (hasIDR && hasUSD) {
                        return (
                          <div className="relative w-28 h-8 bg-gray-100 rounded-full p-0.5">
                            <div className={`absolute top-0.5 bottom-0.5 w-1/2 rounded-full bg-white shadow transition-transform ${selected==='USD' ? 'translate-x-full' : ''}`}></div>
                            <div className="relative z-10 grid grid-cols-2 text-center text-xs h-full">
                              <button type="button" className={`z-10 ${selected==='IDR' ? 'text-gray-900' : 'text-gray-500'}`} onClick={() => setCurrencyById(prev => ({ ...prev, [p.id]: 'IDR' }))}>IDR</button>
                              <button type="button" className={`z-10 ${selected==='USD' ? 'text-gray-900' : 'text-gray-500'}`} onClick={() => setCurrencyById(prev => ({ ...prev, [p.id]: 'USD' }))}>USD</button>
                            </div>
                          </div>
                        );
                      }
                      // Only one available
                      const only = hasIDR ? 'IDR' : 'USD';
                      return (
                        <div className={`px-3 py-1 rounded-full border text-xs ${only==='IDR' ? 'bg-yellow-50 border-amber-200 text-amber-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>{only}</div>
                      );
                    })()}
                  </div>
                  <textarea
                    className="border rounded px-2 py-1 text-sm w-full text-gray-800"
                    placeholder="Notes/specifications"
                    rows={2}
                    value={notesById[p.id] ?? ''}
                    onChange={(e) => setNotesById((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  />
                  <button
                    onClick={() => placeOrder(p.id)}
                    disabled={placingOrderId === p.id}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800 disabled:opacity-60"
                  >
                    {placingOrderId === p.id ? 'Ordering...' : 'Order & notify admin'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </RoleGuard>
  );
}
