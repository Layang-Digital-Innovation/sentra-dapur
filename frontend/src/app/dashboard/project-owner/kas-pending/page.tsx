"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { dapurService, DapurUnit } from "@/services/dapur.service";
import {
  FiCalendar,
  FiCheckCircle,
  FiHome,
  FiXCircle,
  FiTrash2,
  FiEdit3,
} from "react-icons/fi";
import toast from "react-hot-toast";

interface PendingRow {
  id: string;
  dapurName: string;
  dapurId: string;
  type: string;
  bookType: string;
  amount: number;
  description: string;
  transactionDate: string;
  markedForDeletion?: boolean;
  pendingEditData?: Record<string, unknown> | null;
}

export default function KasPendingPoPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [dapurList, setDapurList] = useState<DapurUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await dapurService.getMyDapur();
      setDapurList(data);
    } catch {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.user.role !== "PROJECT_OWNER") {
      router.replace("/dashboard");
      return;
    }
    load();
  }, [user, router]);

  const pendingRows = useMemo(() => {
    const out: PendingRow[] = [];
    dapurList.forEach((d) => {
      const kas = (d as unknown as { arusKas?: any[] }).arusKas;
      if (!kas) return;
      kas.forEach((trx: any) => {
        if (trx.pendingPoApproval) {
          out.push({
            id: trx.id,
            dapurName: d.name,
            dapurId: d.id,
            type: trx.type,
            bookType: trx.bookType,
            amount: trx.amount,
            description: trx.description,
            transactionDate: trx.transactionDate,
            markedForDeletion: trx.markedForDeletion,
            pendingEditData: trx.pendingEditData,
          });
        }
      });
    });
    out.sort(
      (a, b) =>
        new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime(),
    );
    return out;
  }, [dapurList]);

  const approve = async (id: string) => {
    try {
      setBusyId(id);
      const res = (await dapurService.approveArusKas(id)) as { deleted?: boolean };
      if (res?.deleted) toast.success("Penghapusan disetujui.");
      else toast.success("Perubahan disetujui.");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal menyetujui");
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string) => {
    try {
      setBusyId(id);
      await dapurService.rejectArusKas(id);
      toast.success("Pengajuan ditolak — data dapur tidak berubah.");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal menolak");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Persetujuan ubah / hapus kas</h1>
        <p className="text-gray-600 text-sm mt-1">
          Pengajuan dari Admin Pusat atas transaksi yang sudah disetujui sebelumnya. Setujui atau
          tolak—jika ditolak, data kas tetap seperti semula.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-100">
            <tr>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Jenis</th>
              <th className="px-4 py-3">Ringkas</th>
              <th className="px-4 py-3 text-right">Nominal</th>
              <th className="px-4 py-3">Pengajuan</th>
              <th className="px-4 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {pendingRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                  Tidak ada pengajuan yang menunggu Anda.
                </td>
              </tr>
            ) : (
              pendingRows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 font-medium text-gray-900">
                      <FiHome className="h-3.5 w-3.5 text-gray-400" />
                      {row.dapurName}
                    </div>
                    <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                      <FiCalendar className="h-3 w-3" />
                      {new Date(row.transactionDate).toLocaleDateString("id-ID")}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold block text-gray-600">
                      Buku {row.bookType}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded inline-block mt-1 ${
                        row.type === "IN" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {row.type === "IN" ? "Masuk" : "Keluar"}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="text-gray-800 line-clamp-2">{row.description}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    Rp {row.amount.toLocaleString("id-ID")}
                  </td>
                  <td className="px-4 py-3">
                    {row.markedForDeletion ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded bg-rose-50 text-rose-800 border border-rose-100">
                        <FiTrash2 className="h-3 w-3" />
                        Hapus
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded bg-indigo-50 text-indigo-800 border border-indigo-100">
                        <FiEdit3 className="h-3 w-3" />
                        Ubah data
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => approve(row.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 disabled:opacity-50"
                      >
                        <FiCheckCircle className="h-3.5 w-3.5" />
                        Setujui
                      </button>
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => reject(row.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-800 text-xs font-bold hover:bg-gray-50 disabled:opacity-50"
                      >
                        <FiXCircle className="h-3.5 w-3.5" />
                        Tolak
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pendingRows.some((r) => r.pendingEditData && !r.markedForDeletion) && (
        <p className="text-xs text-gray-500">
          Untuk pengajuan &ldquo;Ubah data&rdquo;, nilai baru akan diterapkan setelah Anda menyetujui.
        </p>
      )}
    </div>
  );
}
