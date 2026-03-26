"use client";

import React, { useEffect, useState, useMemo } from "react";
import { dapurService, DapurUnit } from "@/services/dapur.service";
import {
  FiDownload,
  FiFileText,
  FiTrendingUp,
  FiPackage,
  FiDollarSign,
  FiBarChart2,
  FiCalendar,
  FiChevronDown,
  FiLoader,
  FiAlertCircle,
  FiFile,
} from "react-icons/fi";

// ─── Types ────────────────────────────────────────────────

type ArusKasRow = {
  id: string; transactionDate: string; referenceNo?: string;
  description: string; type: 'IN' | 'OUT'; amount: number; bookType?: string;
};
type POItem = {
  productName: string; quantity: number; unit?: string;
  supplierName?: string; pricePerUnit?: number; total?: number;
};
type PORow = {
  id: string; createdAt: string; items: POItem[]; status?: string; type?: string;
};
type LBBPRow = {
  id: string; transactionDate: string; productName: string; quantity: number;
  unit: string; pricePerUnit: number; total: number; supplierName?: string;
};

const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

// ─── Tabs Config ──────────────────────────────────────────

const TABS = [
  { id: 'bku',    label: 'BKU',    title: 'Buku Kas Umum',              icon: FiDollarSign,  color: 'amber' },
  { id: 'bkk',    label: 'BKK',    title: 'Buku Kas Pembantu',          icon: FiFileText,    color: 'indigo' },
  { id: 'lbbp',   label: 'LBBP',   title: 'Laporan Biaya Bahan Pangan', icon: FiPackage,     color: 'green' },
  { id: 'lbo',    label: 'LBO',    title: 'Laporan Biaya Operasional', icon: FiTrendingUp,  color: 'purple' },
  { id: 'lbs',    label: 'LBS',    title: 'Laporan Biaya Sewa',         icon: FiDollarSign,  color: 'rose' },
  { id: 'lra',    label: 'LRA',    title: 'Realisasi Anggaran',         icon: FiBarChart2,   color: 'cyan' },
  { id: 'lpd2m',  label: 'LPD2M',  title: 'Rekapitulasi Bulanan',       icon: FiCalendar,    color: 'slate' },
  { id: 'kartu-stok', label: 'Kartu Stok', title: 'Kartu Persediaan Bahan Pangan', icon: FiPackage, color: 'indigo' },
  { id: 'stok-opname', label: 'Opname', title: 'Berita Acara Stok Opname', icon: FiFileText, color: 'rose' },
] as const;

type TabId = typeof TABS[number]['id'];

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-800' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-800' },
  green:  { bg: 'bg-emerald-50',text: 'text-emerald-700',border: 'border-emerald-200',badge: 'bg-emerald-100 text-emerald-800' },
  purple: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', badge: 'bg-violet-100 text-violet-800' },
  rose:   { bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200',   badge: 'bg-rose-100 text-rose-800' },
  cyan:   { bg: 'bg-cyan-50',   text: 'text-cyan-700',   border: 'border-cyan-200',   badge: 'bg-cyan-100 text-cyan-800' },
  slate:  { bg: 'bg-slate-50',  text: 'text-slate-700',  border: 'border-slate-200',  badge: 'bg-slate-100 text-slate-800' },
};

const fmtIDR = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

// ─── Main Component ───────────────────────────────────────

