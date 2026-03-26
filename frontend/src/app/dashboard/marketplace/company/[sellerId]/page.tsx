"use client";

import React, { useEffect, useState } from 'react';
import RoleGuard from '@/components/auth/RoleGuard';
import { Role } from '@/types/user.types';
import { useParams, useRouter } from 'next/navigation';
import { tradingService } from '@/services/trading.service';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';

export default function BuyerCompanyDetailPage() {
  const { sellerId } = useParams();
  const router = useRouter();
  const { addItem } = useCart();
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [sort, setSort] = useState<'newest'|'price_asc'|'price_desc'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);

  const getPriceFor = (p: any, c: 'IDR'|'USD'): number | null => {
    const code = String(c).toUpperCase();
    const row = (p?.prices || []).find((x: any) => String(x?.currency || x?.currencyCode || x?.code || '').toUpperCase() === code);
    if (!row) return null;
    const raw = row.price ?? row.amount ?? row.value ?? (row.priceCents != null ? row.priceCents / 100 : null);
    return raw != null ? Number(raw) : null;
  };

  const unitOptions = React.useMemo(() => {
    const set = new Set<string>();
    (products || []).forEach((p: any) => { if (p.unit) set.add(String(p.unit)); });
    return Array.from(set).sort((a,b)=> a.localeCompare(b));
  }, [products]);

  const filteredProducts = React.useMemo(() => {
    let arr = [...products];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    }
    if (unitFilter) {
      const uf = unitFilter.toLowerCase();
      arr = arr.filter(p => String(p.unit||'').toLowerCase() === uf);
    }
    const priceValue = (p: any) => (getPriceFor(p,'IDR') ?? getPriceFor(p,'USD') ?? 0);
    if (sort === 'price_asc') arr.sort((a,b)=> priceValue(a) - priceValue(b));
    if (sort === 'price_desc') arr.sort((a,b)=> priceValue(b) - priceValue(a));
    // newest: keep server order
    return arr;
  }, [products, search, unitFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * pageSize;
  const pagedProducts = filteredProducts.slice(start, start + pageSize);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!sellerId) return;
      setLoading(true);
      setError(null);
      try {
        const data = await tradingService.getSellerProfileById(String(sellerId));
        if (!mounted) return;
        setProfile(data || null);
        // fetch products by seller
        try {
          const prods = await tradingService.getApprovedProducts({ sellerId: String(sellerId) });
          if (mounted) setProducts(prods || []);
        } catch {}
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load company profile');
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [sellerId]);

  return (
    <RoleGuard allowedRoles={[Role.BUYER]}>
      <div className="py-6">
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
          <button onClick={() => router.back()} className="px-3 py-1 rounded border hover:bg-gray-50">Back</button>
          <span>/</span>
          <span className="text-gray-900 font-medium">Company Detail</span>
        </div>

        {loading && <div>Loading...</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        {profile && (
          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              {profile.companyLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.companyLogo} alt="company" className="h-16 w-16 rounded-full object-cover border" />
              ) : (
                <div className="h-16 w-16 rounded-full bg-gray-200" />
              )}
              <div className="flex-1">
                <div className="text-lg font-semibold text-gray-900">{profile.companyName || 'Company'}</div>
                <div className="text-sm text-gray-600 whitespace-pre-line">{profile.descriptions || '-'}</div>
                <div className="mt-2 text-xs text-gray-500">Country: {profile.country || '-'}</div>
                <div className="text-xs text-gray-500">Address: {profile.address || '-'}</div>
                {profile.profileCompanyUrl && (
                  <a href={profile.profileCompanyUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs px-3 py-1.5 rounded border bg-gray-50 hover:bg-gray-100 text-amber-600">View Profile Company</a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Product Catalog */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Product Catalog</h2>
            <div className="text-sm text-gray-600">{filteredProducts.length} products</div>
          </div>

          {/* Controls */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              className="border rounded-lg px-3 py-2 text-sm text-gray-800"
              placeholder="Search product or description..."
              value={search}
              onChange={(e)=> { setSearch(e.target.value); setCurrentPage(1); }}
            />
            <select
              className="border rounded-lg px-3 py-2 text-sm text-gray-800"
              value={unitFilter}
              onChange={(e)=> { setUnitFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="">All Units</option>
              {unitOptions.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <select
              className="border rounded-lg px-3 py-2 text-sm text-gray-800"
              value={sort}
              onChange={(e)=> { setSort(e.target.value as any); setCurrentPage(1); }}
            >
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Per page:</span>
              <select
                className="border rounded-lg px-2 py-2 text-sm text-gray-800"
                value={pageSize}
                onChange={(e)=> { setPageSize(parseInt(e.target.value,10)); setCurrentPage(1); }}
              >
                {[6,9,12,18].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-sm text-gray-500">No products found for this company.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pagedProducts.map((p)=> (
                <div key={p.id} className="group border rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                  <Link href={`/dashboard/marketplace/${p.id}`} className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {(() => {
                      const BACKEND_BASE = (typeof process !== 'undefined' && process.env && (process.env.NEXT_PUBLIC_BACKEND_URL as string)) || 'http://localhost:3001';
                      const cover = (p.images || []).find((img: any) => img.isCover) || (p.images || [])[0];
                      const url: string | undefined = cover?.url ? (cover.url.startsWith('http') ? cover.url : `${BACKEND_BASE}${cover.url}`) : undefined;
                      return url ? (
                        <img src={url} alt={p.name} className="w-full h-40 object-cover" />
                      ) : (
                        <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-500 text-xs">No Image</div>
                      );
                    })()}
                    <div className="p-4">
                      <div className="text-base font-semibold text-gray-900 truncate">{p.name}</div>
                      <div className="text-xs text-gray-600 line-clamp-2 min-h-[32px]">{p.description}</div>
                      <div className="mt-2 text-sm font-semibold text-gray-900">
                        {(() => {
                          const idrRow = (p.prices || []).find((x:any)=>String(x.currency).toUpperCase()==='IDR');
                          const usdRow = (p.prices || []).find((x:any)=>String(x.currency).toUpperCase()==='USD');
                          const idr = idrRow ? (idrRow.price ?? idrRow.amount ?? idrRow.value ?? (idrRow.priceCents!=null? idrRow.priceCents/100 : null)) : null;
                          const usd = usdRow ? (usdRow.price ?? usdRow.amount ?? usdRow.value ?? (usdRow.priceCents!=null? usdRow.priceCents/100 : null)) : null;
                          return (
                            <div className="flex items-center flex-wrap gap-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-50 text-amber-800 border border-amber-200">
                                <span>IDR</span>
                                <span>{idr != null ? `Rp ${Number(idr).toLocaleString('id-ID')}` : '-'}</span>
                              </span>
                              <span className="text-gray-400">|</span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                                <span>USD</span>
                                <span>{usd != null ? `$ ${Number(usd).toLocaleString('en-US')}` : '-'}</span>
                              </span>
                              <span className="ml-1 text-xs text-gray-600">/ {p.unit}</span>
                            </div>
                          );
                        })()}
                      </div>
                      <div className="mt-2">
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 text-gray-700 border border-gray-200 text-[11px]">
                          <svg className="w-3.5 h-3.5 text-gray-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 100-2 1 1 0 000 2zm1 2a1 1 0 10-2 0v5a1 1 0 102 0v-5z" clipRule="evenodd" />
                          </svg>
                          <span>Prices shown are estimates based on origin country. Final pricing will be adjusted by admin for the destination country.</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                  <div className="p-4 pt-0">
                    <button
                      onClick={() => {
                        const BACKEND_BASE = (typeof process !== 'undefined' && process.env && (process.env.NEXT_PUBLIC_BACKEND_URL as string)) || 'http://localhost:3001';
                        const cover = (p.images || []).find((img: any) => img.isCover) || (p.images || [])[0];
                        const url: string | undefined = cover?.url ? (cover.url.startsWith('http') ? cover.url : `${BACKEND_BASE}${cover.url}`) : undefined;
                        const idrRow = (p.prices || []).find((x:any)=>String(x.currency).toUpperCase()==='IDR');
                        const usdRow = (p.prices || []).find((x:any)=>String(x.currency).toUpperCase()==='USD');
                        const idr = idrRow ? (idrRow.price ?? idrRow.amount ?? idrRow.value ?? (idrRow.priceCents!=null? idrRow.priceCents/100 : null)) : null;
                        const usd = usdRow ? (usdRow.price ?? usdRow.amount ?? usdRow.value ?? (usdRow.priceCents!=null? usdRow.priceCents/100 : null)) : null;
                        const currency = idr != null ? 'IDR' : (usd != null ? 'USD' : null);
                        const unitPriceEstimate = currency === 'IDR' ? idr : usd;
                        addItem({ productId: p.id, name: p.name, unit: p.unit, imageUrl: url, currency: currency as any, unitPriceEstimate: (unitPriceEstimate ?? null) as any }, 1);
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4 text-sm">
            <div className="text-gray-600">
              Showing {filteredProducts.length === 0 ? 0 : start + 1} - {Math.min(start + pageSize, filteredProducts.length)} of {filteredProducts.length}
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 border rounded disabled:opacity-50" onClick={()=> setCurrentPage(1)} disabled={safePage===1}>«</button>
              <button className="px-3 py-1 border rounded disabled:opacity-50" onClick={()=> setCurrentPage(p => Math.max(1, p-1))} disabled={safePage===1}>Prev</button>
              <span className="px-2">Page {safePage} / {totalPages}</span>
              <button className="px-3 py-1 border rounded disabled:opacity-50" onClick={()=> setCurrentPage(p => Math.min(totalPages, p+1))} disabled={safePage===totalPages}>Next</button>
              <button className="px-3 py-1 border rounded disabled:opacity-50" onClick={()=> setCurrentPage(totalPages)} disabled={safePage===totalPages}>»</button>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
