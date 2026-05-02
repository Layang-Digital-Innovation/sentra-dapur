"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { dapurService, DapurUnit } from "@/services/dapur.service";
import { FiPlus, FiArrowRight, FiEdit, FiTrash2, FiX } from "react-icons/fi";

export default function DapurUnitListPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [dapurList, setDapurList] = useState<DapurUnit[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit State
  const [editingDapur, setEditingDapur] = useState<DapurUnit | null>(null);
  const [editFormData, setEditFormData] = useState({ name: "", location: "" });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleDelete = async (dapur: DapurUnit) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus Dapur "${dapur.name}"? Data yang sudah dihapus tidak dapat dikembalikan.`)) {
      return;
    }
    try {
      await dapurService.deleteDapur(dapur.id);
      setDapurList(prev => prev.filter(d => d.id !== dapur.id));
    } catch (err: any) {
      alert(err.message || "Gagal menghapus dapur. Pastikan dapur tidak terikat dengan data operasional.");
    }
  };

  const handleEditClick = (dapur: DapurUnit) => {
    setEditingDapur(dapur);
    setEditFormData({ name: dapur.name, location: dapur.location || "" });
    setErrorMsg("");
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDapur) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      await dapurService.updateDapur(editingDapur.id, editFormData);
      setDapurList(prev => prev.map(d => d.id === editingDapur.id ? { ...d, name: editFormData.name, location: editFormData.location } : d));
      setEditingDapur(null);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan perubahan.");
    } finally {
      setSubmitting(false);
    }
  };

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Unit Dapur</h1>
          <p className="text-gray-500 mt-1">Daftar semua Unit Dapur yang dikelola</p>
        </div>
        <button
          onClick={() => router.push("/dashboard/admin-pusat/dapur/create")}
          className="flex items-center px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
        >
          <FiPlus className="mr-2" />
          Tambah Dapur
        </button>
      </div>

      {loading ? (
        <div className="p-6 text-center text-gray-500">Memuat data...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dapurList.map((dapur) => (
            <div key={dapur.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition">
              <div className="p-5 border-b border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-gray-900 pr-2">{dapur.name}</h3>
                  <div className="flex flex-col items-end gap-2">
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                      {dapur.status}
                    </span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEditClick(dapur)}
                        className="text-gray-400 hover:text-amber-600 transition"
                        title="Edit Dapur"
                      >
                        <FiEdit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(dapur)}
                        className="text-gray-400 hover:text-red-600 transition"
                        title="Hapus Dapur"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-500">{dapur.location || "Lokasi belum diatur"}</p>
              </div>
              <div className="p-5 bg-gray-50 rounded-b-xl flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{dapur.adminDapurId ? "Admin: Aktif" : "Belum ada Admin"}</span>
                </div>
                <button
                   className="text-amber-600 hover:text-amber-800 text-sm font-medium flex items-center"
                   onClick={() => router.push(`/dashboard/admin-pusat/dapur/${dapur.id}`)}
                >
                  Detail <FiArrowRight className="ml-1"/>
                </button>
              </div>
            </div>
          ))}
          {dapurList.length === 0 && (
            <div className="col-span-full text-center py-10 bg-white rounded-xl border border-gray-100 shadow-sm">
              <p className="text-gray-500">Anda belum memiliki Unit Dapur.</p>
              <button 
                onClick={() => router.push("/dashboard/admin-pusat/dapur/create")}
                className="mt-4 text-amber-600 font-medium hover:underline"
              >
                Buat satu sekarang
              </button>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingDapur && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Edit Unit Dapur</h2>
              <button 
                onClick={() => setEditingDapur(null)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <FiX size={24} />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6">
              {errorMsg && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm border border-red-100">
                  {errorMsg}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Unit Dapur *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi (Opsional)</label>
                  <input
                    type="text"
                    value={editFormData.location}
                    onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setEditingDapur(null)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium disabled:opacity-50 transition"
                >
                  {submitting ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
