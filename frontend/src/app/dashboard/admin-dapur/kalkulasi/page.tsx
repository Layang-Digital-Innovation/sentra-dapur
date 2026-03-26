"use client";

import React, { useEffect, useState, useCallback } from "react";
import { rencanaApi, IngredientCalculation, MonthlyMenuPlan } from "@/services/produksi.service";
import { dapurService, DapurUnit } from "@/services/dapur.service";
import { userService } from "@/services/user.service";
import { tradingService } from "@/services/trading.service";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { FiClipboard, FiDownload, FiCalendar, FiPackage, FiAlertCircle, FiShoppingCart, FiCheckCircle } from "react-icons/fi";

const MONTHS_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export default function KalkulasiPOPage() {
  const { user } = useAuth();
  const router = useRouter();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [dapur, setDapur] = useState<DapurUnit | null>(null);
  const [plan, setPlan] = useState<MonthlyMenuPlan | null>(null);
  const [result, setResult] = useState<IngredientCalculation | null>(null);
  const [editableResult, setEditableResult] = useState<{ ingredientName: string; unit: string; totalGrams: number; supplierName: string; pricePerUnit: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [creatingPO, setCreatingPO] = useState(false);
  const [successPO, setSuccessPO] = useState(false);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    userService.getAllUsers({ role: 'SUPPLIER' as any }).then(res => setSuppliers(res.users)).catch(console.error);
    tradingService.getApprovedProducts().then(res => setProducts(res)).catch(console.error);
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
      setEditableResult(res.ingredients.map((i: any) => ({
        ingredientName: i.ingredientName,
        totalGrams: i.totalGrams,
        unit: i.unit,
        supplierName: "",
        pricePerUnit: "0"
      })));
    } catch (e: any) {
      alert("Gagal mengkalkulasi PO: " + e?.response?.data?.message);
    } finally { setCalculating(false); }
  };

  const handleEditChange = (index: number, field: string, value: string | number) => {
    setEditableResult(prev => {
      const arr = [...prev];
      arr[index] = { ...arr[index], [field]: value };
      
      // Auto-fill price when supplier is selected
      if (field === "supplierName") {
         const selectedSupplier = suppliers.find(s => s.fullName === value || s.email === value);
         if (selectedSupplier) {
           const supplierProducts = products.filter(p => p.sellerId === selectedSupplier.id);
           const matchingProduct = supplierProducts.find(p => 
             p.name.toLowerCase().includes(arr[index].ingredientName.toLowerCase()) || 
             arr[index].ingredientName.toLowerCase().includes(p.name.toLowerCase())
           );
           
           if (matchingProduct) {
             const idrPrice = matchingProduct.prices?.find((pr: any) => pr.currency === "IDR")?.price || matchingProduct.price || 0;
             arr[index].pricePerUnit = String(idrPrice);
           } else {
             arr[index].pricePerUnit = "0";
           }
         } else {
           arr[index].pricePerUnit = "0"; // Tidak ada supplier yang dipilih
         }
      }

      return arr;
    });
  };

  const createPO = async () => {
    if (!editableResult.length || !dapur) return;

    // Validation
    for (const item of editableResult) {
      if (!item.supplierName || item.supplierName.trim() === "") {
        alert(`⚠️ Peringatan: Mohon pilih supplier untuk item "${item.ingredientName}"`);
        return;
      }
      if (!item.totalGrams || item.totalGrams <= 0) {
        alert(`⚠️ Peringatan: Kuantitas untuk item "${item.ingredientName}" harus lebih dari 0`);
        return;
      }
      if (!item.pricePerUnit || parseFloat(item.pricePerUnit) <= 0) {
        alert(`⚠️ Peringatan: Harga satuan untuk item "${item.ingredientName}" harus lebih dari 0`);
        return;
      }
      if (!item.unit || item.unit.trim() === "") {
        alert(`⚠️ Peringatan: Mohon isi satuan untuk item "${item.ingredientName}"`);
        return;
      }
    }

    if (!confirm("Buat Purchase Order otomatis dengan data tabel saat ini?")) return;
    setCreatingPO(true);
    try {
      const items = editableResult.map(i => ({
        productName: i.ingredientName,
        quantity: i.totalGrams,
        unit: i.unit,
        supplierName: i.supplierName || undefined,
        pricePerUnit: parseFloat(i.pricePerUnit) || 0
      }));
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
      ["Nama Bahan", "Satuan", "Total Dibutuhkan (Gram)", "Dibutuhkan (Kg)", "Supplier", "Harga Estimasi"],
      ...editableResult.map(i => [
        i.ingredientName, 
        i.unit, 
        i.totalGrams.toString(), 
        (i.totalGrams/1000).toFixed(2),
        i.supplierName,
        i.pricePerUnit
      ]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kalkulasi-po-${MONTHS_ID[month - 1]}-${year}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FiClipboard className="text-amber-500" /> PO Automation
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Hitung akumulasi/total kebutuhan raw material dari resep (BOM) berdasarkan sasaran penerima manfaat, dan buat Purchase Order dengan 1-klik.
        </p>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-800 mb-5 flex items-center gap-2"><FiCalendar className="text-amber-500" /> Filter Periode Kalkulasi</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Bulan</label>
            <select
              value={month}
              onChange={e => setMonth(parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            >
              {MONTHS_ID.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Tahun</label>
            <input
              type="number"
              value={year}
              onChange={e => setYear(parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Dari Tanggal (opt)</label>
            <input
              type="date"
              value={dateStart}
              onChange={e => setDateStart(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Sampai Tanggal (opt)</label>
            <input
              type="date"
              value={dateEnd}
              onChange={e => setDateEnd(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3 pt-5 border-t border-gray-100">
          <button
            onClick={calculate}
            disabled={calculating || !plan}
            className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 text-white rounded-lg font-bold hover:bg-amber-600 disabled:opacity-50 transition-all shadow-sm focus:ring-4 focus:ring-amber-500/20"
          >
            <FiPackage className="w-4 h-4" />
            {calculating ? "Mengakumulasi Data..." : "Kalkulasi Kebutuhan"}
          </button>
          {result && result.ingredients.length > 0 && (
            <>
              <button disabled={creatingPO || successPO} onClick={createPO} className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm focus:ring-4 focus:ring-slate-900/20 transition-all">
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
                Purchase Order berhasil dibuat otomatis dan menunggu persetujuan (Approval) dari Admin Pusat!
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
               <p className="text-sm font-medium text-amber-900">
                 Data Sumber: <span className="font-bold">{MONTHS_ID[month - 1]} {year}</span>
               </p>
               <p className="text-xs text-amber-700/70 mt-0.5 font-medium">
                 {plan.dailyEntries?.length || 0} hari operasional
               </p>
             </div>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center transition-all hover:shadow-md">
              <p className="text-3xl font-black text-amber-600">{result.ingredients.length}</p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1.5">Jenis Bahan (SKU)</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center transition-all hover:shadow-md">
              <p className="text-3xl font-black text-slate-700">{result.entriesCount}</p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1.5">Jadwal Operasional</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center transition-all hover:shadow-md">
              <p className="text-xl font-black text-emerald-600">
                {result.ingredients.length} SKU
              </p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1.5">Estimasi Item Unik</p>
            </div>
          </div>

          {result.ingredients.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 flex flex-col items-center justify-center text-center">
              <FiAlertCircle className="w-12 h-12 text-amber-400 mb-3" />
              <p className="font-bold text-lg text-amber-900">Tidak ada data kalkulasi</p>
              <p className="text-sm text-amber-700/80 mt-1 max-w-md">
                Pastikan Anda sudah memplot jadwal menu dan menyetel penerima manfaat pada kalender bulan tersebut.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
                <h3 className="font-bold text-gray-900 flex items-center gap-2"><FiClipboard className="text-gray-400" /> Rincian Akumulasi Pemesanan</h3>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest bg-white border border-gray-200 px-3 py-1.5 rounded-full">{dateStart || 'Awal'} s/d {dateEnd || 'Akhir'} ({MONTHS_ID[month - 1]})</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white border-b border-gray-100">
                    <tr>
                      <th className="text-left px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">No</th>
                      <th className="text-left px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">SKU / Nama Bahan Baku</th>
                      <th className="text-center px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Satuan Dasar</th>
                      <th className="text-right px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kuantitas Pengadaan</th>
                      <th className="text-left px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Satuan Pengadaan</th>
                      <th className="text-left px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Supplier</th>
                      <th className="text-left px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Harga/Satuan Dasar (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {editableResult.map((ing, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-400">{idx + 1}</td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-800">{ing.ingredientName}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-center text-gray-500 font-medium">{ing.unit}</td>
                        <td className="px-6 py-4 text-right">
                          <input 
                            type="number"
                            className="bg-white border border-gray-300 text-amber-600 font-black text-right rounded-md px-2 py-1.5 w-24 focus:ring-2 focus:ring-amber-500 outline-none"
                            value={ing.totalGrams}
                            onChange={(e) => handleEditChange(idx, "totalGrams", parseInt(e.target.value) || 0)}
                          />
                        </td>
                        <td className="px-6 py-4 text-left">
                          <input 
                            type="text"
                            placeholder="Satuan"
                            className="bg-white border border-gray-300 text-sm font-bold text-emerald-600 rounded-md px-2 py-1.5 w-24 focus:ring-2 focus:ring-amber-500 outline-none"
                            value={ing.unit || ""}
                            onChange={(e) => handleEditChange(idx, "unit", e.target.value)}
                          />
                        </td>
                        <td className="px-6 py-4 text-left">
                          <select
                            className="bg-white border border-gray-300 text-sm rounded-md px-2 py-1.5 w-36 focus:ring-2 focus:ring-amber-500 outline-none"
                            value={ing.supplierName}
                            onChange={(e) => handleEditChange(idx, "supplierName", e.target.value)}
                          >
                            <option value="">-- Pilih --</option>
                            {suppliers.map((s, i) => (
                              <option key={i} value={s.fullName || s.email}>{s.fullName || s.email}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4 text-left">
                          <input 
                            type="number"
                            placeholder="0"
                            className="bg-white border border-gray-300 text-sm font-medium text-slate-700 right rounded-md px-2 py-1.5 w-28 focus:ring-2 focus:ring-amber-500 outline-none"
                            value={ing.pricePerUnit}
                            onChange={(e) => handleEditChange(idx, "pricePerUnit", e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-900">
                    <tr>
                      <td colSpan={3} className="px-6 py-5 font-bold text-white text-[11px] uppercase tracking-widest">TOTAL VOLUME KESELURUHAN</td>
                      <td className="px-6 py-5 text-right font-black text-white text-lg">
                        {editableResult.reduce((sum, item) => sum + item.totalGrams, 0).toLocaleString("id-ID")}
                      </td>
                      <td className="px-6 py-5 text-right font-bold text-emerald-400 text-lg">
                         -
                      </td>
                      <td colSpan={2} className="px-6 py-5 text-right font-black text-amber-400 text-lg">
                        Rp {editableResult.reduce((sum, item) => sum + (item.totalGrams * (parseFloat(item.pricePerUnit) || 0)), 0).toLocaleString("id-ID")}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
