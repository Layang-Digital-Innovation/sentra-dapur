"use client";

import React, { useEffect, useState } from 'react';
import RoleGuard from '@/components/auth/RoleGuard';
import { Role } from '@/types/user.types';
import { tradingService } from '@/services/trading.service';

export default function SellerWarehousePage() {
  const [form, setForm] = useState<{ country?: string; province?: string; city?: string; address?: string }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await tradingService.getSellerProfile();
        setForm({
          country: data?.country || '',
          province: data?.province || '',
          city: data?.city || '',
          address: data?.address || '',
        });
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const save = async () => {
    try {
      setSaving(true);
      setOk(null);
      setError(null);
      await tradingService.upsertSellerProfile(form);
      setOk('Saved');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <RoleGuard allowedRoles={[Role.SUPPLIER]}>
      <div className="py-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">Warehouse Origin</h1>
        {loading && <div>Loading...</div>}
        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
        {ok && <div className="text-sm text-green-700 mb-2">{ok}</div>}
        {!loading && (
          <div className="max-w-lg space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Country</label>
              <input value={form.country || ''} onChange={(e)=>setForm(prev=>({...prev, country: e.target.value}))} className="w-full border rounded px-3 py-2 text-sm text-gray-800" placeholder="e.g. Indonesia" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Province</label>
              <input value={form.province || ''} onChange={(e)=>setForm(prev=>({...prev, province: e.target.value}))} className="w-full border rounded px-3 py-2 text-sm text-gray-800" placeholder="e.g. Jawa Barat" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">City</label>
              <input value={form.city || ''} onChange={(e)=>setForm(prev=>({...prev, city: e.target.value}))} className="w-full border rounded px-3 py-2 text-sm text-gray-800" placeholder="e.g. Bandung" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Address</label>
              <textarea value={form.address || ''} onChange={(e)=>setForm(prev=>({...prev, address: e.target.value}))} className="w-full border rounded px-3 py-2 text-sm text-gray-800" rows={3} placeholder="Street, district, postal code" />
            </div>
            <div>
              <button onClick={save} disabled={saving} className="px-4 py-2 rounded bg-slate-900 text-white text-sm hover:bg-slate-800 disabled:opacity-60">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
