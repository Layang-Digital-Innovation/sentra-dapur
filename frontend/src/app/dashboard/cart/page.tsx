"use client";

import React, { useMemo, useState } from 'react';
import RoleGuard from '@/components/auth/RoleGuard';
import { Role } from '@/types/user.types';
import { useCart } from '@/contexts/CartContext';
import { tradingService } from '@/services/trading.service';
import { useRouter } from 'next/navigation';

export default function CartPage() {
  const { items, updateQty, removeItem, clear } = useCart();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [destinationCountry, setDestinationCountry] = useState('');
  const [destinationState, setDestinationState] = useState('');
  const [destinationCity, setDestinationCity] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [incoterm, setIncoterm] = useState('');
  const [notes, setNotes] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const countries = [
    'Indonesia','United States','China','Japan','Singapore','Malaysia','Thailand','Vietnam','India','Australia','United Kingdom','Germany','Netherlands','United Arab Emirates','Saudi Arabia','South Korea','Philippines'
  ];

  const totalByCurrency = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const it of items) {
      if (!it.currency || it.unitPriceEstimate == null) continue;
      totals[it.currency] = (totals[it.currency] || 0) + it.unitPriceEstimate * (it.quantity || 0);
    }
    return totals;
  }, [items]);

  const handleCheckout = async () => {
    setErr(null);
    const missing: string[] = [];
    if (!destinationCountry.trim()) missing.push('country');
    if (!destinationCity.trim()) missing.push('city');
    if (!addressLine.trim()) missing.push('address');
    if (missing.length) {
      setErr('Please fill in required destination fields (country, city, address).');
      setTouched(prev=>({ ...prev, country:true, city:true, address:true }));
      return;
    }
    const validItems = items
      .map(it => ({ ...it, quantity: Math.max(1, parseInt(String(it.quantity||1),10) || 1) }))
      .filter(it => !!it.productId && String(it.productId).trim().length>0);
    if (validItems.length === 0) {
      setErr('Your cart has no valid items. Please re-add products.');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        items: validItems.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          unitPriceEstimate: it.unitPriceEstimate ?? null,
          currency: (it.currency as any) ?? null,
        })),
        destinationCountry,
        destinationState: destinationState || null,
        destinationCity: destinationCity || null,
        addressLine: addressLine || null,
        postalCode: postalCode || null,
        incoterm: incoterm || null,
        notes: notes || null,
      };
      const res: any = await tradingService.createDraftOrder(payload);
      clear();
      if (Array.isArray(res?.ids) && res.ids.length > 1) {
        const idsParam = encodeURIComponent(res.ids.join(','));
        router.push(`/dashboard/orders/combined?ids=${idsParam}&created=1`);
        return;
      }
      if (res?.id) {
        router.push(`/dashboard/orders/${res.id}?created=1`);
      } else {
        router.push('/dashboard/orders?created=1');
      }
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Failed to create draft order');
    } finally {
      setSaving(false);
    }
  };

  return (
    <RoleGuard allowedRoles={[Role.BUYER]}>
      <div className="py-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">Cart</h1>
        {err && <div className="mb-3 text-sm text-red-600">{err}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {items.length === 0 ? (
              <div className="text-sm text-gray-600">Your cart is empty.</div>
            ) : (
              items.map((it) => (
                <div key={it.productId} className="border rounded-lg p-3 bg-white">
                  <div className="flex items-start gap-3">
                    {it.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.imageUrl} alt={it.name} className="h-16 w-16 rounded object-cover" />
                    ) : (
                      <div className="h-16 w-16 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs">No Image</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{it.name}</div>
                      <div className="text-xs text-gray-600">{it.currency || '-'} {it.unitPriceEstimate != null ? (it.currency === 'USD' ? `$ ${it.unitPriceEstimate.toLocaleString('en-US')}` : `Rp ${it.unitPriceEstimate.toLocaleString('id-ID')}`) : '-'} / {it.unit}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <label className="text-xs text-gray-600">Qty</label>
                        <input type="number" min={1} value={it.quantity} onChange={(e)=>updateQty(it.productId, Number(e.target.value))} className="border rounded px-2 py-1 text-sm w-20 text-gray-800" />
                        <button onClick={()=>removeItem(it.productId)} className="text-xs text-red-700 hover:underline ml-auto">Remove</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div>
            <div className="border rounded-xl bg-white p-4">
              <div className="text-sm font-semibold text-gray-900 mb-2">Destination</div>
              <div className="space-y-2">
                <div>
                  <select value={destinationCountry} onChange={(e)=>setDestinationCountry(e.target.value)} className={`w-full border rounded px-3 py-2 text-sm text-gray-800 ${touched.country && !destinationCountry ? 'border-red-400' : ''}`} onBlur={()=>setTouched(prev=>({...prev,country:true}))}>
                    <option value="">Select Country</option>
                    {countries.map(c => (<option key={c} value={c}>{c}</option>))}
                  </select>
                  {touched.country && !destinationCountry && (<div className="text-[11px] text-red-600 mt-1">Country is required</div>)}
                </div>
                <input value={destinationState} onChange={(e)=>setDestinationState(e.target.value)} placeholder="State/Province (optional)" className="w-full border rounded px-3 py-2 text-sm text-gray-800" />
                <div>
                  <input value={destinationCity} onChange={(e)=>setDestinationCity(e.target.value)} onBlur={()=>setTouched(prev=>({...prev,city:true}))} placeholder="City" className={`w-full border rounded px-3 py-2 text-sm text-gray-800 ${touched.city && !destinationCity ? 'border-red-400' : ''}`} />
                  {touched.city && !destinationCity && (<div className="text-[11px] text-red-600 mt-1">City is required</div>)}
                </div>
                <div>
                  <input value={addressLine} onChange={(e)=>setAddressLine(e.target.value)} onBlur={()=>setTouched(prev=>({...prev,address:true}))} placeholder="Address" className={`w-full border rounded px-3 py-2 text-sm text-gray-800 ${touched.address && !addressLine ? 'border-red-400' : ''}`} />
                  {touched.address && !addressLine && (<div className="text-[11px] text-red-600 mt-1">Address is required</div>)}
                </div>
                <input value={postalCode} onChange={(e)=>setPostalCode(e.target.value)} placeholder="Postal Code" className="w-full border rounded px-3 py-2 text-sm text-gray-800" />
                <input value={incoterm} onChange={(e)=>setIncoterm(e.target.value)} placeholder="Incoterm (optional)" className="w-full border rounded px-3 py-2 text-sm text-gray-800" />
                <textarea value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Notes (optional)" className="w-full border rounded px-3 py-2 text-sm text-gray-800" rows={3} />
              </div>

              <div className="mt-4 text-sm text-gray-800 space-y-1">
                {Object.keys(totalByCurrency).length === 0 ? (
                  <div className="text-xs text-gray-500">No estimated totals</div>
                ) : (
                  Object.entries(totalByCurrency).map(([cur, val]) => (
                    <div key={cur} className="flex items-center justify-between">
                      <span>{cur} Estimated Total</span>
                      <span className="font-semibold">{cur === 'USD' ? `$ ${val.toLocaleString('en-US')}` : `Rp ${val.toLocaleString('id-ID')}`}</span>
                    </div>
                  ))
                )}
              </div>

              <button onClick={handleCheckout} disabled={saving || items.length===0} className="mt-4 w-full px-4 py-2 rounded bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60 text-sm">
                {saving ? 'Creating Draft...' : 'Checkout'}
              </button>
              <div className="mt-2 text-[11px] text-gray-600">Prices shown are estimates based on origin country. Final pricing will be adjusted by admin for the destination country.</div>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
