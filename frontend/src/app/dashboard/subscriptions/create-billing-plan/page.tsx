"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import RoleGuard from '@/components/auth/RoleGuard';
import { Role } from '@/types/user.types';
import { subscriptionService } from '@/services/subscription.service';
import { FiTag, FiCreditCard, FiDollarSign, FiRefreshCcw, FiCheck, FiAlertTriangle } from 'react-icons/fi';
import { toast } from 'react-toastify';

export default function CreateBillingPlanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [providerUsd, setProviderUsd] = useState<boolean>(true);
  const [providerIdr, setProviderIdr] = useState<boolean>(true);
  const [plan, setPlan] = useState<'GOLD_MONTHLY' | 'GOLD_YEARLY' | 'ENTERPRISE_CUSTOM'>('GOLD_MONTHLY');
  const [priceUSD, setPriceUSD] = useState<number>(0);
  const [priceIDR, setPriceIDR] = useState<number>(0);
  const [period, setPeriod] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [name, setName] = useState<string>('');

  const handleSubmit = async () => {
    if (plan === 'ENTERPRISE_CUSTOM') {
      toast.info('Plan ENTERPRISE_CUSTOM menggunakan harga kustom melalui Bulk Subscribe Label, bukan billing plan.');
      return;
    }
    if (!providerUsd && !providerIdr) {
      toast.warn('Pilih setidaknya satu provider (PayPal atau Xendit)');
      return;
    }
    if (providerUsd && priceUSD <= 0 && !(providerIdr && priceIDR > 0)) {
      toast.warn('Isi harga USD yang valid atau nonaktifkan PayPal');
      return;
    }
    if (providerIdr && priceIDR <= 0 && !(providerUsd && priceUSD > 0)) {
      toast.warn('Isi harga IDR yang valid atau nonaktifkan Xendit');
      return;
    }

    setLoading(true);
    try {
      // Create USD (PayPal)
      if (providerUsd && priceUSD > 0) {
        const resUSD = await subscriptionService.createBillingPlan({ provider: 'PAYPAL', currency: 'USD', plan, price: priceUSD, period, name: name || undefined });
        toast.success(`Billing plan USD dibuat: ${resUSD?.name || plan}`);
      }
      // Create IDR (Xendit or stored plan)
      if (providerIdr && priceIDR > 0) {
        try {
          const resIDR = await subscriptionService.createBillingPlan({ provider: 'XENDIT', currency: 'IDR', plan, price: priceIDR, period, name: name || undefined });
          toast.success(`Billing plan IDR dibuat: ${resIDR?.name || plan}`);
        } catch (e:any) {
          // Fallback without provider if backend does not accept XENDIT on create
          const resIDR2 = await subscriptionService.createBillingPlan({ currency: 'IDR', plan, price: priceIDR, period, name: name || undefined } as any);
          toast.success(`Billing plan IDR dibuat: ${resIDR2?.name || plan}`);
        }
      }
      router.push('/dashboard/subscriptions');
    } catch (error: any) {
      console.error('Create billing plan error:', error);
      toast.error(error?.response?.data?.message || 'Gagal membuat billing plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleGuard allowedRoles={[Role.SUPER_ADMIN]}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-black">Create Billing Plan</h1>
          <button onClick={() => router.push('/dashboard/subscriptions')} className="text-blue-600 hover:underline">Kembali ke Subscriptions</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Plan and Provider */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-lg font-semibold text-gray-900 mb-4">Plan & Provider</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                  <select
                    value={plan}
                    onChange={(e) => setPlan(e.target.value as any)}
                    className="border rounded px-3 py-2 w-full text-gray-900"
                  >
                    <option value="GOLD_MONTHLY">Gold Monthly</option>
                    <option value="GOLD_YEARLY">Gold Yearly</option>
                    <option value="ENTERPRISE_CUSTOM">Enterprise Custom (use Bulk)</option>
                  </select>
                  {plan === 'ENTERPRISE_CUSTOM' && (
                    <p className="mt-2 text-xs text-yellow-700 bg-yellow-50 p-2 rounded">Enterprise Custom dikelola via Bulk Subscribe pada halaman Subscriptions, bukan di sini.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Providers</label>
                  <div className="flex items-center space-x-4 text-gray-900">
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" checked={providerUsd} onChange={(e) => setProviderUsd(e.target.checked)} />
                      <span>PayPal (USD)</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" checked={providerIdr} onChange={(e) => setProviderIdr(e.target.checked)} />
                      <span>Xendit (IDR)</span>
                    </label>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Centang provider yang ingin dibuat. PayPal untuk USD, Xendit untuk IDR.</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-lg font-semibold text-gray-900 mb-4">Pricing (Dual Currency)</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (USD • PayPal)</label>
                  <div className="flex items-center border rounded px-3 py-2 text-gray-700">
                    <FiDollarSign className="mr-2 text-gray-500" />
                    <input
                      type="number"
                      value={priceUSD}
                      onChange={(e) => setPriceUSD(parseFloat(e.target.value) || 0)}
                      className="w-full outline-none text-gray-900"
                      min={0}
                      step={0.01}
                      placeholder="e.g. 10"
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Dibuat sebagai Billing Plan PayPal (USD).</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (IDR • Xendit)</label>
                  <div className="flex items-center border rounded px-3 py-2 text-gray-700">
                    <FiDollarSign className="mr-2 text-gray-500" />
                    <input
                      type="number"
                      value={priceIDR}
                      onChange={(e) => setPriceIDR(parseFloat(e.target.value) || 0)}
                      className="w-full outline-none text-gray-900"
                      min={0}
                      step={1000}
                      placeholder="e.g. 150000"
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Dibuat sebagai plan IDR untuk Xendit/invoice.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as any)}
                    className="border rounded px-3 py-2 w-full text-gray-900"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom Name (opsional)</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 p-2 border rounded w-full text-gray-900"
                    placeholder={`Misal: Sentra Dapur GOLD - ${period === 'MONTHLY' ? 'Bulanan' : 'Tahunan'}`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Summary & Actions */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-lg font-semibold text-gray-900 mb-2">Ringkasan</div>
              <div className="text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Plan</span>
                  <span className="font-semibold text-gray-900">{plan}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Providers</span>
                  <div className="flex items-center gap-2">
                    {providerUsd && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200">PayPal (USD)</span>
                    )}
                    {providerIdr && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-50 text-amber-800 border border-amber-200">Xendit (IDR)</span>
                    )}
                    {!providerUsd && !providerIdr && <span className="text-gray-400">-</span>}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Price USD</span>
                  <span className="font-semibold text-gray-900">{providerUsd && priceUSD > 0 ? `$ ${priceUSD.toLocaleString('en-US')}` : '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Price IDR</span>
                  <span className="font-semibold text-gray-900">{providerIdr && priceIDR > 0 ? `Rp ${priceIDR.toLocaleString('id-ID')}` : '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Period</span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700 border">{period}</span>
                </div>
                {!!name && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Name</span>
                    <span className="font-medium text-gray-900 truncate max-w-[60%]" title={name}>{name}</span>
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-center space-x-3">
                <button
                  onClick={handleSubmit}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center"
                  disabled={loading || plan === 'ENTERPRISE_CUSTOM'}
                  title={plan === 'ENTERPRISE_CUSTOM' ? 'Gunakan Bulk Subscribe untuk Enterprise Custom' : 'Create Billing Plan'}
                >
                  {loading ? <FiRefreshCcw className="mr-2 animate-spin" /> : <FiCheck className="mr-2" />} Create
                </button>
                <button
                  onClick={() => router.push('/dashboard/subscriptions')}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-900 px-4 py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4 text-sm text-amber-800">
              <div className="flex items-center font-medium mb-1"><FiAlertTriangle className="mr-2" /> Catatan</div>
              <div>
                - Plan <b>TRIAL</b> tidak perlu dibuat di sini; trial dibuat otomatis oleh sistem untuk user eligible.
              </div>
              <div>
                - <b>Enterprise Custom</b> dikelola via Bulk Subscribe pada halaman Subscriptions.
              </div>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}