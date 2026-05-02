"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { dapurService, DapurUnit } from "@/services/dapur.service";
import { FiChevronRight, FiHome, FiLayers } from "react-icons/fi";
import toast from "react-hot-toast";

export default function KasDapurPickerPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [dapurList, setDapurList] = useState<DapurUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    if (user?.user.role !== "ADMIN_PUSAT") {
      router.replace("/dashboard");
      return;
    }
    (async () => {
      try {
        const data = await dapurService.getMyDapur();
        setDapurList(data);
      } catch {
        toast.error("Gagal memuat unit dapur");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, router]);

  const goDetail = () => {
    if (!selectedId) {
      toast.error("Pilih nama dapur terlebih dahulu");
      return;
    }
    router.push(`/dashboard/admin-pusat/buku-kas/dapur/${selectedId}`);
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[320px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-8">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-700">
          <FiLayers className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kas Dapur</h1>
          <p className="text-gray-600 mt-1 text-sm">
            Pilih unit dapur untuk melihat rincian Kas Umum dan Kas Pembantu. Perubahan dan
            penghapusan oleh Admin Pusat memerlukan persetujuan Project Owner.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <label className="block text-sm font-semibold text-gray-700">Nama dapur</label>
        <div className="relative">
          <FiHome className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 font-medium appearance-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
          >
            <option value="">— Pilih dapur —</option>
            {dapurList.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={goDetail}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors"
        >
          Rincian
          <FiChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
