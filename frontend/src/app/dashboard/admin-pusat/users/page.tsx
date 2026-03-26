"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { userService } from "@/services/user.service";
import { dapurService, DapurUnit } from "@/services/dapur.service";
import { User, Role } from "@/types/user.types";
import {
  FiPlus, FiEdit2, FiTrash2, FiSearch, FiUser,
  FiMail, FiLock, FiX, FiCheck, FiRefreshCw, FiHome
} from "react-icons/fi";

type TabType = "ADMIN_DAPUR" | "INVESTOR" | "SUPPLIER";

interface FormData {
  email: string;
  fullName: string;
  password: string;
  role: TabType;
  dapurId: string; // only used when role = ADMIN_DAPUR
}

const DEFAULT_FORM = (role: TabType): FormData => ({
  email: "",
  fullName: "",
  password: "",
  role,
  dapurId: "",
});

export default function AdminPusatUserManagementPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>("ADMIN_DAPUR");
  const [users, setUsers] = useState<User[]>([]);
  const [dapurList, setDapurList] = useState<DapurUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [form, setForm] = useState<FormData>(DEFAULT_FORM("ADMIN_DAPUR"));
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userService.getAllUsers({ role: activeTab as any as Role, search: searchQuery });
      setUsers(res.users);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery]);

  useEffect(() => {
    if (user?.user.role !== "ADMIN_PUSAT") {
      router.replace("/dashboard");
      return;
    }
    // Load dapur list for admin assignment
    dapurService.getMyDapur().then(setDapurList).catch(console.error);
    fetchUsers();
  }, [user, router, fetchUsers]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(DEFAULT_FORM(activeTab));
    setErrorMsg("");
    setShowModal(true);
  };

  const openEdit = (u: User) => {
    setEditTarget(u);
    // Find currently assigned dapur for this user
    const assignedDapur = dapurList.find(d => d.adminDapurId === u.id);
    setForm({ 
      email: u.email, 
      fullName: u.fullName || "", 
      password: "", 
      role: u.role as TabType, 
      dapurId: assignedDapur ? assignedDapur.id : "" 
    });
    setErrorMsg("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditTarget(null);
    setErrorMsg("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    try {
      if (editTarget) {
        // Edit mode
        const payload: any = { email: form.email, fullName: form.fullName };
        if (form.password) payload.password = form.password;
        await userService.updateUser(editTarget.id, payload);
        // If editing an ADMIN_DAPUR and dapur changed, reassign
        if (activeTab === "ADMIN_DAPUR" && form.dapurId) {
          await dapurService.assignAdminDapur(form.dapurId, editTarget.id);
        }
        setSuccessMsg(`Akun ${activeTab === "ADMIN_DAPUR" ? "Admin Dapur" : activeTab === "INVESTOR" ? "Investor" : "Supplier"} berhasil diperbarui.`);
      } else {
        // Create mode
        if (!form.password) throw new Error("Password wajib diisi untuk akun baru.");
        if (activeTab === "ADMIN_DAPUR" && !form.dapurId) {
          throw new Error("Pilih Unit Dapur yang akan dikelola oleh Admin Dapur ini.");
        }

        const newUser = await userService.createUser({
          email: form.email,
          fullName: form.fullName,
          password: form.password,
          role: activeTab === "ADMIN_DAPUR" ? Role.ADMIN_DAPUR : activeTab === "INVESTOR" ? Role.INVESTOR : Role.SUPPLIER,
        });

        // Immediately assign to the selected Dapur
        if (activeTab === "ADMIN_DAPUR" && form.dapurId && newUser?.id) {
          await dapurService.assignAdminDapur(form.dapurId, newUser.id);
        }

        setSuccessMsg(`Akun ${activeTab === "ADMIN_DAPUR" ? "Admin Dapur" : activeTab === "INVESTOR" ? "Investor" : "Supplier"} berhasil dibuat${form.dapurId ? " dan ditetapkan ke unit dapur." : "."}`);
      }
      closeModal();
      fetchUsers();
      if (activeTab === "ADMIN_DAPUR") {
        dapurService.getMyDapur().then(setDapurList).catch(console.error);
      }
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await userService.deleteUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      setDeleteConfirm(null);
      setSuccessMsg("Akun berhasil dihapus.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menghapus akun.");
    }
  };

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.fullName || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Map dapur id → name for display
  const dapurMap = Object.fromEntries(dapurList.map(d => [d.id, d.name]));

  const roleLabel = activeTab === "ADMIN_DAPUR" ? "Admin Dapur" : activeTab === "INVESTOR" ? "Investor" : "Supplier";
  const roleColor = activeTab === "ADMIN_DAPUR" ? "from-slate-900 to-slate-700" : activeTab === "INVESTOR" ? "from-amber-700 to-amber-500" : "from-emerald-700 to-emerald-500";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen User</h1>
          <p className="text-gray-500 mt-1">Kelola akun Admin Dapur, Investor, dan Supplier untuk unit-unit Dapur MBG.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-medium shadow"
        >
          <FiPlus className="h-4 w-4" />
          Tambah {roleLabel}
        </button>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
          <FiCheck className="h-5 w-5 flex-shrink-0" /> {successMsg}
        </div>
      )}
      {errorMsg && !showModal && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          <FiX className="h-5 w-5 flex-shrink-0" /> {errorMsg}
        </div>
      )}

      {/* Tabs + Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {(["ADMIN_DAPUR", "INVESTOR", "SUPPLIER"] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSearchQuery(""); }}
              className={`flex-1 py-3 text-sm font-semibold transition ${
                activeTab === tab
                  ? "border-b-2 border-slate-900 text-slate-900 bg-gray-50"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {tab === "ADMIN_DAPUR" ? "👨‍🍳 Admin Dapur" : tab === "INVESTOR" ? "💰 Investor" : "📦 Supplier"}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-sm">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder={`Cari ${roleLabel}...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-full border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
            />
          </div>
        </div>

        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Daftar {roleLabel} ({filtered.length})</h2>
          <button onClick={fetchUsers} className="text-gray-400 hover:text-slate-900 transition">
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
            <p className="text-gray-700 font-medium">Belum ada {roleLabel}</p>
            <p className="text-gray-500 text-sm mt-1">Klik tombol "Tambah {roleLabel}" untuk membuat akun baru.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">Nama</th>
                  <th className="px-6 py-3 text-left font-semibold">Email</th>
                  {activeTab === "ADMIN_DAPUR" && (
                    <th className="px-6 py-3 text-left font-semibold">Unit Dapur</th>
                  )}
                  <th className="px-6 py-3 text-left font-semibold">Dibuat</th>
                  <th className="px-6 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-full bg-gradient-to-br ${roleColor} text-white flex items-center justify-center font-bold text-sm flex-shrink-0`}>
                          {(u.fullName || u.email).charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">
                          {u.fullName || <span className="text-gray-400 italic">—</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{u.email}</td>
                    {activeTab === "ADMIN_DAPUR" && (
                      <td className="px-6 py-4">
                        {/* Find which dapur this admin is assigned to */}
                        {(() => {
                          const assignedDapur = dapurList.find(d => d.adminDapurId === u.id);
                          return assignedDapur ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                              <FiHome className="h-3 w-3" />
                              {assignedDapur.name}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs italic">Belum ditetapkan</span>
                          );
                        })()}
                      </td>
                    )}
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(u)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition" title="Edit">
                          <FiEdit2 className="h-4 w-4" />
                        </button>
                        {deleteConfirm === u.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDelete(u.id)} className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition">Hapus</button>
                            <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition">Batal</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(u.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition" title="Hapus">
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">
                {editTarget ? `Edit ${roleLabel}` : `Tambah ${roleLabel} Baru`}
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

              {/* Role Badge */}
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${roleColor}`}>
                  {roleLabel}
                </span>
                <span className="text-sm text-gray-500">Role yang akan ditetapkan untuk akun ini</span>
              </div>

              {/* Nama */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input type="text" required value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })}
                    className="pl-9 pr-4 py-2.5 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
                    placeholder={`Nama lengkap ${roleLabel}`} />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    className="pl-9 pr-4 py-2.5 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
                    placeholder="email@sentradapur.com" />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {editTarget && <span className="text-gray-400 font-normal">(kosongkan jika tidak ingin ganti)</span>}
                </label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input type="password" required={!editTarget} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                    className="pl-9 pr-4 py-2.5 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
                    placeholder="Min. 8 karakter" minLength={editTarget ? 0 : 8} />
                </div>
              </div>

              {/* Pilih Dapur — hanya untuk ADMIN_DAPUR */}
              {activeTab === "ADMIN_DAPUR" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Dapur yang Dikelola
                    {!editTarget && <span className="text-red-500 ml-0.5">*</span>}
                    {editTarget && <span className="text-gray-400 font-normal ml-1">(opsional — ubah penugasan)</span>}
                  </label>
                  <div className="relative">
                    <FiHome className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
                    <select
                      value={form.dapurId}
                      onChange={e => setForm({ ...form, dapurId: e.target.value })}
                      required={!editTarget}
                      className="pl-9 pr-4 py-2.5 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition appearance-none bg-white"
                    >
                      <option value="">-- Pilih Unit Dapur --</option>
                      {dapurList.map(d => {
                        // show who is currently assigned
                        const currentAdmin = users.find(u => u.id === d.adminDapurId);
                        const label = currentAdmin
                          ? `${d.name} (${d.location || d.status}) — Admin: ${currentAdmin.fullName || currentAdmin.email}`
                          : `${d.name} (${d.location || d.status}) — Belum ada admin`;
                        return (
                          <option key={d.id} value={d.id}>{label}</option>
                        );
                      })}
                    </select>
                  </div>
                  {dapurList.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1.5">
                      ⚠ Belum ada unit dapur. Buat unit dapur terlebih dahulu.
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={closeModal}
                  className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 font-medium transition">
                  Batal
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition">
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
