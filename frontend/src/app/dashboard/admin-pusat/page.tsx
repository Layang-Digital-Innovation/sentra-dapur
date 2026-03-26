"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { dapurService, DapurUnit } from "@/services/dapur.service";
import { FiActivity, FiFolder, FiDollarSign, FiArrowUpRight, FiArrowDownRight } from "react-icons/fi";

export default function AdminPusatDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [dapurList, setDapurList] = useState<DapurUnit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.user.role !== "ADMIN_PUSAT" && user?.user.role !== "PROJECT_OWNER") {
      router.replace("/dashboard");
      return;
    }

    const fetchDapur = async () => {
      try {
        const data = await dapurService.getMyDapur();
        setDapurList(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDapur();
  }, [user, router]);

  if (loading) return <div className="p-6">Loading data...</div>;

  // Calculate Aggregates
  let totalDapur = dapurList.length;
  let totalIn = 0;
  let totalOut = 0;
  let pendingApprovals = 0;

  dapurList.forEach((d) => {
    if (d.arusKas) {
      d.arusKas.forEach((a) => {
        if (trxStatus(a) === 'PENDING') pendingApprovals++;
        if (trxStatus(a) === 'APPROVED' && a.category !== 'INTERNAL_TRANSFER') {
          if (a.type === "IN") totalIn += a.amount;
          if (a.type === "OUT") totalOut += a.amount;
        }
      });
    }
  });

  function trxStatus(a: any) {
    // Fallback if status not present yet on old records (though they should be null/default)
    return a.status || 'APPROVED'; 
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Pusat (Bird's Eye View)</h1>
          <p className="text-gray-500 mt-1">Pantau seluruh aktivitas Unit Dapur Anda.</p>
        </div>
        <div className="flex gap-4">
           {pendingApprovals > 0 && (
             <button
               onClick={() => router.push("/dashboard/admin-pusat/approvals")}
               className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-bold transition-all animate-pulse shadow-lg shadow-amber-100 flex items-center gap-2"
             >
               <FiActivity className="h-5 w-5" />
               {pendingApprovals} Persetujuan Baru
             </button>
           )}
           <button
             onClick={() => router.push("/dashboard/admin-pusat/dapur/create")}
             className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium transition-colors"
           >
             + Tambah Unit Dapur
           </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center">
          <div className="p-3 rounded-lg bg-slate-100 text-amber-600 mr-4">
            <FiFolder className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Dapur Aktif</p>
            <h3 className="text-2xl font-bold text-gray-900">{totalDapur}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center">
          <div className="p-3 rounded-lg bg-green-100 text-green-600 mr-4">
            <FiDollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Pemasukan (Verifikasi)</p>
            <h3 className="text-xl font-bold text-gray-900">Rp {totalIn.toLocaleString()}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center border-l-4 border-l-amber-400">
          <div className="p-3 rounded-lg bg-amber-50 text-amber-600 mr-4">
            <FiActivity className="h-6 w-6" />
          </div>
          <div className="cursor-pointer" onClick={() => router.push("/dashboard/admin-pusat/approvals")}>
            <p className="text-sm font-medium text-gray-500 underline decoration-dotted underline-offset-2">Pending Persetujuan</p>
            <h3 className="text-2xl font-bold text-gray-900">{pendingApprovals}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center">
          <div className="p-3 rounded-lg bg-red-100 text-red-600 mr-4">
            <FiArrowDownRight className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Pengeluaran (Verifikasi)</p>
            <h3 className="text-xl font-bold text-gray-900">Rp {totalOut.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      {/* Sub Units List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Statistik Per Unit Dapur</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nama Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lokasi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Admin Lapangan
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Arus Masuk (Rp)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Arus Keluar (Rp)
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dapurList.map((dapur) => {
                let dIn = 0,
                  dOut = 0;
                dapur.arusKas?.forEach((a) => {
                  if (a.category !== 'INTERNAL_TRANSFER') {
                    if (a.type === "IN") dIn += a.amount;
                    if (a.type === "OUT") dOut += a.amount;
                  }
                });

                return (
                  <tr key={dapur.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{dapur.name}</div>
                      <div className="text-xs text-gray-500">ID: {dapur.id.substring(0,8)}...</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {dapur.location || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{dapur.adminDapurId ? "Ditugaskan" : "Belum Ada"}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 text-right">
                      {dIn.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600 text-right">
                      {dOut.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {dapur.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {dapurList.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                    Tidak ada data Unit Dapur. Silakan buat unit baru.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
