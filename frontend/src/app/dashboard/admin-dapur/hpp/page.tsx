"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { rencanaApi, MonthlyMenuPlan, HPPCalculationResult } from "@/services/produksi.service";
import { dapurService, DapurUnit } from "@/services/dapur.service";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { FiDollarSign, FiCalendar, FiTrendingUp, FiAlertCircle, FiDownload } from "react-icons/fi";

const MONTHS_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export default function HPPEstimationPage() {
  const { user } = useAuth();
  const router = useRouter();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [dapur, setDapur] = useState<DapurUnit | null>(null);
  const [plan, setPlan] = useState<MonthlyMenuPlan | null>(null);
  const [results, setResults] = useState<HPPCalculationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  const loadPlan = useCallback(async () => {
    if (!dapur) return;
    setLoading(true);
    try {
      const p = await rencanaApi.getOrCreate(dapur.id, year, month);
      setPlan(p);
      setResults([]);
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
    try {
      const res = await rencanaApi.calculateHPP(plan.id, dateStart || undefined, dateEnd || undefined);
      setResults(res);
    } catch (e: any) {
      alert("Gagal menghitung HPP: " + e?.response?.data?.message);
    } finally { setCalculating(false); }
  };

  const exportCSV = () => {
    if (!results.length) return;
    const rows = [
      ["Tanggal", "Menu", "Jenis Porsi", "Kuantitas", "Total Biaya Bahan (Rp)", "Estimasi HPP per Porsi (Rp)"],
      ...results.map(r => [
        r.date, 
        r.menuName, 
        r.portionTypeName, 
        r.quantity.toString(),
        r.totalCost.toString(),
        r.hppPerPortion.toFixed(2)
      ]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hpp-estimasi-${MONTHS_ID[month - 1]}-${year}.csv`;
    a.click();
  };

  const summary = useMemo(() => {
    const summaryData: Record<string, { totalHPP: number; count: number }> = {};
    results.forEach(r => {
      if (r.quantity > 0) {
        if (!summaryData[r.portionTypeName]) {
          summaryData[r.portionTypeName] = { totalHPP: 0, count: 0 };
        }
        summaryData[r.portionTypeName].totalHPP += r.hppPerPortion;
        summaryData[r.portionTypeName].count++;
      }
    });

    return Object.entries(summaryData).map(([name, data]) => ({
      name,
      average: data.totalHPP / data.count,
    }));
  }, [results]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FiDollarSign className="text-amber-500" /> Estimasi HPP per Porsi
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Kalkulasi Harga Pokok Produksi (HPP) per porsi berdasarkan data BOM dan riwayat harga bahan baku terakhir di Purchase Order.
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
            <FiTrendingUp className="w-4 h-4" />
            {calculating ? "Menghitung HPP..." : "Hitung Estimasi HPP"}
          </button>
          
          {results.length > 0 && (
             <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
               <FiDownload className="w-4 h-4 text-gray-400" /> Export CSV
             </button>
          )}
        </div>
      </div>

      {plan && (
        <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <FiCalendar className="text-amber-600" />
             </div>
             <div>
               <p className="text-sm font-medium text-amber-900">
                 Data Rencana Menu: <span className="font-bold">{MONTHS_ID[month - 1]} {year}</span>
               </p>
               <p className="text-xs text-amber-700/70 mt-0.5 font-medium">
                 {plan.dailyEntries?.length || 0} hari operasional dipetakan
               </p>
             </div>
          </div>
        </div>
      )}

      {/* Result Section */}
      {results && results.length > 0 ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {summary.map((s, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 transition-all hover:shadow-md">
                <p className="text-3xl font-black text-emerald-600">Rp {s.average.toLocaleString("id-ID", { maximumFractionDigits: 0 })}</p>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1.5">Rata-Rata HPP {s.name}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
             <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
               <h3 className="font-bold text-gray-900 flex items-center gap-2"><FiDollarSign className="text-gray-400" /> Rincian HPP Harian</h3>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full">
                 <thead className="bg-white border-b border-gray-100">
                   <tr>
                     <th className="text-left px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tanggal</th>
                     <th className="text-left px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Menu</th>
                     <th className="text-center px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Jenis Porsi</th>
                     <th className="text-right px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Jml Porsi</th>
                     <th className="text-right px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Biaya Bahan (Rp)</th>
                     <th className="text-right px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Estimasi HPP/Porsi (Rp)</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                   {results.map((r, idx) => (
                     <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                       <td className="px-6 py-4 text-sm font-medium text-gray-500">{r.date}</td>
                       <td className="px-6 py-4">
                         <span className="font-bold text-slate-800">{r.menuName}</span>
                         {r.ingredients.length > 0 && (
                           <p className="text-xs text-slate-400 mt-1">
                             {r.ingredients.length} bahan baku
                           </p>
                         )}
                       </td>
                       <td className="px-6 py-4 text-sm text-center text-gray-500 font-medium">{r.portionTypeName}</td>
                       <td className="px-6 py-4 text-right text-sm font-bold text-amber-600">{r.quantity}</td>
                       <td className="px-6 py-4 text-right text-sm text-slate-700 font-medium">
                         {r.totalCost.toLocaleString("id-ID", { maximumFractionDigits: 0 })}
                       </td>
                       <td className="px-6 py-4 text-right">
                         <span className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg font-bold">
                           {r.hppPerPortion.toLocaleString("id-ID", { maximumFractionDigits: 0 })}
                         </span>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        </div>
      ) : (
        calculating === false && results.length === 0 && plan && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 flex flex-col items-center justify-center text-center">
            <FiAlertCircle className="w-12 h-12 text-amber-400 mb-3" />
            <p className="font-bold text-lg text-amber-900">Belum Ada Data HPP</p>
            <p className="text-sm text-amber-700/80 mt-1 max-w-md">
              Klik "Hitung Estimasi HPP" untuk memproses data dari Rencana Menu bulan ini. Pastikan Anda sudah menyetel porsi di menu kalender & memiliki riwayat belanja PO.
            </p>
          </div>
        )
      )}
    </div>
  );
}
