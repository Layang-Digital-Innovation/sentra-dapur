"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import RoleGuard from "@/components/auth/RoleGuard";
import { Role } from "@/types/user.types";
import { tradingService } from "@/services/trading.service";
import { uploadService } from "@/services/upload.service";
import BomConversionSection from "@/components/BomConversionSection";

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = (params?.id as string) || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    unit: "KG",
    priceIDR: "",
    priceUSD: "",
    weight: "",
    volume: "",
  });

  const [uploading, setUploading] = useState(false);
  const [coverImage, setCoverImage] = useState<{ url: string; filename: string; originalName?: string; size?: number; mimetype?: string } | null>(null);
  const [previewImages, setPreviewImages] = useState<{ url: string; filename: string; originalName?: string; size?: number; mimetype?: string }[]>([]);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const previewsInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActiveCover, setDragActiveCover] = useState(false);
  const [dragActivePreviews, setDragActivePreviews] = useState(false);

  // BOM Conversions state
  const [bomConversions, setBomConversions] = useState<Array<{ productionUnit: string; conversionFactor: string }>>([]);
  const [bomErrors, setBomErrors] = useState<Array<{ productionUnit?: string; conversionFactor?: string }>>([]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const p = await tradingService.getProduct(id);
        setForm({
          name: p?.name || "",
          description: p?.description || "",
          unit: p?.unit || "KG",
          priceIDR: String((p?.prices || []).find((x: any)=>x.currency==='IDR')?.price ?? ''),
          priceUSD: String((p?.prices || []).find((x: any)=>x.currency==='USD')?.price ?? ''),
          weight: String(p?.weight ?? ""),
          volume: p?.volume || "",
        });
        // Map existing images if present
        const images = Array.isArray(p?.images) ? p.images : [];
        const cover = images.find((img: any) => img.isCover);
        const previews = images.filter((img: any) => !img.isCover);
        setCoverImage(cover ? { url: cover.url, filename: cover.filename, originalName: cover.originalName, size: cover.size, mimetype: cover.mimeType } : null);
        setPreviewImages(previews.map((im: any) => ({ url: im.url, filename: im.filename, originalName: im.originalName, size: im.size, mimetype: im.mimeType })));
        // Load existing BOM conversions
        const existingBom = Array.isArray(p?.bomConversions) ? p.bomConversions : [];
        setBomConversions(existingBom.map((b: any) => ({ productionUnit: b.productionUnit, conversionFactor: String(b.conversionFactor) })));
        setBomErrors(existingBom.map(() => ({})));
      } catch (e: any) {
        setError(e?.response?.data?.message || "Failed to load product");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const validateFiles = (files: File[]) => {
    const MAX = 10 * 1024 * 1024;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    const valid: File[] = [];
    for (const f of files) {
      if (f.size > MAX) { setError(`File ${f.name} melebihi 10MB`); continue; }
      if (!allowed.includes(f.type)) { setError(`Tipe file ${f.name} tidak diizinkan`); continue; }
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
      (target === 'cover' ? [valid[0]] : valid).forEach((f) => dt.items.add(f));
      const res = await uploadService.uploadProductImages(dt.files);
      const BACKEND_BASE = (typeof process !== 'undefined' && process.env && (process.env.NEXT_PUBLIC_BACKEND_URL as string)) || 'http://localhost:3001';
      const items = (res?.files || []).map((f: any) => ({ url: `${BACKEND_BASE}${f.url}`, filename: f.filename, originalName: f.originalName, size: f.size, mimetype: f.mimetype }));
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

  const chooseCover = () => coverInputRef.current?.click();
  const choosePreviews = () => previewsInputRef.current?.click();
  const removeCover = () => setCoverImage(null);
  const removePreviewAt = (idx: number) => setPreviewImages((prev) => prev.filter((_, i) => i !== idx));

  // BOM Conversion handlers
  const addBomRow = () => {
    setBomConversions((prev) => [...prev, { productionUnit: '', conversionFactor: '' }]);
    setBomErrors((prev) => [...prev, {}]);
  };

  const updateBomRow = (index: number, field: 'productionUnit' | 'conversionFactor', value: string) => {
    setBomConversions((prev) => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
    setBomErrors((prev) => prev.map((err, i) => i === index ? { ...err, [field]: undefined } : err));
  };

  const removeBomRow = (index: number) => {
    setBomConversions((prev) => prev.filter((_, i) => i !== index));
    setBomErrors((prev) => prev.filter((_, i) => i !== index));
  };

  const validateBomConversions = (): boolean => {
    const newErrors = bomConversions.map((row) => {
      const err: { productionUnit?: string; conversionFactor?: string } = {};
      if (!row.productionUnit.trim()) err.productionUnit = 'Satuan produksi tidak boleh kosong';
      const factor = parseFloat(row.conversionFactor);
      if (!row.conversionFactor || isNaN(factor) || factor <= 0) err.conversionFactor = 'Faktor konversi harus lebih besar dari 0';
      return err;
    });
    setBomErrors(newErrors);
    return newErrors.every((e) => !e.productionUnit && !e.conversionFactor);
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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!validateBomConversions()) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const prices: Array<{ currency: 'IDR'|'USD'; price: number }> = [];
      if (form.priceIDR && Number(form.priceIDR) > 0) prices.push({ currency: 'IDR', price: Number(form.priceIDR) });
      if (form.priceUSD && Number(form.priceUSD) > 0) prices.push({ currency: 'USD', price: Number(form.priceUSD) });
      const bomPayload = bomConversions.map((b) => ({
        productionUnit: b.productionUnit.trim(),
        conversionFactor: parseFloat(b.conversionFactor),
      }));
      await tradingService.updateProduct(id, {
        name: form.name,
        description: form.description,
        unit: form.unit,
        prices,
        weight: Number(form.weight),
        volume: form.volume,
        bomConversions: bomPayload,
      });
      // Attach images if selected
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
        await tradingService.attachProductImages(id, { cover: coverPayload, previews: previewsPayload });
      }
      setSuccess("Product updated");
      setTimeout(() => router.push("/dashboard/products"), 700);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  return (
    <RoleGuard allowedRoles={[Role.SUPPLIER]}>
      <div className="py-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Edit Product</h1>
            <p className="text-sm text-gray-600">Perbarui data produk</p>
          </div>
          <Link href="/dashboard/products" className="px-3 py-1.5 rounded border text-sm text-gray-800">Back</Link>
        </div>

        <div className="bg-white border rounded-lg p-5 max-w-3xl">
          {loading ? (
            <div className="text-sm text-gray-600">Loading...</div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">{error}</div>}
              {success && <div className="p-3 bg-green-50 text-green-700 text-sm rounded border border-green-200">{success}</div>}

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Name</label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm text-gray-800"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Description</label>
                <textarea
                  className="w-full border rounded px-3 py-2 text-sm text-gray-800"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Unit</label>
                  <input
                    className="w-full border rounded px-3 py-2 text-sm text-gray-800"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    placeholder="KG"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Price (IDR)</label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2 text-sm text-gray-800"
                    value={form.priceIDR}
                    onChange={(e) => setForm({ ...form, priceIDR: e.target.value })}
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Price (USD)</label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2 text-sm text-gray-800"
                    value={form.priceUSD}
                    onChange={(e) => setForm({ ...form, priceUSD: e.target.value })}
                    min={0}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Weight</label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2 text-sm text-gray-800"
                    value={form.weight}
                    onChange={(e) => setForm({ ...form, weight: e.target.value })}
                    min={0}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-800 mb-1">Volume</label>
                  <input
                    className="w-full border rounded px-3 py-2 text-sm text-gray-800"
                    value={form.volume}
                    onChange={(e) => setForm({ ...form, volume: e.target.value })}
                    placeholder="e.g. 40 x 40 x 40"
                    required
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
                      <span className="absolute top-2 left-2 text-[10px] bg-white/90 px-2 py-0.5 rounded border text-green-800">Cover</span>
                      <button type="button" onClick={removeCover} className="absolute top-2 right-2 bg-white/95 text-xs px-2 py-1 rounded border text-red-800">Remove</button>
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
                      {previewImages.map((img, idx) => (
                        <div key={`${img.filename}-${idx}`} className="group relative border rounded-lg overflow-hidden bg-white">
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
                          <button type="button" onClick={() => removePreviewAt(idx)} className="absolute top-2 right-2 bg-white/95 text-xs px-2 py-1 rounded border opacity-90 group-hover:opacity-100 text-red-800">Remove</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* BOM Conversion Section */}
              <BomConversionSection
                catalogUnit={form.unit}
                conversions={bomConversions}
                errors={bomErrors}
                onAdd={addBomRow}
                onChange={updateBomRow}
                onRemove={removeBomRow}
              />

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded bg-slate-900 text-white text-sm hover:bg-slate-800 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
