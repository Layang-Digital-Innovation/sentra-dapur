"use client";

import React, { useCallback, useMemo, useRef, useState } from 'react';
import RoleGuard from '@/components/auth/RoleGuard';
import { Role } from '@/types/user.types';
import { tradingService } from '@/services/trading.service';
import { uploadService } from '@/services/upload.service';
import RichTextEditor from '@/components/RichTextEditor';
import { useRouter } from 'next/navigation';

export default function CreateProductPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    priceIDR: '',
    priceUSD: '',
    unit: '',
    weight: '',
    volume: '',
  });

  const [uploading, setUploading] = useState(false);
  const [coverImage, setCoverImage] = useState<{ url: string; filename: string; originalName?: string; size?: number; mimetype?: string } | null>(null);
  const [previewImages, setPreviewImages] = useState<{ url: string; filename: string; originalName?: string; size?: number; mimetype?: string }[]>([]);
  const [dragActiveCover, setDragActiveCover] = useState(false);
  const [dragActivePreviews, setDragActivePreviews] = useState(false);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const previewsInputRef = useRef<HTMLInputElement | null>(null);

  const disableSubmit = useMemo(() => {
    const hasAnyPrice = (form.priceIDR && Number(form.priceIDR) > 0) || (form.priceUSD && Number(form.priceUSD) > 0);
    return !form.name || !form.description || !hasAnyPrice || !form.unit || !form.weight || !form.volume || submitting;
  }, [form, submitting]);

  const validateFiles = (files: File[]) => {
    const MAX = 10 * 1024 * 1024;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    const valid: File[] = [];
    for (const f of files) {
      if (f.size > MAX) {
        setError(`File ${f.name} melebihi 10MB`);
        continue;
      }
      if (!allowed.includes(f.type)) {
        setError(`Tipe file ${f.name} tidak diizinkan`);
        continue;
      }
      valid.push(f);
    }
    return valid;
  };

  const onUpload = async (files: FileList | null, target: 'cover' | 'previews') => {
    if (!files || files.length === 0) return;
    const fileArr = Array.from(files);
    const valid = validateFiles(fileArr);
    if (valid.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const dt = new DataTransfer();
      // If cover, only take the first file
      (target === 'cover' ? [valid[0]] : valid).forEach((f) => dt.items.add(f));
      const res = await uploadService.uploadProductImages(dt.files);
      const BACKEND_BASE = (typeof process !== 'undefined' && process.env && (process.env.NEXT_PUBLIC_BACKEND_URL as string)) || 'http://localhost:3001';
      const items = (res?.files || []).map((f) => ({ url: `${BACKEND_BASE}${f.url}`, filename: f.filename, originalName: f.originalName, size: f.size, mimetype: f.mimetype }));
      if (target === 'cover') {
        setCoverImage(items[0] || null);
      } else {
        setPreviewImages((prev) => [...prev, ...items]);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>, target: 'cover' | 'previews') => {
    e.preventDefault();
    e.stopPropagation();
    if (target === 'cover') setDragActiveCover(false); else setDragActivePreviews(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files, target);
      e.dataTransfer.clearData();
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>, target: 'cover' | 'previews') => {
    e.preventDefault();
    e.stopPropagation();
    if (target === 'cover') setDragActiveCover(true); else setDragActivePreviews(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>, target: 'cover' | 'previews') => {
    e.preventDefault();
    e.stopPropagation();
    if (target === 'cover') setDragActiveCover(false); else setDragActivePreviews(false);
  }, []);

  const chooseCover = () => coverInputRef.current?.click();
  const choosePreviews = () => previewsInputRef.current?.click();

  const removeCover = () => setCoverImage(null);
  const removePreview = (filename: string) => setPreviewImages((prev) => prev.filter((i) => i.filename !== filename));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const prices: Array<{ currency: 'IDR'|'USD'; price: number }> = [];
      if (form.priceIDR && Number(form.priceIDR) > 0) prices.push({ currency: 'IDR', price: Number(form.priceIDR) });
      if (form.priceUSD && Number(form.priceUSD) > 0) prices.push({ currency: 'USD', price: Number(form.priceUSD) });
      const created = await tradingService.createProduct({
        name: form.name,
        description: form.description,
        prices,
        unit: form.unit,
        weight: Number(form.weight),
        volume: form.volume,
      });
      // Attach images if present
      const coverPayload = coverImage ? {
        url: coverImage.url,
        filename: coverImage.filename,
        originalName: coverImage.originalName || coverImage.filename,
        size: Number(coverImage.size || 0),
        mimeType: coverImage.mimetype || 'image/jpeg',
      } : null;
      const previewsPayload = previewImages.map((img) => ({
        url: img.url,
        filename: img.filename,
        originalName: img.originalName || img.filename,
        size: Number(img.size || 0),
        mimeType: img.mimetype || 'image/jpeg',
      }));
      if (coverPayload || previewsPayload.length) {
        await tradingService.attachProductImages(created.id, { cover: coverPayload, previews: previewsPayload });
      }
      setSuccess('Product created. Awaiting admin approval.');
      setTimeout(() => router.push('/dashboard/products'), 800);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RoleGuard allowedRoles={[Role.SUPPLIER]}>
      <div className="py-6">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold text-gray-900">Create Product</h1>
          <p className="text-sm text-gray-600">Masukkan detail produk Anda dengan jelas. Gambar produk dapat diunggah di bawah ini.</p>
        </div>

        <form onSubmit={onSubmit} className="bg-white border rounded-xl p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Product Name</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm placeholder-gray-400 text-gray-800"
                placeholder="Nama produk"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Unit</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm placeholder-gray-400 text-gray-800"
                placeholder="Contoh: TON, KG, PCS"
                value={form.unit}
                onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Price (IDR)</label>
              <input
                type="number"
                step="0.01"
                className="w-full border rounded-lg px-3 py-2 text-sm placeholder-gray-400 text-gray-800"
                placeholder="Harga EXW (Rupiah)"
                value={form.priceIDR}
                onChange={(e) => setForm((p) => ({ ...p, priceIDR: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Price (USD)</label>
              <input
                type="number"
                step="0.01"
                className="w-full border rounded-lg px-3 py-2 text-sm placeholder-gray-400 text-gray-800"
                placeholder="EXW Price (USD)"
                value={form.priceUSD}
                onChange={(e) => setForm((p) => ({ ...p, priceUSD: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Weight</label>
              <input
                type="number"
                step="0.01"
                className="w-full border rounded-lg px-3 py-2 text-sm placeholder-gray-400 text-gray-800"
                placeholder="Berat total (kg/ton)"
                value={form.weight}
                onChange={(e) => setForm((p) => ({ ...p, weight: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Volume (L x W x H)</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm placeholder-gray-400 text-gray-800"
                placeholder="Contoh: 120 x 60 x 50"
                value={form.volume}
                onChange={(e) => setForm((p) => ({ ...p, volume: e.target.value }))}
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-900 mb-1">Description / Specifications</label>
              <RichTextEditor
                value={form.description}
                onChange={(html) => setForm((p) => ({ ...p, description: html }))}
                placeholder="Tuliskan spesifikasi/ketentuan produk yang jelas"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cover Image */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Cover Image</label>
              <div
                onDrop={(e)=>handleDrop(e,'cover')}
                onDragOver={(e)=>handleDragOver(e,'cover')}
                onDragLeave={(e)=>handleDragLeave(e,'cover')}
                className={`rounded-xl border-2 border-dashed p-6 text-center transition-all ${dragActiveCover ? 'border-slate-800 bg-slate-50' : 'border-gray-300 bg-gray-50'}`}
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6H16a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                  <p className="text-sm text-gray-800">Drag & drop cover image</p>
                  <p className="text-xs text-gray-600">or</p>
                  <button type="button" onClick={chooseCover} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs hover:bg-slate-800">Choose Cover</button>
                  <input ref={coverInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => onUpload(e.target.files,'cover')} />
                  {uploading && <span className="text-sm text-gray-600">Uploading...</span>}
                  <p className="text-xs text-gray-600 mt-1">Format: JPG, JPEG, PNG, PDF. Maks 10MB per file.</p>
                </div>
              </div>
              {coverImage && (
                <div className="mt-3 relative border rounded-lg overflow-hidden bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {coverImage.url.toLowerCase().includes('.pdf') ? (
                    <div className="w-full h-40 flex items-center justify-center bg-gray-100">
                      <span className="text-xs text-gray-700">PDF: {coverImage.originalName || coverImage.filename}</span>
                    </div>
                  ) : (
                    <img src={coverImage.url} alt={coverImage.filename} className="w-full h-40 object-cover" />
                  )}
                  <span className="absolute top-2 left-2 text-[10px] bg-white/90 px-2 py-0.5 rounded border">Cover</span>
                  <button type="button" onClick={removeCover} className="absolute top-2 right-2 bg-white/95 text-xs px-2 py-1 rounded border">Remove</button>
                </div>
              )}
            </div>

            {/* Preview Images */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Preview Images</label>
              <div
                onDrop={(e)=>handleDrop(e,'previews')}
                onDragOver={(e)=>handleDragOver(e,'previews')}
                onDragLeave={(e)=>handleDragLeave(e,'previews')}
                className={`rounded-xl border-2 border-dashed p-6 text-center transition-all ${dragActivePreviews ? 'border-slate-800 bg-slate-50' : 'border-gray-300 bg-gray-50'}`}
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6H16a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                  <p className="text-sm text-gray-800">Drag & drop preview images</p>
                  <p className="text-xs text-gray-600">or</p>
                  <button type="button" onClick={choosePreviews} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs hover:bg-slate-800">Choose Files</button>
                  <input ref={previewsInputRef} type="file" multiple accept="image/*,.pdf" className="hidden" onChange={(e) => onUpload(e.target.files,'previews')} />
                  {uploading && <span className="text-sm text-gray-600">Uploading...</span>}
                  <p className="text-xs text-gray-600 mt-1">Format: JPG, JPEG, PNG, PDF. Maks 10MB per file.</p>
                </div>
              </div>
              {previewImages.length > 0 && (
                <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                  {previewImages.map((img) => (
                    <div key={img.filename} className="group relative border rounded-lg overflow-hidden bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {img.url.toLowerCase().includes('.pdf') ? (
                        <div className="w-full h-28 flex items-center justify-center bg-gray-100">
                          <span className="text-xs text-gray-700">PDF: {img.originalName || img.filename}</span>
                        </div>
                      ) : (
                        <img src={img.url} alt={img.filename} className="w-full h-28 object-cover" />
                      )}
                      <div className="absolute left-2 right-10 bottom-2 text-[10px] text-gray-800 truncate bg-white/80 px-1 rounded">
                        {img.originalName || img.filename}
                      </div>
                      <button type="button" onClick={() => removePreview(img.filename)} className="absolute top-2 right-2 bg-white/95 text-xs px-2 py-1 rounded border opacity-90 group-hover:opacity-100">Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
          {success && <div className="text-sm text-green-700">{success}</div>}

          <div className="pt-2 flex items-center gap-3">
            <button type="submit" disabled={disableSubmit} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800 disabled:opacity-60">
              {submitting ? 'Submitting...' : 'Create Product'}
            </button>
            <button type="button" onClick={() => router.push('/dashboard/products')} className="px-4 py-2 rounded-lg border text-sm text-red-600 hover:text-red-700">Cancel</button>
          </div>
        </form>
      </div>
    </RoleGuard>
  );
}
