"use client";

import React, { useEffect, useState } from "react";
import { portionTypeApi, PortionType } from "@/services/produksi.service";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { FiPlus, FiEdit2, FiTrash2, FiSettings } from "react-icons/fi";

export default function MasterPorsiPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [portionTypes, setPortionTypes] = useState<PortionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PortionType | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.user?.role !== "ADMIN_PUSAT" && user?.user?.role !== "SUPER_ADMIN") {
      router.replace("/dashboard");
      return;
    }
    portionTypeApi.getAll().then(setPortionTypes).catch(console.error).finally(() => setLoading(false));
  }, [user, router]);

  const openCreate = () => { setEditing(null); setForm({ name: "", description: "" }); setShowModal(true); };
  const openEdit = (p: PortionType) => { setEditing(p); setForm({ name: p.name, description: p.description || "" }); setShowModal(true); };

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        const updated = await portionTypeApi.update(editing.id, form);
        setPortionTypes(prev => prev.map(p => p.id === editing.id ? updated : p));
      } else {
        const created = await portionTypeApi.create(form);
        setPortionTypes(prev => [...prev, created]);
      }
      setShowModal(false);
    } catch (e: any) { 
        alert(e?.response?.data?.message || "Gagal menyimpan");
    } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm("Hapus master jenis porsi ini?")) return;
    try {
        await portionTypeApi.delete(id);
        setPortionTypes(prev => prev.filter(p => p.id !== id));
    } catch (e: any) {
        alert(e?.response?.data?.message || "Gagal menghapus");
    }
  };

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiSettings className="text-slate-900" /> Master Jenis Porsi
          </h1>
          <p className="text-gray-500 text-sm mt-1">Konfigurasi jenis porsi standar (Besar, Kecil, dll) untuk semua Dapur Unit</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-all shadow-sm">
          <FiPlus /> Tambah Porsi
        </button>
      </div>

      {portionTypes.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
          <FiSettings className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-500">Belum Ada Master Jenis Porsi</h3>
          <p className="text-sm text-gray-400 mt-1">Tambahkan standar jenis porsi seperti "Porsi Besar", "Porsi Kecil", dll.</p>
          <button onClick={openCreate} className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-all">
            + Tambah Sekarang
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {portionTypes.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start justify-between gap-3 hover:shadow-md transition-all">
              <div>
                <h3 className="font-semibold text-gray-900">{p.name}</h3>
                {p.description && <p className="text-sm text-gray-500 mt-0.5">{p.description}</p>}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => openEdit(p)} className="p-2 text-gray-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all" title="Edit">
                  <FiEdit2 className="w-4 h-4" />
                </button>
                <button onClick={() => del(p.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Hapus">
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{editing ? "Edit" : "Tambah"} Master Jenis Porsi</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Porsi <span className="text-red-500">*</span></label>
                <input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="cth: Porsi Besar, Porsi Kecil"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi (opsional)</label>
                <input
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="cth: Standar SD Negeri"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all">Batal</button>
              <button onClick={save} disabled={saving || !form.name.trim()} className="flex-1 py-2.5 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 disabled:opacity-50 transition-all">
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
