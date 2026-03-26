"use client";

import React, { useEffect, useState, useCallback } from "react";
import { rencanaApi, menuApi, portionTypeApi, MonthlyMenuPlan, Menu, PortionType, DailyMenuEntry } from "@/services/produksi.service";
import { dapurService, DapurUnit } from "@/services/dapur.service";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { FiCalendar, FiChevronLeft, FiChevronRight, FiPlus, FiTrash2, FiX, FiSave } from "react-icons/fi";

const MONTHS_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const DAYS_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

type AddEntryForm = { menuId: string; notes: string; portions: Record<string, number> };

export default function SettingPenerimaDanMenuPage() {
  const { user } = useAuth();
  const router = useRouter();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [dapur, setDapur] = useState<DapurUnit | null>(null);
  const [plan, setPlan] = useState<MonthlyMenuPlan | null>(null);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [portionTypes, setPortionTypes] = useState<PortionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [addForm, setAddForm] = useState<AddEntryForm>({ menuId: "", notes: "", portions: {} });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (y: number, m: number) => {
    setLoading(true);
    try {
      const dapurData = await dapurService.getMyDapur();
      const d = dapurData?.[0];
      setDapur(d || null);
      if (d) {
        const [p, mns, pts] = await Promise.all([
          rencanaApi.getOrCreate(d.id, y, m),
          menuApi.getAll(d.id),
          portionTypeApi.getAll(),
        ]);
        setPlan(p);
        setMenus(mns);
        setPortionTypes(pts);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (user?.user.role !== "ADMIN_DAPUR" && user?.user.role !== "PRODUKSI") {
      router.replace("/dashboard");
      return;
    }
    load(year, month);
  }, [load, year, month, user, router]);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const getEntriesForDate = (day: number): DailyMenuEntry[] => {
    if (!plan) return [];
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return plan.dailyEntries.filter(e => e.date.startsWith(dateStr));
  };

  const openAddModal = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(dateStr);
    const defaultPortions: Record<string, number> = {};
    portionTypes.forEach(pt => { defaultPortions[pt.id] = 0; });
    setAddForm({ menuId: menus[0]?.id || "", notes: "", portions: defaultPortions });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!plan || !selectedDate || !addForm.menuId) return;
    setSaving(true);
    
    const existingEntries = plan.dailyEntries.filter(e => e.date.startsWith(selectedDate));
    const newEntry = {
      menuId: addForm.menuId,
      notes: addForm.notes,
      portions: Object.entries(addForm.portions)
        .filter(([, qty]) => qty > 0)
        .map(([ptId, qty]) => ({ portionTypeId: ptId, quantity: qty })),
    };

    // Merge with existing entries
    const allEntries = [
      ...existingEntries.map(e => ({
        menuId: e.menuId,
        notes: e.notes,
        portions: e.portions.map(p => ({ portionTypeId: p.portionTypeId, quantity: p.quantity })),
      })),
      newEntry,
    ];

    try {
      await rencanaApi.setDailyMenu(plan.id, selectedDate, allEntries);
      await load(year, month);
      setShowModal(false);
    } catch (e: any) {
      alert(e?.response?.data?.message || "Gagal menyimpan jadwal");
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (entryId: string, day: number) => {
    // const isConfirmed = window.confirm(`Hapus resep ini secara permanen dari jadwal tanggal ${day}?`);
    // if (!isConfirmed) return;
    try {
      await rencanaApi.deleteDailyEntry(entryId);
      // Reload from server directly ensures UI and Backend are perfectly in sync
      await load(year, month);
    } catch (e: any) {
      alert("Gagal menghapus: " + (e?.response?.data?.message || e.message || "Unknown error"));
    }
  };

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><FiCalendar className="text-amber-500" /> Penjadwalan & Penerima Manfaat</h1>
          <p className="text-gray-500 text-sm mt-1">Atur jadwal menu harian dan masukkan jumlah sasaran penerima manfaat (porsi) untuk Dapur Unit ini.</p>
        </div>
        {dapur && <span className="text-sm font-semibold text-amber-900 bg-amber-100 px-4 py-2 rounded-lg">{dapur.name}</span>}
      </div>

      {/* Month Navigator */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-200 text-gray-600 rounded-lg transition-all"><FiChevronLeft className="w-5 h-5" /></button>
          <h2 className="text-lg font-bold text-gray-900">{MONTHS_ID[month - 1]} {year}</h2>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-200 text-gray-600 rounded-lg transition-all"><FiChevronRight className="w-5 h-5" /></button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/80">
          {DAYS_ID.map(d => (
            <div key={d} className="py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {/* Empty cells */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[140px] border-r border-b border-gray-50 bg-gray-50/50" />
          ))}
          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const entries = getEntriesForDate(day);
            const isToday = day === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear();
            return (
              <div key={day} className={`min-h-[140px] border-r border-b border-gray-100 p-2 flex flex-col ${isToday ? "bg-amber-50/60" : "hover:bg-gray-50/50"} transition-colors relative group`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? "bg-amber-500 text-white" : "text-gray-700 font-medium"}`}>{day}</span>
                  <button onClick={() => openAddModal(day)} title="Jadwalkan Menu" className="opacity-0 group-hover:opacity-100 hover:opacity-100 p-1 text-gray-400 hover:text-amber-600 hover:bg-amber-100 rounded transition-all">
                    <FiPlus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 space-y-1.5 overflow-y-auto w-full custom-scrollbar pr-1">
                  {entries.map(entry => {
                    const totalQty = entry.portions.reduce((sum, p) => sum + p.quantity, 0);
                    return (
                      <div key={entry.id} className="group/entry flex flex-col bg-amber-100/60 border border-amber-200/50 rounded-lg p-2 shadow-sm relative">
                        <div className="flex items-start justify-between">
                          <span className="text-xs text-amber-900 font-bold leading-tight">{entry.menu.name}</span>
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteEntry(entry.id, day); }} title="Hapus" className="text-amber-500 hover:text-white hover:bg-red-500 rounded-md p-1 ml-1 flex-shrink-0 transition-all cursor-pointer relative z-10">
                            <FiX className="w-4 h-4 pointer-events-none" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between mt-1 text-[10px] text-amber-800/80">
                          <span>{entry.portions.length} tipe ({totalQty} porsi)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 px-2 text-sm text-gray-500 font-medium mt-3">
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-amber-100 border border-amber-200 rounded" /> Rencana Menu Harian</div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-amber-500 rounded-full" /> Tanggal Hari Ini</div>
      </div>

      {/* Add Menu Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Jadwalkan Menu & Penerima Manfaat</h2>
                <p className="text-sm font-medium text-amber-600">{selectedDate}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-200 rounded-xl text-gray-500 transition-colors"><FiX className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">Pilih Master Menu <span className="text-red-500">*</span></label>
                <select value={addForm.menuId} onChange={e => setAddForm(p => ({ ...p, menuId: e.target.value }))} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white shadow-sm transition-shadow">
                  <option value="">-- Pilih Template Menu --</option>
                  {menus.map(m => <option key={m.id} value={m.id}>{m.name}{m.category ? ` (${m.category})` : ""}</option>)}
                </select>
              </div>

              {portionTypes.length > 0 && (
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
                  <label className="block text-sm font-bold text-amber-900 mb-2">Jumlah Sasaran / Penerima Manfaat</label>
                  <p className="text-xs text-amber-700/70 mb-4 line-clamp-2">Masukkan jumlah porsi yang akan diproduksi untuk jadwal ini. Jumlah ini akan secara otomatis dikonversikan menjadi akumulasi raw material yang dapat Anda pesan (Purchase Order) pada form PO Automation.</p>
                  <div className="space-y-3">
                    {portionTypes.map(pt => (
                      <div key={pt.id} className="flex items-center justify-between bg-white border border-amber-200/60 rounded-lg p-3 shadow-sm">
                        <div>
                          <span className="text-sm font-bold text-gray-800 block">{pt.name}</span>
                          {pt.description && <span className="text-[11px] text-gray-500">{pt.description}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            value={addForm.portions[pt.id] === 0 ? "" : addForm.portions[pt.id]}
                            onChange={e => setAddForm(p => ({ ...p, portions: { ...p.portions, [pt.id]: parseInt(e.target.value) || 0 } }))}
                            className="w-20 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder:font-normal placeholder:text-gray-300"
                            placeholder="0"
                          />
                          <span className="text-xs font-medium text-gray-400 w-10">porsi</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">Catatan Dapur (opsional)</label>
                <textarea rows={2} value={addForm.notes} onChange={e => setAddForm(p => ({ ...p, notes: e.target.value }))} placeholder="Catatan khusus untuk operasional memasak hari ini..." className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm transition-shadow resize-none" />
              </div>
            </div>

            <div className="flex items-center gap-3 p-5 border-t border-gray-100 bg-gray-50/50">
              <button onClick={() => setShowModal(false)} className="px-6 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors shadow-sm">Batal</button>
              <button onClick={handleSave} disabled={saving || !addForm.menuId} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 focus:ring-4 focus:ring-amber-500/20 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                <FiSave className="w-5 h-5 mb-0.5" /> {saving ? "Menyimpan ke Jadwal..." : "Simpan Penjadwalan"}
              </button>
            </div>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #fde68a; border-radius: 4px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: #fcd34d; }
      `}} />
    </div>
  );
}
