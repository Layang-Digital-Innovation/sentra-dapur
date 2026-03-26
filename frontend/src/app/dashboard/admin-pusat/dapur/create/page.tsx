"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { dapurService } from "@/services/dapur.service";

export default function CreateDapurPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "", location: "" });
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      await dapurService.createDapur(formData);
      router.push("/dashboard/admin-pusat/dapur");
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat membuat dapur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Buat Unit Dapur Baru</h1>
        <p className="text-gray-500 mb-8">Daftarkan unit dapur baru untuk dikelola operasionalnya oleh Admin Dapur.</p>

        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-100 text-sm flex items-center">
             <span className="font-semibold mr-2">Error:</span> {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Unit Dapur *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
              placeholder="Contoh: Dapur Sentral Harmoni"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi (Opsional)</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
              placeholder="Contoh: Jl. Sudirman No 45, Jakarta Pusat"
            />
          </div>
          <div className="flex items-center gap-4 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium disabled:opacity-50 transition"
            >
              {loading ? "Memproses..." : "Simpan Dapur Baru"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
