"use client";

import React, { useEffect, useMemo, useState } from "react";
import { subscriptionService } from "@/services/subscription.service";
import { FiCreditCard, FiRefreshCw, FiAlertTriangle } from "react-icons/fi";
import { useRouter } from "next/navigation";

export default function SubscriptionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState<any | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const groupedPlans = useMemo(() => {
    const map = new Map<string, { key: string; plan: string; period: string; usd?: any; idr?: any }>();
    (plans || []).forEach((p: any) => {
      const key = `${p.plan}-${p.period}`;
      if (!map.has(key)) map.set(key, { key, plan: p.plan, period: p.period });
      const entry = map.get(key)!;
      const cur = String(p.currency || '').toUpperCase();
      if (cur === 'USD') entry.usd = p;
      if (cur === 'IDR') entry.idr = p;
    });
    return Array.from(map.values());
  }, [plans]);
  const [selectedCurrencyByGroup, setSelectedCurrencyByGroup] = useState<Record<string, 'IDR'|'USD'>>({});
  const [startingTrial, setStartingTrial] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  const goldPlan = useMemo(() => {
    const idr = plans.find((p: any) => p.plan === 'GOLD_MONTHLY' && p.currency === 'IDR');
    const usd = plans.find((p: any) => p.plan === 'GOLD_MONTHLY' && p.currency === 'USD');
    return idr || usd || plans.find((p: any) => p.plan === 'GOLD_MONTHLY');
  }, [plans]);
  const paypalNeedsConfig = useMemo(() => {
    return goldPlan?.currency === 'USD' && !goldPlan?.providerPlanId;
  }, [goldPlan]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [mySub, myPays, planList] = await Promise.all([
          subscriptionService.getMySubscription(),
          subscriptionService.getMyPayments(),
          subscriptionService.getSubscriptionPlans(),
        ]);
        setSub(mySub || null);
        setPayments(Array.isArray(myPays) ? myPays : (myPays?.items || []));
        setPlans(planList || []);
      } catch (e: any) {
        setError(e?.response?.data?.message || "Gagal memuat data subscription");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const endStr = useMemo(() => {
    const d = sub?.status === "TRIAL" ? (sub?.trialEndsAt || sub?.expiresAt) : (sub?.currentPeriodEnd || sub?.expiresAt);
    return d ? new Date(d).toLocaleString() : "-";
  }, [sub]);

  const isExpired = useMemo(() => {
    const d = sub?.status === "TRIAL" ? (sub?.trialEndsAt || sub?.expiresAt) : (sub?.currentPeriodEnd || sub?.expiresAt);
    return d ? new Date(d).getTime() < Date.now() : false;
  }, [sub]);

  // Derive displayed status from period end to avoid confusing mismatch
  const displayedStatus = useMemo(() => {
    if (isExpired) return 'EXPIRED';
    const s = sub?.status || 'TRIAL';
    // If backend status is EXPIRED but period end is in the future, show ACTIVE
    if (s === 'EXPIRED') return 'ACTIVE';
    return s;
  }, [isExpired, sub]);

  const labelName = useMemo(() => {
    const direct = sub?.label?.name;
    if (direct && typeof direct === 'string' && direct.trim()) return direct;
    const fromUser = sub?.user?.labelInvestors?.[0]?.label?.name;
    if (fromUser && typeof fromUser === 'string' && fromUser.trim()) return fromUser;
    const fromPaymentMeta = (payments || []).find((p: any) => p?.metadata?.labelName)?.metadata?.labelName;
    if (fromPaymentMeta && typeof fromPaymentMeta === 'string' && fromPaymentMeta.trim()) return fromPaymentMeta;
    return '';
  }, [sub, payments]);

  const handleRenewGold = async () => {
    setBuying(true);
    setError(null);
    try {
      // Prefer IDR plan to use Xendit; fallback to USD (PayPal) which requires billingPlanId
      const goldIdr = plans.find((p: any) => p.plan === 'GOLD_MONTHLY' && p.currency === 'IDR');
      const goldUsd = plans.find((p: any) => p.plan === 'GOLD_MONTHLY' && p.currency === 'USD');
      const goldMonthly = goldIdr || goldUsd || plans.find((p: any) => p.plan === 'GOLD_MONTHLY');
      const price = goldMonthly?.price;
      const currency = (goldMonthly?.currency as 'IDR'|'USD') || 'IDR';
      if (typeof price !== 'number' || price <= 0) {
        setError('Harga plan belum dikonfigurasi. Hubungi admin.');
        setBuying(false);
        return;
      }
      const provider = currency === 'USD' ? 'paypal' : 'xendit';
      const payload: any = {
        type: "subscription",
        plan: "GOLD_MONTHLY",
        price,
        currency,
        provider,
      };
      if (provider === 'paypal') {
        const billingPlanId = goldMonthly?.providerPlanId;
        if (!billingPlanId) {
          setError('Billing plan PayPal belum dikonfigurasi. Hubungi admin.');
          setBuying(false);
          return;
        }
        payload.billingPlanId = billingPlanId;
      }
      const res = await subscriptionService.checkout(payload);
      const url = (res && (res.paymentLink || res.approval_url)) as string | undefined;
      if (url) {
        window.location.href = url;
      } else {
        setError("Gagal mendapatkan link pembayaran.");
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || "Gagal memulai pembayaran");
    } finally {
      setBuying(false);
    }
  };

  const handleCheckoutPlan = async (planItem: any) => {
    setProcessingPlanId(planItem?.id || planItem?.providerPlanId || planItem?.plan || '');
    setError(null);
    try {
      const price = planItem?.price;
      const currency = (planItem?.currency as 'IDR'|'USD') || 'IDR';
      if (typeof price !== 'number' || price <= 0) {
        setError('Harga plan belum dikonfigurasi. Hubungi admin.');
        setProcessingPlanId(null);
        return;
      }
      const provider = currency === 'USD' ? 'paypal' : 'xendit';
      const payload: any = {
        type: 'subscription',
        plan: planItem?.plan,
        price,
        currency,
        provider,
      };
      if (provider === 'paypal') {
        const billingPlanId = planItem?.providerPlanId;
        if (!billingPlanId) {
          setError('Billing plan PayPal belum dikonfigurasi. Hubungi admin.');
          setProcessingPlanId(null);
          return;
        }
        payload.billingPlanId = billingPlanId;
      }
      const res = await subscriptionService.checkout(payload);
      const url = (res && (res.paymentLink || res.approval_url)) as string | undefined;
      if (url) {
        window.location.href = url;
      } else {
        setError('Gagal mendapatkan link pembayaran.');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Gagal memulai pembayaran');
    } finally {
      setProcessingPlanId(null);
    }
  };

  const handleStartTrial = async () => {
    setStartingTrial(true);
    setError(null);
    try {
      await subscriptionService.startTrial();
      // reload subscription and payments
      const [mySub, myPays] = await Promise.all([
        subscriptionService.getMySubscription(),
        subscriptionService.getMyPayments(),
      ]);
      setSub(mySub || null);
      setPayments(Array.isArray(myPays) ? myPays : (myPays?.items || []));
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Gagal memulai trial');
    } finally {
      setStartingTrial(false);
    }
  };

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black flex items-center"><FiCreditCard className="mr-2" /> Subscription</h1>
      </div>

      {loading ? (
        <div className="p-6 bg-white rounded-lg shadow text-gray-700">Memuat...</div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded">{error}</div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Status</div>
                <div className="text-lg font-semibold text-black flex items-center gap-2">
                  <span>{displayedStatus}</span>
                  {isExpired && (
                    <span className="inline-block text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">Expired</span>
                  )}
                </div>
              </div>
              {isExpired && (
                <div className="flex items-center text-red-600 text-sm"><FiAlertTriangle className="mr-2"/> Akses berakhir. Silahkan perpanjang.</div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm">
              <div>
                <div className="text-gray-600">Plan</div>
                <div className="text-black font-medium">{sub?.plan || 'TRIAL'}</div>
              </div>
              <div>
                <div className="text-gray-600">Label/Organisasi</div>
                <div className="text-black font-medium">{labelName || '-'}</div>
              </div>
              <div>
                <div className="text-gray-600">Period End</div>
                <div className="text-black font-medium">{endStr}</div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {sub?.plan === 'ENTERPRISE_CUSTOM' ? (
                <button onClick={()=>router.push('/support')} className="px-4 py-2 rounded border hover:bg-slate-50 text-amber-600">Hubungi admin</button>
              ) : (
                <>
                  {(!sub) && (
                    <button onClick={handleStartTrial} disabled={startingTrial} className="px-4 py-2 rounded border hover:bg-gray-50 text-gray-800">
                      {startingTrial ? 'Memulai Trial...' : 'Mulai Trial 7 Hari'}
                    </button>
                  )}
                  <button onClick={() => setPlanModalOpen(true)} disabled={buying} className="inline-flex items-center px-4 py-2 rounded bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60">
                    <FiRefreshCw className="mr-2"/> {buying ? 'Memproses...' : 'Subscribe'}
                  </button>
                  {goldPlan && (
                    <div className="text-xs text-gray-600 self-center">
                      Harga: {typeof goldPlan.price === 'number' ? goldPlan.price.toLocaleString() : goldPlan.price} {goldPlan.currency || ''}
                    </div>
                  )}
                  {paypalNeedsConfig && (
                    <div className="text-xs text-red-600 w-full">Billing plan PayPal belum dikonfigurasi. Hubungi admin untuk melengkapi konfigurasi.</div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-lg font-semibold text-black mb-3">Riwayat Pembayaran</div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="p-2 text-black">Tanggal</th>
                    <th className="p-2 text-black">Deskripsi</th>
                    <th className="p-2 text-black">Provider</th>
                    <th className="p-2 text-black">Jumlah</th>
                    <th className="p-2 text-black">Status</th>
                    <th className="p-2 text-black">Invoice/Link</th>
                  </tr>
                </thead>
                <tbody>
                  {(!payments || payments.length === 0) ? (
                    <tr><td colSpan={6} className="p-4 text-center text-gray-600">Tidak ada riwayat pembayaran</td></tr>
                  ) : payments.map((p: any) => (
                    <tr key={p.id} className="border-t">
                      <td className="p-2 text-black">{p.createdAt ? new Date(p.createdAt).toLocaleString() : '-'}</td>
                      <td className="p-2 text-black">{p.description || '-'}</td>
                      <td className="p-2 text-black">{p.provider || '-'}</td>
                      <td className="p-2 text-black">{typeof p.amount === 'number' ? p.amount.toLocaleString() : p.amount} {p.currency || ''}</td>
                      <td className="p-2 text-black">{p.status}</td>
                      <td className="p-2 text-black">
                        {p.invoiceNumber ? <span className="inline-block text-xs bg-gray-100 text-gray-800 rounded px-2 py-1 mr-2">{p.invoiceNumber}</span> : null}
                        {p.paymentLink ? <a href={p.paymentLink} target="_blank" rel="noreferrer" className="text-amber-600 hover:underline">Buka</a> : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
    {planModalOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => setPlanModalOpen(false)}>
        <div className="bg-white rounded-xl max-w-lg w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-black">Pilih Billing Plan</h3>
            <p className="text-sm text-gray-600 mt-1">Silakan pilih paket berlangganan yang tersedia.</p>
          </div>
          <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
            {groupedPlans && groupedPlans.length > 0 ? (
              groupedPlans.map((g: any) => {
                const key = g.key;
                const hasIDR = !!g.idr;
                const hasUSD = !!g.usd;
                const selected = selectedCurrencyByGroup[key] || (hasIDR ? 'IDR' : 'USD');
                const activePlan = selected === 'USD' ? g.usd : g.idr;
                return (
                  <div key={key} className="flex items-center justify-between border rounded-lg p-3">
                    <div>
                      <div className="text-sm font-medium text-black">{activePlan?.name || g.plan}</div>
                      <div className="text-xs text-gray-500">{(g.period || '').toLowerCase()} • {(activePlan?.provider || '-')} • {(activePlan?.status || '-')}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-yellow-50 text-amber-800 border border-amber-200">{hasIDR ? `IDR ${typeof g.idr?.price==='number'?g.idr.price.toLocaleString():g.idr?.price}` : 'IDR -'}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">{hasUSD ? `USD ${typeof g.usd?.price==='number'?g.usd.price.toLocaleString():g.usd?.price}` : 'USD -'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-black">{activePlan ? (typeof activePlan.price === 'number' ? activePlan.price.toLocaleString() : activePlan.price) : '-'} {selected}</div>
                      {hasIDR && hasUSD ? (
                        <div className="relative w-28 h-8 bg-gray-100 rounded-full p-0.5 mx-auto mt-2">
                          <div className={`absolute top-0.5 bottom-0.5 w-1/2 rounded-full bg-white shadow transition-transform ${selected==='USD' ? 'translate-x-full' : ''}`}></div>
                          <div className="relative z-10 grid grid-cols-2 text-center text-xs h-full">
                            <button type="button" className={`z-10 ${selected==='IDR' ? 'text-gray-900' : 'text-gray-500'}`} onClick={() => setSelectedCurrencyByGroup(prev => ({...prev, [key]: 'IDR'}))}>IDR</button>
                            <button type="button" className={`z-10 ${selected==='USD' ? 'text-gray-900' : 'text-gray-500'}`} onClick={() => setSelectedCurrencyByGroup(prev => ({...prev, [key]: 'USD'}))}>USD</button>
                          </div>
                        </div>
                      ) : (
                        <div className={`px-3 py-1 rounded-full border text-xs mt-2 ${hasIDR ? 'bg-yellow-50 border-amber-200 text-amber-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>{selected}</div>
                      )}
                      <button onClick={() => handleCheckoutPlan(activePlan)} disabled={!!processingPlanId || !activePlan} className="mt-2 px-3 py-1.5 rounded bg-slate-900 text-white text-xs hover:bg-slate-800 disabled:opacity-60">
                        {processingPlanId ? 'Memproses...' : 'Pilih'}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-sm text-gray-600">Belum ada billing plan yang tersedia.</div>
            )}
          </div>
          <div className="px-6 pb-6 flex items-center justify-end gap-3">
            <button onClick={() => setPlanModalOpen(false)} className="px-4 py-2 rounded border text-gray-700 hover:bg-gray-50">Tutup</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
