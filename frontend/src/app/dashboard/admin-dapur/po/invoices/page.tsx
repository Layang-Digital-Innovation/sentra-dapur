"use client";

import React, { useEffect, useState } from "react";
import { tradingService } from "@/services/trading.service";
import { dapurService, DapurUnit } from "@/services/dapur.service";
import { 
  FiFileText, 
  FiDollarSign, 
  FiCheckCircle, 
  FiClock, 
  FiCreditCard, 
  FiX, 
  FiCheck
} from "react-icons/fi";

export default function AdminDapurInvoicesPage() {
  const [dapur, setDapur] = useState<DapurUnit | null>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState<{ isOpen: boolean; po: any | null }>({
    isOpen: false,
    po: null
  });
  const [selectedBook, setSelectedBook] = useState<'UMUM' | 'PEMBANTU'>('UMUM');
  const [payEvidence, setPayEvidence] = useState({
    referenceNo: '',
    transactionDate: new Date().toISOString().split('T')[0],
    file: null as File | null
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const list = await dapurService.getMyDapur();
      if (list.length > 0) {
        const d = list[0];
        setDapur(d);
        // Fetch All POs for this dapur (uses admin context in service)
        const pos = await dapurService.getPurchaseOrders();
        // Filter those that need payment
        setPurchaseOrders(pos.filter((p: any) => p.paymentStatus === 'UNPAID'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePay = async () => {
    if (!dapur || !payModal.po) return;
    
    setSubmitting(true);
    try {
      let evidenceUrl = "";
      if (payEvidence.file) {
        const { uploadService } = await import("@/services/upload.service");
        const res = await uploadService.uploadEvidence(payEvidence.file);
        evidenceUrl = res.file.url;
      }

      await dapurService.payPO(dapur.id, payModal.po.id, {
        bookType: selectedBook,
        referenceNo: payEvidence.referenceNo,
        evidenceUrl,
        transactionDate: payEvidence.transactionDate
      });
      alert("Pembayaran berhasil dicatat dan Arus Kas telah diperbarui.");
      setPayModal({ isOpen: false, po: null });
      setPayEvidence({ referenceNo: '', transactionDate: new Date().toISOString().split('T')[0], file: null });
      fetchData();
    } catch (err: any) {
      alert(err.message || "Gagal mencatat pembayaran.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !dapur) return <div className="p-8 text-center text-slate-500">Memuat info tagihan...</div>;
  if (!dapur) return <div className="p-8 text-center">Unit dapur tidak ditemukan.</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
      {/* HEADER SECTION */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-100">
            <FiFileText className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">Tagihan & Pembayaran</h1>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em]">Manajemen Pelunasan Invoice Supplier</p>
          </div>
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
          <h2 className="font-black text-sm text-slate-900 uppercase tracking-widest">Daftar Invoice Belum Lunas</h2>
          <span className="px-3 py-1 bg-red-50 text-red-600 text-[10px] font-black uppercase rounded-full">
            {purchaseOrders.length} Menunggu Pembayaran
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID / Tanggal</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Supplier</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Tagihan</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status PO</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {purchaseOrders.length > 0 ? (
                purchaseOrders.map((po: any) => {
                  const total = po.items.reduce((acc: number, item: any) => acc + (item.quantity * (item.pricePerUnit || 0)), 0);
                  return (
                    <tr key={po.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-black text-slate-800 leading-none mb-1">#{po.id.slice(0, 8)}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                          {new Date(po.createdAt).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-600">{po.items[0]?.supplierName || 'Manual Supplier'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-black text-slate-900">Rp {total.toLocaleString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                          po.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          {po.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setPayModal({ isOpen: true, po })}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl text-[10px] uppercase tracking-widest transition-all shadow-md shadow-slate-100"
                        >
                          Pelunasan
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <FiCheckCircle className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold text-sm tracking-widest uppercase">Semua tagihan sudah lunas.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAYMENT MODAL */}
      {payModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-8">
            <div className="p-6 bg-emerald-600 text-white flex justify-between items-center">
              <h3 className="font-black text-sm uppercase tracking-widest">Konfirmasi Pelunasan</h3>
              <button 
                onClick={() => setPayModal({ isOpen: false, po: null })}
                className="hover:rotate-90 transition-transform"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total yang Dibayar</p>
                <p className="text-3xl font-black text-slate-900">
                  Rp {payModal.po.items.reduce((acc: number, item: any) => acc + (item.quantity * (item.pricePerUnit || 0)), 0).toLocaleString()}
                </p>
                <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-widest">PO: #{payModal.po.id.slice(0,8)}</p>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Pilih Sumber Dana</label>
                <div className="grid grid-cols-2 gap-3">
                   <button 
                     type="button"
                     onClick={() => setSelectedBook('UMUM')}
                     className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all text-center ${
                       selectedBook === 'UMUM' ? 'border-amber-500 bg-amber-50/30' : 'border-slate-100 hover:border-slate-200'
                     }`}
                   >
                     <div className={`p-2 rounded-xl ${selectedBook === 'UMUM' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                       <FiDollarSign className="w-5 h-5" />
                     </div>
                     <p className="font-black text-slate-800 text-[10px] leading-none">Kas Umum</p>
                   </button>

                   <button 
                     type="button"
                     onClick={() => setSelectedBook('PEMBANTU')}
                     className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all text-center ${
                       selectedBook === 'PEMBANTU' ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-100 hover:border-slate-200'
                     }`}
                   >
                     <div className={`p-2 rounded-xl ${selectedBook === 'PEMBANTU' ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                       <FiCreditCard className="w-5 h-5" />
                     </div>
                     <p className="font-black text-slate-800 text-[10px] leading-none">Kas Pembantu</p>
                   </button>
                </div>
              </div>

              <div className="space-y-4 pt-2 border-t border-slate-50">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Tanggal Bayar</label>
                    <input 
                      type="date" 
                      value={payEvidence.transactionDate}
                      onChange={(e) => setPayEvidence({...payEvidence, transactionDate: e.target.value})}
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-black text-slate-800 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">No. Bukti (Opsional)</label>
                    <input 
                      type="text" 
                      value={payEvidence.referenceNo}
                      onChange={(e) => setPayEvidence({...payEvidence, referenceNo: e.target.value})}
                      placeholder="MISAL: TRF-123"
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-black text-slate-800 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Upload Bukti Bayar (Opsional)</label>
                  <div className="relative h-14 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 hover:border-emerald-500/50 transition-colors flex items-center justify-center overflow-hidden">
                    <input 
                      type="file" 
                      onChange={(e) => setPayEvidence({...payEvidence, file: e.target.files?.[0] || null})}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      accept="image/*,application/pdf"
                    />
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <FiCheckCircle className="w-4 h-4 text-emerald-500"/> {payEvidence.file ? payEvidence.file.name : "Pilih Gambar Bukti Transaksi"}
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={handlePay}
                disabled={submitting}
                className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 mt-4 shadow-xl shadow-slate-200"
              >
                {submitting ? "Memproses..." : <><FiCheckCircle className="w-5 h-5"/> Konfirmasi Pelunasan</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
