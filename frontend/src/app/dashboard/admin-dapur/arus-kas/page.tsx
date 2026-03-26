"use client";

import React, { useEffect, useState } from "react";
import { dapurService, DapurUnit } from "@/services/dapur.service";
import { 
  FiDollarSign, 
  FiPlusCircle, 
  FiMinusCircle, 
  FiX, 
  FiCheck, 
  FiCreditCard, 
  FiTrash2, 
  FiPlus, 
  FiInfo,
  FiShoppingBag,
  FiCalendar,
  FiArrowRight
} from "react-icons/fi";

type TrxItem = {
  name: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  total: number;
};

export default function AdminDapurArusKas({ bookType = 'UMUM' }: { bookType?: 'UMUM' | 'PEMBANTU' }) {
  const [dapur, setDapur] = useState<DapurUnit | null>(null);
  const [arusKas, setArusKas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [form, setForm] = useState({
    type: 'IN' as 'IN' | 'OUT',
    outCategory: 'Operasional',
    amount: 0,
    description: '',
    referenceNo: '',
    transactionDate: new Date().toISOString().split('T')[0],
    file: null as File | null,
    items: [] as TrxItem[]
  });

  const [transferForm, setTransferForm] = useState({
    amount: 0,
    fromBook: 'UMUM' as 'UMUM' | 'PEMBANTU',
    toBook: 'PEMBANTU' as 'UMUM' | 'PEMBANTU',
    description: '',
    transactionDate: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const list = await dapurService.getMyDapur();
      if (list.length > 0) {
        const d = list[0];
        setDapur(d);
        const history = await dapurService.getArusKas(d.id, bookType);
        setArusKas(history);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [bookType]);

  const addItem = () => {
    setForm({
      ...form,
      items: [...form.items, { name: '', quantity: 1, unit: 'pcs', pricePerUnit: 0, total: 0 }]
    });
  };

  const removeItem = (index: number) => {
    const newItems = [...form.items];
    newItems.splice(index, 1);
    const newAmount = newItems.reduce((acc, curr) => acc + curr.total, 0);
    setForm({ ...form, items: newItems, amount: newItems.length > 0 ? newAmount : form.amount });
  };

  const updateItem = (index: number, field: keyof TrxItem, value: any) => {
    const newItems = [...form.items];
    const item = { ...newItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'pricePerUnit') {
      item.total = Number(item.quantity) * Number(item.pricePerUnit);
    }
    
    newItems[index] = item;
    const newAmount = newItems.reduce((acc, curr) => acc + (curr.total || 0), 0);
    setForm({ ...form, items: newItems, amount: newAmount });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dapur) return;
    if (form.amount <= 0 || !form.description) {
      alert("Harap isi jumlah dan keterangan dengan benar.");
      return;
    }

    setSubmitting(true);
    try {
      let evidenceUrl = "";
      if (form.file) {
        const { uploadService } = await import("@/services/upload.service");
        const res = await uploadService.uploadEvidence(form.file);
        evidenceUrl = res.file.url;
      }

      let finalDescription = form.description;
      if (form.type === 'OUT') {
        if (form.outCategory === 'Sewa') {
          finalDescription = `[Sewa] ${form.description}`;
        } else if (form.outCategory === 'Operasional') {
          finalDescription = `[Operasional] ${form.description}`;
        } else if (form.outCategory === 'Lain-lain') {
          finalDescription = `[Lain-lain] ${form.description}`;
        }
      }

      await dapurService.reportArusKas(dapur.id, {
        type: form.type,
        amount: form.amount,
        description: finalDescription,
        referenceNo: form.referenceNo,
        evidenceUrl,
        transactionDate: form.transactionDate,
        bookType,
        items: form.items
      });
      alert("Transaksi berhasil dicatat.");
      setIsModalOpen(false);
      setForm({ 
        type: 'IN', 
        outCategory: 'Operasional',
        amount: 0, 
        description: '', 
        referenceNo: '', 
        transactionDate: new Date().toISOString().split('T')[0], 
        file: null,
        items: [] 
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || "Gagal mencatat transaksi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dapur) return;
    if (transferForm.amount <= 0 || !transferForm.description) {
       alert("Harap isi jumlah dan keterangan transfer.");
       return;
    }

    setSubmitting(true);
    try {
      await dapurService.transferCash(dapur.id, transferForm);
      alert("Transfer dana berhasil dicatat di kedua buku kas.");
      setIsTransferOpen(false);
      setTransferForm({ 
        amount: 0, 
        fromBook: 'UMUM', 
        toBook: 'PEMBANTU', 
        description: '',
        transactionDate: new Date().toISOString().split('T')[0]
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || "Gagal melakukan transfer.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !dapur) return <div className="p-6 text-center text-gray-500">Memuat data...</div>;
  if (!dapur) return <div className="p-8 text-center">Unit dapur tidak ditemukan.</div>;

  const totalIn = arusKas.filter(k => k.type === "IN").reduce((acc, curr) => acc + curr.amount, 0);
  const totalOut = arusKas.filter(k => k.type === "OUT").reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIn - totalOut;

  const isPetty = bookType === 'PEMBANTU';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className={`h-12 w-12 ${isPetty ? 'bg-indigo-600' : 'bg-amber-500'} rounded-lg flex items-center justify-center text-white shadow-sm`}>
            {isPetty ? <FiCreditCard className="w-6 h-6"/> : <FiDollarSign className="w-6 h-6" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">
              {isPetty ? 'Buku Kas Pembantu' : 'Buku Kas Umum'}
            </h1>
            <p className="text-gray-500 text-sm">
               {isPetty ? 'Pencatatan Kas Kecil Harian' : 'Otorisasi Pemasukan & Pengeluaran'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setIsTransferOpen(true)}
            className="h-10 px-4 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg text-sm transition-all flex items-center gap-2 hover:bg-gray-50"
          >
            <FiCreditCard className="w-4 h-4"/> Transfer Dana
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className={`h-10 px-4 ${isPetty ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-900 hover:bg-slate-800'} text-white font-medium rounded-lg text-sm transition-all flex items-center gap-2`}
          >
            <FiPlusCircle className="w-4 h-4"/> Catat Transaksi
          </button>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
           <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Saldo Tersedia</p>
           <h3 className="text-2xl font-bold text-gray-900">Rp {balance.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm border-b-2 border-b-green-500">
           <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Akumulasi Masuk</p>
           <h3 className="text-2xl font-bold text-green-600">Rp {totalIn.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm border-b-2 border-b-red-500">
           <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Akumulasi Keluar</p>
           <h3 className="text-2xl font-bold text-red-600">Rp {totalOut.toLocaleString()}</h3>
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
         <div className="p-4 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
             <h2 className="font-bold text-sm text-gray-900 uppercase tracking-wider">Log Arus Kas Unit</h2>
             <span className="text-xs text-gray-400">{arusKas.length} Entri</span>
         </div>
         <div className="divide-y divide-gray-50">
            {arusKas.length > 0 ? (
               arusKas.map((kas: any) => (
                 <div key={kas.id} className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition duration-150">
                    <div className="flex items-center">
                       <div className={`p-3 rounded-lg mr-4 ${kas.type === 'IN' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                          {kas.type === 'IN' ? <FiPlusCircle className="w-5 h-5"/> : <FiMinusCircle className="w-5 h-5"/>}
                       </div>
                       <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-900 text-sm leading-none">{kas.description}</p>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              kas.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 
                              kas.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 
                              'bg-amber-100 text-amber-700'
                            }`}>
                               {kas.status || 'APPROVED'}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                              <FiCalendar className="w-3 h-3" />
                              {kas.transactionDate ? new Date(kas.transactionDate).toLocaleDateString("id-ID", {day:'numeric', month:'short', year:'numeric'}) : new Date(kas.createdAt).toLocaleDateString()}
                            </p>
                            {kas.referenceNo && (
                              <span className="text-[10px] text-gray-500 font-medium"># {kas.referenceNo}</span>
                            )}
                            {kas.evidenceUrl && (
                              <a href={kas.evidenceUrl} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-600 font-bold hover:underline">
                                BUKTI
                              </a>
                            )}
                          </div>
                       </div>
                    </div>
                    <div className="text-right">
                       <span className={`text-lg font-bold ${kas.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                          {kas.type === 'IN' ? '+' : '-'} {kas.amount.toLocaleString()}
                       </span>
                    </div>
                 </div>
               ))
            ) : (
               <div className="py-20 text-center">
                 <p className="text-gray-400 text-sm">Belum ada aktivitas kas.</p>
               </div>
            )}
         </div>
      </div>

      {/* INPUT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className={`p-6 ${isPetty ? 'bg-indigo-600' : 'bg-slate-900'} text-white flex justify-between items-center`}>
              <div>
                <h3 className="font-bold text-lg">Pencatatan Baru</h3>
                <p className="text-white/60 text-xs mt-1">Buku Kas {isPetty ? 'Pembantu' : 'Umum'}</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="hover:bg-white/10 p-2 rounded-lg transition-all"
              >
                <FiX className="w-6 h-6 text-white"/>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Type Selector */}
              <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                <button 
                  type="button"
                  onClick={() => setForm({...form, type: 'IN'})}
                  className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${form.type === 'IN' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}
                >
                  Pemasukan
                </button>
                <button 
                  type="button"
                  onClick={() => setForm({...form, type: 'OUT'})}
                  className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${form.type === 'OUT' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}
                >
                  Pengeluaran
                </button>
              </div>

              {/* Main Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1">Tanggal</label>
                  <input 
                    type="date" 
                    value={form.transactionDate}
                    onChange={(e) => setForm({...form, transactionDate: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
                {form.type === 'OUT' ? (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Kategori Laporan</label>
                    <select 
                      value={form.outCategory}
                      onChange={(e) => setForm({...form, outCategory: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500/20"
                    >
                      <option value="Operasional">Biaya Operasional</option>
                      <option value="Sewa">Biaya Sewa</option>
                      <option value="Lain-lain">Lain-lain / Tidak Spesifik</option>
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Jumlah (Rp)</label>
                    <input 
                      type="number" 
                      value={form.amount}
                      readOnly={form.items.length > 0}
                      onChange={(e) => setForm({...form, amount: Number(e.target.value)})}
                      placeholder="0"
                      className={`w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm font-bold outline-none ${form.items.length > 0 ? 'bg-gray-100' : ''}`}
                    />
                  </div>
                )}
              </div>
              {form.type === 'OUT' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Jumlah (Rp)</label>
                    <input 
                      type="number" 
                      value={form.amount}
                      readOnly={form.items.length > 0}
                      onChange={(e) => setForm({...form, amount: Number(e.target.value)})}
                      placeholder="0"
                      className={`w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm font-bold outline-none ${form.items.length > 0 ? 'bg-gray-100' : ''}`}
                    />
                  </div>
                </div>
              )}

              {/* ITEMS BREAKDOWN */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                      <FiShoppingBag className="text-amber-500" />
                      Detail Item (Opsional)
                   </h4>
                   <button 
                     type="button" 
                     onClick={addItem}
                     className="text-[10px] font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded hover:bg-slate-200 transition-all flex items-center gap-1"
                   >
                     <FiPlus className="w-3 h-3" /> TAMBAH ITEM
                   </button>
                </div>

                {form.items.length > 0 && (
                  <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    {form.items.map((item, index) => (
                      <div key={index} className="flex gap-2">
                        <input 
                          placeholder="Nama..." 
                          className="flex-1 bg-white border border-gray-200 rounded px-3 py-1.5 text-xs outline-none"
                          value={item.name}
                          onChange={(e) => updateItem(index, 'name', e.target.value)}
                        />
                        <input 
                          placeholder="Qty" 
                          type="number"
                          className="w-16 bg-white border border-gray-200 rounded px-2 py-1.5 text-xs text-center outline-none"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        />
                        <input 
                          placeholder="Harga" 
                          type="number"
                          className="w-24 bg-white border border-gray-200 rounded px-2 py-1.5 text-xs text-right outline-none"
                          value={item.pricePerUnit}
                          onChange={(e) => updateItem(index, 'pricePerUnit', e.target.value)}
                        />
                        <button 
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-gray-300 hover:text-red-500"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reference & File */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1">No. Ref (Opsional)</label>
                  <input 
                    type="text" 
                    value={form.referenceNo}
                    onChange={(e) => setForm({...form, referenceNo: e.target.value})}
                    placeholder="REFE-123"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none"
                  />
                </div>
                <div className="space-y-1">
                   <label className="text-xs font-bold text-gray-500 uppercase ml-1">Bukti / Nota</label>
                   <input 
                    type="file" 
                    onChange={(e) => setForm({...form, file: e.target.files?.[0] || null})}
                    className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                    accept="image/*,application/pdf"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Keterangan</label>
                <textarea 
                  value={form.description}
                  onChange={(e) => setForm({...form, description: e.target.value})}
                  placeholder="Ceritakan detail transaksi..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none h-24 resize-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <button 
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-slate-900 text-white font-bold rounded-lg text-sm hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                {submitting ? "Menyimpan..." : "Simpan Transaksi"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TRANSFER MODAL */}
      {isTransferOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in slide-in-from-bottom-8">
            <div className={`p-6 bg-slate-900 text-white flex justify-between items-center`}>
              <h3 className="font-bold">Mutasi Kas</h3>
              <button onClick={() => setIsTransferOpen(false)} className="hover:bg-white/10 p-2 rounded-lg transition-all"><FiX className="w-6 h-6"/></button>
            </div>
            <form onSubmit={handleTransfer} className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                 <div className="flex-1">
                   <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Dari</label>
                   <select 
                     value={transferForm.fromBook}
                     onChange={(e) => setTransferForm({...transferForm, fromBook: e.target.value as any})}
                     className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-xs font-bold outline-none"
                   >
                     <option value="UMUM">UMUM</option>
                     <option value="PEMBANTU">PEMBANTU</option>
                   </select>
                 </div>
                 <FiArrowRight className="text-gray-300 mt-4" />
                 <div className="flex-1">
                   <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Tujuan</label>
                   <select 
                     value={transferForm.toBook}
                     onChange={(e) => setTransferForm({...transferForm, toBook: e.target.value as any})}
                     className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-xs font-bold outline-none"
                   >
                     <option value="PEMBANTU">PEMBANTU</option>
                     <option value="UMUM">UMUM</option>
                   </select>
                 </div>
              </div>

              <div className="space-y-3">
                <input 
                  type="date" 
                  value={transferForm.transactionDate}
                  onChange={(e) => setTransferForm({...transferForm, transactionDate: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-2 text-sm outline-none"
                />
                <input 
                  type="number" 
                  value={transferForm.amount}
                  onChange={(e) => setTransferForm({...transferForm, amount: Number(e.target.value)})}
                  placeholder="Jumlah..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-2 text-sm font-bold outline-none"
                />
                <input 
                  type="text"
                  value={transferForm.description}
                  onChange={(e) => setTransferForm({...transferForm, description: e.target.value})}
                  placeholder="Keterangan..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-2 text-sm outline-none"
                />
              </div>

              <button 
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-slate-900 text-white font-bold rounded-lg text-sm hover:bg-slate-800 transition-all mt-2"
              >
                {submitting ? "Memutasikan..." : "Eksekusi Mutasi"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
