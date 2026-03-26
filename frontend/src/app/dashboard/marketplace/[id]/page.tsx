"use client";

import React, { useEffect, useMemo, useState } from 'react';
import RoleGuard from '@/components/auth/RoleGuard';
import { Role } from '@/types/user.types';
import { tradingService } from '@/services/trading.service';
import { useParams, useRouter } from 'next/navigation';
import chatService from '@/services/chat.service';

export default function MarketplaceProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || '';

  const [product, setProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');
  const [placing, setPlacing] = useState<boolean>(false);
  const [currency, setCurrency] = useState<'IDR'|'USD'>('IDR');

  const BACKEND_BASE = (typeof process !== 'undefined' && process.env && (process.env.NEXT_PUBLIC_BACKEND_URL as string)) || 'http://localhost:3001';

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const data = await tradingService.getProduct(id);
        if (!mounted) return;
        setProduct(data);
        // Set default currency based on available prices
        const hasIDR = (data?.prices || []).some((x: any) => x.currency === 'IDR');
        setCurrency(hasIDR ? 'IDR' : 'USD');
        // set cover as first active
        if (data?.images?.length) {
          const coverIdx = data.images.findIndex((x: any) => x.isCover);
          setActiveImageIdx(coverIdx >= 0 ? coverIdx : 0);
        }
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [id]);

  const imageUrls: string[] = useMemo(() => {
    if (!product?.images?.length) return [];
    return product.images.map((img: any) => {
      const url: string = img.url;
      if (!url) return '';
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
      return `${BACKEND_BASE}${url}`;
    }).filter(Boolean);
  }, [product, BACKEND_BASE]);

  const getPriceFor = (p: any, c: 'IDR'|'USD'): number | null => {
    const row = (p?.prices || []).find((x: any) => x.currency === c);
    return row ? Number(row.price || 0) : null;
  };

  const placeOrder = async () => {
    if (!product) return;
    try {
      setPlacing(true);
      await tradingService.createOrder({ productId: product.id, quantity, notes, currency });
      const chat = await chatService.startChat({ type: 'TRADING_SUPPORT', title: `Order Inquiry - ${product.name}` });
      // Send initial order summary message so admin sees the context
      const unitPrice = getPriceFor(product, currency) || 0;
      const priceStr = currency==='USD' ? `$ ${unitPrice.toLocaleString('en-US')}` : `Rp ${unitPrice.toLocaleString('id-ID')}`;
      const unit = product?.unit || '';
      const productLink = `/dashboard/marketplace/${product.id}`;
      const companyLink = product?.seller?.id ? `/dashboard/marketplace/company/${product.seller.id}` : '';
      const summary = `Order created\nProduct: ${product?.name}\nPrice: ${priceStr} / ${unit}\nQuantity: ${quantity} ${unit}\nNotes: ${notes || '-'}\nProduct link: ${productLink}${companyLink ? `\nCompany link: ${companyLink}` : ''}`;
      try { await chatService.postMessage(chat.id, summary); } catch {}
      setNotes('');
      setQuantity(1);
      router.push(`/dashboard/chat?chatId=${chat.id}`);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to create order');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <RoleGuard allowedRoles={[Role.BUYER]}>
      <div className="py-6">
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
          <button onClick={() => router.back()} className="px-3 py-1 rounded border hover:bg-gray-50">Back</button>
          <span>/</span>
          <span className="text-gray-900 font-medium">Product Detail</span>
        </div>

        {loading && <div>Loading...</div>}
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {product && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Gallery */}
            <div className="lg:col-span-3">
              <div className="rounded-xl overflow-hidden border bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {imageUrls.length ? (
                  <img src={imageUrls[activeImageIdx]} alt={product.name} className="w-full h-80 object-cover" />
                ) : (
                  <div className="w-full h-80 bg-gray-100 flex items-center justify-center text-gray-500 text-sm">No Image</div>
                )}
              </div>
              {imageUrls.length > 1 && (
                <div className="mt-3 grid grid-cols-4 md:grid-cols-6 gap-2">
                  {imageUrls.map((url, idx) => (
                    <button key={idx} onClick={() => setActiveImageIdx(idx)} className={`border rounded overflow-hidden ${idx===activeImageIdx? 'ring-2 ring-slate-900' : ''}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`preview-${idx}`} className="w-full h-20 object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info + order */}
            <div className="lg:col-span-2">
              <div className="rounded-xl border bg-white p-5">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <h1 className="text-xl font-semibold text-gray-900">{product.name}</h1>
                    <div className="mt-1 text-sm text-gray-600 whitespace-pre-line">{product.description}</div>
                    <div className="mt-3 text-base text-gray-900 font-medium">
                      {(() => {
                        const idr = getPriceFor(product,'IDR');
                        const usd = getPriceFor(product,'USD');
                        const parts: string[] = [];
                        if (idr != null) parts.push(`Rp ${idr.toLocaleString('id-ID')}`);
                        if (usd != null) parts.push(`$ ${usd.toLocaleString('en-US')}`);
                        return `${parts.join(' | ')} / ${product.unit}`;
                      })()}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">Volume: {product.volume}</div>
                    <div className="mt-3 text-xs text-gray-600">Seller: {product.seller?.fullname || product.seller?.email}</div>
                  </div>
                  {(product.seller?.SellerProfile?.companyLogo || product.seller?.SellerProfile?.companyName) && (
                    <div className="flex items-center gap-2">
                      {product.seller?.SellerProfile?.companyLogo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.seller.SellerProfile.companyLogo} alt="logo" className="h-10 w-10 rounded-full object-cover border" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200" />
                      )}
                      <div className="text-sm text-gray-900 font-medium truncate">{product.seller?.SellerProfile?.companyName || (product.seller?.fullname || product.seller?.email)}</div>
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  <input
                    type="number"
                    min={1}
                    className="border rounded px-3 py-2 text-sm w-full text-gray-800"
                    placeholder="Quantity"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-600">Currency</label>
                    <select
                      className="border rounded px-2 py-1 text-xs text-gray-800"
                      value={currency}
                      onChange={(e)=> setCurrency(e.target.value as any)}
                    >
                      {(product?.prices||[]).some((x:any)=>x.currency==='IDR') && (<option value="IDR">IDR</option>)}
                      {(product?.prices||[]).some((x:any)=>x.currency==='USD') && (<option value="USD">USD</option>)}
                    </select>
                  </div>
                  <textarea
                    className="border rounded px-3 py-2 text-sm w-full text-gray-800"
                    placeholder="Notes/specifications"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <button
                    onClick={placeOrder}
                    disabled={placing}
                    className="w-full px-4 py-2 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800 disabled:opacity-60"
                  >
                    {placing ? 'Ordering...' : 'Order & notify admin'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