export default function LaporanKeuanganPage() {
  const [dapur, setDapur] = useState<DapurUnit | null>(null);
  const [bku, setBku] = useState<ArusKasRow[]>([]);
  const [bkk, setBkk] = useState<ArusKasRow[]>([]);
  const [pos, setPos] = useState<PORow[]>([]);
  const [stok, setStok] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('bku');
  const [generating, setGenerating] = useState<string | null>(null);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  // ── Fetch ─────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const dapurs = await dapurService.getMyDapur();
        if (!dapurs.length) return;
        const d = dapurs[0];
        setDapur(d);
        const [bkuData, bkkData, poData, stokData] = await Promise.all([
          dapurService.getArusKas(d.id, 'UMUM'),
          dapurService.getArusKas(d.id, 'PEMBANTU'),
          dapurService.getPurchaseOrders(),
          dapurService.getMyStok('BAHAN'),
        ]);
        setBku(bkuData);
        setBkk(bkkData);
        setPos(poData);
        setStok(stokData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Derived LBBP data from POs ────────────────────────
  const lbbp: LBBPRow[] = useMemo(() => {
    const rows: LBBPRow[] = [];
    pos.filter(p => p.type === 'BAHAN' || !p.type).forEach(po => {
      (po.items || []).forEach((item, idx) => {
        rows.push({
          id: `${po.id}-${idx}`,
          transactionDate: po.createdAt,
          productName: item.productName,
          quantity: item.quantity,
          unit: item.unit || 'kg',
          pricePerUnit: item.pricePerUnit || 0,
          total: item.total || (item.quantity * (item.pricePerUnit || 0)),
          supplierName: item.supplierName || '-',
        });
      });
    });
    return rows;
  }, [pos]);

  // ── Derived LBO data from Kas & PO Gudang Lain ────────
  const lboList: ArusKasRow[] = useMemo(() => {
    const fromKas = [...bku, ...bkk].filter(r => {
      if (r.type !== 'OUT') return false;
      const desc = r.description.toLowerCase();
      if (desc.includes('[operasional]')) return true;
      if (desc.includes('[sewa]') || desc.includes('[lain-lain]')) return false;
      // Legacy fallback: untagged Kas Pembantu is considered operasional
      if (r.bookType === 'PEMBANTU') return true;
      return false;
    });

    const fromPoLain: ArusKasRow[] = [];
    pos.filter(p => p.type === 'LAIN').forEach(po => {
      (po.items || []).forEach((item, idx) => {
        fromPoLain.push({
          id: `po-lain-${po.id}-${idx}`,
          transactionDate: po.createdAt,
          description: `Pembelian Gudang Lain: ${item.productName} (${item.quantity} ${item.unit || ''})`,
          type: 'OUT',
          amount: item.total || (item.quantity * (item.pricePerUnit || 0)),
        });
      });
    });
    return [...fromKas, ...fromPoLain].sort((a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime());
  }, [bku, bkk, pos]);

  // ── LRA computed ─────────────────────────────────────
  const lraData = useMemo(() => {
    const filterPeriode = (arr: ArusKasRow[]) =>
      arr.filter(d => {
        const dt = new Date(d.transactionDate);
        return dt.getMonth() + 1 === month && dt.getFullYear() === year;
      });
    const bkuF = filterPeriode(bku);
    const bkkF = filterPeriode(bkk);
    const lbbpF = lbbp.filter(d => {
      const dt = new Date(d.transactionDate);
      return dt.getMonth() + 1 === month && dt.getFullYear() === year;
    });

    const totalMasukBKU = bkuF.filter(r => r.type === 'IN').reduce((s, r) => s + r.amount, 0);
    const totalMasukBKK = bkkF.filter(r => r.type === 'IN').reduce((s, r) => s + r.amount, 0);
    const bahanPangan = lbbpF.reduce((s, r) => s + r.total, 0);
    const lboF = filterPeriode(lboList);
    const operasional = lboF.reduce((s, r) => s + r.amount, 0);
    const sewa = [...bkuF, ...bkkF].filter(r => r.type === 'OUT' && r.description.toLowerCase().includes('sewa')).reduce((s, r) => s + r.amount, 0);

    return {
      pendapatan: [
        { label: 'Dana BGN / Bantuan Pemerintah', amount: totalMasukBKU },
        { label: 'Dana Operasional (Kas Kecil)', amount: totalMasukBKK },
      ],
      belanja: [
        { label: 'Biaya Bahan Pangan', amount: bahanPangan },
        { label: 'Biaya Operasional', amount: operasional },
        { label: 'Biaya Sewa', amount: sewa },
      ],
    };
  }, [bku, bkk, lbbp, lboList, month, year]);

  // ── LPD2M rows ───────────────────────────────────────
  const lpd2mData = useMemo(() => {
    return BULAN.map((bulan, idx) => {
      const m = idx + 1;
      const filter = (arr: ArusKasRow[]) =>
        arr.filter(d => {
          const dt = new Date(d.transactionDate);
          return dt.getMonth() + 1 === m && dt.getFullYear() === year;
        });
      const bkuM = filter(bku);
      const bkkM = filter(bkk);
      const lbbpM = lbbp.filter(d => {
        const dt = new Date(d.transactionDate);
        return dt.getMonth() + 1 === m && dt.getFullYear() === year;
      });

      const penerimaan = bkuM.filter(r => r.type === 'IN').reduce((s, r) => s + r.amount, 0)
        + bkkM.filter(r => r.type === 'IN').reduce((s, r) => s + r.amount, 0);
      const bahanPangan = lbbpM.reduce((s, r) => s + r.total, 0);
      const lboM = filter(lboList);
      const operasional = lboM.reduce((s, r) => s + r.amount, 0);
      const sewa = [...bkuM, ...bkkM].filter(r => r.type === 'OUT' && r.description.toLowerCase().includes('sewa')).reduce((s, r) => s + r.amount, 0);
      const totalPengeluaran = bahanPangan + operasional + sewa;

      return { bulan, saldoAwal: 0, penerimaan, bahanPangan, operasional, sewa, totalPengeluaran, saldoAkhir: penerimaan - totalPengeluaran };
    });
  }, [bku, bkk, lbbp, lboList, year]);

  // ── Download Handlers ─────────────────────────────────
  const download = async (type: 'excel' | 'pdf', reportId: string) => {
    if (!dapur) return;
    const key = `${type}-${reportId}`;
    setGenerating(key);
    try {
      if (type === 'excel') {
        const { generateBKUExcel, generateLBBPExcel, generateLBOExcel, generateLRAExcel, generateLPD2MExcel, generateKartuStokExcel, generateStokOpnameExcel } = await import('@/lib/laporan-excel');
        if (reportId === 'bku') generateBKUExcel(bku, dapur.name, 'UMUM', month, year);
        if (reportId === 'bkk') generateBKUExcel(bkk, dapur.name, 'PEMBANTU', month, year);
        if (reportId === 'lbbp') generateLBBPExcel(lbbp, dapur.name, month, year);
        if (reportId === 'lbo') generateLBOExcel(lboList, dapur.name, 'LBO', month, year);
        if (reportId === 'lbs') generateLBOExcel([...bku, ...bkk], dapur.name, 'LBS', month, year);
        if (reportId === 'lra') generateLRAExcel(lraData, dapur.name, month, year);
        if (reportId === 'lpd2m') generateLPD2MExcel(lpd2mData, dapur.name, year);
        if (reportId === 'kartu-stok') generateKartuStokExcel(stok, dapur.name);
        if (reportId === 'stok-opname') generateStokOpnameExcel(stok, dapur.name);
      } else {
        const { generateBKUPdf, generateLBBPPdf, generateLBOPdf, generateLRAPdf, generateLPD2MPdf, generateKartuStokPdf, generateStokOpnamePdf } = await import('@/lib/laporan-pdf');
        if (reportId === 'bku') generateBKUPdf(bku, dapur.name, 'UMUM', month, year);
        if (reportId === 'bkk') generateBKUPdf(bkk, dapur.name, 'PEMBANTU', month, year);
        if (reportId === 'lbbp') generateLBBPPdf(lbbp, dapur.name, month, year);
        if (reportId === 'lbo') generateLBOPdf(lboList, dapur.name, 'LBO', month, year);
        if (reportId === 'lbs') generateLBOPdf([...bku, ...bkk], dapur.name, 'LBS', month, year);
        if (reportId === 'lra') generateLRAPdf(lraData, dapur.name, month, year);
        if (reportId === 'lpd2m') generateLPD2MPdf(lpd2mData, dapur.name, year);
        if (reportId === 'kartu-stok') generateKartuStokPdf(stok, dapur.name);
        if (reportId === 'stok-opname') generateStokOpnamePdf(stok, dapur.name);
      }
    } catch (err) {
      console.error(`Gagal generate ${type}:`, err);
    } finally {
      setTimeout(() => setGenerating(null), 1000);
    }
  };

  const downloadFull = async (type: 'excel' | 'pdf') => {
    if (!dapur) return;
    const key = `full-${type}`;
    setGenerating(key);
    try {
      if (type === 'excel') {
        const { generateFullLaporanExcel } = await import('@/lib/laporan-excel');
        generateFullLaporanExcel({
          dapurName: dapur.name, month, year, bku, bkk, lbbp,
          lbo: lboList, lbs: [...bku, ...bkk], lra: lraData, lpd2m: lpd2mData, stok
        });
      } else {
        const { generateFullLaporanPdf } = await import('@/lib/laporan-pdf');
        generateFullLaporanPdf({
          dapurName: dapur.name, month, year, bku, bkk, lbbp,
          lboList, lra: lraData, lpd: lpd2mData, stok
        });
      }
    } catch (err) {
      console.error(`Gagal generate full ${type}:`, err);
    } finally {
      setTimeout(() => setGenerating(null), 1000);
    }
  };

  // ── Preview data for active tab ───────────────────────
  const filterPeriode = (arr: ArusKasRow[]) =>
    arr.filter(d => {
      const dt = new Date(d.transactionDate);
      return dt.getMonth() + 1 === month && dt.getFullYear() === year;
    });

  const previewData = useMemo(() => {
    switch (activeTab) {
      case 'bku': return { rows: filterPeriode(bku), type: 'kas' };
      case 'bkk': return { rows: filterPeriode(bkk), type: 'kas' };
      case 'lbbp': return { rows: lbbp.filter(d => { const dt = new Date(d.transactionDate); return dt.getMonth() + 1 === month && dt.getFullYear() === year; }), type: 'lbbp' };
      case 'lbo': return { rows: filterPeriode(lboList), type: 'simple' };
      case 'lbs': return { rows: filterPeriode([...bku, ...bkk]).filter(r => r.type === 'OUT' && r.description.toLowerCase().includes('sewa')), type: 'simple' };
      case 'lra': return { rows: null, type: 'lra' };
      case 'lpd2m': return { rows: lpd2mData, type: 'lpd2m' };
      case 'kartu-stok': return { rows: stok, type: 'stok' };
      case 'stok-opname': return { rows: stok, type: 'stok-opname' };
      default: return { rows: [], type: 'kas' };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, bku, bkk, lbbp, lboList, month, year, lpd2mData, stok]);

  const activeTabConfig = TABS.find(t => t.id === activeTab)!;
  const colors = COLOR_MAP[activeTabConfig.color];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <FiLoader className="h-8 w-8 animate-spin text-amber-500 mx-auto" />
          <p className="text-gray-500 text-sm">Memuat data laporan...</p>
        </div>
      </div>
    );
  }

  if (!dapur) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3 p-8">
          <FiAlertCircle className="h-10 w-10 text-red-400 mx-auto" />
          <p className="text-gray-700 font-medium">Unit dapur tidak ditemukan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">

      {/* ── HEADER ─────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                <FiBarChart2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Modul Laporan Keuangan</h1>
                <p className="text-slate-400 text-xs">SPPG {dapur.name} — Export PDF &amp; Excel</p>
              </div>
            </div>
          </div>

          {/* Periode Selector */}
          <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3 backdrop-blur-sm">
            <FiCalendar className="h-4 w-4 text-amber-400 flex-shrink-0" />
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={month}
                  onChange={e => setMonth(Number(e.target.value))}
                  className="appearance-none bg-white/20 text-white text-sm font-medium rounded-lg px-3 py-1.5 pr-6 outline-none cursor-pointer border border-white/20"
                >
                  {BULAN.map((b, i) => (
                    <option key={i} value={i + 1} className="text-slate-900">{b}</option>
                  ))}
                </select>
                <FiChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-white pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                  className="appearance-none bg-white/20 text-white text-sm font-medium rounded-lg px-3 py-1.5 pr-6 outline-none cursor-pointer border border-white/20"
                >
                  {[2023, 2024, 2025, 2026].map(y => (
                    <option key={y} value={y} className="text-slate-900">{y}</option>
                  ))}
                </select>
                <FiChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-white pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── TABS ───────────────────────────────────── */}
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-2 min-w-max">
          {TABS.map(tab => {
            const c = COLOR_MAP[tab.color];
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border ${
                  isActive
                    ? `${c.bg} ${c.text} ${c.border} shadow-sm`
                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CONTENT ────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Content Header */}
        <div className={`p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${colors.bg}`}>
          <div>
            <h2 className={`font-bold text-lg ${colors.text}`}>{activeTabConfig.title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Periode: {BULAN[month - 1]} {year}
            </p>
          </div>

          {/* Download Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => download('excel', activeTab)}
              disabled={!!generating}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-60 shadow-sm"
            >
              {generating === `excel-${activeTab}` ? (
                <FiLoader className="h-4 w-4 animate-spin" />
              ) : (
                <FiFileText className="h-4 w-4" />
              )}
              Excel
            </button>
            <button
              onClick={() => download('pdf', activeTab)}
              disabled={!!generating}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-60 shadow-sm"
            >
              {generating === `pdf-${activeTab}` ? (
                <FiLoader className="h-4 w-4 animate-spin" />
              ) : (
                <FiFile className="h-4 w-4" />
              )}
              PDF
            </button>
          </div>
        </div>

        {/* ── TABLE PREVIEW ─────────────────────────── */}
        <div className="overflow-x-auto">

          {/* BKU / BKK */}
          {(activeTab === 'bku' || activeTab === 'bkk') && (
            <KasTable rows={previewData.rows as ArusKasRow[]} />
          )}

          {/* LBBP */}
          {activeTab === 'lbbp' && (
            <LBBPTable rows={previewData.rows as LBBPRow[]} />
          )}

          {/* LBO / LBS */}
          {(activeTab === 'lbo' || activeTab === 'lbs') && (
            <SimpleExpenseTable rows={previewData.rows as ArusKasRow[]} />
          )}

          {/* LRA */}
          {activeTab === 'lra' && (
            <LRAPreview lra={lraData} />
          )}

          {/* LPD2M */}
          {activeTab === 'lpd2m' && (
            <LPD2MTable rows={previewData.rows as any[]} />
          )}

          {/* Stok */}
          {activeTab === 'kartu-stok' && (
            <KartuStokTable rows={previewData.rows as any[]} />
          )}

          {activeTab === 'stok-opname' && (
            <StokOpnameTable rows={previewData.rows as any[]} />
          )}
        </div>
      </div>

      {/* ── Quick Cards: download all ─────────────── */}
      <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-2xl border border-gray-200 p-5">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mb-6 bg-white/60 p-4 rounded-xl border border-white">
          <p className="text-sm text-slate-600 font-medium">
            Gabungkan semua laporan bulan <span className="text-amber-600 font-bold">{BULAN[month - 1]} {year}</span> dalam satu file:
          </p>
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={() => downloadFull('excel')}
              disabled={!!generating}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-200 transition-all disabled:opacity-50"
            >
              <FiFileText className="h-4 w-4" /> Download Gabungan Excel (.xlsx)
            </button>
            <button
              onClick={() => downloadFull('pdf')}
              disabled={!!generating}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-rose-200 transition-all disabled:opacity-50"
            >
              <FiFile className="h-4 w-4" /> Download Gabungan PDF (.pdf)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {TABS.map(tab => {
            const c = COLOR_MAP[tab.color];
            const Icon = tab.icon;
            return (
              <div key={tab.id} className={`${c.bg} ${c.border} border rounded-xl p-3`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-4 w-4 ${c.text}`} />
                  <span className={`text-xs font-bold ${c.text}`}>{tab.label}</span>
                </div>
                <p className="text-[10px] text-gray-500 mb-2 leading-tight">{tab.title}</p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => download('excel', tab.id)}
                    disabled={!!generating}
                    className="flex-1 flex items-center justify-center gap-1 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded text-[10px] font-bold transition-all"
                  >
                    <FiFileText className="h-3 w-3" /> XLS
                  </button>
                  <button
                    onClick={() => download('pdf', tab.id)}
                    disabled={!!generating}
                    className="flex-1 flex items-center justify-center gap-1 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-[10px] font-bold transition-all"
                  >
                    <FiFile className="h-3 w-3" /> PDF
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────

function KasTable({ rows }: { rows: ArusKasRow[] }) {
  let saldo = 0;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-slate-800 text-white text-xs">
          <th className="px-4 py-3 text-left w-10">No.</th>
          <th className="px-4 py-3 text-left">Tanggal</th>
          <th className="px-4 py-3 text-left">No. Bukti</th>
          <th className="px-4 py-3 text-left">Uraian</th>
          <th className="px-4 py-3 text-right">Pemasukan</th>
          <th className="px-4 py-3 text-right">Pengeluaran</th>
          <th className="px-4 py-3 text-right">Saldo</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {rows.length === 0 && (
          <tr><td colSpan={7} className="py-12 text-center text-gray-400 text-sm">Tidak ada data pada periode ini.</td></tr>
        )}
        {rows.map((row, i) => {
          const masuk = row.type === 'IN' ? row.amount : 0;
          const keluar = row.type === 'OUT' ? row.amount : 0;
          saldo += masuk - keluar;
          return (
            <tr key={row.id} className="hover:bg-gray-50/70">
              <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
              <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{fmtDate(row.transactionDate)}</td>
              <td className="px-4 py-3 text-gray-500 text-xs">{row.referenceNo || '-'}</td>
              <td className="px-4 py-3 text-gray-800 font-medium">{row.description}</td>
              <td className="px-4 py-3 text-right text-green-600 font-medium text-xs">{masuk > 0 ? fmtIDR(masuk) : '-'}</td>
              <td className="px-4 py-3 text-right text-red-600 font-medium text-xs">{keluar > 0 ? fmtIDR(keluar) : '-'}</td>
              <td className="px-4 py-3 text-right font-bold text-gray-900 text-xs">{fmtIDR(saldo)}</td>
            </tr>
          );
        })}
      </tbody>
      {rows.length > 0 && (
        <tfoot>
          <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
            <td colSpan={4} className="px-4 py-3 text-xs text-slate-600">TOTAL</td>
            <td className="px-4 py-3 text-right text-green-600 text-xs">{fmtIDR(rows.filter(r => r.type === 'IN').reduce((s, r) => s + r.amount, 0))}</td>
            <td className="px-4 py-3 text-right text-red-600 text-xs">{fmtIDR(rows.filter(r => r.type === 'OUT').reduce((s, r) => s + r.amount, 0))}</td>
            <td className="px-4 py-3 text-right text-slate-900 text-xs">{fmtIDR(saldo)}</td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}

function LBBPTable({ rows }: { rows: any[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-emerald-800 text-white text-xs">
          <th className="px-4 py-3 text-left w-10">No.</th>
          <th className="px-4 py-3 text-left">Tanggal</th>
          <th className="px-4 py-3 text-left">Nama Bahan</th>
          <th className="px-4 py-3 text-center">Volume</th>
          <th className="px-4 py-3 text-center">Satuan</th>
          <th className="px-4 py-3 text-right">Harga Satuan</th>
          <th className="px-4 py-3 text-right">Total</th>
          <th className="px-4 py-3 text-left">Penyuplai</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {rows.length === 0 && (
          <tr><td colSpan={8} className="py-12 text-center text-gray-400 text-sm">Tidak ada data bahan pangan pada periode ini.</td></tr>
        )}
        {rows.map((row, i) => (
          <tr key={row.id} className="hover:bg-emerald-50/30">
            <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
            <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{fmtDate(row.transactionDate)}</td>
            <td className="px-4 py-3 font-medium text-gray-800">{row.productName}</td>
            <td className="px-4 py-3 text-center text-gray-600 text-xs">{row.quantity}</td>
            <td className="px-4 py-3 text-center text-gray-500 text-xs">{row.unit}</td>
            <td className="px-4 py-3 text-right text-gray-600 text-xs">{fmtIDR(row.pricePerUnit)}</td>
            <td className="px-4 py-3 text-right font-bold text-gray-900 text-xs">{fmtIDR(row.total)}</td>
            <td className="px-4 py-3 text-gray-500 text-xs">{row.supplierName || '-'}</td>
          </tr>
        ))}
      </tbody>
      {rows.length > 0 && (
        <tfoot>
          <tr className="bg-emerald-50 font-bold border-t-2 border-emerald-200">
            <td colSpan={6} className="px-4 py-3 text-xs text-emerald-700">TOTAL BAHAN PANGAN</td>
            <td className="px-4 py-3 text-right text-emerald-700 text-xs">{fmtIDR(rows.reduce((s, r) => s + r.total, 0))}</td>
            <td />
          </tr>
        </tfoot>
      )}
    </table>
  );
}

function SimpleExpenseTable({ rows }: { rows: ArusKasRow[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-violet-800 text-white text-xs">
          <th className="px-4 py-3 text-left w-10">No.</th>
          <th className="px-4 py-3 text-left">Tanggal</th>
          <th className="px-4 py-3 text-left">Uraian</th>
          <th className="px-4 py-3 text-right">Nominal</th>
          <th className="px-4 py-3 text-left">Keterangan</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {rows.length === 0 && (
          <tr><td colSpan={5} className="py-12 text-center text-gray-400 text-sm">Tidak ada data pada periode ini.</td></tr>
        )}
        {rows.map((row, i) => (
          <tr key={row.id} className="hover:bg-violet-50/30">
            <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
            <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{fmtDate(row.transactionDate)}</td>
            <td className="px-4 py-3 font-medium text-gray-800">{row.description}</td>
            <td className="px-4 py-3 text-right font-bold text-red-600 text-xs">{fmtIDR(row.amount)}</td>
            <td className="px-4 py-3 text-gray-500 text-xs">-</td>
          </tr>
        ))}
      </tbody>
      {rows.length > 0 && (
        <tfoot>
          <tr className="bg-violet-50 font-bold border-t-2 border-violet-200">
            <td colSpan={3} className="px-4 py-3 text-xs text-violet-700">TOTAL</td>
            <td className="px-4 py-3 text-right text-violet-700 text-xs">{fmtIDR(rows.reduce((s, r) => s + r.amount, 0))}</td>
            <td />
          </tr>
        </tfoot>
      )}
    </table>
  );
}

function LRAPreview({ lra }: { lra: { pendapatan: { label: string; amount: number }[]; belanja: { label: string; amount: number }[] } }) {
  const totalP = lra.pendapatan.reduce((s, r) => s + r.amount, 0);
  const totalB = lra.belanja.reduce((s, r) => s + r.amount, 0);
  const surplus = totalP - totalB;
  return (
    <table className="w-full text-sm max-w-2xl mx-auto">
      <thead>
        <tr className="bg-cyan-800 text-white text-xs">
          <th className="px-6 py-3 text-left">Uraian</th>
          <th className="px-6 py-3 text-right">Jumlah (Rp)</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        <tr className="bg-cyan-50"><td colSpan={2} className="px-6 py-2 text-xs font-bold text-cyan-800">A. PENDAPATAN</td></tr>
        {lra.pendapatan.map((p, i) => (
          <tr key={i} className="hover:bg-gray-50">
            <td className="px-8 py-3 text-gray-700">{p.label}</td>
            <td className="px-6 py-3 text-right text-green-600 font-medium text-xs">{fmtIDR(p.amount)}</td>
          </tr>
        ))}
        <tr className="bg-slate-50 font-bold">
          <td className="px-6 py-3 text-xs text-slate-700">Total Pendapatan</td>
          <td className="px-6 py-3 text-right text-green-700 text-xs">{fmtIDR(totalP)}</td>
        </tr>
        <tr><td colSpan={2} className="py-1" /></tr>
        <tr className="bg-red-50"><td colSpan={2} className="px-6 py-2 text-xs font-bold text-red-800">B. BELANJA</td></tr>
        {lra.belanja.map((b, i) => (
          <tr key={i} className="hover:bg-gray-50">
            <td className="px-8 py-3 text-gray-700">{b.label}</td>
            <td className="px-6 py-3 text-right text-red-600 font-medium text-xs">{fmtIDR(b.amount)}</td>
          </tr>
        ))}
        <tr className="bg-slate-50 font-bold">
          <td className="px-6 py-3 text-xs text-slate-700">Total Belanja</td>
          <td className="px-6 py-3 text-right text-red-700 text-xs">{fmtIDR(totalB)}</td>
        </tr>
        <tr><td colSpan={2} className="py-1" /></tr>
        <tr className={surplus >= 0 ? 'bg-green-50' : 'bg-red-50'}>
          <td className={`px-6 py-4 font-bold text-sm ${surplus >= 0 ? 'text-green-800' : 'text-red-800'}`}>
            {surplus >= 0 ? '✓ SURPLUS' : '✗ DEFISIT'}
          </td>
          <td className={`px-6 py-4 text-right font-bold text-sm ${surplus >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {fmtIDR(Math.abs(surplus))}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function KartuStokTable({ rows }: { rows: any[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-indigo-800 text-white text-xs">
          <th className="px-4 py-3 text-left w-10">No.</th>
          <th className="px-4 py-3 text-left">Nama Bahan</th>
          <th className="px-4 py-3 text-left">Satuan</th>
          <th className="px-4 py-3 text-left">Kategori</th>
          <th className="px-4 py-3 text-right">Stok Sistem Saat Ini</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {rows.length === 0 && (
          <tr><td colSpan={5} className="py-12 text-center text-gray-400 text-sm">Belum ada data bahan di gudang.</td></tr>
        )}
        {rows.map((row, i) => (
          <tr key={row.id} className="hover:bg-indigo-50/30 text-gray-700">
            <td className="px-4 py-3 text-xs">{i + 1}</td>
            <td className="px-4 py-3 font-medium">{row.itemName}</td>
            <td className="px-4 py-3 text-xs">{row.unit}</td>
            <td className="px-4 py-3 text-xs">{row.category}</td>
            <td className="px-4 py-3 font-bold text-right">{row.quantity}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StokOpnameTable({ rows }: { rows: any[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-rose-800 text-white text-xs">
          <th className="px-4 py-3 text-left w-10">No.</th>
          <th className="px-4 py-3 text-left">Nama Bahan</th>
          <th className="px-4 py-3 text-left">Satuan</th>
          <th className="px-4 py-3 text-right">Stok Sistem</th>
          <th className="px-4 py-3 text-center w-32 border-l border-white/20">Stok Fisik</th>
          <th className="px-4 py-3 text-center w-32 border-l border-white/20">Selisih</th>
          <th className="px-4 py-3 text-left border-l border-white/20">Keterangan</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {rows.length === 0 && (
          <tr><td colSpan={7} className="py-12 text-center text-gray-400 text-sm">Belum ada data bahan di gudang.</td></tr>
        )}
        {rows.map((row, i) => (
          <tr key={row.id} className="hover:bg-rose-50/30 text-gray-700 text-xs">
            <td className="px-4 py-3">{i + 1}</td>
            <td className="px-4 py-3 font-medium text-sm">{row.itemName}</td>
            <td className="px-4 py-3">{row.unit}</td>
            <td className="px-4 py-3 font-bold text-right">{row.quantity}</td>
            <td className="px-4 py-3 border-l border-gray-100">
               <div className="border-b border-gray-300 border-dashed pb-4"></div>
            </td>
            <td className="px-4 py-3 border-l border-gray-100">
               <div className="border-b border-gray-300 border-dashed pb-4"></div>
            </td>
            <td className="px-4 py-3 border-l border-gray-100">
               <div className="border-b border-gray-300 border-dashed pb-4"></div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
function LPD2MTable({ rows }: { rows: any[] }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="bg-slate-800 text-white">
          <th className="px-3 py-3 text-left">No.</th>
          <th className="px-3 py-3 text-left">Bulan</th>
          <th className="px-3 py-3 text-right">Saldo Awal</th>
          <th className="px-3 py-3 text-right">Penerimaan</th>
          <th className="px-3 py-3 text-right">Bahan Pangan</th>
          <th className="px-3 py-3 text-right">Operasional</th>
          <th className="px-3 py-3 text-right">Sewa</th>
          <th className="px-3 py-3 text-right font-bold">Total Keluar</th>
          <th className="px-3 py-3 text-right">Saldo Akhir</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {rows.map((r, i) => (
          <tr key={i} className="hover:bg-slate-50/50">
            <td className="px-3 py-2.5 text-gray-400">{i + 1}</td>
            <td className="px-3 py-2.5 font-medium text-gray-700">{r.bulan}</td>
            <td className="px-3 py-2.5 text-right text-gray-500">{fmtIDR(r.saldoAwal)}</td>
            <td className="px-3 py-2.5 text-right text-green-600 font-medium">{fmtIDR(r.penerimaan)}</td>
            <td className="px-3 py-2.5 text-right text-gray-600">{fmtIDR(r.bahanPangan)}</td>
            <td className="px-3 py-2.5 text-right text-gray-600">{fmtIDR(r.operasional)}</td>
            <td className="px-3 py-2.5 text-right text-gray-600">{fmtIDR(r.sewa)}</td>
            <td className="px-3 py-2.5 text-right text-red-600 font-bold">{fmtIDR(r.totalPengeluaran)}</td>
            <td className="px-3 py-2.5 text-right font-bold text-gray-900">{fmtIDR(r.saldoAkhir)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
