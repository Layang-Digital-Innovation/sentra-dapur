"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import RoleGuard from '@/components/auth/RoleGuard';
import { Role } from '@/types/user.types';
import { tradingService } from '@/services/trading.service';

export default function SellerProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const formatIDR = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value || 0);
  const formatUSD = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);

  const normalizePrices = (p: any): Array<{ currency: 'IDR' | 'USD'; price: number }> => {
    // 1) If already an array
    if (Array.isArray(p?.prices)) {
      return p.prices
        .filter((x: any) => {
          const code = String(x?.currency || x?.currencyCode || x?.code || '').toUpperCase();
          return code === 'IDR' || code === 'USD';
        })
        .map((x: any) => {
          const code = String(x?.currency || x?.currencyCode || x?.code || '').toUpperCase();
          const raw = (x?.price ?? x?.amount ?? x?.value ?? (x?.priceCents != null ? x.priceCents / 100 : 0));
          const num = typeof raw === 'string' ? Number(raw.replace(/[,\s]/g, '')) : Number(raw || 0);
          return { currency: code, price: num };
        });
    }
    // 2) If object with currency keys
    if (p?.prices && typeof p.prices === 'object') {
      const out: Array<{ currency: 'IDR' | 'USD'; price: number }> = [];
      const obj = p.prices;
      const parseNum = (v: any) => (typeof v === 'string' ? Number(v.replace(/[,\s]/g, '')) : Number(v || 0));
      if (obj.IDR != null) out.push({ currency: 'IDR', price: parseNum(obj.IDR) });
      if (obj.USD != null) out.push({ currency: 'USD', price: parseNum(obj.USD) });
      if (obj.idr != null) out.push({ currency: 'IDR', price: parseNum(obj.idr) });
      if (obj.usd != null) out.push({ currency: 'USD', price: parseNum(obj.usd) });
      if (out.length) return out;
    }
    // 3) JSON string field
    if (p?.pricesJson && typeof p.pricesJson === 'string') {
      try {
        const parsed = JSON.parse(p.pricesJson);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((x: any) => x && (x.currency === 'IDR' || x.currency === 'USD'))
            .map((x: any) => ({ currency: x.currency, price: Number(x.price || 0) }));
        }
        if (parsed && typeof parsed === 'object') {
          const out: Array<{ currency: 'IDR' | 'USD'; price: number }> = [];
          const parseNum = (v: any) => (typeof v === 'string' ? Number(v.replace(/[,\s]/g, '')) : Number(v || 0));
          if (parsed.IDR != null) out.push({ currency: 'IDR', price: parseNum(parsed.IDR) });
          if (parsed.USD != null) out.push({ currency: 'USD', price: parseNum(parsed.USD) });
          if (parsed.idr != null) out.push({ currency: 'IDR', price: parseNum(parsed.idr) });
          if (parsed.usd != null) out.push({ currency: 'USD', price: parseNum(parsed.usd) });
          if (out.length) return out;
        }
      } catch {}
    }
    // 4) Legacy fields
    const out: Array<{ currency: 'IDR' | 'USD'; price: number }> = [];
    const parseNum = (v: any) => (typeof v === 'string' ? Number(v.replace(/[,\s]/g, '')) : Number(v || 0));
    if (p?.priceIDR != null) out.push({ currency: 'IDR', price: parseNum(p.priceIDR) });
    if (p?.priceUSD != null) out.push({ currency: 'USD', price: parseNum(p.priceUSD) });
    if (p?.idrPrice != null) out.push({ currency: 'IDR', price: parseNum(p.idrPrice) });
    if (p?.usdPrice != null) out.push({ currency: 'USD', price: parseNum(p.usdPrice) });
    // Single price field fallback (assume IDR for backward compat)
    if (out.length === 0 && (p?.price != null)) {
      out.push({ currency: 'IDR', price: Number(p.price) });
    }
    return out;
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await tradingService.getSellerProducts();
        setProducts(data || []);
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Enrich products that miss USD by fetching product detail
  const [enriched, setEnriched] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const missing = (products || []).filter((p: any) => {
      const prices = normalizePrices(p);
      const hasUSD = prices.some((x) => x.currency === 'USD');
      return !hasUSD && !enriched[p.id];
    });
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const updates = await Promise.all(missing.map((p: any) => tradingService.getProduct(p.id).catch(()=>null)));
        if (cancelled) return;
        setProducts((prev) => {
          const map: Record<string, any> = {};
          (prev || []).forEach((x: any) => { map[x.id] = x; });
          updates.forEach((full) => {
            if (full && full.id) {
              map[full.id] = { ...map[full.id], ...full };
            }
          });
          return Object.values(map);
        });
        setEnriched((prev) => {
          const nxt = { ...prev };
          missing.forEach((p: any) => { nxt[p.id] = true; });
          return nxt;
        });
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [products, normalizePrices]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (products || [])
      .filter((p: any) => (status === 'ALL' ? true : (p.status === status)))
      .filter((p: any) => !s || p.name?.toLowerCase().includes(s) || p.description?.toLowerCase().includes(s));
  }, [products, search, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filtered.slice(start, end);
  }, [filtered, currentPage, pageSize]);

  return (
    <RoleGuard allowedRoles={[Role.SUPPLIER]}>
      <div className="py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
            <p className="text-sm text-gray-600">Kelola daftar produk Anda untuk marketplace</p>
          </div>
          <Link href="/dashboard/products/create" className="w-full sm:w-auto text-center px-3 py-1.5 text-sm md:px-4 md:py-2 md:text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-800">
            + Add Product
          </Link>
        </div>

        <div className="bg-white border rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-800 mb-1">Search Products</label>
              <input
                className="w-full border rounded px-3 py-2 text-sm placeholder-gray-400"
                placeholder="Cari nama atau deskripsi produk"
                value={search}
                onChange={(e) => { setPage(1); setSearch(e.target.value); }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Filter Status</label>
              <select className="w-full border rounded px-3 py-2 text-sm text-gray-800" value={status} onChange={(e)=>{ setPage(1); setStatus(e.target.value as any); }}>
                <option value="ALL">All</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Page Size</label>
              <select className="w-full border rounded px-3 py-2 text-sm text-gray-800" value={pageSize} onChange={(e)=>{ setPage(1); setPageSize(Number(e.target.value)); }}>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Unit</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Prices</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Weight</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Volume</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Created</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageItems.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{p.name}</div>
                      <div className="text-xs text-gray-600 line-clamp-1">{p.description}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">{p.unit}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      <div className="flex flex-col gap-1">
                        {(() => {
                          const prices = normalizePrices(p);
                          const idr = prices.find((x) => x.currency === 'IDR');
                          const usd = prices.find((x) => x.currency === 'USD');
                          return (
                            <>
                              <div className="inline-flex items-center gap-2">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-yellow-700">IDR</span>
                                <span className="text-gray-800">{idr ? formatIDR(idr.price) : '-'}</span>
                              </div>
                              <div className="inline-flex items-center gap-2">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">USD</span>
                                <span className="text-gray-800">{usd ? formatUSD(usd.price) : '-'}</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">{p.weight}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{p.volume}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className={`px-2 py-1 rounded text-xs ${p.status === 'APPROVED' ? 'bg-green-100 text-green-700' : p.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-yellow-700'}`}>{p.status || 'PENDING'}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-600">{p.createdAt ? new Date(p.createdAt).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/dashboard/products/${p.id}/edit`} className="inline-flex items-center px-3 py-1.5 rounded border text-xs hover:bg-gray-50 text-green-600 hover:text-green-900">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
                {!loading && pageItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-600">No products found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 flex items-center justify-between border-t bg-gray-50">
            <div className="text-xs text-gray-600">Page {currentPage} of {totalPages} • {filtered.length} items</div>
            <div className="flex items-center gap-2">
              <button onClick={()=>setPage(p=>Math.max(1, p-1))} disabled={currentPage<=1} className="px-3 py-1.5 rounded border text-sm disabled:opacity-50 text-gray-800">Prev</button>
              <button onClick={()=>setPage(p=>Math.min(totalPages, p+1))} disabled={currentPage>=totalPages} className="px-3 py-1.5 rounded border text-sm disabled:opacity-50 text-gray-800">Next</button>
            </div>
          </div>
        </div>

        {loading && <div className="mt-3">Loading...</div>}
        {error && <div className="mt-3 text-red-600 text-sm">{error}</div>}
      </div>
    </RoleGuard>
  );
}
