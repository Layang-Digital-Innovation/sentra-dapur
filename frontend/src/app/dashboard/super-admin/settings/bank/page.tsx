"use client";

import React, { useEffect, useState } from 'react';
import RoleGuard from '@/components/auth/RoleGuard';
import { Role } from '@/types/user.types';
import { settingsService } from '@/services/settings.service';
import { toast } from 'react-toastify';

export default function PlatformBankSettingsPage() {
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [instruction, setInstruction] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const s = await settingsService.getPlatformBankSettings();
        setBankName(s.bankName || '');
        setAccountName(s.accountName || '');
        setAccountNumber(s.accountNumber || '');
        setInstruction(s.instruction || '');
      } catch (e: any) {
        // ignore
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await settingsService.updatePlatformBankSettings({
        bankName: bankName || null,
        accountName: accountName || null,
        accountNumber: accountNumber || null,
        instruction: instruction || null,
      });
      toast.success('Bank settings disimpan');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Gagal menyimpan settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleGuard allowedRoles={[Role.SUPER_ADMIN]}>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-black">Platform Bank Settings</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Bank Name</label>
              <input value={bankName} onChange={(e)=>setBankName(e.target.value)} className="w-full border rounded px-3 py-2 text-sm text-black" placeholder="Contoh: BCA" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Account Name</label>
              <input value={accountName} onChange={(e)=>setAccountName(e.target.value)} className="w-full border rounded px-3 py-2 text-sm text-black" placeholder="Nama Pemilik Rekening" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Account Number</label>
              <input value={accountNumber} onChange={(e)=>setAccountNumber(e.target.value)} className="w-full border rounded px-3 py-2 text-sm text-black" placeholder="1234567890" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Instruction</label>
              <textarea value={instruction} onChange={(e)=>setInstruction(e.target.value)} className="w-full border rounded px-3 py-2 text-sm text-black h-24" placeholder="Instruksi pembayaran (mis: sertakan nomor invoice pada berita transfer)" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end">
            <button disabled={loading} onClick={handleSave} className="px-4 py-2 rounded bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60">{loading ? 'Menyimpan...' : 'Save Settings'}</button>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
