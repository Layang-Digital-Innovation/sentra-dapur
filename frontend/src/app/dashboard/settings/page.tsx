"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { userService } from "@/services/user.service";
import { uploadService } from "@/services/upload.service";
import { dapurService, DapurUnit } from "@/services/dapur.service";
import { 
  FiMail, 
  FiUser, 
  FiLock, 
  FiUpload, 
  FiCheckCircle, 
  FiSettings, 
  FiImage, 
  FiMapPin, 
  FiFileText, 
  FiSave, 
  FiShield 
} from "react-icons/fi";

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"PROFILE" | "BRANDING">("PROFILE");
  
  // SHARED STATES
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // PROFILE FORM STATES
  const idCardInputRef = useRef<HTMLInputElement | null>(null);
  const selfieInputRef = useRef<HTMLInputElement | null>(null);
  const [profileForm, setProfileForm] = useState({
    fullname: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [kyc, setKyc] = useState<{ idCardUrl?: string; selfieUrl?: string }>({});

  // BRANDING FORM STATES
  const [dapur, setDapur] = useState<DapurUnit | null>(null);
  const [brandingForm, setBrandingForm] = useState({
    name: "",
    fullAddress: "",
    adminDapurName: "",
    logoUrl: "",
    signatureUrl: "",
  });

  // INITIAL LOAD
  useEffect(() => {
    // Load Profile Info
    const email = user?.user?.email || "";
    const fullName = (user?.user as any)?.fullName || (user?.user as any)?.fullname || "";
    setProfileForm((p) => ({ ...p, email, fullname: fullName }));
    
    // Load Dapur Branding Info if applicable
    const role = user?.user?.role;
    if (role === "ADMIN_DAPUR" || role === "ADMIN_PUSAT") {
      fetchDapurBranding();
    }
  }, [user]);

  const fetchDapurBranding = async () => {
    try {
      const res = await dapurService.getMyUnit();
      if (res) {
        setDapur(res);
        setBrandingForm({
          name: res.name || "",
          fullAddress: res.fullAddress || "",
          adminDapurName: res.adminDapurName || "",
          logoUrl: res.logoUrl || "",
          signatureUrl: res.signatureUrl || "",
        });
      }
    } catch (err: any) {
      console.error("Gagal mengambil data branding dapur.");
    }
  };

  // PROFILE ACTIONS
  const onUploadKyc = async (files: FileList | null, type: "idCardUrl" | "selfieUrl") => {
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
        setMessage("Dokumen KYC berhasil diunggah. Klik Simpan Profil untuk menerapkan.");
      }
    } catch (e: any) {
      setError(e?.message || "Gagal mengunggah dokumen KYC");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.user?.id) return;
    try {
      setSaving(true);
      setMessage(null);
      setError(null);

      await userService.updateMyProfile({
        email: profileForm.email,
        fullName: profileForm.fullname,
        ...(profileForm.password ? { password: profileForm.password } : {}),
      });

      if (kyc.idCardUrl || kyc.selfieUrl) {
        await userService.updateKycDocs(user.user.id, {
          idCardUrl: kyc.idCardUrl || "",
          selfieUrl: kyc.selfieUrl || "",
        });
      }

      setMessage("Profil berhasil diperbarui.");
      setProfileForm((p) => ({ ...p, password: "", confirmPassword: "" }));
    } catch (e: any) {
      setError(e?.message || "Gagal memperbarui profil");
    } finally {
      setSaving(false);
    }
  };

  // BRANDING ACTIONS
  const handleBrandingUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'signature') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSaving(true);
      const res = await uploadService.uploadDapurBranding(file, type);
      const url = res.file.url;
      setBrandingForm(prev => ({ ...prev, [type === 'logo' ? 'logoUrl' : 'signatureUrl']: url }));
      setMessage(`${type === 'logo' ? 'Logo' : 'Tanda tangan'} berhasil diunggah. Klik Simpan Branding untuk menerapkan.`);
    } catch (err: any) {
      setError(`Gagal mengunggah ${type === 'logo' ? 'logo' : 'tanda tangan'}.`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBranding = async () => {
    if (!dapur) return;
    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      await dapurService.updateBranding(dapur.id, brandingForm);
      setMessage("Pengaturan branding unit dapur berhasil diperbarui.");
    } catch (err: any) {
      setError("Gagal menyimpan perubahan branding.");
    } finally {
      setSaving(false);
    }
  };

  const disabledProfileSave = useMemo(() => {
    if (!profileForm.fullname || !profileForm.email) return true;
    if (profileForm.password || profileForm.confirmPassword) {
      if (profileForm.password.length < 6) return true;
      if (profileForm.password !== profileForm.confirmPassword) return true;
    }
    return saving;
  }, [profileForm, saving]);

  const isDapurAdmin = user?.user?.role === "ADMIN_DAPUR" || user?.user?.role === "ADMIN_PUSAT" || user?.user?.role === "PROJECT_OWNER";

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <FiSettings className="text-amber-600" /> Pengaturan
        </h1>
        <p className="text-slate-500 mt-2 text-lg">Kelola informasi akun dan identitas operasional Anda.</p>
      </div>

      {/* TABS */}
      <div className="flex border-b border-gray-200 mb-8 space-x-8">
        <button 
          onClick={() => { setActiveTab("PROFILE"); setError(null); setMessage(null); }}
          className={`pb-4 text-sm font-bold transition-all border-b-2 ${activeTab === 'PROFILE' ? 'border-amber-600 text-amber-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          AKUN & PROFIL
        </button>
        {isDapurAdmin && (
          <button 
            onClick={() => { setActiveTab("BRANDING"); setError(null); setMessage(null); }}
            className={`pb-4 text-sm font-bold transition-all border-b-2 ${activeTab === 'BRANDING' ? 'border-amber-600 text-amber-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            IDENTITAS & KOP SURAT
          </button>
        )}
      </div>

      {/* FEEDBACK MESSAGES */}
      <div className="mb-6 h-10">
        {error && <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm font-medium animate-in fade-in duration-300">{error}</div>}
        {message && <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-lg text-sm font-medium animate-in fade-in duration-300">{message}</div>}
      </div>

      <div className="space-y-8">
        {activeTab === "PROFILE" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-8">
               {/* BASIC INFO */}
               <section className="bg-white rounded-2xl p-6 border shadow-sm transition-all hover:shadow-md">
                  <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-800">
                    <FiUser className="text-amber-600" /> Informasi Dasar
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nama Lengkap</label>
                      <input 
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-amber-100 focus:border-amber-500 outline-none transition-all text-sm font-medium"
                        value={profileForm.fullname}
                        onChange={(e) => setProfileForm(p => ({ ...p, fullname: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                      <input 
                        type="email"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-amber-100 focus:border-amber-500 outline-none transition-all text-sm font-medium"
                        value={profileForm.email}
                        readOnly // Email often read-only in this system
                      />
                    </div>
                  </div>
               </section>

               {/* SECURITY */}
               <section className="bg-white rounded-2xl p-6 border shadow-sm transition-all hover:shadow-md">
                  <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-800">
                    <FiLock className="text-amber-600" /> Keamanan
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password Baru</label>
                      <input 
                        type="password"
                        placeholder="Minimal 6 karakter"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-amber-100 focus:border-amber-500 outline-none transition-all text-sm font-medium"
                        value={profileForm.password}
                        onChange={(e) => setProfileForm(p => ({ ...p, password: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Konfirmasi Password</label>
                      <input 
                        type="password"
                        placeholder="Ulangi password baru"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-amber-100 focus:border-amber-500 outline-none transition-all text-sm font-medium"
                        value={profileForm.confirmPassword}
                        onChange={(e) => setProfileForm(p => ({ ...p, confirmPassword: e.target.value }))}
                      />
                    </div>
                  </div>
               </section>

               <div className="flex justify-end">
                  <button 
                    onClick={handleSaveProfile}
                    disabled={disabledProfileSave}
                    className="flex items-center gap-2 px-10 py-3.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    <FiSave className="text-lg" />
                    {saving ? "Menyimpan..." : "SIMPAN PERUBAHAN PROFIL"}
                  </button>
               </div>
            </div>

            {/* KYC SIDEBAR */}
            <div className="space-y-6">
               <section className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                  <h2 className="text-md font-bold mb-4 flex items-center gap-2 text-slate-800">
                    <FiShield className="text-amber-600" /> Verifikasi KYC
                  </h2>
                  <p className="text-xs text-slate-500 mb-6 leading-relaxed">Pastikan akun Anda terverifikasi dengan mengunggah dokumen identitas untuk akses fitur finansial penuh.</p>
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-white rounded-xl border border-slate-200">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Dokumen KTP/Passport</label>
                      <div className="flex items-center justify-between">
                         <button type="button" onClick={() => idCardInputRef.current?.click()} className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-lg">
                           <FiUpload /> UPLOAD
                         </button>
                         {kyc.idCardUrl && <FiCheckCircle className="text-emerald-500" />}
                      </div>
                      <input ref={idCardInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => onUploadKyc(e.target.files, 'idCardUrl')} />
                    </div>

                    <div className="p-4 bg-white rounded-xl border border-slate-200">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Selfie dengan Identitas</label>
                      <div className="flex items-center justify-between">
                         <button type="button" onClick={() => selfieInputRef.current?.click()} className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-lg">
                           <FiUpload /> UPLOAD
                         </button>
                         {kyc.selfieUrl && <FiCheckCircle className="text-emerald-500" />}
                      </div>
                      <input ref={selfieInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => onUploadKyc(e.target.files, 'selfieUrl')} />
                    </div>
                  </div>
               </section>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* BRANDING FORM */}
            <div className="space-y-8">
              <section className="bg-white rounded-2xl p-8 border shadow-sm">
                <h2 className="text-xl font-bold mb-8 flex items-center gap-2 text-slate-800 border-b pb-4">
                  <FiFileText className="text-amber-600" /> Konfigurasi Kop Surat
                </h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <FiImage className="text-slate-400" /> Nama Dapur (Header PO)
                    </label>
                    <input
                      type="text"
                      value={brandingForm.name}
                      onChange={(e) => setBrandingForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full px-5 py-3 border-2 border-slate-100 rounded-xl focus:border-amber-500 focus:ring-0 outline-none font-medium transition-all"
                      placeholder="Contoh: Sentra Dapur Kitchen 1"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <FiMapPin className="text-slate-400" /> Alamat Lengkap
                    </label>
                    <textarea
                      value={brandingForm.fullAddress}
                      onChange={(e) => setBrandingForm(p => ({ ...p, fullAddress: e.target.value }))}
                      rows={4}
                      className="w-full px-5 py-3 border-2 border-slate-100 rounded-xl focus:border-amber-500 focus:ring-0 outline-none font-medium transition-all resize-none"
                      placeholder="Alamat lengkap yang akan muncul di dokumen resmi..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Logo Dapur</label>
                      <div className="flex flex-col items-center p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl relative group">
                        {brandingForm.logoUrl ? (
                          <img src={brandingForm.logoUrl} alt="Logo" className="h-20 w-auto object-contain mb-3" />
                        ) : (
                          <FiImage className="w-12 h-12 text-slate-300 mb-3" />
                        )}
                        <label className="cursor-pointer px-4 py-2 bg-white text-slate-700 font-bold text-xs rounded-lg border shadow-sm hover:bg-slate-50 transition-colors">
                          {brandingForm.logoUrl ? "GANTI LOGO" : "UPLOAD LOGO"}
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleBrandingUpload(e, 'logo')} disabled={saving} />
                        </label>
                        <p className="text-[10px] text-slate-400 mt-2 font-medium">Format: PNG Transparan</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Scan Tanda Tangan</label>
                      <div className="flex flex-col items-center p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl relative group">
                        {brandingForm.signatureUrl ? (
                          <img src={brandingForm.signatureUrl} alt="Signature" className="h-20 w-auto object-contain mb-3" />
                        ) : (
                          <FiFileText className="w-12 h-12 text-slate-300 mb-3" />
                        )}
                        <label className="cursor-pointer px-4 py-2 bg-white text-slate-700 font-bold text-xs rounded-lg border shadow-sm hover:bg-slate-50 transition-colors">
                          {brandingForm.signatureUrl ? "GANTI TTD" : "UPLOAD TTD"}
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleBrandingUpload(e, 'signature')} disabled={saving} />
                        </label>
                        <p className="text-[10px] text-slate-400 mt-2 font-medium">Background: Putih/Transparan</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <FiUser className="text-slate-400" /> Nama Admin (Penandatangan)
                    </label>
                    <input
                      type="text"
                      value={brandingForm.adminDapurName}
                      onChange={(e) => setBrandingForm(p => ({ ...p, adminDapurName: e.target.value }))}
                      className="w-full px-5 py-3 border-2 border-slate-100 rounded-xl focus:border-amber-500 focus:ring-0 outline-none font-medium transition-all"
                      placeholder="Nama lengkap admin yang bertanda tangan"
                    />
                  </div>
                </div>

                <div className="mt-10 flex justify-end">
                    <button 
                      onClick={handleSaveBranding}
                      disabled={saving || !dapur}
                      className="flex items-center gap-2 px-10 py-3.5 bg-amber-600 text-white rounded-xl font-bold shadow-lg hover:bg-amber-700 transition-all hover:-translate-y-0.5 disabled:opacity-50"
                    >
                      <FiSave className="text-lg" />
                      {saving ? "Menyimpan..." : "SIMPAN PENGATURAN BRANDING"}
                    </button>
                </div>
              </section>
            </div>

            {/* LIVE PREVIEW COLD */}
            <div className="sticky top-6">
               <div className="bg-slate-900 rounded-3xl p-1 shadow-2xl">
                 <div className="bg-white rounded-[1.4rem] overflow-hidden min-h-[500px] flex flex-col">
                    <div className="p-8 border-b-8 border-slate-100 flex-1">
                       <div className="flex flex-col items-center text-center mb-8">
                          {brandingForm.logoUrl ? (
                            <img src={brandingForm.logoUrl} alt="Preview Logo" className="h-16 w-auto object-contain mb-4" />
                          ) : (
                            <div className="w-16 h-16 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-300 text-[10px] font-bold">LOGO</div>
                          )}
                          <h3 className="text-2xl font-black text-amber-600 uppercase tracking-tight">{brandingForm.name || "NAMA UNIT DAPUR"}</h3>
                          <p className="text-xs text-slate-400 max-w-xs mt-2 line-clamp-2">{brandingForm.fullAddress || "Alamat lengkap dapur akan muncul di area ini pada dokumen resmi Purchase Order."}</p>
                       </div>

                       <div className="border-y-2 border-slate-50 py-4 my-8 flex justify-between items-center opacity-20">
                          <div className="h-3 w-32 bg-slate-200 rounded-full"></div>
                          <div className="h-3 w-20 bg-slate-200 rounded-full"></div>
                       </div>
                       
                       <div className="space-y-3 opacity-10">
                          <div className="h-4 w-full bg-slate-200 rounded-lg"></div>
                          <div className="h-4 w-full bg-slate-200 rounded-lg"></div>
                          <div className="h-12 w-full bg-slate-100 rounded-xl"></div>
                       </div>
                    </div>

                    <div className="p-8 bg-slate-50 flex flex-col items-end">
                       <div className="text-center w-40">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Hormat Kami,</p>
                          <div className="h-16 flex items-center justify-center mb-1">
                             {brandingForm.signatureUrl ? (
                               <img src={brandingForm.signatureUrl} alt="Preview Signature" className="h-full w-auto object-contain" />
                             ) : (
                               <div className="text-[10px] text-slate-300 italic border border-dashed border-slate-300 px-4 py-1">Tanda Tangan</div>
                             )}
                          </div>
                          <p className="text-sm font-bold text-slate-800 border-t-2 border-slate-900 pt-1 uppercase truncate">{brandingForm.adminDapurName || "NAMA ADMIN"}</p>
                          <p className="text-[10px] font-medium text-slate-400">Admin Dapur Unit</p>
                       </div>
                    </div>
                 </div>
               </div>
               <p className="text-center text-xs text-slate-400 mt-4 font-medium italic">Pratinjau tampilan Purchase Order berdasarkan pengaturan branding Anda.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
