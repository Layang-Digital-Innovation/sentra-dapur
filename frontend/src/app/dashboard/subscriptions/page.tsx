"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import RoleGuard from '@/components/auth/RoleGuard';
import { Role } from '@/types/user.types';
import { subscriptionService } from '@/services/subscription.service';
import { FiPlus, FiCreditCard, FiTag, FiLayers, FiCheck, FiAlertTriangle, FiSearch } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useAuth } from '@/contexts/AuthContext';

interface SubscriptionItem {
  id: string;
  dapurUnitId: string;
  plan: string;
  status: string;
  dapurUnit?: {
    id: string;
    name: string;
    location?: string | null;
    projectOwner?: {
      id: string;
      email: string;
      fullname?: string;
      role: string;
    };
    adminDapur?: { id: string; email: string; fullname?: string };
  };
  startedAt?: string;
  currentPeriodEnd?: string;
  trialEndsAt?: string;
  expiresAt?: string;
}

export default function SubscriptionsAdminPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isSuperAdmin = user?.user?.role === 'SUPER_ADMIN';
  const [loading, setLoading] = useState(false);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);

  // Subscribe state
  const [selectedDapurUnitIds, setSelectedDapurUnitIds] = useState<string[]>([]);
  const [price, setPrice] = useState<number>(0);
  const [currency, setCurrency] = useState('IDR');
  const [period, setPeriod] = useState<'MONTHLY' | 'YEARLY' | 'TWO_YEARS'>('MONTHLY');

  const [dapurRows, setDapurRows] = useState<any[]>([]);
  const [dapurSearch, setDapurSearch] = useState('');
  const [loadingDapurs, setLoadingDapurs] = useState(false);

  // Subscriptions table controls
  const [subsSearch, setSubsSearch] = useState('');
  const [subsPlanFilter, setSubsPlanFilter] = useState<string>('');
  const [subsPage, setSubsPage] = useState(1);
  const [subsPageSize, setSubsPageSize] = useState(10);

  useEffect(() => {
    if (!isSuperAdmin) return;
    const loadData = async () => {
      setLoading(true);
      try {
        const subsRes = await subscriptionService.getAllSubscriptions();
        setSubscriptions(subsRes || []);
      } catch (error: any) {
        toast.error('Gagal memuat data langganan');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [isSuperAdmin]);

  useEffect(() => {
    const loadDapurs = async () => {
      if (!showSubscribeModal) return;
      setLoadingDapurs(true);
      try {
        const rows = await subscriptionService.getAllDapurUnits();
        setDapurRows(rows || []);
      } catch (e: any) {
        setDapurRows([]);
      } finally {
        setLoadingDapurs(false);
      }
    };
    loadDapurs();
  }, [showSubscribeModal]);

  const handleSubscribe = async () => {
    if (selectedDapurUnitIds.length === 0) {
      toast.warn('Pilih minimal satu unit dapur');
      return;
    }
    setLoading(true);
    try {
      await subscriptionService.subscribeDapurUnits({
        dapurUnitIds: selectedDapurUnitIds,
        price,
        currency,
        period,
      });
      toast.success(`Berhasil membuat tagihan langganan untuk ${selectedDapurUnitIds.length} unit dapur.`);
      setShowSubscribeModal(false);
      const subsRes = await subscriptionService.getAllSubscriptions();
      setSubscriptions(subsRes || []);
    } catch (error: any) {
      toast.error('Gagal melakukan subscribe');
    } finally {
      setLoading(false);
    }
  };

  const formatPlanLabel = (val: string) => {
    const map: Record<string, string> = {
      GOLD_MONTHLY: 'Gold 1 Bulan',
      GOLD_YEARLY: 'Gold 1 Tahun',
      GOLD_TWO_YEARS: 'Gold 2 Tahun',
      ENTERPRISE_CUSTOM: 'Kustom Enterprise',
      TRIAL: 'Trial',
    };
    return map[val] || val;
  };

  const getEndStr = (s: SubscriptionItem) => s.status === 'TRIAL' ? (s.trialEndsAt || s.expiresAt) : (s.currentPeriodEnd || s.expiresAt);
  const isExpiredSub = (s: SubscriptionItem) => {
    const endStr = getEndStr(s);
    if (!endStr) return false;
    return new Date(endStr).getTime() < Date.now();
  };

  const subscriptionStats = useMemo(() => {
    const total = subscriptions.length;
    const active = subscriptions.filter(s => s.status === 'ACTIVE' && !isExpiredSub(s)).length;
    const expired = subscriptions.filter(s => isExpiredSub(s)).length;
    return { total, active, expired };
  }, [subscriptions]);

  const filteredDapurRows = useMemo(() => {
    const q = dapurSearch.trim().toLowerCase();
    if (!q) return dapurRows;
    return dapurRows.filter((row) => (
      (row.name || '').toLowerCase().includes(q) ||
      (row.projectOwner?.fullname || '').toLowerCase().includes(q) ||
      (row.projectOwner?.email || '').toLowerCase().includes(q)
    ));
  }, [dapurRows, dapurSearch]);

  const filteredSubscriptions = useMemo(() => {
    const q = subsSearch.trim().toLowerCase();
    return subscriptions.filter((s) => {
      const byPlan = subsPlanFilter ? s.plan === subsPlanFilter : true;
      const byQuery = !q ? true : (
        (s.dapurUnit?.name?.toLowerCase().includes(q)) ||
        (s.dapurUnit?.projectOwner?.email?.toLowerCase().includes(q)) ||
        (s.status?.toLowerCase().includes(q))
      );
      return byPlan && byQuery;
    });
  }, [subscriptions, subsSearch, subsPlanFilter]);

  const pagedSubscriptions = filteredSubscriptions.slice((subsPage - 1) * subsPageSize, subsPage * subsPageSize);

  return (
    <RoleGuard allowedRoles={[Role.SUPER_ADMIN]}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-black">Manajemen Langganan</h1>
          <button 
            onClick={() => { setSelectedDapurUnitIds([]); setShowSubscribeModal(true); }}
            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded flex items-center shadow-sm transition"
          >
            <FiPlus className="mr-2" /> Langganan Unit Dapur
          </button>
        </div>

        {/* Statistik */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center text-blue-600 mb-1"><FiLayers className="mr-2" /> Total Langganan</div>
            <div className="text-3xl font-bold text-gray-900">{subscriptionStats.total}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center text-green-600 mb-1"><FiCheck className="mr-2" /> Aktif</div>
            <div className="text-3xl font-bold text-gray-900">{subscriptionStats.active}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center text-red-600 mb-1"><FiAlertTriangle className="mr-2" /> Kadaluarsa</div>
            <div className="text-3xl font-bold text-gray-900">{subscriptionStats.expired}</div>
          </div>
        </div>

        {/* Daftar Langganan */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <FiCreditCard className="mr-2 text-gray-500" /> Daftar Langganan Unit
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  value={subsSearch} 
                  onChange={(e) => setSubsSearch(e.target.value)} 
                  placeholder="Cari dapur atau pemilik..." 
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none w-64"
                />
              </div>
              <select 
                value={subsPlanFilter} 
                onChange={(e) => setSubsPlanFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
              >
                <option value="">Semua Paket</option>
                <option value="GOLD_MONTHLY">Gold Bulanan</option>
                <option value="GOLD_YEARLY">Gold Tahunan</option>
                <option value="TRIAL">Trial</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-left border-b border-gray-100">
                  <th className="pb-3 font-semibold text-gray-700 text-sm">Unit Dapur / Pemilik</th>
                  <th className="pb-3 font-semibold text-gray-700 text-sm">Paket</th>
                  <th className="pb-3 font-semibold text-gray-700 text-sm">Status</th>
                  <th className="pb-3 font-semibold text-gray-700 text-sm">Berakhir Pada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pagedSubscriptions.length === 0 ? (
                  <tr><td colSpan={4} className="py-10 text-center text-gray-500">Tidak ada data langganan</td></tr>
                ) : (
                  pagedSubscriptions.map((s) => {
                    const expired = isExpiredSub(s);
                    return (
                      <tr key={s.id} className="hover:bg-gray-50/50 transition">
                        <td className="py-4">
                          <div className="font-medium text-gray-900">{s.dapurUnit?.name || '—'}</div>
                          <div className="text-xs text-gray-500">{s.dapurUnit?.projectOwner?.fullname || s.dapurUnit?.projectOwner?.email}</div>
                        </td>
                        <td className="py-4">
                          <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">
                            {formatPlanLabel(s.plan)}
                          </span>
                        </td>
                        <td className="py-4">
                          <span className={`px-2 py-1 rounded-md text-xs font-medium border ${
                            expired ? 'bg-red-50 text-red-700 border-red-100' : 
                            s.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-100' : 
                            'bg-gray-50 text-gray-600 border-gray-100'
                          }`}>
                            {expired ? 'KADALUARSA' : s.status === 'ACTIVE' ? 'AKTIF' : s.status}
                          </span>
                        </td>
                        <td className="py-4 text-sm text-gray-600">
                          {getEndStr(s) ? new Date(getEndStr(s)!).toLocaleDateString('id-ID') : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Subscribe */}
        {showSubscribeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Langganan Unit Dapur</h3>
                <button onClick={() => setShowSubscribeModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cari Unit Dapur</label>
                    <div className="relative">
                      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        value={dapurSearch} 
                        onChange={(e) => setDapurSearch(e.target.value)}
                        placeholder="Nama dapur atau email pemilik..."
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Periode</label>
                    <select 
                      value={period} 
                      onChange={(e) => setPeriod(e.target.value as any)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
                    >
                      <option value="MONTHLY">1 Bulan</option>
                      <option value="YEARLY">1 Tahun</option>
                      <option value="TWO_YEARS">2 Tahun</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Harga (IDR)</label>
                    <input 
                      type="number" 
                      value={price} 
                      onChange={(e) => setPrice(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mata Uang</label>
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
                      <option value="IDR">IDR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-gray-100 rounded-xl overflow-hidden flex flex-col">
                    <div className="bg-gray-50 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Pilih Unit Dapur</div>
                    <div className="overflow-y-auto h-64">
                      {loadingDapurs ? (
                        <div className="p-10 text-center text-sm text-gray-400">Memuat data...</div>
                      ) : filteredDapurRows.length === 0 ? (
                        <div className="p-10 text-center text-sm text-gray-400">Tidak ada unit dapur ditemukan</div>
                      ) : (
                        <table className="min-w-full text-sm">
                          <tbody className="divide-y divide-gray-50">
                            {filteredDapurRows.map((du) => {
                              const isSelected = selectedDapurUnitIds.includes(du.id);
                              return (
                                <tr key={du.id} className={`hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-blue-50/30' : ''}`} onClick={() => {
                                  if (isSelected) setSelectedDapurUnitIds(prev => prev.filter(id => id !== du.id));
                                  else setSelectedDapurUnitIds(prev => [...prev, du.id]);
                                }}>
                                  <td className="p-3 w-10">
                                    <input type="checkbox" checked={isSelected} readOnly className="rounded border-gray-300 text-slate-900 focus:ring-slate-900" />
                                  </td>
                                  <td className="p-3">
                                    <div className="font-medium text-gray-900">{du.name}</div>
                                    <div className="text-xs text-gray-500">{du.projectOwner?.email}</div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  <div className="border border-gray-100 rounded-xl overflow-hidden flex flex-col">
                    <div className="bg-gray-50 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Unit Dipilih ({selectedDapurUnitIds.length})</div>
                    <div className="overflow-y-auto h-64 p-3">
                      {selectedDapurUnitIds.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-sm text-gray-400">Belum ada unit dipilih</div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {selectedDapurUnitIds.map(id => {
                            const du = dapurRows.find(d => d.id === id);
                            return (
                              <span key={id} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                {du?.name || id}
                                <button onClick={(e) => { e.stopPropagation(); setSelectedDapurUnitIds(prev => prev.filter(x => x !== id)); }} className="ml-1.5 text-slate-400 hover:text-slate-600">✕</button>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="p-4 bg-gray-50 border-t border-gray-100">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Total Tagihan:</span>
                        <span className="font-bold text-gray-900 text-lg">
                          {currency} {(price * selectedDapurUnitIds.length).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-4 flex items-start">
                  <FiAlertTriangle className="text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    <strong>Informasi:</strong> Metode pembayaran yang digunakan adalah <strong>Transfer Manual</strong>. 
                    Setelah klik tombol Subscribe, sistem akan membuat tagihan (invoice) untuk setiap unit dapur yang dipilih. 
                    Admin perlu melakukan konfirmasi pembayaran secara manual untuk mengaktifkan fitur premium pada unit tersebut.
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t flex items-center justify-end gap-3 bg-gray-50 rounded-b-2xl">
                <button onClick={() => setShowSubscribeModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">Batal</button>
                <button 
                  onClick={handleSubscribe} 
                  disabled={loading || selectedDapurUnitIds.length === 0}
                  className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-sm transition"
                >
                  {loading ? 'Memproses...' : 'Subscribe Sekarang'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
