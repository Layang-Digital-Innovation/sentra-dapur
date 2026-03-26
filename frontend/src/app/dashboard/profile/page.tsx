"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { userService } from '@/services/user.service';
import { uploadService } from '@/services/upload.service';
import { FiMail, FiUser, FiLock, FiUpload, FiCheckCircle } from 'react-icons/fi';

export default function ProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const idCardInputRef = useRef<HTMLInputElement | null>(null);
  const selfieInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState({
    fullname: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [kyc, setKyc] = useState<{
    idCardUrl?: string;
    selfieUrl?: string;
  }>({});

  // Prefill from current auth user
  useEffect(() => {
    const email = user?.user?.email || '';
    const fullName = (user?.user as any)?.fullName || (user?.user as any)?.fullname || '';
    setForm((p) => ({ ...p, email, fullname: fullName }));
  }, [user?.user?.email, (user?.user as any)?.fullName, (user?.user as any)?.fullname]);

  const disabledSave = useMemo(() => {
    if (!form.fullname || !form.email) return true;
    if (form.password || form.confirmPassword) {
      if (form.password.length < 6) return true;
      if (form.password !== form.confirmPassword) return true;
    }
    return saving;
  }, [form, saving]);

  const chooseIdCard = () => idCardInputRef.current?.click();
  const chooseSelfie = () => selfieInputRef.current?.click();

  const onUploadKyc = async (files: FileList | null, type: 'idCardUrl' | 'selfieUrl') => {
    if (!files || files.length === 0) return;
    try {
      setLoading(true);
      setError(null);
      const res = await uploadService.uploadKycDocuments(files);
      const first = res?.files?.[0];
      if (first?.url) {
        const BACKEND_BASE = (typeof process !== 'undefined' && process.env && (process.env.NEXT_PUBLIC_BACKEND_URL as string)) || 'http://localhost:3001';
        const absolute = `${BACKEND_BASE}${first.url}`;
        setKyc((p) => ({ ...p, [type]: absolute }));
        setMessage('KYC document uploaded. Remember to Save Profile to apply.');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to upload KYC document');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.user?.id) return;
    try {
      setSaving(true);
      setMessage(null);
      setError(null);

      const payload: any = {
        fullName: form.fullname,
        email: form.email,
      };
      if (form.password) payload.password = form.password;

      // Update profile basic info (self-update)
      await userService.updateMyProfile({
        email: payload.email,
        fullName: payload.fullName,
        ...(payload.password ? { password: payload.password } : {}),
      });

      // Update KYC if any link present
      if (kyc.idCardUrl || kyc.selfieUrl) {
        await userService.updateKycDocs(user.user.id, {
          idCardUrl: kyc.idCardUrl || '',
          selfieUrl: kyc.selfieUrl || '',
        });
      }

      setMessage('Profile updated successfully.');
      setForm((p) => ({ ...p, password: '', confirmPassword: '' }));
    } catch (e: any) {
      setError(e?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-600">Perbarui informasi akun dan dokumen KYC Anda.</p>
      </div>

      <form onSubmit={onSubmit} className="bg-white border rounded-xl p-6 space-y-6 max-w-3xl">
        {/* Basic info */}
        <div>
          <h2 className="text-lg font-medium text-gray-900">Basic Information</h2>
          <p className="text-xs text-gray-500">Nama lengkap dan email digunakan untuk komunikasi.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Full name</label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm placeholder-gray-400 text-gray-800"
                  placeholder="Nama lengkap"
                  value={form.fullname}
                  onChange={(e) => setForm((p) => ({ ...p, fullname: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Email</label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm placeholder-gray-400 text-gray-800"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Password */}
        <div>
          <h2 className="text-lg font-medium text-gray-900">Change Password</h2>
          <p className="text-xs text-gray-500">Kosongkan jika tidak ingin mengubah password.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">New password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm placeholder-gray-400 text-gray-800"
                  placeholder="Minimal 6 karakter"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Confirm password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm placeholder-gray-400 text-gray-800"
                  placeholder="Ulangi password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </div>

        {/* KYC */}
        <div>
          <h2 className="text-lg font-medium text-gray-900">KYC Documents</h2>
          <p className="text-xs text-gray-500">Unggah KTP/Paspor dan selfie untuk verifikasi identitas.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">ID Card (KTP/Passport)</label>
              <div className="flex items-center gap-2">
                <button type="button" onClick={chooseIdCard} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:bg-gray-50 text-gray-800">
                  <FiUpload /> Upload
                </button>
                {kyc.idCardUrl && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-700">
                    <FiCheckCircle /> Uploaded
                  </span>
                )}
              </div>
              <input ref={idCardInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => onUploadKyc(e.target.files, 'idCardUrl')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Selfie with ID</label>
              <div className="flex items-center gap-2">
                <button type="button" onClick={chooseSelfie} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:bg-gray-50 text-gray-800">
                  <FiUpload /> Upload
                </button>
                {kyc.selfieUrl && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-700">
                    <FiCheckCircle /> Uploaded
                  </span>
                )}
              </div>
              <input ref={selfieInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => onUploadKyc(e.target.files, 'selfieUrl')} />
            </div>
          </div>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}
        {message && <div className="text-sm text-green-700">{message}</div>}

        <div className="pt-2 flex items-center gap-3">
          <button type="submit" disabled={disabledSave} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800 disabled:opacity-60">
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
