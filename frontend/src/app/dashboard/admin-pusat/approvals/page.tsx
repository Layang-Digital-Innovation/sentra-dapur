"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { dapurService, DapurUnit } from "@/services/dapur.service";
import { userService } from "@/services/user.service";
import { 
  FiCheckCircle, 
  FiXCircle, 
  FiCalendar, 
  FiDollarSign, 
  FiHome, 
  FiFileText,
  FiExternalLink,
  FiClock,
  FiAlertCircle,
  FiInfo,
  FiPackage,
  FiUser,
  FiArrowRight,
  FiImage
} from "react-icons/fi";
import { toast } from "react-hot-toast";

export default function ApprovalCenterPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [dapurList, setDapurList] = useState<DapurUnit[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Modal state
  const [selectedTrx, setSelectedTrx] = useState<any | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dapurData, suppData] = await Promise.all([
        dapurService.getMyDapur(),
        userService.getSuppliers()
      ]);
      setDapurList(dapurData);
      setSuppliers(suppData);
    } catch (err) {
      console.error(err);
      toast.error("Gagal mengambil data transaksi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.user.role !== "ADMIN_PUSAT" && user?.user.role !== "PROJECT_OWNER") {
      router.replace("/dashboard");
      return;
    }
    fetchData();
  }, [user, router]);

  // Extract all pending arus kas
  const pendingTransactions: any[] = [];
  dapurList.forEach((dapur) => {
    if (dapur.arusKas) {
      dapur.arusKas.forEach((trx: any) => {
        if (trx.status === "PENDING") {
          pendingTransactions.push({
            ...trx,
            dapurName: dapur.name,
            dapurId: dapur.id
          });
        }
      });
    }
  });

  // Sort by date desc
  pendingTransactions.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());

  const handleApprove = async (id: string) => {
    if (!confirm("Setujui transaksi ini?")) return;
    try {
      setProcessingId(id);
      await dapurService.approveArusKas(id);
      toast.success("Transaksi disetujui");
      setSelectedTrx(null);
      fetchData(); // Refresh list
    } catch (err) {
      console.error(err);
      toast.error("Gagal menyetujui transaksi");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Tolak transaksi ini?")) return;
    try {
      setProcessingId(id);
      await dapurService.rejectArusKas(id);
      toast.error("Transaksi ditolak");
      setSelectedTrx(null);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Gagal menolak transaksi");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      <p className="mt-4 text-gray-500 font-medium text-lg italic">Menyiapkan daftar persetujuan...</p>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 px-4">
      {/* Header Section */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-amber-50 rounded-xl text-amber-600 shadow-sm border border-amber-100 flex items-center justify-center">
             <FiClock className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Persetujuan Transaksi</h1>
            <p className="text-gray-500 mt-1 font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Terdapat <span className="text-slate-900 font-bold underline decoration-amber-300 underline-offset-4">{pendingTransactions.length}</span> transaksi yang butuh verifikasi Anda.
            </p>
          </div>
        </div>
        
        <div className="flex items-center bg-slate-50 px-4 py-2 rounded-lg border border-slate-100 italic text-sm text-slate-600 font-medium">
           <FiAlertCircle className="mr-2 h-4 w-4 text-amber-500 shrink-0" />
           Transaksi PENDING tidak akan masuk kalkulasi Laba/Rugi hingga disetujui.
        </div>
      </div>

      {/* Main Table Section */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-slate-900">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-100 uppercase tracking-widest">Waktu & Unit</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-100 uppercase tracking-widest">Alokasi & Jenis</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-100 uppercase tracking-widest">Keterangan</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-100 uppercase tracking-widest">Nominal (Rp)</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-100 uppercase tracking-widest">Aksi Manajemen</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {pendingTransactions.map((trx) => (
                <tr key={trx.id} className="hover:bg-slate-50/50 transition-all duration-200 group">
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex flex-col">
                      <div className="flex items-center text-sm font-semibold text-gray-900">
                        <FiCalendar className="mr-1.5 h-3.5 w-3.5 text-gray-400" />
                        {new Date(trx.transactionDate).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="flex items-center text-xs text-slate-500 mt-1 font-medium bg-slate-100 px-2 py-0.5 rounded-full w-fit">
                        <FiHome className="mr-1 h-3 w-3" />
                        {trx.dapurName}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex flex-col gap-1.5">
                       <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider w-fit border ${
                         trx.bookType === 'UMUM' 
                           ? 'bg-purple-50 text-purple-700 border-purple-100' 
                           : 'bg-cyan-50 text-cyan-700 border-cyan-100'
                       }`}>
                         Buku {trx.bookType}
                       </span>
                       <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider w-fit flex items-center gap-1 ${
                         trx.type === 'IN' 
                           ? 'bg-green-100 text-green-700' 
                           : 'bg-red-100 text-red-700'
                       }`}>
                         {trx.type === 'IN' ? 'Pemasukan' : 'Pengeluaran'}
                       </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col max-w-xs">
                      <div className="flex items-center gap-2">
                         <p className="text-sm font-medium text-gray-800 line-clamp-1 leading-relaxed flex-1">
                            {trx.description}
                         </p>
                         <button 
                           onClick={() => setSelectedTrx(trx)}
                           className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-md transition-all opacity-0 group-hover:opacity-100"
                         >
                           <FiInfo className="h-3 w-3" />
                           Detail
                         </button>
                      </div>
                      <div className="flex flex-wrap items-center mt-2 gap-2 text-xs text-gray-400 italic">
                        {trx.referenceNo && (
                          <span className="flex items-center bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded">
                            Ref: {trx.referenceNo}
                          </span>
                        )}
                        {trx.evidenceUrl && (
                          <div className="flex items-center gap-2">
                             <a 
                               href={trx.evidenceUrl} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="flex items-center text-indigo-600 hover:text-indigo-800 font-bold not-italic hover:underline underline-offset-2"
                             >
                               <FiExternalLink className="mr-1 h-3 w-3" />
                               Bukti
                             </a>
                             <FiImage className="h-3 w-3 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className={`px-6 py-5 whitespace-nowrap text-right font-black text-lg ${
                    trx.type === 'IN' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {trx.type === 'IN' ? '+' : '-'} {trx.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => handleApprove(trx.id)}
                        disabled={processingId === trx.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-[10px] shadow transition-all active:scale-95 disabled:opacity-50"
                      >
                        <FiCheckCircle className="h-3.5 w-3.5" />
                        SETUJUI
                      </button>
                      <button
                        onClick={() => handleReject(trx.id)}
                        disabled={processingId === trx.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-rose-600 border border-rose-600 rounded-lg hover:bg-rose-50 font-bold text-[10px] transition-all active:scale-95 disabled:opacity-50"
                      >
                        <FiXCircle className="h-3.5 w-3.5" />
                        TOLAK
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pendingTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <FiCheckCircle className="h-10 w-10 text-gray-300" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">Antrean Bersih</h3>
                      <p className="text-gray-500 mt-2 font-medium max-w-xs mx-auto">
                        Tidak ada transaksi baru yang menunggu persetujuan Anda saat ini.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {selectedTrx && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className={`p-2 rounded-lg ${selectedTrx.type === 'IN' ? 'bg-green-500' : 'bg-red-500'}`}>
                      <FiDollarSign className="h-5 w-5" />
                   </div>
                   <div>
                      <h2 className="text-xl font-bold">Detail Transaksi</h2>
                      <p className="text-slate-400 text-xs">ID: {selectedTrx.id}</p>
                   </div>
                </div>
                <button 
                  onClick={() => setSelectedTrx(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                   <FiXCircle className="h-6 w-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                 {/* Basic Info Cards */}
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Unit Dapur</p>
                       <div className="flex items-center gap-2 text-slate-900">
                          <FiHome className="h-4 w-4 text-amber-500" />
                          <span className="font-bold text-sm">{selectedTrx.dapurName}</span>
                       </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pencatat</p>
                       <div className="flex items-center gap-2 text-slate-900">
                          <FiUser className="h-4 w-4 text-indigo-500" />
                          <span className="font-bold text-sm">{selectedTrx.reportedBy?.fullname || "Admin Dapur"}</span>
                       </div>
                    </div>
                 </div>

                 {/* Financial Summary */}
                 <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
                    <div className={`absolute top-0 right-0 px-4 py-1 rounded-bl-xl text-[10px] font-black uppercase tracking-tighter text-white ${
                      selectedTrx.type === 'IN' ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {selectedTrx.type === 'IN' ? 'Pemasukan' : 'Pengeluaran'}
                    </div>
                    <p className="text-gray-500 text-sm italic mb-2">"{selectedTrx.description}"</p>
                    <h3 className={`text-4xl font-black ${selectedTrx.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                       Rp {selectedTrx.amount.toLocaleString()}
                    </h3>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                       <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide">
                          Buku {selectedTrx.bookType}
                       </span>
                       <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide flex items-center gap-1">
                          <FiCalendar className="h-3 w-3" />
                          {new Date(selectedTrx.transactionDate).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}
                       </span>
                    </div>
                 </div>

                 {/* Breakdown Items Table (Manual Entry Detail) */}
                 {(selectedTrx.items && selectedTrx.items.length > 0) && (
                   <div className="space-y-3">
                      <h4 className="flex items-center gap-2 text-slate-900 font-bold border-b pb-2">
                         <FiPackage className="text-amber-500" />
                         Rincian Barang / Biaya
                      </h4>
                      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                        <table className="min-w-full divide-y divide-gray-100">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Item</th>
                              <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Qty</th>
                              <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Harga</th>
                              <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                             {selectedTrx.items.map((item: any, idx: number) => (
                               <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                 <td className="px-4 py-3 text-sm font-medium text-slate-700">{item.name}</td>
                                 <td className="px-4 py-3 text-sm text-center text-slate-600">
                                   {item.quantity} {item.unit}
                                 </td>
                                 <td className="px-4 py-3 text-sm text-right text-slate-600">
                                   {item.pricePerUnit?.toLocaleString() || "-"}
                                 </td>
                                 <td className="px-4 py-3 text-sm text-right font-bold text-slate-900">
                                   {item.total?.toLocaleString()}
                                 </td>
                               </tr>
                             ))}
                          </tbody>
                        </table>
                      </div>
                   </div>
                 )}

                 {/* PO Linked Details */}
                 {selectedTrx.purchaseOrder && (
                    <div className="space-y-3 p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100 border-dashed">
                       <div className="flex items-center justify-between">
                          <h4 className="flex items-center gap-2 text-indigo-900 font-black">
                             <FiFileText className="text-indigo-600" />
                             Linked Purchase Order
                          </h4>
                          <span className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter shadow-lg shadow-indigo-100">
                             {selectedTrx.purchaseOrder.poNumber || "PO Link"}
                          </span>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-4 mt-4">
                          {(() => {
                             const supName = selectedTrx.purchaseOrder.supplierName || selectedTrx.purchaseOrder.items?.[0]?.supplierName;
                             if (!supName) return null;
                             
                             const supplierObj = suppliers.find(s => 
                               s.fullName?.toLowerCase() === supName.toLowerCase() || 
                               s.fullname?.toLowerCase() === supName.toLowerCase()
                             );
                             
                             if (supplierObj && (supplierObj.noRekening || supplierObj.namaRekening)) {
                               return (
                                 <div className="col-span-2 bg-amber-50 p-4 rounded-xl border border-amber-200">
                                   <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                                     <FiDollarSign className="w-3 h-3" /> Informasi Pembayaran (Rekening Tujuan)
                                   </p>
                                   <div className="flex justify-between items-center">
                                      <div>
                                        <p className="text-[10px] text-amber-600/70 font-bold uppercase">No. Rekening</p>
                                        <p className="text-base font-black text-amber-900 font-mono tracking-widest bg-amber-100/50 px-2 py-0.5 rounded mt-0.5 inline-block">{supplierObj.noRekening || "-"}</p>
                                      </div>
                                      <div className="text-right hidden sm:block">
                                        <FiArrowRight className="text-amber-300 w-5 h-5 mx-4" />
                                      </div>
                                      <div className="text-right">
                                        <p className="text-[10px] text-amber-600/70 font-bold uppercase">Atas Nama</p>
                                        <p className="text-sm font-bold text-amber-900 mt-1">{supplierObj.namaRekening || "-"}</p>
                                      </div>
                                   </div>
                                 </div>
                               );
                             }
                             return null;
                           })()}

                          <div className="bg-white p-3 rounded-xl border border-indigo-100">
                             <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5">Supplier</p>
                             <p className="text-sm font-bold text-slate-900 uppercase">{selectedTrx.purchaseOrder.supplierName || selectedTrx.purchaseOrder.items?.[0]?.supplierName || "-"}</p>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-indigo-100">
                             <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5">Tipe PO</p>
                             <p className="text-sm font-bold text-indigo-600 tracking-wider">#{selectedTrx.purchaseOrder.type}</p>
                          </div>
                       </div>

                       {/* PO Items Mini Table */}
                       <div className="mt-4 bg-white rounded-2xl border border-indigo-50 p-2">
                          {selectedTrx.purchaseOrder.items?.map((poi: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-2 rounded-xl hover:bg-indigo-50 transition-colors border-b border-indigo-50 last:border-0">
                               <div className="flex flex-col">
                                  <span className="text-xs font-bold text-slate-800 uppercase">{poi.productName}</span>
                                  <span className="text-[10px] text-slate-400 italic">Supplier: {poi.supplierName}</span>
                               </div>
                               <div className="text-right">
                                  <div className="text-xs font-black text-slate-900">{poi.quantity} {poi.unit}</div>
                                  <div className="text-[10px] text-indigo-500 font-bold">Rp {poi.pricePerUnit?.toLocaleString() || 0}</div>
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>
                 )}

                 {/* Evidence Image */}
                 {selectedTrx.evidenceUrl && (
                   <div className="space-y-3">
                      <h4 className="flex items-center gap-2 text-slate-900 font-bold">
                         <FiImage className="text-indigo-500" />
                         Bukti Transaksi
                      </h4>
                      <div className="relative group rounded-3xl overflow-hidden border-4 border-slate-50 shadow-inner">
                         <img 
                           src={selectedTrx.evidenceUrl} 
                           alt="Bukti" 
                           className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-110"
                         />
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                            <a 
                              href={selectedTrx.evidenceUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="bg-white text-slate-900 px-6 py-3 rounded-2xl font-black text-sm shadow-xl flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform"
                            >
                               <FiExternalLink className="h-4 w-4" />
                               BUKA FILE ASLI
                            </a>
                         </div>
                      </div>
                   </div>
                 )}
              </div>

              {/* Modal Footer Actions */}
              <div className="p-8 bg-slate-50 border-t flex flex-col sm:flex-row gap-4">
                 <button
                   onClick={() => handleApprove(selectedTrx.id)}
                   disabled={processingId === selectedTrx.id}
                   className="flex-1 flex items-center justify-center gap-3 py-4 bg-green-600 text-white rounded-2xl hover:bg-green-700 font-black text-lg shadow-xl shadow-green-100 transition-all active:scale-95 disabled:opacity-50"
                 >
                   <FiCheckCircle className="h-6 w-6" />
                   SETUJUI TRANSAKSI
                 </button>
                 <button
                   onClick={() => handleReject(selectedTrx.id)}
                   disabled={processingId === selectedTrx.id}
                   className="flex-1 flex items-center justify-center gap-3 py-4 bg-white text-rose-600 border-2 border-rose-600 rounded-2xl hover:bg-rose-100 font-black text-lg transition-all active:scale-95 disabled:opacity-50"
                 >
                   <FiXCircle className="h-6 w-6" />
                   TOLAK TRANSAKSI
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Analytics/Summary Footer */}
      {pendingTransactions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-slate-900 p-8 rounded-3xl flex items-center shadow-2xl border-b-8 border-green-500 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <FiDollarSign className="h-24 w-24 text-green-400" />
              </div>
              <div className="p-4 bg-slate-800 rounded-2xl mr-6 text-green-400 border border-slate-700 shadow-inner">
                <FiDollarSign className="h-8 w-8" />
              </div>
              <div>
                <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em]">Total Potensi Inflow</p>
                <p className="text-3xl font-black text-white mt-1">
                  Rp {pendingTransactions.filter(t => t.type === 'IN').reduce((acc, t) => acc + t.amount, 0).toLocaleString()}
                </p>
              </div>
           </div>
           
           <div className="bg-slate-900 p-8 rounded-3xl flex items-center shadow-2xl border-b-8 border-rose-500 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <FiDollarSign className="h-24 w-24 text-rose-400" />
              </div>
              <div className="p-4 bg-slate-800 rounded-2xl mr-6 text-rose-400 border border-slate-700 shadow-inner">
                <FiDollarSign className="h-8 w-8" />
              </div>
              <div>
                <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em]">Total Potensi Outflow</p>
                <p className="text-3xl font-black text-white mt-1">
                  Rp {pendingTransactions.filter(t => t.type === 'OUT').reduce((acc, t) => acc + t.amount, 0).toLocaleString()}
                </p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
