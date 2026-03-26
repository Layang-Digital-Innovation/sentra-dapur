"use client";

import React, { useEffect, useState } from "react";
import { dapurService, DapurUnit } from "@/services/dapur.service";
import axiosInstance from "@/utils/axiosConfig";
import { FiPackage, FiEdit2, FiPlus, FiSave, FiX } from "react-icons/fi";

interface StokItem {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
  updatedAt: string;
}

export default function StokPage() {
  const [dapur, setDapur] = useState<DapurUnit | null>(null);
  const [stok, setStok] = useState<StokItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ quantity: 0, unit: "" });
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ itemName: "", quantity: 0, unit: "gram" });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    dapurService.getMyDapur().then(async (data) => {
      const d = data?.[0];
      setDapur(d || null);
      if (d) {
        try {
          const res = await axiosInstance.get(`/dapur/${d.id}/stok`);
          setStok(res.data || []);
        } catch { setStok([]); }
      }
      setLoading(false);
    });
  }, []);

  const updateStok = async (id: string) => {
    if (!dapur) return;
    setSaving(true);
    try {
      const item = stok.find(s => s.id === id)!;
      await axiosInstance.post(`/dapur/${dapur.id}/stok`, {
        itemName: item.itemName,
        quantity: editForm.quantity,
        unit: editForm.unit,
      });
      setStok(prev => prev.map(s => s.id === id ? { ...s, quantity: editForm.quantity, unit: editForm.unit } : s));
      setEditingId(null);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const addStok = async () => {
    if (!dapur || !addForm.itemName.trim()) return;
    setSaving(true);
    try {
      const res = await axiosInstance.post(`/dapur/${dapur.id}/stok`, addForm);
      setStok(prev => [...prev, res.data]);
      setShowAdd(false);
      setAddForm({ itemName: "", quantity: 0, unit: "gram" });
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const filtered = stok.filter(s => s.itemName.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiPackage className="text-rose-500" /> Stok Bahan Baku
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {dapur?.name || "Unit Dapur"} — Pantau dan perbarui stok bahan baku
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 shadow-sm"
        >
          <FiPlus /> Tambah Stok
        </button>
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="🔍 Cari bahan baku..."
        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
      />

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
          <FiPackage className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-500">Belum Ada Data Stok</h3>
          <p className="text-sm text-gray-400 mt-1">Tambahkan item bahan baku untuk dipantau</p>
          <button onClick={() => setShowAdd(true)} className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700">+ Tambah Sekarang</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Nama Bahan</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Stok</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Satuan</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Update Terakhir</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{item.itemName}</td>
                  <td className="px-6 py-4 text-right">
                    {editingId === item.id ? (
                      <input
                        type="number"
                        min={0}
                        value={editForm.quantity}
                        onChange={e => setEditForm(p => ({ ...p, quantity: parseFloat(e.target.value) || 0 }))}
                        className="w-24 border border-gray-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-rose-400"
                      />
                    ) : (
                      <span className={`font-bold text-lg ${item.quantity < 10 ? "text-red-500" : "text-gray-900"}`}>
                        {item.quantity.toLocaleString("id-ID")}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === item.id ? (
                      <input
                        value={editForm.unit}
                        onChange={e => setEditForm(p => ({ ...p, unit: e.target.value }))}
                        className="w-20 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                      />
                    ) : (
                      <span className="text-gray-500">{item.unit}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {new Date(item.updatedAt).toLocaleDateString("id-ID")}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === item.id ? (
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"><FiX className="w-4 h-4" /></button>
                        <button onClick={() => updateStok(item.id)} disabled={saving} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"><FiSave className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingId(item.id); setEditForm({ quantity: item.quantity, unit: item.unit }); }}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Tambah Bahan Baku</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Bahan <span className="text-red-500">*</span></label>
                <input value={addForm.itemName} onChange={e => setAddForm(p => ({ ...p, itemName: e.target.value }))} placeholder="cth: Beras, Minyak Goreng" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Stok</label>
                  <input type="number" min={0} value={addForm.quantity} onChange={e => setAddForm(p => ({ ...p, quantity: parseFloat(e.target.value) || 0 }))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Satuan</label>
                  <input value={addForm.unit} onChange={e => setAddForm(p => ({ ...p, unit: e.target.value }))} placeholder="gram, liter, kg" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50">Batal</button>
              <button onClick={addStok} disabled={saving || !addForm.itemName.trim()} className="flex-1 py-2.5 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 disabled:opacity-50">
                {saving ? "Menyimpan..." : "Tambah"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
