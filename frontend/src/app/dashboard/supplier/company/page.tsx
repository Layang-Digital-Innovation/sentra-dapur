"use client";

import React, { useEffect, useRef, useState } from 'react';
import RoleGuard from '@/components/auth/RoleGuard';
import { Role } from '@/types/user.types';
import { tradingService } from '@/services/trading.service';
import { uploadService } from '@/services/upload.service';

export default function SellerCompanyPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    companyLogo: '' as string,
    companyName: '' as string,
    descriptions: '' as string,
    country: '' as string,
    address: '' as string,
    profileCompanyUrl: '' as string,
    profileCompanyFileName: '' as string,
  });

  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const profile = await tradingService.getSellerProfile();
        if (!mounted) return;
        setForm({
          companyLogo: profile?.companyLogo || '',
          companyName: profile?.companyName || '',
          descriptions: profile?.descriptions || '',
          country: profile?.country || '',
          address: profile?.address || '',
          profileCompanyUrl: profile?.profileCompanyUrl || '',
          profileCompanyFileName: profile?.profileCompanyFileName || '',
        });
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const onChooseLogo = () => logoInputRef.current?.click();
  const onChooseFile = () => fileInputRef.current?.click();

  const handleUploadLogo = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploadingLogo(true);
    setError(null);
    try {
      const res = await uploadService.uploadCompanyLogo(files[0]);
      const file = res?.file;
      if (file?.url) setForm((p) => ({ ...p, companyLogo: file.url }));
    } catch (e: any) {
      setError(e?.message || 'Upload logo failed');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleUploadProfileFile = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploadingFile(true);
    setError(null);
    try {
      const res = await uploadService.uploadCompanyProfile(files[0]);
      const file = res?.file;
      if (file?.url) setForm((p) => ({ ...p, profileCompanyUrl: file.url, profileCompanyFileName: file.originalName || file.filename }));
    } catch (e: any) {
      setError(e?.message || 'Upload file failed');
    } finally {
      setUploadingFile(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await tradingService.upsertSellerProfile({
        companyLogo: form.companyLogo || null,
        companyName: form.companyName || null,
        descriptions: form.descriptions || null,
        country: form.country || undefined,
        address: form.address || undefined,
        profileCompanyUrl: form.profileCompanyUrl || null,
        profileCompanyFileName: form.profileCompanyFileName || null,
      });
      setSuccess('Company profile saved');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <RoleGuard allowedRoles={[Role.SUPPLIER]}>
      <div className="py-6">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold text-gray-900">Company Profile</h1>
          <p className="text-sm text-gray-600">Lengkapi profil perusahaan Anda untuk meningkatkan kepercayaan buyer.</p>
        </div>

        {loading && <div>Loading...</div>}
        {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
        {success && <div className="text-sm text-green-700 mb-3">{success}</div>}

        {!loading && (
          <form onSubmit={onSubmit} className="bg-white border rounded-xl p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <div className="text-sm font-medium text-gray-900">Company Logo</div>
                <div className="text-xs text-gray-600">Unggah logo perusahaan Anda.</div>
              </div>
              <div className="md:col-span-2">
                <div className="flex items-center gap-4">
                  {form.companyLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.companyLogo} alt="logo" className="h-16 w-16 rounded-full object-cover border" />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-gray-200" />
                  )}
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={onChooseLogo} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs hover:bg-slate-800 disabled:opacity-60" disabled={uploadingLogo}>{uploadingLogo ? 'Uploading...' : 'Choose Logo'}</button>
                    {form.companyLogo && (
                      <button type="button" onClick={() => setForm(p=>({ ...p, companyLogo: '' }))} className="px-3 py-1.5 rounded-lg border text-xs text-red-600">Remove</button>
                    )}
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e)=>handleUploadLogo(e.target.files)} />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <div className="text-sm font-medium text-gray-900">Company Name</div>
              </div>
              <div className="md:col-span-2">
                <input value={form.companyName} onChange={(e)=>setForm(p=>({...p, companyName: e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm text-gray-800" placeholder="Nama perusahaan" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <div className="text-sm font-medium text-gray-900">Descriptions</div>
              </div>
              <div className="md:col-span-2">
                <textarea value={form.descriptions} onChange={(e)=>setForm(p=>({...p, descriptions: e.target.value}))} rows={5} className="w-full border rounded-lg px-3 py-2 text-sm text-gray-800" placeholder="Profil singkat perusahaan, pengalaman, sertifikasi, dsb." />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <div className="text-sm font-medium text-gray-900">Country</div>
              </div>
              <div className="md:col-span-2">
                <input value={form.country} onChange={(e)=>setForm(p=>({...p, country: e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm text-gray-800" placeholder="Negara" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <div className="text-sm font-medium text-gray-900">Address</div>
              </div>
              <div className="md:col-span-2">
                <input value={form.address} onChange={(e)=>setForm(p=>({...p, address: e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm text-gray-800" placeholder="Alamat lengkap" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <div className="text-sm font-medium text-gray-900">Company Profile File</div>
                <div className="text-xs text-gray-600">Unggah dokumen profil (PDF/IMG).</div>
              </div>
              <div className="md:col-span-2">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={onChooseFile} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs hover:bg-slate-800 disabled:opacity-60" disabled={uploadingFile}>{uploadingFile ? 'Uploading...' : 'Choose File'}</button>
                  {form.profileCompanyUrl && (
                    <a href={form.profileCompanyUrl} target="_blank" rel="noreferrer" className="text-xs underline text-amber-700">{form.profileCompanyFileName || 'View file'}</a>
                  )}
                  {form.profileCompanyUrl && (
                    <button type="button" onClick={()=>setForm(p=>({...p, profileCompanyUrl: '', profileCompanyFileName: ''}))} className="px-3 py-1.5 rounded-lg border text-xs text-red-600">Remove</button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e)=>handleUploadProfileFile(e.target.files)} />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800 disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </RoleGuard>
  );
}
