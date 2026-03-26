"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { dapurService, DapurUnit } from "@/services/dapur.service";
import {
  FiDollarSign, FiTrendingUp, FiTrendingDown, FiUsers,
  FiCheckCircle, FiAlertCircle, FiBarChart2, FiRefreshCw
} from "react-icons/fi";

interface DapurLaba {
  dapur: DapurUnit;
  totalIn: number;
  totalOut: number;
  netProfit: number;
  investors: { name?: string; email?: string; amount: number; pct: number; dividen: number }[];
}

export default function DividenLabaPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [dapurList, setDapurList] = useState<DapurLaba[]>([]);
  const [loading, setLoading] = useState(true);
  const [validatedIds, setValidatedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user?.user.role !== "PROJECT_OWNER") {
      router.replace("/dashboard");
      return;
    }
    fetchData();
  }, [user, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const list = await dapurService.getMyDapur();
      const labas: DapurLaba[] = list.map((dapur) => {
        const totalIn = dapur.arusKas?.filter((k: any) => k.type === "IN").reduce((a: number, b: any) => a + b.amount, 0) || 0;
        const totalOut = dapur.arusKas?.filter((k: any) => k.type === "OUT").reduce((a: number, b: any) => a + b.amount, 0) || 0;
        const netProfit = totalIn - totalOut;

        const investors = (dapur.investors || []).map((inv: any) => ({
          name: inv.investor?.fullname || inv.investor?.fullName,
          email: inv.investor?.email || "—",
          amount: inv.amount || 0,
          pct: inv.profitSharingPct || 0,
          dividen: netProfit > 0 ? Math.round(netProfit * ((inv.profitSharingPct || 0) / 100)) : 0,
        }));

        return { dapur, totalIn, totalOut, netProfit, investors };
      });

      setDapurList(labas);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Aggregate totals
  const grandTotalIn = dapurList.reduce((a, b) => a + b.totalIn, 0);
  const grandTotalOut = dapurList.reduce((a, b) => a + b.totalOut, 0);
  const grandNetProfit = dapurList.reduce((a, b) => a + b.netProfit, 0);
  const grandTotalDividen = dapurList.reduce(
    (a, b) => a + b.investors.reduce((x, inv) => x + inv.dividen, 0), 0
  );

  const toggleValidate = (id: string) => {
    setValidatedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-700 p-8 rounded-2xl shadow-lg text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Laporan Dividen & Laba</h1>
            <p className="text-slate-300 mt-1">Rekap performa finansial dan estimasi bagi hasil per unit Dapur MBG</p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition"
          >
            <FiRefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Grand Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Pemasukan</p>
          <div className="flex items-center gap-2">
            <FiTrendingUp className="h-5 w-5 text-green-500" />
            <span className="text-lg font-bold text-gray-900">Rp {grandTotalIn.toLocaleString("id-ID")}</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Pengeluaran</p>
          <div className="flex items-center gap-2">
            <FiTrendingDown className="h-5 w-5 text-red-500" />
            <span className="text-lg font-bold text-gray-900">Rp {grandTotalOut.toLocaleString("id-ID")}</span>
          </div>
        </div>
        <div className={`p-5 rounded-xl border shadow-sm ${grandNetProfit >= 0 ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Estimasi Laba Bersih</p>
          <div className="flex items-center gap-2">
            <FiBarChart2 className={`h-5 w-5 ${grandNetProfit >= 0 ? "text-green-600" : "text-red-600"}`} />
            <span className={`text-lg font-bold ${grandNetProfit >= 0 ? "text-green-700" : "text-red-700"}`}>
              Rp {grandNetProfit.toLocaleString("id-ID")}
            </span>
          </div>
        </div>
        <div className="bg-amber-50 p-5 rounded-xl border border-amber-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Dividen Investor</p>
          <div className="flex items-center gap-2">
            <FiDollarSign className="h-5 w-5 text-amber-600" />
            <span className="text-lg font-bold text-amber-700">Rp {grandTotalDividen.toLocaleString("id-ID")}</span>
          </div>
        </div>
      </div>

      {/* Per Dapur Cards */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
        </div>
      ) : dapurList.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-gray-100 text-center text-gray-400">
          Belum ada unit Dapur yang terdaftar.
        </div>
      ) : (
        <div className="space-y-6">
          {dapurList.map(({ dapur, totalIn, totalOut, netProfit, investors }) => {
            const isValidated = validatedIds.has(dapur.id);
            const totalDivInUnit = investors.reduce((a, inv) => a + inv.dividen, 0);

            return (
              <div key={dapur.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Unit Header */}
                <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{dapur.name}</h2>
                    <p className="text-sm text-gray-500">{dapur.location || "Lokasi belum diatur"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {netProfit >= 0 ? "+" : ""}Rp {netProfit.toLocaleString("id-ID")}
                    </span>
                    <button
                      onClick={() => toggleValidate(dapur.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                        isValidated
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-slate-900 text-white hover:bg-slate-800"
                      }`}
                    >
                      {isValidated ? (
                        <><FiCheckCircle className="h-4 w-4" /> Tervalidasi</>
                      ) : (
                        <><FiAlertCircle className="h-4 w-4" /> Validasi Dividen</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
                  <div className="p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">Pemasukan</p>
                    <p className="font-semibold text-green-600 text-sm">Rp {totalIn.toLocaleString("id-ID")}</p>
                  </div>
                  <div className="p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">Pengeluaran</p>
                    <p className="font-semibold text-red-600 text-sm">Rp {totalOut.toLocaleString("id-ID")}</p>
                  </div>
                  <div className="p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">Total Dividen Unit</p>
                    <p className="font-semibold text-amber-600 text-sm">Rp {totalDivInUnit.toLocaleString("id-ID")}</p>
                  </div>
                </div>

                {/* Investor Breakdown */}
                {investors.length > 0 ? (
                  <div>
                    <div className="px-5 pt-4 pb-2 flex items-center gap-2 text-sm font-semibold text-gray-600">
                      <FiUsers className="h-4 w-4" /> Rincian Investor
                    </div>
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
                        <tr>
                          <th className="px-5 py-2 text-left">Investor</th>
                          <th className="px-5 py-2 text-right">Modal</th>
                          <th className="px-5 py-2 text-right">Bagi Hasil</th>
                          <th className="px-5 py-2 text-right">Estimasi Dividen</th>
                          <th className="px-5 py-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {investors.map((inv, i) => (
                          <tr key={i} className="hover:bg-gray-50 transition">
                            <td className="px-5 py-3">
                              <div>
                                <p className="font-medium text-gray-900">{inv.name || "—"}</p>
                                <p className="text-xs text-gray-400">{inv.email}</p>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-right text-gray-700">Rp {inv.amount.toLocaleString("id-ID")}</td>
                            <td className="px-5 py-3 text-right text-gray-700">{inv.pct}%</td>
                            <td className="px-5 py-3 text-right font-semibold text-amber-600">
                              Rp {inv.dividen.toLocaleString("id-ID")}
                            </td>
                            <td className="px-5 py-3 text-center">
                              {isValidated ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" /> Disetujui
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">
                                  <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full" /> Menunggu
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-5 py-6 text-sm text-gray-400 flex items-center gap-2">
                    <FiAlertCircle className="h-4 w-4" />
                    Belum ada investor yang tercatat di unit dapur ini.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
