"use client";

import React, { useEffect, useMemo, useState } from "react";
import { 
  FiPackage, 
  FiTruck, 
  FiCheckCircle, 
  FiAlertTriangle, 
  FiPlus, 
  FiSearch, 
  FiChevronRight, 
  FiFileText,
  FiX,
  FiSave,
  FiRefreshCw,
  FiArrowDown,
  FiBox
} from "react-icons/fi";
import { dapurService, StokOpnameLog } from "@/services/dapur.service";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

interface StokItem {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
  updatedAt: string;
}

interface POItem {
  id: string;
  productName: string;
  quantity: number;
  unit: string;
  receivedItems?: any[];
}

interface PurchaseOrder {
  id: string;
  dapurUnitId: string;
  status: string;
  items: POItem[];
  updatedAt: string;
}

interface OpnameForm {
  itemName: string;
  unit: string;
  systemQty: number;
  physicalQty: number;
  notes: string;
}

export default function AdminDapurStokPage({ category }: { category?: "BAHAN" | "LAIN" }) {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"inventory" | "loading" | "history" | "opname">("inventory");
  const [stok, setStok] = useState<StokItem[]>([]);
  const [incomingPOs, setIncomingPOs] = useState<PurchaseOrder[]>([]);
  const [receptionHistory, setReceptionHistory] = useState<any[]>([]);
  const [opnameHistory, setOpnameHistory] = useState<StokOpnameLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [bahanLabelFilter, setBahanLabelFilter] = useState<"ALL" | "BASAH" | "KERING">("ALL");
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [penerimaanForm, setPenerimaanForm] = useState<{
    notes: string;
    items: {
      poItemId: string;
      productName: string;
      orderedQty: number;
      quantityReceived: number;
      quantityRejected: number;
      quantityReturned: number;
      qualityCheck: string;
      notes: string;
    }[];
  }>({ notes: "", items: [] });
  const [submitting, setSubmitting] = useState(false);
  const [dapurUnitId, setDapurUnitId] = useState<string | null>(null);
  const [opnameOpen, setOpnameOpen] = useState(false);
  const [opnameSaving, setOpnameSaving] = useState(false);
  const [opnameForm, setOpnameForm] = useState<OpnameForm>({
    itemName: "",
    unit: "",
    systemQty: 0,
    physicalQty: 0,
    notes: "",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [stokRes, poRes, receptionHistoryRes, opnameRes, unitRes] = await Promise.all([
        dapurService.getMyStok(category),
        dapurService.getIncomingPOs(),
        dapurService.getLoadingHistory(),
        dapurService.getStokOpnameHistory(category),
        dapurService.getMyUnit(),
      ]);
      setStok(stokRes);
      setIncomingPOs(poRes);
      setReceptionHistory(receptionHistoryRes);
      setOpnameHistory(opnameRes);
      setDapurUnitId(unitRes?.id || null);
    } catch (error) {
      console.error("Gagal mengambil data stok:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const role = user?.user.role || "";
    const gudangOnly = ["GUDANG"];
    const generalWarehouse = ["ADMIN_DAPUR", "AKUNTAN", "PRODUKSI", "AHLI_GIZI", "CHEF"];
    const allowedRoles = category ? [...gudangOnly, ...generalWarehouse] : generalWarehouse;
    if (!allowedRoles.includes(role)) {
      router.replace("/dashboard");
      return;
    }
    fetchData();
  }, [user, category, router]);

  const openReceiveModal = (po: PurchaseOrder) => {
    setSelectedPO(po);
    const isFollowUp = po.status === "DELIVERED";
    setPenerimaanForm({
      notes: "",
      items: po.items.map((item) => ({
        poItemId: item.id,
        productName: item.productName || "",
        orderedQty: item.quantity,
        // Penerimaan pertama: default gross = qty order. Lanjutan (PO sudah DELIVERED): default 0 agar retur/reject mengurangi stok tanpa menambah "diterima" lagi.
        quantityReceived: isFollowUp ? 0 : item.quantity,
        quantityRejected: 0,
        quantityReturned: 0,
        qualityCheck: "Baik",
        notes: "",
      })),
    });
    setIsModalOpen(true);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...penerimaanForm.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setPenerimaanForm({ ...penerimaanForm, items: newItems });
  };

  const handleSubmitPenerimaan = async () => {
    if (!selectedPO) return;
    try {
      setSubmitting(true);
      await dapurService.receivePO(selectedPO.id, penerimaanForm);
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Gagal memproses penerimaan:", error);
      alert("Gagal memproses penerimaan barang.");
    } finally {
      setSubmitting(false);
    }
  };

  const openOpnameModal = (item: StokItem) => {
    setOpnameForm({
      itemName: item.itemName,
      unit: item.unit,
      systemQty: item.quantity,
      physicalQty: item.quantity,
      notes: "",
    });
    setOpnameOpen(true);
  };

  const submitOpname = async () => {
    if (!dapurUnitId) {
      alert("Dapur unit tidak ditemukan.");
      return;
    }
    try {
      setOpnameSaving(true);
      const result = await dapurService.createStokOpname(dapurUnitId, {
        itemName: opnameForm.itemName,
        physicalQty: opnameForm.physicalQty,
        unit: opnameForm.unit,
        category: category || "BAHAN",
        note: opnameForm.notes || undefined,
      });
      setOpnameOpen(false);
      await fetchData();
      const diff = result?.log?.difference ?? (opnameForm.physicalQty - opnameForm.systemQty);
      alert(`Stok opname berhasil disimpan. Selisih: ${diff > 0 ? "+" : ""}${diff.toLocaleString("id-ID")} ${opnameForm.unit}`);
    } catch (error) {
      console.error("Gagal menyimpan stok opname:", error);
      alert("Gagal menyimpan stok opname.");
    } finally {
      setOpnameSaving(false);
    }
  };

  const getBahanLabel = (itemName: string): "BASAH" | "KERING" => {
    const name = itemName.toLowerCase();
    const wetKeywords = [
      "ayam", "ikan", "daging", "udang", "susu", "telur", "tahu", "tempe",
      "sayur", "bayam", "kangkung", "wortel", "kol", "sawi", "cabai", "tomat",
      "bawang", "kentang", "buah", "pisang", "apel",
    ];
    return wetKeywords.some((kw) => name.includes(kw)) ? "BASAH" : "KERING";
  };

  const filteredStok = stok.filter((item) => {
    const matchSearch = item.itemName.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchSearch) return false;
    if (category !== "BAHAN" || bahanLabelFilter === "ALL") return true;
    return getBahanLabel(item.itemName) === bahanLabelFilter;
  });

  const bahanCounts = useMemo(() => {
    if (category !== "BAHAN") return { basah: 0, kering: 0 };
    const basah = stok.filter((item) => getBahanLabel(item.itemName) === "BASAH").length;
    return { basah, kering: Math.max(0, stok.length - basah) };
  }, [stok, category]);

  return (
    <div className="py-6 space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 sm:px-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{category === 'LAIN' ? 'Gudang Lain-lain' : 'Gudang Bahan Baku'}</h1>
          <p className="text-slate-500 text-sm">Monitor persediaan dan kelola penerimaan {category === 'LAIN' ? 'barang (packaging, gas, dll)' : 'bahan baku masakan'}.</p>
          {category === "BAHAN" && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[11px] font-bold px-2 py-1 rounded bg-cyan-100 text-cyan-800 border border-cyan-200">
                Gudang Basah: {bahanCounts.basah}
              </span>
              <span className="text-[11px] font-bold px-2 py-1 rounded bg-amber-100 text-amber-800 border border-amber-200">
                Gudang Kering: {bahanCounts.kering}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData}
            className="p-2 text-slate-400 hover:text-amber-600 transition-colors"
            title="Refresh Data"
          >
            <FiRefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder={category === 'LAIN' ? "Cari barang..." : "Cari bahan..."} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none w-full md:w-64"
            />
          </div>
          {category === "BAHAN" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBahanLabelFilter("ALL")}
                className={`px-3 py-2 rounded-lg text-xs font-bold border ${bahanLabelFilter === "ALL" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"}`}
              >
                Semua
              </button>
              <button
                onClick={() => setBahanLabelFilter("BASAH")}
                className={`px-3 py-2 rounded-lg text-xs font-bold border ${bahanLabelFilter === "BASAH" ? "bg-cyan-600 text-white border-cyan-600" : "bg-white text-cyan-700 border-cyan-200"}`}
              >
                Gudang Basah
              </button>
              <button
                onClick={() => setBahanLabelFilter("KERING")}
                className={`px-3 py-2 rounded-lg text-xs font-bold border ${bahanLabelFilter === "KERING" ? "bg-amber-600 text-white border-amber-600" : "bg-white text-amber-700 border-amber-200"}`}
              >
                Gudang Kering
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-4 sm:px-0">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="bg-amber-50 text-amber-600 p-4 rounded-xl">
            {category === 'LAIN' ? <FiBox className="w-6 h-6" /> : <FiPackage className="w-6 h-6" />}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Total Item Stok</p>
            <h3 className="text-2xl font-black text-slate-900 leading-none">{stok.length}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="bg-blue-50 text-blue-600 p-4 rounded-xl">
            <FiTruck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">PO Menunggu Bongkar</p>
            <h3 className="text-2xl font-black text-slate-900 leading-none">{incomingPOs.length}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl">
            <FiCheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Penerimaan Minggu Ini</p>
            <h3 className="text-2xl font-black text-slate-900 leading-none">{receptionHistory.length}</h3>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {/* TAB NAVIGATION */}
        <div className="flex border-b border-slate-100">
          <button 
            onClick={() => setActiveTab("inventory")}
            className={`flex-1 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'inventory' ? 'border-amber-500 text-amber-600 bg-amber-50/30' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
          >
            Persediaan Gudang
          </button>
          <button 
            onClick={() => setActiveTab("loading")}
            className={`flex-1 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'loading' ? 'border-amber-500 text-amber-600 bg-amber-50/30' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
          >
            Penerimaan (Loading)
            {incomingPOs.length > 0 && <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full">{incomingPOs.length}</span>}
          </button>
          <button 
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'history' ? 'border-amber-500 text-amber-600 bg-amber-50/30' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
          >
            Riwayat Penerimaan
          </button>
          <button
            onClick={() => setActiveTab("opname")}
            className={`flex-1 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'opname' ? 'border-indigo-500 text-indigo-600 bg-indigo-50/30' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
          >
            Riwayat Stok Opname
          </button>
        </div>

        {/* TAB CONTENT */}
        <div className="p-2">
          {activeTab === "inventory" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-50">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{category === 'LAIN' ? 'Nama Barang' : 'Nama Bahan'}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kuantitas</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Satuan</th>
                    {category === "BAHAN" && (
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Label Gudang</th>
                    )}
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Terakhir Update</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={category === "BAHAN" ? 6 : 5} className="py-20 text-center text-slate-400 italic">Memuat stok...</td></tr>
                  ) : filteredStok.length === 0 ? (
                    <tr><td colSpan={category === "BAHAN" ? 6 : 5} className="py-20 text-center text-slate-400 italic font-medium">Belum ada stok bahan tercatat.</td></tr>
                  ) : (
                    filteredStok.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                               <FiPackage className="w-4 h-4" />
                            </div>
                            <p className="font-bold text-slate-800">{item.itemName}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-md text-sm font-black ${item.quantity < 10 ? 'text-red-600 bg-red-50' : 'text-slate-900'}`}>
                            {item.quantity.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-xs font-black px-2 py-1 bg-slate-100 text-slate-500 rounded uppercase">{item.unit}</span>
                        </td>
                        {category === "BAHAN" && (
                          <td className="px-6 py-4 text-center">
                            {getBahanLabel(item.itemName) === "BASAH" ? (
                              <span className="text-[10px] font-black px-2 py-1 rounded bg-cyan-100 text-cyan-800 border border-cyan-200 uppercase">
                                Gudang Basah
                              </span>
                            ) : (
                              <span className="text-[10px] font-black px-2 py-1 rounded bg-amber-100 text-amber-800 border border-amber-200 uppercase">
                                Gudang Kering
                              </span>
                            )}
                          </td>
                        )}
                        <td className="px-6 py-4 text-right">
                          <p className="text-[10px] text-slate-400 font-bold">{new Date(item.updatedAt).toLocaleString('id-ID')}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => openOpnameModal(item)}
                            className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition-colors"
                          >
                            Stok Opname
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : activeTab === "loading" ? (
            <div className="space-y-4 p-4">
              {incomingPOs.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center">
                  <FiTruck className="w-12 h-12 text-slate-200 mb-4" />
                  <p className="text-slate-400 italic font-medium">Tidak ada Purchase Order yang sedang menunggu pengiriman.</p>
                </div>
              ) : (
                incomingPOs.map((po) => (
                  <div key={po.id} className="bg-white border border-slate-100 rounded-2xl p-6 hover:shadow-md transition-all group flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-start gap-4">
                       <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                          <FiTruck className="w-6 h-6" />
                       </div>
                       <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-black text-slate-900 uppercase text-xs tracking-wider">ORDER #{po.id.slice(-8).toUpperCase()}</h4>
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-black rounded uppercase tracking-tighter">Dalam Pengiriman</span>
                          </div>
                          <p className="text-sm text-slate-500 font-medium">{po.items.length} jenis barang dari supplier</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase italic">Diupdate pada: {new Date(po.updatedAt).toLocaleDateString('id-ID')}</p>
                       </div>
                    </div>
                    <button 
                      onClick={() => openReceiveModal(po)}
                      className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-xs hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
                    >
                       <FiArrowDown className="w-4 h-4" /> BONGKAR BARANG
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === "history" ? (
            <div className="p-4 space-y-4">
              {receptionHistory.length === 0 ? (
                <div className="py-20 text-center text-slate-400 italic font-medium">Belum ada riwayat penerimaan barang.</div>
              ) : (
                <div className="overflow-x-auto">
                   <table className="w-full text-left">
                     <thead>
                       <tr className="border-b border-slate-50">
                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal</th>
                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">PO Reference</th>
                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Penerima</th>
                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Items</th>
                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status/Notes</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {receptionHistory.map((h: any) => (
                          <tr key={h.id} className="hover:bg-slate-50 text-xs">
                             <td className="px-6 py-4 font-bold text-slate-600">{new Date(h.createdAt).toLocaleDateString('id-ID')}</td>
                             <td className="px-6 py-4 font-black">#{h.purchaseOrderId.slice(-8).toUpperCase()}</td>
                             <td className="px-6 py-4">{h.receivedBy?.fullname || "Admin Dapur"}</td>
                             <td className="px-6 py-4">
                               <div className="space-y-1">
                                 {h.items.map((it: any) => (
                                   <div key={it.id} className="flex gap-2">
                                      <span className="font-bold">{it.poItem?.productName}:</span>
                                      <span className="text-emerald-600 font-bold">{it.quantityReceived} OK</span>
                                      {(it.quantityRejected > 0 || it.quantityReturned > 0) && (
                                        <span className="text-red-500 font-bold">({it.quantityRejected} REJECT / {it.quantityReturned} RETURN)</span>
                                      )}
                                   </div>
                                 ))}
                               </div>
                             </td>
                             <td className="px-6 py-4 italic text-slate-400">{h.notes || "-"}</td>
                          </tr>
                        ))}
                     </tbody>
                   </table>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {opnameHistory.length === 0 ? (
                <div className="py-20 text-center text-slate-400 italic font-medium">Belum ada riwayat stok opname.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-50">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Waktu</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Before</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">After</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Selisih</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Petugas</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {opnameHistory.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50 text-xs">
                          <td className="px-6 py-4 font-bold text-slate-600">{new Date(log.opnameAt || log.createdAt).toLocaleString('id-ID')}</td>
                          <td className="px-6 py-4">
                            <span className="font-bold text-slate-800">{log.itemName}</span>
                            <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-500">{log.category}</span>
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-slate-600">{log.beforeQty.toLocaleString('id-ID')} {log.unit}</td>
                          <td className="px-6 py-4 text-right font-bold text-slate-900">{log.afterQty.toLocaleString('id-ID')} {log.unit}</td>
                          <td className="px-6 py-4 text-right">
                            <span className={`font-black ${log.difference >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {log.difference >= 0 ? '+' : ''}{log.difference.toLocaleString('id-ID')} {log.unit}
                            </span>
                          </td>
                          <td className="px-6 py-4">{log.performedBy?.fullname || log.performedBy?.email || '-'}</td>
                          <td className="px-6 py-4 italic text-slate-500">{log.note || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL RECEIVE PO */}
      {isModalOpen && selectedPO && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-[2rem] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl scale-in-center overflow-y-auto">
              {/* MODAL HEADER */}
              <div className="p-8 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                 <div>
                   <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                     <FiArrowDown className="text-amber-600" /> Penerimaan Barang Terpadu
                   </h2>
                   <p className="text-slate-400 text-sm font-medium">Verifikasi kuantitas & kualitas barang yang masuk ke gudang.</p>
                   {selectedPO.status === "DELIVERED" && (
                     <p className="text-amber-700 text-xs font-semibold mt-2">
                       PO ini sudah pernah diterima. Untuk mencatat retur/reject tambahan saja, isi <strong>Diterima = 0</strong> lalu isi Reject/Return — stok akan berkurang sesuai netto.
                     </p>
                   )}
                 </div>
                 <button onClick={() => setIsModalOpen(false)} className="h-10 w-10 bg-slate-50 text-slate-400 hover:text-red-500 rounded-full flex items-center justify-center transition-colors">
                   <FiX className="w-6 h-6" />
                 </button>
              </div>

              {/* MODAL BODY */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-4">
                       <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Daftar Item dalam PO</h3>
                       <div className="space-y-4">
                          {penerimaanForm.items.map((item, idx) => (
                            <div key={item.poItemId} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 group">
                               <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 mb-6">
                                  <div className="flex items-center gap-3">
                                     <div className="h-10 w-10 bg-white rounded-xl border flex items-center justify-center text-amber-600 font-black">
                                        {idx + 1}
                                     </div>
                                     <div>
                                        <p className="font-black text-slate-900 uppercase tracking-tight leading-none mb-1">{item.productName}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Order: {item.orderedQty} {selectedPO.items[idx]?.unit}</p>
                                     </div>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                     <div className="px-3 py-1 bg-white border rounded-lg text-slate-600 text-[10px] font-black uppercase">Stat: Ordered</div>
                                     <div className={`px-3 py-1 border rounded-lg text-[10px] font-black uppercase ${item.quantityReceived < item.orderedQty ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                        {item.quantityReceived < item.orderedQty ? 'Kurang' : 'Lengkap'}
                                     </div>
                                  </div>
                               </div>

                               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div>
                                    <label className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                      <span>Diterima (Gross)</span>
                                      <span className="text-emerald-500">Netto: {item.quantityReceived - item.quantityRejected - item.quantityReturned}</span>
                                    </label>
                                    <input 
                                      type="number" 
                                      value={item.quantityReceived}
                                      onChange={(e) => handleItemChange(idx, 'quantityReceived', parseFloat(e.target.value) || 0)}
                                      className="w-full bg-white border p-2 rounded-lg text-xs font-bold focus:ring-2 focus:ring-amber-500/20"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Reject (Rusak)</label>
                                    <input 
                                      type="number" 
                                      value={item.quantityRejected}
                                      onChange={(e) => handleItemChange(idx, 'quantityRejected', parseFloat(e.target.value) || 0)}
                                      className="w-full bg-white border p-2 rounded-lg text-xs font-bold focus:ring-2 focus:ring-amber-500/20"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Return</label>
                                    <input 
                                      type="number" 
                                      value={item.quantityReturned}
                                      onChange={(e) => handleItemChange(idx, 'quantityReturned', parseFloat(e.target.value) || 0)}
                                      className="w-full bg-white border p-2 rounded-lg text-xs font-bold focus:ring-2 focus:ring-amber-500/20"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Kualitas</label>
                                    <select 
                                      value={item.qualityCheck}
                                      onChange={(e) => handleItemChange(idx, 'qualityCheck', e.target.value)}
                                      className="w-full bg-white border p-2 rounded-lg text-xs font-bold focus:ring-2 focus:ring-amber-500/20"
                                    >
                                      <option>Baik</option>
                                      <option>Sedang</option>
                                      <option>Buruk</option>
                                    </select>
                                  </div>
                               </div>
                               <div className="mt-4">
                                 <input 
                                   type="text" 
                                   placeholder="Catatan per item (contoh: alasan reject)..."
                                   value={item.notes}
                                   onChange={(e) => handleItemChange(idx, 'notes', e.target.value)}
                                   className="w-full bg-white border p-2 rounded-lg text-[10px] font-medium placeholder:text-slate-300"
                                 />
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>
                    {/* MODAL SIDEBAR INFO */}
                    <div className="space-y-6">
                       <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl">
                          <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-4">Informasi Loading</h4>
                          <div className="space-y-4">
                             <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Catatan Umum</label>
                                <textarea 
                                  rows={4}
                                  placeholder="Contoh: Barang datang jam 10 pagi, kondisi armada supplier bersih..."
                                  value={penerimaanForm.notes}
                                  onChange={(e) => setPenerimaanForm({...penerimaanForm, notes: e.target.value})}
                                  className="w-full bg-slate-800 border-none rounded-xl p-3 text-xs font-medium placeholder:text-slate-600 focus:ring-1 focus:ring-amber-500"
                                />
                             </div>
                             <div className="pt-2">
                                <p className="text-[10px] text-slate-400 leading-relaxed italic">Stok gudang berubah sebesar netto (Diterima − Reject − Return), termasuk berkurang jika netto negatif pada penerimaan lanjutan.</p>
                             </div>
                          </div>
                       </div>

                       <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Rangkuman Receipt</h4>
                          <div className="space-y-2">
                             <div className="flex justify-between text-xs font-bold">
                                <span className="text-slate-500">Total Items:</span>
                                <span className="text-slate-900">{penerimaanForm.items.length}</span>
                             </div>
                             <div className="flex justify-between text-xs font-bold">
                                <span className="text-slate-500">Total Diterima:</span>
                                <span className="text-emerald-600">{penerimaanForm.items.reduce((acc, curr) => acc + curr.quantityReceived, 0)}</span>
                             </div>
                             <div className="flex justify-between text-xs font-bold">
                                <span className="text-slate-500">Total Reject/Return:</span>
                                <span className="text-red-500">{penerimaanForm.items.reduce((acc, curr) => acc + curr.quantityRejected + curr.quantityReturned, 0)}</span>
                             </div>
                             <div className="flex justify-between text-xs font-bold border-t border-slate-200 pt-2 mt-2">
                                <span className="text-slate-500">Δ Stok (netto):</span>
                                <span className="text-slate-900">
                                  {penerimaanForm.items.reduce(
                                    (acc, curr) =>
                                      acc + (curr.quantityReceived - curr.quantityRejected - curr.quantityReturned),
                                    0
                                  )}
                                </span>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

              {/* MODAL FOOTER */}
              <div className="p-8 border-t border-slate-100 bg-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between">
                 <div className="flex items-center gap-2 text-amber-700 bg-amber-50 px-4 py-2 rounded-full border border-amber-100">
                    <FiAlertTriangle className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Pastikan data verifikasi sudah benar</span>
                 </div>
                 <div className="flex items-center gap-3 w-full md:w-auto">
                    <button 
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 md:flex-none px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-xs hover:bg-slate-50 transition-all uppercase tracking-widest"
                    >
                      Batal
                    </button>
                    <button 
                      onClick={handleSubmitPenerimaan}
                      disabled={submitting}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-10 py-3 bg-emerald-600 text-white rounded-xl font-black text-xs hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 uppercase tracking-widest disabled:opacity-50"
                    >
                      <FiSave className="w-4 h-4" /> 
                      {submitting ? "MEMPROSES..." : "SELESAI & UPDATE STOK"}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* MODAL STOK OPNAME */}
      {opnameOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900">Stok Opname Gudang</h3>
              <button onClick={() => setOpnameOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                <FiX className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Item</p>
                <p className="text-sm font-bold text-slate-800">{opnameForm.itemName}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Stok Sistem</p>
                  <p className="text-lg font-black text-slate-900">
                    {opnameForm.systemQty.toLocaleString("id-ID")} <span className="text-xs font-bold text-slate-500">{opnameForm.unit}</span>
                  </p>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                  <p className="text-[10px] font-bold text-indigo-400 uppercase">Stok Fisik</p>
                  <input
                    type="number"
                    value={opnameForm.physicalQty}
                    onChange={(e) => setOpnameForm((prev) => ({ ...prev, physicalQty: parseFloat(e.target.value) || 0 }))}
                    className="mt-1 w-full border border-indigo-200 rounded px-2 py-1 text-sm font-bold text-indigo-700"
                  />
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                <p className="text-[10px] font-bold text-amber-500 uppercase mb-1">Selisih Opname</p>
                <p className="text-sm font-black text-amber-700">
                  {(opnameForm.physicalQty - opnameForm.systemQty) > 0 ? "+" : ""}
                  {(opnameForm.physicalQty - opnameForm.systemQty).toLocaleString("id-ID")} {opnameForm.unit}
                </p>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Catatan (opsional)</label>
                <textarea
                  rows={2}
                  value={opnameForm.notes}
                  onChange={(e) => setOpnameForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Contoh: selisih karena susut penyimpanan"
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex items-center justify-end gap-3">
              <button onClick={() => setOpnameOpen(false)} className="px-4 py-2 text-sm font-bold border border-slate-200 rounded-lg text-slate-600">
                Batal
              </button>
              <button
                onClick={submitOpname}
                disabled={opnameSaving}
                className="px-4 py-2 text-sm font-black rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {opnameSaving ? "Menyimpan..." : "Simpan Opname"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
