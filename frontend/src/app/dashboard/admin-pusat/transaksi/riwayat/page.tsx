"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { dapurService, DapurUnit } from "@/services/dapur.service";
import {
  FiCalendar,
  FiDollarSign,
  FiHome,
  FiInfo,
  FiExternalLink,
  FiImage,
  FiPackage,
  FiUser,
  FiXCircle,
  FiCheckCircle,
  FiSlash,
} from "react-icons/fi";
import { toast } from "react-hot-toast";

export default function RiwayatTransaksiPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [dapurList, setDapurList] = useState<DapurUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrx, setSelectedTrx] = useState<any | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const dapurData = await dapurService.getMyDapur();
      setDapurList(dapurData);
    } catch (err) {
      console.error(err);
      toast.error("Gagal mengambil riwayat transaksi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.user.role !== "ADMIN_PUSAT" && user?.user.role !== "PROJECT_OWNER") {
      router.replace("/dashboard");
      return;
    }
    fetchData();
  }, [user, router]);

  const historyTransactions = useMemo(() => {
    const rows: any[] = [];
    dapurList.forEach((dapur) => {
      if (dapur.arusKas) {
        dapur.arusKas.forEach((trx: any) => {
          if (trx.status === "APPROVED" || trx.status === "REJECTED") {
            rows.push({
              ...trx,
              dapurName: dapur.name,
              dapurId: dapur.id,
            });
          }
        });
      }
    });
    rows.sort(
      (a, b) =>
        new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime(),
    );
    return rows;
  }, [dapurList]);

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
        <p className="mt-4 text-gray-500 font-medium text-lg italic">Memuat riwayat transaksi...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-slate-50 rounded-xl text-slate-700 shadow-sm border border-slate-100 flex items-center justify-center">
            <FiPackage className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Riwayat Transaksi
            </h1>
            <p className="text-gray-500 mt-1 font-medium">
              Transaksi kas yang sudah disetujui atau ditolak oleh Admin Pusat.
            </p>
          </div>
        </div>
        <div className="text-sm text-slate-600 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
          Total <span className="font-bold text-slate-900">{historyTransactions.length}</span>{" "}
          entri
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-slate-900">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-100 uppercase tracking-widest">
                  Waktu & Unit
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-100 uppercase tracking-widest">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-100 uppercase tracking-widest">
                  Alokasi & Jenis
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-100 uppercase tracking-widest">
                  Keterangan
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-100 uppercase tracking-widest">
                  Nominal (Rp)
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-100 uppercase tracking-widest">
                  Detail
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {historyTransactions.map((trx) => (
                <tr key={trx.id} className="hover:bg-slate-50/50 transition-all duration-200 group">
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex flex-col">
                      <div className="flex items-center text-sm font-semibold text-gray-900">
                        <FiCalendar className="mr-1.5 h-3.5 w-3.5 text-gray-400" />
                        {new Date(trx.transactionDate).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                      <div className="flex items-center text-xs text-slate-500 mt-1 font-medium bg-slate-100 px-2 py-0.5 rounded-full w-fit">
                        <FiHome className="mr-1 h-3 w-3" />
                        {trx.dapurName}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    {trx.status === "APPROVED" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-green-50 text-green-800 border border-green-100">
                        <FiCheckCircle className="h-3 w-3" />
                        Disetujui
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-100">
                        <FiSlash className="h-3 w-3" />
                        Ditolak
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex flex-col gap-1.5">
                      <span
                        className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider w-fit border ${
                          trx.bookType === "UMUM"
                            ? "bg-purple-50 text-purple-700 border-purple-100"
                            : "bg-cyan-50 text-cyan-700 border-cyan-100"
                        }`}
                      >
                        Buku {trx.bookType}
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider w-fit flex items-center gap-1 ${
                          trx.type === "IN" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {trx.type === "IN" ? "Pemasukan" : "Pengeluaran"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-medium text-gray-800 line-clamp-2 max-w-xs">
                      {trx.description}
                    </p>
                  </td>
                  <td
                    className={`px-6 py-5 whitespace-nowrap text-right font-black text-lg ${
                      trx.type === "IN" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {trx.type === "IN" ? "+" : "-"} {trx.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-center">
                    <button
                      type="button"
                      onClick={() => setSelectedTrx(trx)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-md"
                    >
                      <FiInfo className="h-3 w-3" />
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
              {historyTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <FiPackage className="h-10 w-10 text-gray-300" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">Belum ada riwayat</h3>
                      <p className="text-gray-500 mt-2 font-medium max-w-xs mx-auto">
                        Transaksi yang sudah diproses akan muncul di sini.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTrx && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${selectedTrx.type === "IN" ? "bg-green-500" : "bg-red-500"}`}
                >
                  <FiDollarSign className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Detail Transaksi</h2>
                  <p className="text-slate-400 text-xs">ID: {selectedTrx.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTrx(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <FiXCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="flex flex-wrap gap-2">
                {selectedTrx.status === "APPROVED" ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                    <FiCheckCircle className="h-3.5 w-3.5" />
                    Disetujui
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                    <FiSlash className="h-3.5 w-3.5" />
                    Ditolak
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Unit Dapur
                  </p>
                  <div className="flex items-center gap-2 text-slate-900">
                    <FiHome className="h-4 w-4 text-amber-500" />
                    <span className="font-bold text-sm">{selectedTrx.dapurName}</span>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Pencatat
                  </p>
                  <div className="flex items-center gap-2 text-slate-900">
                    <FiUser className="h-4 w-4 text-indigo-500" />
                    <span className="font-bold text-sm">
                      {selectedTrx.reportedBy?.fullname || "Admin Dapur"}
                    </span>
                  </div>
                </div>
              </div>

              {selectedTrx.approvedBy && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Diproses oleh
                  </p>
                  <div className="flex items-center gap-2 text-slate-900">
                    <FiUser className="h-4 w-4 text-amber-600" />
                    <span className="font-bold text-sm">
                      {selectedTrx.approvedBy?.fullname || selectedTrx.approvedBy?.email || "—"}
                    </span>
                  </div>
                </div>
              )}

              <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 text-center relative overflow-hidden">
                <p className="text-gray-500 text-sm italic mb-2">&ldquo;{selectedTrx.description}&rdquo;</p>
                <h3
                  className={`text-4xl font-black ${
                    selectedTrx.type === "IN" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  Rp {selectedTrx.amount.toLocaleString()}
                </h3>
              </div>

              {(selectedTrx.items && selectedTrx.items.length > 0) && (
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 text-slate-900 font-bold border-b pb-2">
                    <FiPackage className="text-amber-500" />
                    Rincian Barang / Biaya
                  </h4>
                  <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Item
                          </th>
                          <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Qty
                          </th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Harga
                          </th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Subtotal
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {selectedTrx.items.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-slate-700">{item.name}</td>
                            <td className="px-4 py-3 text-sm text-center text-slate-600">
                              {item.quantity} {item.unit}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-slate-600">
                              {item.pricePerUnit?.toLocaleString() || "—"}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-slate-900">
                              {item.total?.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3 text-sm">
                {selectedTrx.referenceNo && (
                  <span className="bg-gray-50 border border-gray-100 px-2 py-1 rounded">
                    Ref: {selectedTrx.referenceNo}
                  </span>
                )}
                {selectedTrx.evidenceUrl && (
                  <a
                    href={selectedTrx.evidenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-indigo-600 font-semibold hover:underline"
                  >
                    <FiExternalLink className="mr-1 h-4 w-4" />
                    Bukti lampiran
                    <FiImage className="ml-1 h-3 w-3 text-gray-400" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
