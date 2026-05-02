"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { menuApi, portionTypeApi, Menu, PortionType } from "@/services/produksi.service";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { FiBook, FiPlus, FiEdit2, FiTrash2, FiChevronDown, FiChevronUp, FiSave, FiX, FiUpload, FiDownload, FiActivity, FiGlobe, FiRefreshCw } from "react-icons/fi";
import * as XLSX from "xlsx";

type IngredientForm = { portionTypeId: string; ingredientName: string; unit: string; gramsPerPortion: number };

import { dapurService, DapurUnit } from "@/services/dapur.service";

export default function DapurMenuPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [portionTypes, setPortionTypes] = useState<PortionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Menu modal
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [menuForm, setMenuForm] = useState({ 
    name: "", description: "", category: "", 
    calories: 0, protein: 0, carbs: 0, fat: 0 
  });

  // Ingredient editor
  const [editingIngredients, setEditingIngredients] = useState<string | null>(null);
  const [ingredientRows, setIngredientRows] = useState<IngredientForm[]>([]);
  const [savingIngr, setSavingIngr] = useState(false);

  // Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [dapurUnitId, setDapurUnitId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const dapurData = await dapurService.getMyDapur();
      const currentDapurId = dapurData?.[0]?.id || null;
      setDapurUnitId(currentDapurId);
      
      if (!currentDapurId) {
          setLoading(false);
          return;
      }
      
      const [m, pt] = await Promise.all([menuApi.getAll(currentDapurId), portionTypeApi.getAll()]);
      setMenus(m);
      setPortionTypes(pt);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const allowedRoles = ["ADMIN_DAPUR", "AKUNTAN", "PRODUKSI", "AHLI_GIZI", "CHEF"];
    if (user && !allowedRoles.includes(user.user.role)) {
      router.replace("/dashboard");
      return;
    }
    load();
  }, [user, router, load]);

  const openCreateMenu = () => { setEditingMenu(null); setMenuForm({ name: "", description: "", category: "", calories: 0, protein: 0, carbs: 0, fat: 0 }); setShowMenuModal(true); };
  const openEditMenu = (m: Menu) => { 
    setEditingMenu(m); 
    setMenuForm({ 
        name: m.name, description: m.description || "", category: m.category || "",
        calories: m.calories || 0, protein: m.protein || 0, carbs: m.carbs || 0, fat: m.fat || 0
    }); 
    setShowMenuModal(true); 
  };

  const saveMenu = async () => {
    if (!menuForm.name.trim() || !dapurUnitId) return;
    try {
      if (editingMenu) {
        const updated = await menuApi.update(editingMenu.id, { ...menuForm, dapurUnitId });
        setMenus(prev => prev.map(m => m.id === editingMenu.id ? updated : m));
      } else {
        const created = await menuApi.create({ ...menuForm, dapurUnitId });
        setMenus(prev => [created, ...prev]);
      }
      setShowMenuModal(false);
    } catch (e: any) {
      alert(e?.response?.data?.message || "Terjadi kesalahan menyimpan menu");
    }
  };

  const deleteMenu = async (id: string) => {
    if (!confirm("Hapus menu lokal ini?")) return;
    try {
      await menuApi.delete(id);
      setMenus(prev => prev.filter(m => m.id !== id));
      if (expanded === id) setExpanded(null);
    } catch (e: any) {
      alert("Gagal menghapus menu: " + e?.response?.data?.message);
    }
  };

  const handleCopyGlobalMenu = async (id: string) => {
    if (!confirm("Salin master menu ini menjadi menu lokal dapur Anda?")) return;
    if (!dapurUnitId) { alert("Dapur Unit ID tidak ditemukan"); return; }
    try {
      const cloned = await menuApi.copyMenu(id, { dapurUnitId });
      alert("Menu berhasil disalin ke dapur lokal!");
      load();
    } catch (e: any) {
      alert("Gagal menyalin menu: " + e?.response?.data?.message);
    }
  };

  // Ingredient editor
  const startEditIngredients = (menu: Menu) => {
    setEditingIngredients(menu.id);
    if (menu.ingredients.length > 0) {
      setIngredientRows(menu.ingredients.map(i => ({
        portionTypeId: i.portionTypeId,
        ingredientName: i.ingredientName,
        unit: i.unit,
        gramsPerPortion: i.gramsPerPortion,
      })));
    } else {
      setIngredientRows(portionTypes.map(pt => ({ portionTypeId: pt.id, ingredientName: "", unit: "gram", gramsPerPortion: 0 })));
    }
  };

  const addIngredientRow = () => setIngredientRows(prev => [...prev, { portionTypeId: portionTypes[0]?.id || "", ingredientName: "", unit: "gram", gramsPerPortion: 0 }]);
  const updateRow = (idx: number, field: keyof IngredientForm, value: any) => {
    setIngredientRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };
  const removeRow = (idx: number) => setIngredientRows(prev => prev.filter((_, i) => i !== idx));

  // Smart Unit Converter
  const handleConvertUnit = (idx: number) => {
    setIngredientRows(prev => {
      const newRows = [...prev];
      const row = newRows[idx];
      if (!row) return newRows;
      
      const unit = row.unit.toLowerCase().trim();
      let newQty = row.gramsPerPortion;
      let newUnit = row.unit;

      if (unit === 'kg' || unit === 'kilogram') {
        newQty = newQty * 1000;
        newUnit = 'Gram';
      } else if (unit === 'liter' || unit === 'l') {
        newQty = newQty * 1000;
        newUnit = 'Mililiter';
      } else if (unit === 'ons') {
        newQty = newQty * 100;
        newUnit = 'Gram';
      } else if (unit === 'sdm') {
        newQty = newQty * 15;
        newUnit = 'Gram';
      } else if (unit === 'sdt') {
        newQty = newQty * 5;
        newUnit = 'Gram';
      } else {
        return newRows; // no conversion needed
      }

      newRows[idx] = { ...row, gramsPerPortion: newQty, unit: newUnit };
      return newRows;
    });
  };

  const saveIngredients = async (menuId: string) => {
    const valid = ingredientRows.filter(r => r.ingredientName.trim() && r.portionTypeId && r.gramsPerPortion > 0);
    setSavingIngr(true);
    try {
      const updated = await menuApi.upsertIngredients(menuId, valid);
      setMenus(prev => prev.map(m => m.id === menuId ? { ...m, ingredients: updated.ingredients } : m));
      setEditingIngredients(null);
    } catch (e: any) {
      alert("Gagal menyimpan bahan: " + e?.response?.data?.message);
    } finally {
      setSavingIngr(false);
    }
  };

  // ==========================================
  // EXCEL IMPORT & EXPORT
  // ==========================================
  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        "Nama Menu": "Daging Sapi Lokal (Unit A)",
        "Kategori": "Lauk Utama",
        "Bahan Baku": "Daging Sapi Slice/Cincang",
        "Satuan": "Gram",
        "Porsi Besar (SD/SMP)": 80,
        "Porsi Kecil (TK/PAUD)": 50,
        "Kalori (Kkal)": 450,
        "Protein (g)": 30,
        "Karbohidrat (g)": 45,
        "Lemak (g)": 15
      }
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Menu BOM Lokal");
    
    // Add instruction sheet
    const wsHelp = XLSX.utils.json_to_sheet([
        { Catatan: "1. Nama Menu harus persis sama untuk bahan-bahan di menu yang sama." },
        { Catatan: "2. Nilai Gizi cukup ditulis dan akan menimpa/diambil dari baris terakhir." },
        { Catatan: "3. 'Jenis Porsi' akan otomatis dibuat jika belum ada di sistem." },
        { Catatan: "4. Pastikan 'Kuantitas' (angka) dan 'Satuan' terisi pada setiap baris bahan baku." },
    ]);
    XLSX.utils.book_append_sheet(wb, wsHelp, "Instruksi");

    try {
        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const dataBlob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
        const url = window.URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "Template_Master_Menu_Lokal.xlsx";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (err: any) {
        console.error(err);
        alert("Gagal membuat file template Excel: " + err.message);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !dapurUnitId) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        // Group rows into Menu bulk payload
        const menuMap = new Map<string, any>();

        data.forEach(row => {
          const mName = row["Nama Menu"] || row["Menu"];
          if (!mName) return;

          const parseNum = (val: any) => parseFloat(String(val || "0").replace(/,/g, "."));

          if (!menuMap.has(mName)) {
            menuMap.set(mName, {
              name: mName,
              category: row["Kategori"] || "",
              calories: parseNum(row["Kalori (Kkal)"]),
              protein: parseNum(row["Protein (g)"]),
              carbs: parseNum(row["Karbohidrat (g)"]),
              fat: parseNum(row["Lemak (g)"]),
              ingredients: []
            });
          }

          const menu = menuMap.get(mName);
          const ingName = row["Bahan Baku"] || row["Nama Bahan"];
          const unit = row["Satuan"] || "Gram";

          if (ingName) {
            // Find all portion columns (case-insensitive starts with 'porsi')
            const keys = Object.keys(row);
            const portionKeys = keys.filter(k => k.toLowerCase().includes('porsi'));

            portionKeys.forEach(pKey => {
                const qty = parseNum(row[pKey]);
                if (qty > 0) {
                    // Extract exact column name as the portion name to remain consistent
                    const portionName = pKey;
                    menu.ingredients.push({
                        portionTypeName: portionName,
                        ingredientName: ingName,
                        quantity: qty,
                        unit: unit
                    });
                }
            });
          }
        });

        const menusArray = Array.from(menuMap.values());
        
        if (menusArray.length === 0) {
            throw new Error("Tidak ada data menu valid yang ditemukan di file Excel.");
        }

        const res = await menuApi.createBulk({ menus: menusArray, dapurUnitId });
        alert(`Berhasil mengunggah ${res.count} Menu Lokal beserta detail BOM dan gizinya!`);
        
        // reload grid
        load();
      } catch (err: any) {
        console.error(err);
        alert("Gagal memproses file Excel: " + (err.message || "Pastikan format sesuai template."));
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.onerror = () => {
        alert("Gagal membaca file.");
        setUploading(false);
    }
    reader.readAsBinaryString(file);
  };

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><FiBook className="text-slate-900" /> Referensi & Menu Dapur</h1>
          <p className="text-gray-500 text-sm mt-1">Daftar resep dari Menu Pusat (Global) dan menu lokal kreasi dapur Anda</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm">
             <FiDownload className="text-slate-400" /> Unduh Template
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv" className="hidden" />
          <button disabled={uploading} onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50">
             <FiUpload /> {uploading ? "Memproses..." : "Upload Menu Lokal"}
          </button>
          <div className="w-px h-6 bg-gray-200 hidden sm:block"></div>
          <button onClick={openCreateMenu} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-all shadow-sm">
            <FiPlus /> Menu Lokal Baru
          </button>
        </div>
      </div>

      {portionTypes.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          ⚠️ Master jenis porsi belum tersedia di sistem pusat.
        </div>
      )}

      {menus.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
          <FiBook className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-500">Belum Ada Menu</h3>
          <p className="text-sm text-gray-400 mt-1 mb-6">Master menu dari pusat belum tersedia, Anda dapat membuat menu lokal.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {menus.map(menu => {
            const isGlobal = !menu.dapurUnitId;

            return (
              <div key={menu.id} className={`bg-white rounded-xl border ${isGlobal ? 'border-amber-200 shadow-sm' : 'border-slate-100 shadow-sm'} overflow-hidden`}>
                {/* Header */}
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-slate-50/50 transition-colors gap-4 ${isGlobal ? 'bg-amber-50/20' : ''}`}>
                  <div className="flex items-start gap-4 flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(expanded === menu.id ? null : menu.id)}>
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 text-lg shadow-inner">
                      {isGlobal ? '🌍' : '👨‍🍳'}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                        {menu.name}
                        {isGlobal ? (
                           <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                             <FiGlobe className="w-3 h-3"/> MASTER PUSAT
                           </span>
                        ) : (
                           <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                             MENU LOKAL
                           </span>
                        )}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5">
                        {menu.category && <span className="text-[11px] font-bold uppercase tracking-wider bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full">{menu.category}</span>}
                        <span className="text-xs text-gray-500 font-medium flex items-center gap-1.5"><FiActivity className="text-emerald-500" /> {menu.calories || 0} Kkal</span>
                        <span className="text-xs text-gray-400">&bull; {menu.ingredients.length} item BOM</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 sm:flex-shrink-0 sm:ml-3 bg-gray-50 sm:bg-transparent rounded-lg p-2 sm:p-0">
                    <button onClick={() => setExpanded(expanded === menu.id ? null : menu.id)} className="flex-1 sm:flex-none p-2 text-gray-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all flex justify-center items-center">
                      {expanded === menu.id ? <FiChevronUp className="w-5 h-5" /> : <FiChevronDown className="w-5 h-5" />}
                    </button>
                    {isGlobal && (
                      <>
                        <div className="w-px bg-gray-200 my-1 hidden sm:block"></div>
                        <button onClick={(e) => { e.stopPropagation(); handleCopyGlobalMenu(menu.id); }} className="flex-1 sm:flex-none p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-100 rounded-lg transition-all flex justify-center items-center" title="Salin menu ini ke dapur Anda">
                          <FiDownload className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {!isGlobal && (
                      <>
                        <div className="w-px bg-gray-200 my-1 hidden sm:block"></div>
                        <button onClick={() => openEditMenu(menu)} className="flex-1 sm:flex-none p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all flex justify-center items-center" title="Edit Metadata">
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteMenu(menu.id)} className="flex-1 sm:flex-none p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex justify-center items-center" title="Hapus">
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Expanded: Ingredient Editor */}
                {expanded === menu.id && (
                  <div className="border-t border-gray-100 bg-slate-50/80">
                    
                    {/* Info Gizi Bar */}
                    <div className="px-5 py-4 bg-white/60 border-b border-gray-100 flex flex-wrap gap-6 items-center text-sm font-medium">
                      <span className="text-gray-500 uppercase tracking-wider text-[10px] font-bold">Profil Gizi:</span>
                      <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-400" /> Kalori: <span className="text-gray-900 font-bold">{menu.calories || 0} Kkal</span></span>
                      <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-400" /> Protein: <span className="text-gray-900 font-bold">{menu.protein || 0} g</span></span>
                      <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-400" /> Karbo: <span className="text-gray-900 font-bold">{menu.carbs || 0} g</span></span>
                      <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-400" /> Lemak: <span className="text-gray-900 font-bold">{menu.fat || 0} g</span></span>
                    </div>

                    <div className="p-5">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">Bill of Materials / Komposisi (Per Porsi)</h4>
                          {!isGlobal && editingIngredients !== menu.id && (
                            <button onClick={() => startEditIngredients(menu)} className="flex items-center gap-1.5 text-sm text-slate-700 font-bold hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition-all shadow-sm">
                              <FiEdit2 className="w-3.5 h-3.5" /> Konfigurasi Bahan
                            </button>
                          )}
                          {!isGlobal && editingIngredients === menu.id && (
                            <div className="flex gap-2">
                              <button onClick={() => setEditingIngredients(null)} className="text-sm text-gray-600 font-bold hover:bg-gray-100 px-4 py-1.5 rounded-lg border border-transparent transition-colors">Batal</button>
                              <button onClick={() => saveIngredients(menu.id)} disabled={savingIngr} className="flex items-center gap-1.5 text-sm text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-1.5 rounded-lg font-bold disabled:opacity-50 transition-all shadow-sm">
                                <FiSave className="w-3.5 h-3.5" /> {savingIngr ? "Menyimpan..." : "Simpan BOM"}
                              </button>
                            </div>
                          )}
                        </div>

                        {editingIngredients !== menu.id ? (
                          // View mode
                          menu.ingredients.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-8 bg-white/50 rounded-xl border border-gray-200 border-dashed">Belum ada bahan baku dikonfigurasi.</p>
                          ) : (
                            <div className="overflow-hidden bg-white border border-gray-100 rounded-xl shadow-sm">
                              <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                  <thead className="bg-gray-50 border-b border-gray-100">
                                      <tr className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                                      <th className="px-5 py-3.5 text-left">Nama Bahan Baku</th>
                                      <th className="px-5 py-3.5 text-left w-64">Jenis Porsi Sasaran</th>
                                      <th className="px-5 py-3.5 text-right w-40">Kuantitas</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-50">
                                      {menu.ingredients.map((ing, idx) => (
                                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                          <td className="px-5 py-3.5 font-semibold text-slate-800">{ing.ingredientName}</td>
                                          <td className="px-5 py-3.5"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">{ing.portionType?.name || 'UMUM'}</span></td>
                                          <td className="px-5 py-3.5 text-right font-bold text-emerald-600 tabular-nums">{ing.gramsPerPortion} <span className="text-xs text-gray-400 font-normal ml-0.5">{ing.unit}</span></td>
                                      </tr>
                                      ))}
                                  </tbody>
                                  </table>
                              </div>
                            </div>
                          )
                        ) : (
                          // Edit mode (Lokal)
                          <div className="space-y-3 bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
                              <div className="hidden sm:grid grid-cols-12 gap-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
                                  <div className="col-span-5">Nama Bahan Baku</div>
                                  <div className="col-span-3">Jenis Porsi</div>
                                  <div className="col-span-3 text-right">Kuantitas & Satuan</div>
                                  <div className="col-span-1"></div>
                              </div>
                            {ingredientRows.map((row, idx) => (
                              <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start group">
                                <div className="col-span-1 sm:col-span-5">
                                  <label className="sm:hidden block text-xs font-semibold text-gray-500 mb-1">Nama Bahan Baku</label>
                                  <input
                                    type="text"
                                    placeholder="Contoh: Beras Putih, Daging Ayam"
                                    value={row.ingredientName}
                                    onChange={e => updateRow(idx, "ingredientName", e.target.value)}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-shadow font-medium text-slate-800"
                                  />
                                </div>
                                <div className="col-span-1 sm:col-span-3">
                                  <label className="sm:hidden block text-xs font-semibold text-gray-500 mb-1">Jenis Porsi</label>
                                  <select
                                    value={row.portionTypeId}
                                    onChange={e => updateRow(idx, "portionTypeId", e.target.value)}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-slate-50"
                                  >
                                    {portionTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
                                  </select>
                                </div>
                                <div className="col-span-1 sm:col-span-3 flex gap-2">
                                  <div className="flex-1">
                                    <label className="sm:hidden block text-xs font-semibold text-gray-500 mb-1">Kuantitas</label>
                                    <input
                                      type="number"
                                      min={0}
                                      value={row.gramsPerPortion === 0 ? "" : row.gramsPerPortion}
                                      onChange={e => updateRow(idx, "gramsPerPortion", parseFloat(e.target.value) || 0)}
                                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 font-bold text-center text-emerald-700"
                                      placeholder="0"
                                    />
                                  </div>
                                  <div className="w-24">
                                    <label className="sm:hidden block text-xs font-semibold text-gray-500 mb-1">Satuan</label>
                                    <div className="relative flex items-center">
                                      <input
                                        type="text"
                                        list="standard-units"
                                        value={row.unit}
                                        onChange={e => updateRow(idx, "unit", e.target.value)}
                                        className="w-full border border-gray-200 rounded-lg pl-2 pr-8 py-2 text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-slate-50"
                                      />
                                      <button 
                                        type="button"
                                        onClick={() => handleConvertUnit(idx)}
                                        className="absolute right-2 text-amber-500 hover:text-amber-600 transition-colors"
                                        title="Konversi Otomatis ke Unit Dasar (cth: Kg -> Gram)"
                                      >
                                        <FiRefreshCw className="w-4 h-4" />
                                      </button>
                                      <datalist id="standard-units">
                                        <option value="Gram"></option>
                                        <option value="Kg"></option>
                                        <option value="Mililiter"></option>
                                        <option value="Liter"></option>
                                        <option value="Pcs"></option>
                                        <option value="Lembar"></option>
                                        <option value="Ikat"></option>
                                        <option value="Bungkus"></option>
                                        <option value="Sdm"></option>
                                      </datalist>
                                    </div>
                                  </div>
                                </div>
                                <div className="col-span-1 flex items-center justify-end sm:pt-2">
                                  <button onClick={() => removeRow(idx)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Hapus Baris">
                                    <FiTrash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                            <button onClick={addIngredientRow} className="mt-3 flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50/50 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors border border-dashed border-blue-200">
                              <FiPlus className="w-4 h-4" /> Tambah Bahan Sekali Lagi
                            </button>
                          </div>
                        )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add/Edit Menu */}
      {showMenuModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800">{editingMenu ? "Edit Menu Lokal" : "Buat Menu Lokal Baru"}</h2>
              <button onClick={() => setShowMenuModal(false)} className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-xl transition-colors"><FiX className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 space-y-5 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nama Menu <span className="text-red-500">*</span></label>
                        <input value={menuForm.name} onChange={e => setMenuForm(p => ({ ...p, name: e.target.value }))} autoFocus className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-shadow font-bold text-slate-800" placeholder="Contoh: Nasi Goreng Spesial" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Kategori Label</label>
                        <input value={menuForm.category} onChange={e => setMenuForm(p => ({ ...p, category: e.target.value }))} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-shadow" placeholder="Contoh: Lauk Pauk Utama" />
                    </div>
                </div>
                
                <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-4">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2 mb-3 flex justify-between items-center">
                        Informasi Kandungan Gizi
                        <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">Opsional</span>
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1">Kalori (Kkal)</label>
                            <input type="number" step="0.1" value={menuForm.calories === 0 ? "" : menuForm.calories} onChange={e => setMenuForm(p => ({ ...p, calories: parseFloat(e.target.value) || 0 }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 text-slate-700 font-medium" placeholder="0" />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1">Protein (g)</label>
                            <input type="number" step="0.1" value={menuForm.protein === 0 ? "" : menuForm.protein} onChange={e => setMenuForm(p => ({ ...p, protein: parseFloat(e.target.value) || 0 }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700 font-medium" placeholder="0" />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1">Karbohidrat (g)</label>
                            <input type="number" step="0.1" value={menuForm.carbs === 0 ? "" : menuForm.carbs} onChange={e => setMenuForm(p => ({ ...p, carbs: parseFloat(e.target.value) || 0 }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-700 font-medium" placeholder="0" />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1">Lemak (g)</label>
                            <input type="number" step="0.1" value={menuForm.fat === 0 ? "" : menuForm.fat} onChange={e => setMenuForm(p => ({ ...p, fat: parseFloat(e.target.value) || 0 }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 text-slate-700 font-medium" placeholder="0" />
                        </div>
                    </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Deskripsi Ringkas</label>
                <textarea rows={2} value={menuForm.description} onChange={e => setMenuForm(p => ({ ...p, description: e.target.value }))} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-shadow resize-none" placeholder="Tuliskan panduan produksi ringkas atau catatan khusus menu ini..." />
              </div>

            </div>

            <div className="flex gap-3 p-5 border-t border-gray-100 bg-slate-50/50">
              <button onClick={() => setShowMenuModal(false)} className="flex-1 py-2.5 bg-white border border-gray-300 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition-colors shadow-sm">Batal</button>
              <button onClick={saveMenu} disabled={!menuForm.name.trim()} className="flex-[2] py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-md focus:ring-4 focus:ring-slate-900/20 disabled:opacity-50">
                Simpan Menu Lokal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
