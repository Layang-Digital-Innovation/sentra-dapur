"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import axiosInstance from "@/utils/axiosConfig";
import { FiUsers, FiPlus, FiEdit2, FiTrash2, FiX } from "react-icons/fi";

interface ProduksiUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  createdAt: string;
}

type ModalMode = "create" | "edit" | null;

export default function TimProduksiPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<ProduksiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<ProduksiUser | null>(null);
  const [form, setForm] = useState({ email: "", password: "", fullName: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (user?.user.role !== "ADMIN_DAPUR") {
      router.replace("/dashboard");
      return;
    }
    loadUsers();
  }, [user, router]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/users?role=PRODUKSI");
      setUsers(res.data?.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setSelected(null);
    setForm({ email: "", password: "", fullName: "" });
    setError("");
    setMode("create");
  };

  const openEdit = (u: ProduksiUser) => {
    setSelected(u);
    setForm({ email: u.email, password: "", fullName: u.fullName || "" });
    setError("");
    setMode("edit");
  };

  const save = async () => {
    if (!form.email.trim()) { setError("Email diperlukan"); return; }
    if (mode === "create" && !form.password.trim()) { setError("Password diperlukan"); return; }
    setSaving(true);
    setError("");
    try {
      if (mode === "create") {
        await axiosInstance.post("/users", { ...form, role: "PRODUKSI" });
      } else if (mode === "edit" && selected) {
        const payload: any = { email: form.email, fullName: form.fullName };
        if (form.password.trim()) payload.password = form.password;
        await axiosInstance.put(`/users/${selected.id}`, payload);
      }
      await loadUsers();
      setMode(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: string, email: string) => {
    if (!confirm(`Hapus akun ${email}?`)) return;
    try {
      await axiosInstance.delete(`/users/${id}`);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (e: any) {
      alert(e?.response?.data?.message || "Gagal menghapus");
    }
  };

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.fullName?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="flex justify-center p-12">
      <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiUsers className="text-purple-500" /> Tim Produksi
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Kelola akun staf produksi untuk dapur Anda
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 shadow-sm"
        >
          <FiPlus /> Tambah Staf
        </button>
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="🔍 Cari nama atau email staf..."
        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
      />

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
          <FiUsers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-500">Belum Ada Staf Produksi</h3>
          <p className="text-sm text-gray-400 mt-1">
            Tambahkan akun untuk staf produksi dapur Anda
          </p>
          <button
            onClick={openCreate}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
          >
            + Tambah Staf Sekarang
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Nama</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Dibuat</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-semibold text-sm flex-shrink-0">
                        {u.fullName?.charAt(0).toUpperCase() || u.email.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{u.fullName || "-"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                      Produksi
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {new Date(u.createdAt).toLocaleDateString("id-ID")}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => openEdit(u)}
                        className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => del(u.id, u.email)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {mode && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">
                {mode === "create" ? "Tambah" : "Edit"} Staf Produksi
              </h2>
              <button onClick={() => setMode(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Lengkap
                </label>
                <input
                  value={form.fullName}
                  onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                  placeholder="cth: Budi Santoso"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="produksi@dapur.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {mode === "edit" && <span className="text-gray-400 font-normal">(kosongkan jika tidak diubah)</span>}
                  {mode === "create" && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder={mode === "edit" ? "Biarkan kosong untuk tetap sama" : "Password baru"}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                  {error}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setMode(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : mode === "create" ? "Buat Akun" : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
