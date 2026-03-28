"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { dapurService, DapurUnit } from "@/services/dapur.service";
import { userService } from "@/services/user.service";
import { User, Role } from "@/types/user.types";
import {
  FiArrowLeft, FiUsers, FiPlus, FiTrash2, FiSave,
  FiAlertCircle, FiCheck, FiX, FiDollarSign,
  FiMapPin, FiTrendingUp, FiTrendingDown, FiUser, FiShoppingBag
} from "react-icons/fi";

interface InvestorRow {
  investorId: string;
  name: string;
  email: string;
  amount: number;
  profitSharingPct: number;
  profitSharingPctPreBEP: number;
  profitSharingPctPostBEP: number;
}

const EMPTY_ROW = (): InvestorRow => ({
  investorId: "",
  name: "",
  email: "",
  amount: 0,
  profitSharingPct: 0,
  profitSharingPctPreBEP: 0,
  profitSharingPctPostBEP: 0,
});

export default function AdminPusatDapurDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const dapurId = params.id as string;

  const [dapur, setDapur] = useState<DapurUnit | null>(null);
  const [adminDapur, setAdminDapur] = useState<User | null>(null);
  const [adminPusat, setAdminPusat] = useState<User | null>(null);
  const [allInvestors, setAllInvestors] = useState<User[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<User[]>([]);
  const [rows, setRows] = useState<InvestorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [arusKas, setArusKas] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [cashbacks, setCashbacks] = useState<any[]>([]);
  const [showCashbackModal, setShowCashbackModal] = useState(false);
  const [newCashback, setNewCashback] = useState({
    amount: 0,
    supplierName: "",
    purchaseOrderId: "",
    description: "",
    transactionDate: new Date().toISOString().split('T')[0]
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [list, investors, suppliers, kas, pos, cash] = await Promise.all([
        dapurService.getMyDapur(),
        userService.getInvestors(),
        userService.getSuppliers(),
        dapurService.getArusKas(dapurId),
        dapurService.getPurchaseOrders(),
        dapurService.getCashbacks(dapurId).catch(() => [])
      ]);
      const found = list.find(d => d.id === dapurId);
      if (!found) {
        router.replace("/dashboard/admin-pusat/dapur");
        return;
      }
      setDapur(found);
      setAllInvestors(investors);
      setAllSuppliers(suppliers);
      setArusKas(kas);
      setCashbacks(cash);
      // Filter POs for this specific dapur
      setPurchaseOrders(pos.filter((p: any) => p.dapurUnitId === dapurId));

      // Hydrate rows from existing investors
      if (found.investors && found.investors.length > 0) {
        setRows(found.investors.map((inv: any) => ({
          investorId: inv.investorId || inv.investor?.id || "",
          name: inv.investor?.fullname || inv.investor?.fullName || "",
          email: inv.investor?.email || "",
          amount: inv.investmentAmount || inv.amount || 0,
          profitSharingPct: inv.profitSharingPct || 0,
          profitSharingPctPreBEP: inv.profitSharingPctPreBEP || 0,
          profitSharingPctPostBEP: inv.profitSharingPctPostBEP || 0,
        })));
      }

      // Use admin details from the payload
      if (found.adminDapur) setAdminDapur(found.adminDapur as any);
      if (found.adminPusat) setAdminPusat(found.adminPusat as any);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [dapurId, router]);

  useEffect(() => {
    if (user?.user.role !== "ADMIN_PUSAT" && user?.user.role !== "PROJECT_OWNER") {
      router.replace("/dashboard");
      return;
    }
    fetchData();
  }, [user, router, fetchData]);

  const addRow = () => setRows(prev => [...prev, EMPTY_ROW()]);

  const removeRow = (idx: number) => setRows(prev => prev.filter((_, i) => i !== idx));

  const updateRow = (idx: number, field: keyof InvestorRow, value: any) => {
    setRows(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      // If investorId changes, auto-fill name and email
      if (field === "investorId") {
        const inv = allInvestors.find(a => a.id === value);
        if (inv) {
          next[idx].name = inv.fullname || inv.fullName || inv.email;
          next[idx].email = inv.email;
        }
      }
      return next;
    });
  };

  const handleSave = async () => {
    setErrorMsg("");
    if (rows.some(r => !r.investorId)) {
      setErrorMsg("Semua baris harus memilih investor.");
      return;
    }
    if (rows.some(r => r.amount <= 0)) {
      setErrorMsg("Nilai investasi harus lebih dari 0.");
      return;
    }

    setSaving(true);
    try {
      await dapurService.setInvestors(dapurId, rows.map(r => ({
        investorId: r.investorId,
        amount: r.amount,
        profitSharingPct: r.profitSharingPct,
        profitSharingPctPreBEP: r.profitSharingPctPreBEP,
        profitSharingPctPostBEP: r.profitSharingPctPostBEP,
      })));
      setSuccessMsg("Data investor berhasil disimpan!");
      setTimeout(() => setSuccessMsg(""), 4000);
      fetchData();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCashback = async () => {
    if (newCashback.amount <= 0) {
      setErrorMsg("Jumlah cashback harus lebih dari 0.");
      return;
    }
    setSaving(true);
    try {
      await dapurService.reportCashback(dapurId, newCashback);
      setSuccessMsg("Cashback berhasil dicatat!");
      setShowCashbackModal(false);
      setNewCashback({
        amount: 0,
        supplierName: "",
        purchaseOrderId: "",
        description: "",
        transactionDate: new Date().toISOString().split('T')[0]
      });
      fetchData();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal mencatat cashback");
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
  const totalInvestasi = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  const externalArusKas = arusKas.filter((k: any) => k.category !== 'INTERNAL_TRANSFER');
  const totalIn = (externalArusKas.filter((k: any) => k.type === "IN").reduce((a: number, b: any) => a + b.amount, 0) || 0) + 
                  (user?.user.role === "ADMIN_PUSAT" || user?.user.role === "SUPER_ADMIN" ? cashbacks.reduce((a, b) => a + b.amount, 0) : 0);
  const totalOut = externalArusKas.filter((k: any) => k.type === "OUT").reduce((a: number, b: any) => a + b.amount, 0) || 0;
  const netBalance = totalIn - totalOut;

  const statusColor: Record<string, string> = {
    APPROVED: "bg-green-100 text-green-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    ACTIVE: "bg-blue-100 text-blue-700",
    INACTIVE: "bg-gray-100 text-gray-600",
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <button onClick={() => router.back()} className="flex items-center text-sm text-gray-500 hover:text-gray-800 mb-4 transition">
          <FiArrowLeft className="mr-1.5 h-4 w-4" /> Kembali ke Daftar Dapur
        </button>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{dapur?.name}</h1>
            {dapur?.location && (
              <div className="flex items-center mt-1 text-gray-500 text-sm">
                <FiMapPin className="mr-1.5 h-4 w-4" />
                {dapur.location}
              </div>
            )}
          </div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${statusColor[dapur?.status || ""] || "bg-gray-100 text-gray-600"}`}>
            {dapur?.status}
          </span>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
          <FiCheck className="h-5 w-5 flex-shrink-0" /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">
          <FiX className="h-5 w-5 flex-shrink-0" /> {errorMsg}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-500">Saldo Bersih</p>
            <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
              <FiDollarSign className="h-4 w-4" />
            </div>
          </div>
          <h3 className={`text-xl font-bold ${netBalance >= 0 ? "text-gray-900" : "text-red-600"}`}>
            Rp {netBalance.toLocaleString("id-ID")}
          </h3>
        </div>
        <div className="bg-green-50 p-5 rounded-xl border border-green-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-green-700">Total Masuk</p>
            <div className="p-2 bg-green-100 rounded-lg text-green-700">
              <FiTrendingUp className="h-4 w-4" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-green-800">Rp {totalIn.toLocaleString("id-ID")}</h3>
        </div>
        <div className="bg-red-50 p-5 rounded-xl border border-red-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-red-700">Total Keluar</p>
            <div className="p-2 bg-red-100 rounded-lg text-red-700">
              <FiTrendingDown className="h-4 w-4" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-red-800">Rp {totalOut.toLocaleString("id-ID")}</h3>
        </div>
      </div>

      {/* Pengelola */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
            <FiUser className="h-4 w-4" /> Admin Pusat
          </h3>
          {adminPusat ? (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-900 to-slate-700 text-white flex items-center justify-center font-bold">
                {(adminPusat.fullname || adminPusat.fullName || adminPusat.email).charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{adminPusat.fullname || adminPusat.fullName || "—"}</p>
                <p className="text-sm text-gray-500">{adminPusat.email}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 italic text-sm">Belum ditugaskan</p>
          )}
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
            <FiUsers className="h-4 w-4" /> Admin Dapur (Lapangan)
          </h3>
          {adminDapur ? (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-600 to-amber-400 text-white flex items-center justify-center font-bold">
                {(adminDapur.fullname || adminDapur.fullName || adminDapur.email).charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{adminDapur.fullname || adminDapur.fullName || "—"}</p>
                <p className="text-sm text-gray-500">{adminDapur.email}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 italic text-sm">Belum ditugaskan</p>
          )}
        </div>
      </div>

      {/* Riwayat Arus Kas */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Riwayat Arus Kas</h2>
          <span className="text-xs text-gray-400">{arusKas.length} transaksi</span>
        </div>
        <div className="divide-y divide-gray-100">
          {arusKas.length > 0 ? (
            arusKas.slice(0, 5).map((kas: any) => (
              <div key={kas.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${kas.type === "IN" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                    {kas.type === "IN" ? <FiTrendingUp className="h-4 w-4" /> : <FiTrendingDown className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{kas.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-gray-400">
                        {kas.transactionDate ? new Date(kas.transactionDate).toLocaleDateString("id-ID") : new Date(kas.createdAt).toLocaleDateString("id-ID")}
                      </p>
                      {kas.referenceNo && (
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black"># {kas.referenceNo}</span>
                      )}
                      {kas.evidenceUrl && (
                        <a href={kas.evidenceUrl} target="_blank" rel="noreferrer" className="text-[10px] text-amber-600 font-bold hover:underline underline-offset-2">
                          Lihat Bukti
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <span className={`font-bold text-sm ${kas.type === "IN" ? "text-green-600" : "text-red-600"}`}>
                  {kas.type === "IN" ? "+" : "-"} Rp {kas.amount.toLocaleString("id-ID")}
                </span>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-400 text-sm">Belum ada riwayat arus kas.</div>
          )}
        </div>
      </div>

      {/* Purchase Orders */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <FiShoppingBag className="h-4 w-4" /> Purchase Orders
          </h2>
          <span className="text-xs text-gray-400">{purchaseOrders.length} PO</span>
        </div>
        <div className="divide-y divide-gray-100">
          {purchaseOrders.length > 0 ? (
            purchaseOrders.slice(0, 5).map((po: any) => (
              <div key={po.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition">
                <div>
                  <p className="font-medium text-gray-900 text-sm">PO #{po.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-gray-400">{new Date(po.createdAt).toLocaleDateString("id-ID")}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  po.status === "APPROVED" ? "bg-green-100 text-green-700" :
                  po.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                  po.status === "REJECTED" ? "bg-red-100 text-red-700" :
                  "bg-gray-100 text-gray-600"
                }`}>
                  {po.status}
                </span>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-400 text-sm">Belum ada Purchase Order.</div>
          )}
        </div>
      </div>

      {/* Supplier Cashback Section — ONLY Admin Pusat & SUPER ADMIN */}
      {(user?.user.role === "ADMIN_PUSAT" || user?.user.role === "SUPER_ADMIN") && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50">
            <div>
              <h2 className="font-bold text-orange-900 flex items-center gap-2">
                <FiDollarSign className="h-4 w-4" /> Pencatatan Cashback Supplier
              </h2>
              <p className="text-[10px] text-orange-600 font-medium">PENDAPATAN TERTUTUP (KHUSUS PUSAT)</p>
            </div>
            <button 
              onClick={() => setShowCashbackModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white text-xs font-bold rounded-lg hover:bg-orange-700 transition shadow-sm"
            >
              <FiPlus className="h-3.5 w-3.5" /> Catat Cashback
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {cashbacks.length > 0 ? (
              cashbacks.map((cb: any) => (
                <div key={cb.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition border-l-4 border-orange-400">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-orange-100 text-orange-600">
                      <FiTrendingUp className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        Cashback dari {cb.supplierName || 'Supplier'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-400">
                          {new Date(cb.transactionDate).toLocaleDateString("id-ID")}
                        </p>
                        {cb.description && <span className="text-xs text-gray-500 italic">· {cb.description}</span>}
                        {cb.purchaseOrderId && (
                          <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-black">PO #{cb.purchaseOrderId.slice(0,8).toUpperCase()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="font-bold text-sm text-green-600">
                    + Rp {cb.amount.toLocaleString("id-ID")}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-400 text-sm">Belum ada catatan cashback supplier.</div>
            )}
          </div>
        </div>
      )}


      {/* Investor Management */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiUsers className="h-5 w-5 text-slate-600" />
            <h2 className="font-bold text-gray-900 text-lg">Manajemen Investor</h2>
          </div>
          <button
            onClick={addRow}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 transition"
          >
            <FiPlus className="h-4 w-4" /> Tambah Investor
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="p-10 text-center">
            <div className="bg-gray-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
              <FiUsers className="h-7 w-7 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">Belum ada investor untuk dapur ini</p>
            <p className="text-gray-400 text-sm mt-1">Klik "Tambah Investor" untuk mulai menambahkan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Investor</th>
                  <th className="px-4 py-3 text-right font-semibold">Total Investasi</th>
                  <th className="px-4 py-3 text-center font-semibold">% Sblm BEP</th>
                  <th className="px-4 py-3 text-right font-semibold">Bagi Hasil (Sblm)</th>
                  <th className="px-4 py-3 text-center font-semibold">% Sth BEP</th>
                  <th className="px-4 py-3 text-right font-semibold">Bagi Hasil (Sth)</th>
                  <th className="px-4 py-3 text-center font-semibold">Hapus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, idx) => {
                  const nominalPreBEP = Math.max(0, netBalance) * ((row.profitSharingPctPreBEP || 0) / 100);
                  const nominalPostBEP = Math.max(0, netBalance) * ((row.profitSharingPctPostBEP || 0) / 100);

                  return (
                    <tr key={idx} className="hover:bg-gray-50">
                      {/* Investor select */}
                      <td className="px-4 py-3">
                        <select
                          value={row.investorId}
                          onChange={e => updateRow(idx, "investorId", e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 min-w-[180px]"
                        >
                          <option value="">-- Pilih Investor --</option>
                          {allInvestors.map(inv => (
                            <option key={inv.id} value={inv.id}>
                              {inv.fullname || inv.fullName || inv.email}
                            </option>
                          ))}
                        </select>
                        {row.email && (
                          <p className="text-xs text-gray-400 mt-1 pl-1">{row.email}</p>
                        )}
                      </td>

                      {/* Total Nilai Investasi */}
                      <td className="px-4 py-3">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">Rp</span>
                          <input
                            type="number"
                            min={0}
                            value={row.amount || ""}
                            onChange={e => updateRow(idx, "amount", Number(e.target.value))}
                            className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-slate-900 min-w-[140px]"
                            placeholder="0"
                          />
                        </div>
                      </td>

                      {/* % Sebelum BEP */}
                      <td className="px-4 py-3">
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.1}
                            value={row.profitSharingPctPreBEP || ""}
                            onChange={e => updateRow(idx, "profitSharingPctPreBEP", Number(e.target.value))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-500 bg-yellow-50 min-w-[80px]"
                            placeholder="0"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">%</span>
                        </div>
                      </td>

                      {/* Nominal Sebelum BEP */}
                      <td className="px-4 py-3 text-right">
                        <div className="text-xs font-bold text-amber-700">
                          {fmt(nominalPreBEP)}
                        </div>
                        <div className="text-[10px] text-gray-400 italic">Estimasi Sblm BEP</div>
                      </td>

                      {/* % Setelah BEP */}
                      <td className="px-4 py-3">
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.1}
                            value={row.profitSharingPctPostBEP || ""}
                            onChange={e => updateRow(idx, "profitSharingPctPostBEP", Number(e.target.value))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500 bg-green-50 min-w-[80px]"
                            placeholder="0"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">%</span>
                        </div>
                      </td>

                      {/* Nominal Setelah BEP */}
                      <td className="px-4 py-3 text-right">
                        <div className="text-xs font-bold text-green-700">
                          {fmt(nominalPostBEP)}
                        </div>
                        <div className="text-[10px] text-gray-400 italic">Estimasi Sth BEP</div>
                      </td>

                      {/* Delete */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => removeRow(idx)}
                          className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Footer summary */}
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td className="px-4 py-3 font-semibold text-gray-700 text-sm">
                    Total ({rows.length} investor)
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900 text-sm">
                    {fmt(totalInvestasi)}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-amber-700 text-sm">
                    {rows.reduce((s, r) => s + (Number(r.profitSharingPctPreBEP) || 0), 0).toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-amber-700 text-sm">
                    {fmt(rows.reduce((s, r) => s + (Math.max(0, netBalance) * ((r.profitSharingPctPreBEP || 0) / 100)), 0))}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-green-700 text-sm">
                    {rows.reduce((s, r) => s + (Number(r.profitSharingPctPostBEP) || 0), 0).toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-green-700 text-sm">
                    {fmt(rows.reduce((s, r) => s + (Math.max(0, netBalance) * ((r.profitSharingPctPostBEP || 0) / 100)), 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Legend */}
        {rows.length > 0 && (
          <div className="p-4 bg-blue-50 border-t border-blue-100 flex flex-wrap gap-4 text-xs text-blue-700">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-yellow-200" />
              <span><b>% Sebelum BEP:</b> Persentase bagi hasil investor sebelum mencapai Break Even Point</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-green-200" />
              <span><b>% Setelah BEP:</b> Persentase bagi hasil investor setelah melampaui Break Even Point</span>
            </div>
            <div className="flex items-center gap-1.5 ml-auto font-medium">
              <span>* Nominal bagi hasil dihitung berdasarkan <b>Saldo Bersih</b> dapur saat ini.</span>
            </div>
          </div>
        )}

        {/* Save button */}
        {rows.length > 0 && (
          <div className="p-5 border-t border-gray-100 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition font-medium"
            >
              <FiSave className="h-4 w-4" />
              {saving ? "Menyimpan..." : "Simpan Data Investor"}
            </button>
          </div>
        )}
      </div>

      {/* Modal Cashback */}
      {showCashbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCashbackModal(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-orange-50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <FiDollarSign className="text-orange-600" /> Catat Cashback Supplier
              </h3>
              <button onClick={() => setShowCashbackModal(false)} className="text-gray-400 hover:text-gray-600 transition">
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Jumlah Cashback (IDR)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">Rp</span>
                  <input
                    type="number"
                    value={newCashback.amount || ""}
                    onChange={e => setNewCashback(p => ({ ...p, amount: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-lg font-bold text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Supplier</label>
                  <input
                    type="text"
                    list="supplier-list"
                    value={newCashback.supplierName}
                    onChange={e => setNewCashback(p => ({ ...p, supplierName: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition"
                    placeholder="Nama / Cari Supplier"
                  />
                  <datalist id="supplier-list">
                    {allSuppliers.map(s => (
                      <option key={s.id} value={s.fullname || s.fullName || ""} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Tanggal</label>
                  <input
                    type="date"
                    value={newCashback.transactionDate}
                    onChange={e => setNewCashback(p => ({ ...p, transactionDate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Referensi Purchase Order (Opsional)</label>
                <input
                  type="text"
                  list="po-list"
                  value={newCashback.purchaseOrderId}
                  autoComplete="off"
                  onChange={e => setNewCashback(p => ({ ...p, purchaseOrderId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition font-mono"
                  placeholder="Ketik atau pilih No. PO"
                />
                <datalist id="po-list">
                  {purchaseOrders.map(po => (
                    <option key={po.id} value={po.id}>PO #{po.id.slice(0, 8).toUpperCase()} ({new Date(po.createdAt).toLocaleDateString()})</option>
                  ))}
                </datalist>
                <p className="text-[10px] text-gray-400 mt-1 italic leading-tight">Bisa dikosongkan jika tidak ada referensi PO spesifik.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Keterangan</label>
                <textarea
                  value={newCashback.description}
                  onChange={e => setNewCashback(p => ({ ...p, description: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition min-h-[80px]"
                  placeholder="Contoh: Cashback 5% dari pembelajaan ayam..."
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSaveCashback}
                  disabled={saving}
                  className="w-full py-3.5 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition shadow-lg shadow-orange-200 disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : "Simpan Cashback"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
