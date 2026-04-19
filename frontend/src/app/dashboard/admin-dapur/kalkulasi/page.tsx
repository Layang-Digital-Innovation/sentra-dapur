"use client";

import React, { useEffect, useState, useCallback } from "react";
import { rencanaApi, IngredientCalculation, MonthlyMenuPlan } from "@/services/produksi.service";
import { dapurService, DapurUnit } from "@/services/dapur.service";
import { userService } from "@/services/user.service";
import { tradingService } from "@/services/trading.service";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { FiClipboard, FiDownload, FiCalendar, FiPackage, FiAlertCircle, FiShoppingCart, FiCheckCircle, FiInfo } from "react-icons/fi";

const MONTHS_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

interface EditableItem {
  ingredientName: string;
  // Catalog (procurement) fields
  totalGrams: number;
  unit: string;
  // Production (BOM) fields — read-only reference
  productionQty: number;
  productionUnit: string;
  // Conversion info
  conversionFactor: number | null;
  // PO fields
  supplierName: string;
  selectedProductId: string;   // which catalog product was chosen
  pricePerUnit: string;
}

interface BomConversionEntry {
  catalogUnit: string;
  conversionFactor: number;
  productName: string;
  sellerId: string;
  sellerName: string;
}

export default function KalkulasiPOPage() {
  const { user } = useAuth();
  const router = useRouter();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [dapur, setDapur] = useState<DapurUnit | null>(null);
  const [plan, setPlan] = useState<MonthlyMenuPlan | null>(null);
  const [result, setResult] = useState<IngredientCalculation | null>(null);
  const [editableResult, setEditableResult] = useState<EditableItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [creatingPO, setCreatingPO] = useState(false);
  const [successPO, setSuccessPO] = useState(false);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  // productionUnit (lowercase) -> list of BOM conversion entries
  const [bomConversionMap, setBomConversionMap] = useState<Record<string, BomConversionEntry[]>>({});

  useEffect(() => {
    userService.getAllUsers({ role: 'SUPPLIER' as any }).then(res => setSuppliers(res.users)).catch(console.error);
    tradingService.getApprovedProducts().then(res => {
      setProducts(res);
      const map: Record<string, BomConversionEntry[]> = {};
      for (const product of res) {
        if (!Array.isArray(product.bomConversions)) continue;
        for (const bom of product.bomConversions) {
          const key = bom.productionUnit.toLowerCase().trim();
          if (!map[key]) map[key] = [];
          map[key].push({
            catalogUnit: product.unit,
            conversionFactor: bom.conversionFactor,
            productName: product.name,
            sellerId: product.sellerId,
            sellerName: product.seller?.fullname || product.seller?.email || "",
          });
        }
      }
      setBomConversionMap(map);
    }).catch(console.error);
  }, []);

  const loadPlan = useCallback(async () => {
    if (!dapur) return;
    setLoading(true);
    try {
      const p = await rencanaApi.getOrCreate(dapur.id, year, month);
      setPlan(p);
      setResult(null);
      setEditableResult([]);
      setSuccessPO(false);
    } finally { setLoading(false); }
  }, [dapur, year, month]);

  useEffect(() => {
    if (user?.user.role !== "ADMIN_DAPUR" && user?.user.role !== "PRODUKSI") {
      router.replace("/dashboard");
      return;
    }
    dapurService.getMyDapur().then(data => {
      const d = data?.[0];
      setDapur(d || null);
    });
  }, [user, router]);

  useEffect(() => { if (dapur) loadPlan(); }, [dapur, loadPlan]);

  const calculate = async () => {
    if (!plan) return;
    setCalculating(true);
    setSuccessPO(false);
    try {
      const res = await rencanaApi.calculateNeeds(plan.id, dateStart || undefined, dateEnd || undefined);
      setResult(res);
      setEditableResult(res.ingredients.map((i: any): EditableItem => {
        const unitKey = (i.unit || '').toLowerCase().trim();
        const conversions = bomConversionMap[unitKey];
        const best = conversions?.[0];

        if (best) {
          const catalogQty = i.totalGrams / best.conversionFactor;
          const autoSupplier = best.sellerName || "";
          // Find the exact product that has this BOM conversion
          const matchProduct = products.find(p =>
            p.sellerId === best.sellerId &&
            Array.isArray(p.bomConversions) &&
            p.bomConversions.some((b: any) => b.productionUnit.toLowerCase().trim() === unitKey)
          );
          const autoPrice = matchProduct
            ? String(matchProduct.prices?.find((pr: any) => pr.currency === "IDR")?.price || matchProduct.price || 0)
            : "0";

          return {
            ingredientName: i.ingredientName,
            totalGrams: parseFloat(catalogQty.toFixed(6)),
            unit: best.catalogUnit,
            productionQty: i.totalGrams,
            productionUnit: i.unit,
            conversionFactor: best.conversionFactor,
            supplierName: autoSupplier,
            selectedProductId: matchProduct?.id || "",
            pricePerUnit: autoPrice,
          };
        }

        return {
          ingredientName: i.ingredientName,
          totalGrams: i.totalGrams,
          unit: i.unit,
          productionQty: i.totalGrams,
          productionUnit: i.unit,
          conversionFactor: null,
          supplierName: "",
          selectedProductId: "",
          pricePerUnit: "0",
        };
      }));
    } catch (e: any) {
      alert("Gagal mengkalkulasi PO: " + e?.response?.data?.message);
    } finally { setCalculating(false); }
  };

  const handleEditChange = (index: number, field: string, value: string | number) => {
    setEditableResult(prev => {
      const arr = [...prev] as any[];
      arr[index] = { ...arr[index], [field]: value };

      if (field === "supplierName") {
        // When supplier changes, reset product selection and price
        arr[index].selectedProductId = "";
        arr[index].pricePerUnit = "0";
      }

      if (field === "selectedProductId") {
        // When product is selected, auto-fill price and unit
        const product = products.find((p: any) => p.id === value);
        if (product) {
          const idrPrice = product.prices?.find((pr: any) => pr.currency === "IDR")?.price || product.price || 0;
          arr[index].pricePerUnit = String(idrPrice);
          // If product has a BOM conversion matching current productionUnit, update catalog unit & qty
          const unitKey = (arr[index].productionUnit || '').toLowerCase().trim();
          const matchBom = product.bomConversions?.find((b: any) => b.productionUnit.toLowerCase().trim() === unitKey);
          if (matchBom) {
            arr[index].unit = product.unit;
            arr[index].conversionFactor = matchBom.conversionFactor;
            arr[index].totalGrams = parseFloat((arr[index].productionQty / matchBom.conversionFactor).toFixed(6));
          }
        } else {
          arr[index].pricePerUnit = "0";
        }
      }

      return arr;
    });
  };

  const createPO = async () => {
    if (!editableResult.length || !dapur) return;

    for (const item of editableResult) {
      if (!item.supplierName?.trim()) {
        alert(`⚠️ Mohon pilih supplier untuk item "${item.ingredientName}"`);
        return;
      }
      if (!item.totalGrams || item.totalGrams <= 0) {
        alert(`⚠️ Kuantitas untuk item "${item.ingredientName}" harus lebih dari 0`);
        return;
      }
      if (!item.pricePerUnit || parseFloat(item.pricePerUnit) <= 0) {
        alert(`⚠️ Harga satuan untuk item "${item.ingredientName}" harus lebih dari 0`);
        return;
      }
      if (!item.unit?.trim()) {
        alert(`⚠️ Mohon isi satuan untuk item "${item.ingredientName}"`);
        return;
      }
    }

    if (!confirm("Buat Purchase Order otomatis dengan data tabel saat ini?")) return;
    setCreatingPO(true);
    try {
      const items = editableResult.map(i => {
        const catalogProduct = products.find((p: any) => p.id === (i as any).selectedProductId);
        return {
          productName: catalogProduct?.name || i.ingredientName,
          productId: catalogProduct?.id || undefined,
          quantity: i.totalGrams,
          unit: i.unit,
          supplierName: i.supplierName || undefined,
          pricePerUnit: parseFloat(i.pricePerUnit) || 0,
        };
      });
      await dapurService.createPO(dapur.id, items);
      setSuccessPO(true);
    } catch (e: any) {
      alert("Gagal membuat PO: " + e?.response?.data?.message);
    } finally {
      setCreatingPO(false);
    }
  };

  const exportCSV = () => {
    if (!editableResult.length) return;
    const rows = [
      ["Nama Bahan", "Kebutuhan Produksi", "Satuan Produksi", "Kuantitas Pengadaan", "Satuan Katalog", "Supplier", "Harga/Satuan (Rp)", "Total Estimasi (Rp)"],
      ...editableResult.map(i => [
        i.ingredientName,
        i.productionQty.toString(),
        i.productionUnit,
        i.totalGrams.toString(),
        i.unit,
        i.supplierName,
        i.pricePerUnit,
        (i.totalGrams * (parseFloat(i.pricePerUnit) || 0)).toFixed(0),
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kalkulasi-po-${MONTHS_ID[month - 1]}-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalEstimasi = editableResult.reduce((sum, item) => sum + (item.totalGrams * (parseFloat(item.pricePerUnit) || 0)), 0);
  const convertedCount = editableResult.filter(i => i.conversionFactor !== null).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FiClipboard className="text-amber-500" /> PO Automation
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Hitung akumulasi kebutuhan bahan baku dari BOM, konversi otomatis ke satuan katalog supplier, dan buat Purchase Order 1-klik.
        </p>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-800 mb-5 flex items-center gap-2">
          <FiCalendar className="text-amber-500" /> Filter Periode Kalkulasi
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Bulan</label>
            <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white">
              {MONTHS_ID.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Tahun</label>
            <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Dari Tanggal (opt)</label>
            <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Sampai Tanggal (opt)</label>
            <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3 pt-5 border-t border-gray-100">
          <button onClick={calculate} disabled={calculating || !plan} className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 text-white rounded-lg font-bold hover:bg-amber-600 disabled:opacity-50 transition-all shadow-sm">
            <FiPackage className="w-4 h-4" />
            {calculating ? "Mengakumulasi Data..." : "Kalkulasi Kebutuhan"}
          </button>
          {result && result.ingredients.length > 0 && (
            <>
              <button disabled={creatingPO || successPO} onClick={createPO} className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all">
                {successPO ? <FiCheckCircle className="w-4 h-4 text-emerald-400" /> : <FiShoppingCart className="w-4 h-4" />}
                {creatingPO ? "Memproses PO..." : successPO ? "PO Terkirim" : "Buat PO 1-Click"}
              </button>
              <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                <FiDownload className="w-4 h-4 text-gray-400" /> Export CSV
              </button>
            </>
          )}
        </div>
        {successPO && (
          <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center gap-3 text-emerald-800 font-medium">
            <FiCheckCircle className="w-5 h-5 text-emerald-500" />
            Purchase Order berhasil dibuat dan menunggu persetujuan Admin Pusat!
          </div>
        )}
      </div>

      {/* Plan status */}
      {plan && (
        <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <FiCalendar className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-900">Data Sumber: <span className="font-bold">{MONTHS_ID[month - 1]} {year}</span></p>
              <p className="text-xs text-amber-700/70 mt-0.5 font-medium">{plan.dailyEntries?.length || 0} hari operasional</p>
            </div>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
              <p className="text-3xl font-black text-amber-600">{result.ingredients.length}</p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1.5">Jenis Bahan (SKU)</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
              <p className="text-3xl font-black text-slate-700">{result.entriesCount}</p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1.5">Jadwal Operasional</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
              <p className="text-3xl font-black text-blue-600">{convertedCount}</p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1.5">Terkonversi ke Katalog</p>
            </div>
          </div>

          {/* BOM conversion info banner */}
          {convertedCount > 0 && (
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <FiInfo className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700">
                <span className="font-semibold">{convertedCount} dari {result.ingredients.length} bahan</span> telah dikonversi otomatis ke satuan katalog supplier menggunakan data Konversi BOM.
                Satuan dan kuantitas yang tampil di kolom <span className="font-semibold">Kuantitas Pengadaan</span> sudah siap digunakan untuk PO ke supplier.
              </p>
            </div>
          )}

          {result.ingredients.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 flex flex-col items-center justify-center text-center">
              <FiAlertCircle className="w-12 h-12 text-amber-400 mb-3" />
              <p className="font-bold text-lg text-amber-900">Tidak ada data kalkulasi</p>
              <p className="text-sm text-amber-700/80 mt-1 max-w-md">Pastikan Anda sudah memplot jadwal menu dan menyetel penerima manfaat pada kalender bulan tersebut.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Header */}
              <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <FiClipboard className="text-gray-400" /> Rincian Akumulasi Pemesanan
                </h3>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest bg-white border border-gray-200 px-3 py-1.5 rounded-full">
                  {dateStart || 'Awal'} s/d {dateEnd || 'Akhir'} ({MONTHS_ID[month - 1]})
                </span>
              </div>

              {/* Card list */}
              <div className="divide-y divide-gray-100">
                {editableResult.map((ing, idx) => {
                  const subtotal = ing.totalGrams * (parseFloat(ing.pricePerUnit) || 0);
                  const hasConversion = ing.conversionFactor !== null;
                  const selectedSupplier = suppliers.find(s => s.fullName === ing.supplierName || s.email === ing.supplierName);
                  const supplierProducts = selectedSupplier
                    ? products.filter((p: any) => p.sellerId === selectedSupplier.id)
                    : [];

                  return (
                    <div key={idx} className={`p-5 transition-colors ${hasConversion ? 'hover:bg-blue-50/20' : 'hover:bg-gray-50/60'}`}>
                      {/* Row top: number + name + BOM badge + subtotal */}
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-gray-900 text-base">{ing.ingredientName}</span>
                              {hasConversion && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-600 border border-blue-200">
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                  BOM Terkonversi
                                </span>
                              )}
                            </div>
                            {/* BOM conversion trail */}
                            {hasConversion && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-xs text-gray-500 font-medium">
                                  {ing.productionQty.toLocaleString('id-ID')} {ing.productionUnit}
                                </span>
                                <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                                <span className="text-xs font-bold text-blue-600">
                                  {ing.totalGrams} {ing.unit}
                                </span>
                                <span className="text-[10px] text-gray-400">(÷ {ing.conversionFactor!.toLocaleString('id-ID')})</span>
                              </div>
                            )}
                            {!hasConversion && (
                              <span className="text-xs text-gray-400 mt-0.5 block">
                                {ing.productionQty.toLocaleString('id-ID')} {ing.productionUnit} — belum ada konversi BOM
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Subtotal */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Subtotal</p>
                          <p className={`text-lg font-black ${subtotal > 0 ? 'text-slate-800' : 'text-gray-300'}`}>
                            {subtotal > 0 ? `Rp ${subtotal.toLocaleString('id-ID')}` : '—'}
                          </p>
                        </div>
                      </div>

                      {/* Row bottom: 4 input fields in a grid */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 ml-10">
                        {/* Kuantitas + Satuan */}
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                            Kuantitas Pengadaan
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              step="0.0001"
                              className={`flex-1 border text-sm font-bold text-right rounded-lg px-3 py-2 focus:ring-2 outline-none transition-all min-w-0 ${
                                hasConversion
                                  ? 'border-blue-200 bg-blue-50 text-blue-700 focus:ring-blue-200 focus:border-blue-400'
                                  : 'border-amber-200 bg-amber-50 text-amber-700 focus:ring-amber-200 focus:border-amber-400'
                              }`}
                              value={ing.totalGrams}
                              onChange={(e) => handleEditChange(idx, "totalGrams", parseFloat(e.target.value) || 0)}
                            />
                            <input
                              type="text"
                              className={`w-14 border text-sm font-bold rounded-lg px-2 py-2 focus:ring-2 outline-none transition-all text-center ${
                                hasConversion
                                  ? 'border-blue-200 bg-blue-50 text-blue-700 focus:ring-blue-200 focus:border-blue-400'
                                  : 'border-gray-200 bg-gray-50 text-gray-600 focus:ring-gray-200 focus:border-gray-400'
                              }`}
                              value={ing.unit}
                              onChange={(e) => handleEditChange(idx, "unit", e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Supplier */}
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                            Supplier
                          </label>
                          <select
                            className="w-full bg-white border border-gray-200 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-400 outline-none transition-all"
                            value={ing.supplierName}
                            onChange={(e) => handleEditChange(idx, "supplierName", e.target.value)}
                          >
                            <option value="">-- Pilih Supplier --</option>
                            {suppliers.map((s, i) => (
                              <option key={i} value={s.fullName || s.email}>{s.fullName || s.email}</option>
                            ))}
                          </select>
                        </div>

                        {/* Produk Katalog */}
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                            Produk Katalog
                          </label>
                          <select
                            className={`w-full bg-white border text-sm rounded-lg px-3 py-2 focus:ring-2 outline-none transition-all ${
                              ing.selectedProductId
                                ? 'border-blue-200 text-blue-700 focus:ring-blue-300'
                                : 'border-gray-200 text-gray-400 focus:ring-gray-200'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            value={ing.selectedProductId}
                            onChange={(e) => handleEditChange(idx, "selectedProductId", e.target.value)}
                            disabled={!ing.supplierName}
                          >
                            <option value="">{ing.supplierName ? '-- Pilih Produk --' : 'Pilih supplier dulu'}</option>
                            {supplierProducts.map((p: any) => (
                              <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                            ))}
                          </select>
                        </div>

                        {/* Harga */}
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                            Harga / Satuan (Rp)
                          </label>
                          <input
                            type="number"
                            placeholder="0"
                            className="w-full bg-white border border-gray-200 text-sm font-semibold text-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-400 outline-none transition-all"
                            value={ing.pricePerUnit}
                            onChange={(e) => handleEditChange(idx, "pricePerUnit", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer total */}
              <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Estimasi Pengadaan</p>
                  <p className="text-sm text-slate-400 mt-0.5">{editableResult.length} item bahan baku</p>
                </div>
                <p className="text-2xl font-black text-amber-400">
                  Rp {totalEstimasi.toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
