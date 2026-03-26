"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { userService } from "@/services/user.service";
import { User, Role } from "@/types/user.types";
import {
  FiPlus, FiEdit2, FiTrash2, FiSearch, FiUser,
  FiMail, FiLock, FiX, FiCheck, FiRefreshCw
} from "react-icons/fi";

interface FormData {
  email: string;
  fullName: string;
  password: string;
}

const DEFAULT_FORM: FormData = { email: "", fullName: "", password: "" };

export default function AdminPusatManagementPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [admins, setAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userService.getAllUsers({ role: Role.ADMIN_PUSAT, search: searchQuery });
      setAdmins(res.users);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal memuat data Admin Pusat");
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (user?.user.role !== "PROJECT_OWNER") {
      router.replace("/dashboard");
      return;
    }
    fetchAdmins();
  }, [user, router, fetchAdmins]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(DEFAULT_FORM);
    setErrorMsg("");
    setShowModal(true);
  };

  const openEdit = (admin: User) => {
    setEditTarget(admin);
    setForm({ email: admin.email, fullName: admin.fullName || "", password: "" });
    setErrorMsg("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditTarget(null);
    setForm(DEFAULT_FORM);
    setErrorMsg("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    try {
      if (editTarget) {
        const payload: any = { email: form.email, fullName: form.fullName };
        if (form.password) payload.password = form.password;
        await userService.updateUser(editTarget.id, payload);
        setSuccessMsg("Admin Pusat berhasil diperbarui.");
      } else {
        if (!form.password) throw new Error("Password wajib diisi untuk akun baru.");
        await userService.createUser({ 
          email: form.email, 
          fullName: form.fullName, 
          password: form.password, 
          role: Role.ADMIN_PUSAT 
        });
        setSuccessMsg("Admin Pusat baru berhasil ditambahkan.");
      }
      closeModal();
      fetchAdmins();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await userService.deleteUser(id);
      setAdmins(prev => prev.filter(a => a.id !== id));
      setDeleteConfirm(null);
      setSuccessMsg("Akun Admin Pusat berhasil dihapus.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menghapus akun.");
    }
  };

  const filtered = admins.filter(a =>
    a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.fullName || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Admin Pusat</h1>
          <p className="text-gray-500 mt-1">
            Kelola akun-akun Admin Pusat yang bertugas mengelola unit-unit Dapur MBG.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-medium shadow"
        >
          <FiPlus className="h-4 w-4" />
          Tambah Admin Pusat
        </button>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
          <FiCheck className="h-5 w-5 flex-shrink-0" />
          {successMsg}
        </div>
      )}
      {errorMsg && !showModal && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          <FiX className="h-5 w-5 flex-shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Search bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="relative max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Cari nama atau email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 w-full border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Daftar Admin Pusat ({filtered.length})</h2>
          <button onClick={fetchAdmins} className="text-gray-400 hover:text-slate-900 transition">
            <FiRefreshCw className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-3" />
            <p className="text-gray-500 text-sm">Memuat data...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="bg-gray-100 text-gray-400 p-5 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <FiUser className="h-8 w-8" />
            </div>
            <p className="text-gray-700 font-medium">Belum ada Admin Pusat</p>
            <p className="text-gray-500 text-sm mt-1">Klik tombol "Tambah Admin Pusat" untuk membuat akun baru.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">Nama</th>
                  <th className="px-6 py-3 text-left font-semibold">Email</th>
                  <th className="px-6 py-3 text-left font-semibold">Dibuat</th>
                  <th className="px-6 py-3 text-left font-semibold">Status</th>
                  <th className="px-6 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(admin => (
                  <tr key={admin.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-slate-900 to-slate-700 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {(admin.fullName || admin.email).charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">
                          {admin.fullName || <span className="text-gray-400 italic">—</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{admin.email}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(admin.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        Aktif
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(admin)}
                          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                          title="Edit"
                        >
                          <FiEdit2 className="h-4 w-4" />
                        </button>
                        {deleteConfirm === admin.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(admin.id)}
                              className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition"
                            >
                              Hapus
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(admin.id)}
                            className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition"
                            title="Hapus"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">
                {editTarget ? "Edit Admin Pusat" : "Tambah Admin Pusat Baru"}
              </h3>
              <button onClick={closeModal} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {errorMsg && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                  <FiX className="h-4 w-4 flex-shrink-0" /> {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    required
                    value={form.fullName}
                    onChange={e => setForm({ ...form, fullName: e.target.value })}
                    className="pl-9 pr-4 py-2.5 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
                    placeholder="Nama lengkap Admin Pusat"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="pl-9 pr-4 py-2.5 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
                    placeholder="email@sentradapur.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {editTarget && <span className="text-gray-400 font-normal">(kosongkan jika tidak ingin ganti)</span>}
                </label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="password"
                    required={!editTarget}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className="pl-9 pr-4 py-2.5 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
                    placeholder="Min. 8 karakter"
                    minLength={editTarget ? 0 : 8}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 font-medium transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition"
                >
                  {submitting ? "Menyimpan..." : editTarget ? "Simpan Perubahan" : "Buat Akun"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
