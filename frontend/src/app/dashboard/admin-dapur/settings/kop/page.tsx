"use client";

import React, { useEffect, useState } from "react";
import { FiSave, FiUpload, FiImage, FiFileText, FiMapPin, FiUser } from "react-icons/fi";
import { dapurService, DapurUnit } from "@/services/dapur.service";
import { uploadService } from "@/services/upload.service";

export default function DapurSettingsKopPage() {
  const [dapur, setDapur] = useState<DapurUnit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [adminDapurName, setAdminDapurName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [signatureUrl, setSignatureUrl] = useState("");

  const fetchDapur = async () => {
    try {
      setLoading(true);
      const res = await dapurService.getMyUnit();
      if (res) {
        setDapur(res);
        setName(res.name || "");
        setFullAddress(res.fullAddress || "");
        setAdminDapurName(res.adminDapurName || "");
        setLogoUrl(res.logoUrl || "");
        setSignatureUrl(res.signatureUrl || "");
      }
    } catch (err: any) {
      setError("Gagal mengambil data dapur.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDapur();
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSaving(true);
      const res = await uploadService.uploadDapurBranding(file, 'logo');
      setLogoUrl(res.file.url);
      setSuccess("Logo berhasil di-upload. Simpan perubahan untuk menerapkan.");
    } catch (err: any) {
      setError("Gagal meng-upload logo.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSaving(true);
      const res = await uploadService.uploadDapurBranding(file, 'signature');
      setSignatureUrl(res.file.url);
      setSuccess("Tanda tangan berhasil di-upload. Simpan perubahan untuk menerapkan.");
    } catch (err: any) {
      setError("Gagal meng-upload tanda tangan.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!dapur) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await dapurService.updateBranding(dapur.id, {
        name,
        fullAddress,
        adminDapurName,
        logoUrl,
        signatureUrl
      });

      setSuccess("Settings kop surat berhasil diperbarui.");
    } catch (err: any) {
      setError("Gagal menyimpan rincian kop surat.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Memuat data dapur...</div>;
  if (!dapur) return <div className="p-8 text-center text-red-500">Anda tidak memiliki akses ke Unit Dapur manapun. Silahkan hubungi Admin Pusat.</div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings Kop Surat & Logo</h1>
        <p className="text-gray-500">Sesuaikan logo, alamat, dan tanda tangan untuk Purchase Order.</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-lg text-sm">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Brand Info */}
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FiFileText className="text-amber-600" /> Informasi Dasar
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                <FiImage className="w-3.5 h-3.5" /> Nama Dapur (Header PO)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                placeholder="Contoh: Sentra Dapur Kitchen 1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                <FiMapPin className="w-3.5 h-3.5" /> Alamat Lengkap (Header PO)
              </label>
              <textarea
                value={fullAddress}
                onChange={(e) => setFullAddress(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none resize-none"
                placeholder="Alamat lengkap dapur untuk kop surat..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                <FiUser className="w-3.5 h-3.5" /> Nama Admin Dapur (Dibawah TTD)
              </label>
              <input
                type="text"
                value={adminDapurName}
                onChange={(e) => setAdminDapurName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                placeholder="Nama lengkap admin yang bertanda tangan"
              />
            </div>
          </div>
        </div>

        {/* Assets Upload */}
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FiUpload className="text-amber-600" /> Logo & Tanda Tangan
          </h2>

          <div className="space-y-6">
            {/* Logo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Logo Dapur</label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 bg-gray-50 border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden relative group">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <FiImage className="w-8 h-8 text-gray-300" />
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <label className="cursor-pointer">
                      <FiUpload className="text-white w-6 h-6" />
                      <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={saving} />
                    </label>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-2 font-medium">Ukuran ideal: 200x200px (PNG Transparan)</p>
                  <label className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors shadow-sm">
                    Ganti Logo
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={saving} />
                  </label>
                </div>
              </div>
            </div>

            {/* Signature */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Scan Tanda Tangan Admin</label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 bg-gray-50 border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden relative group">
                  {signatureUrl ? (
                    <img src={signatureUrl} alt="Signature" className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-center">
                      <FiFileText className="w-8 h-8 text-gray-300 mx-auto" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <label className="cursor-pointer">
                      <FiUpload className="text-white w-6 h-6" />
                      <input type="file" className="hidden" accept="image/*" onChange={handleSignatureUpload} disabled={saving} />
                    </label>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-2 font-medium">Pastikan latar belakang putih bersih atau transparan.</p>
                  <label className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors shadow-sm">
                    Ganti TTD
                    <input type="file" className="hidden" accept="image/*" onChange={handleSignatureUpload} disabled={saving} />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Section */}
      <div className="mt-8 bg-gray-50 border rounded-xl p-8 shadow-inner overflow-hidden">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">Preview Kop Surat & TTD</h3>
        
        <div className="bg-white p-12 shadow-lg border-t-4 border-amber-600 max-w-3xl mx-auto rounded-b-lg min-h-[400px]">
          {/* Header Preview */}
          <div className="flex justify-between items-start border-bottom-2 border-gray-100 pb-8 mb-8">
            <div className="flex items-center gap-6">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo Preview" className="h-20 w-auto object-contain" />
              ) : (
                <div className="w-20 h-20 bg-gray-100 flex items-center justify-center rounded text-gray-400 italic text-[10px]">Logo Dapur</div>
              )}
              <div>
                <h2 className="text-3xl font-black text-amber-600 uppercase tracking-tight leading-none mb-1">
                  {name || "NAMA DAPUR"}
                </h2>
                <div className="text-xs text-gray-400 font-medium max-w-xs leading-relaxed">
                  {fullAddress || "Alamat lengkap unit dapur Anda akan muncul di sini sebagai identitas pengirim PO."}
                </div>
              </div>
            </div>
          </div>

          <div className="border-b-2 border-gray-100 mb-4 mt-8"></div>

          {/* Body Placeholder */}
          <div className="space-y-4 opacity-10">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-20 bg-gray-100 rounded"></div>
          </div>

          {/* Signature Preview */}
          <div className="mt-16 flex justify-end">
            <div className="text-center w-64">
              <p className="text-xs text-gray-500 mb-4 border-b border-gray-100 pb-1">Hormat Kami, Admin Dapur</p>
              <div className="h-24 flex items-center justify-center mb-1">
                {signatureUrl ? (
                  <img src={signatureUrl} alt="TTD Preview" className="h-full w-auto object-contain" />
                ) : (
                  <div className="italic text-gray-300 text-sm border border-dashed border-gray-200 px-4 py-2">(Tanda Tangan)</div>
                )}
              </div>
              <p className="font-bold text-gray-900 border-t border-gray-900 pt-1 uppercase tracking-wider text-sm">
                {adminDapurName || "NAMA ADMIN"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
        >
          <FiSave className="w-5 h-5" />
          {saving ? "Menyimpan..." : "Simpan Pengaturan Kop"}
        </button>
      </div>
    </div>
  );
}
