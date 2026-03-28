"use client";

import React, { useEffect, useMemo, useState } from "react";
import RoleGuard from "@/components/auth/RoleGuard";
import { Role } from "@/types/user.types";
import { subscriptionService } from "@/services/subscription.service";
import axiosInstance from "@/utils/axiosConfig";
import { toast } from "react-toastify";
import { FiCheck, FiX, FiRefreshCw, FiFilter, FiDownload, FiTrash, FiSearch } from "react-icons/fi";
import { usePermissions } from "@/hooks/usePermissions";

interface PaymentItem {
  id: string;
  userId: string;
  labelId?: string | null;
  label?: { id: string; name: string } | null;
  amount: number;
  currency: string;
  provider: string;
  status: string;
  invoiceNumber?: string | null;
  description?: string | null;
  createdAt: string;
  paidAt?: string | null;
  metadata?: any;
}

export default function PaymentsAdminPage() {
  const { isSuperAdmin } = usePermissions();
  const [items, setItems] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [labelId, setLabelId] = useState("");
  const [status, setStatus] = useState<string>("");
  const [provider, setProvider] = useState<string>("manual");
  const [mode, setMode] = useState<string>(""); // Default to empty to show all
  const [limit, setLimit] = useState<number>(50);
  // client-side search & pagination for the table
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Approve/fail dialog state
  const [actionPayment, setActionPayment] = useState<PaymentItem | null>(null);
  const [failReason, setFailReason] = useState("");
  const [expireSubs, setExpireSubs] = useState(false);
  const [deletePayment, setDeletePayment] = useState<PaymentItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const awaitingOnly = useMemo(() => !status || status === "AWAITING_APPROVAL" || status === "PENDING", [status]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await subscriptionService.listAdminPayments({ labelId: labelId || undefined, status: status || undefined, provider: provider || undefined, mode: mode || undefined, limit });
      setItems(res.items || []);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal memuat data pembayaran");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // derived filtered/paged items
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((p) => {
      const inv = (p.invoiceNumber || p.id || "").toLowerCase();
      const lbl = (p.label?.name || p.labelId || "").toLowerCase();
      const stat = (p.status || "").toLowerCase();
      const desc = (p.description || "").toLowerCase();
      const paidBy = (p.metadata?.paidBy || "").toLowerCase();
      const notes = (p.metadata?.notes || "").toLowerCase();
      return inv.includes(q) || lbl.includes(q) || stat.includes(q) || desc.includes(q) || paidBy.includes(q) || notes.includes(q);
    });
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const paged = filtered.slice(start, end);

  // Download invoice with Authorization using axiosInstance; force browser download
  async function handleDownloadInvoice(p: PaymentItem) {
    if (!p?.id) return;
    const base = axiosInstance.defaults.baseURL || process.env.NEXT_PUBLIC_API_URL || "";
    const pdfUrl = `${base}/api/subscription/payment/${p.id}/invoice/pdf`;
    const htmlUrl = `${base}/api/subscription/payment/${p.id}/invoice/html`;
    // Try PDF first
    try {
      const resp = await axiosInstance.get(pdfUrl, { responseType: "blob" });
      const disp = resp.headers?.["content-disposition"] || resp.headers?.["Content-Disposition"];
      let filename = `invoice-${p.invoiceNumber || p.id}.pdf`;
      if (disp && typeof disp === 'string') {
        const match = disp.match(/filename="?([^";]+)"?/i);
        if (match && match[1]) filename = match[1];
      }
      const blob = new Blob([resp.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return;
    } catch (e: any) {
      // Backend PDF not available. Try client-side PDF generation
      try {
        const { default: jsPDF } = await import('jspdf');
        // @ts-ignore
        const autoTable = (await import('jspdf-autotable')).default || (await import('jspdf-autotable'));
        const doc = new jsPDF('p', 'pt');

        const m: any = p.metadata || {};
        const title = 'Sentra Dapur';
        const subtitle = 'PT. Layang Digital Innovation';
        const invoiceNo = p.invoiceNumber || m.invoiceNumber || p.id;
        const createdAt = p.createdAt ? new Date(p.createdAt).toLocaleString('id-ID') : '';
        const status = (p.status || '').toUpperCase();
        const orgName = p.label?.name || m.paidBy || '-';
        const descUsers = Array.isArray(m.userIds) ? m.userIds.length : (m.usersCount || 1);
        const period = m.period || 'MONTHLY';
        const description = m.mode === 'SINGLE_SUBSCRIPTION' ? `Langganan Unit Dapur (${period})` : `Enterprise Custom ${period} - ${descUsers} unit`;
        const currency = p.currency || 'IDR';
        const amount = p.amount || 0;

        // Header
        doc.setFontSize(16); doc.setTextColor('#4b2aad'); doc.text(title, 40, 40);
        doc.setFontSize(10); doc.setTextColor('#444'); doc.text(subtitle, 40, 56);
        doc.setTextColor('#000');
        doc.setFontSize(11);
        doc.text(`Invoice: ${invoiceNo}`, 40, 80);
        doc.text(`Tanggal: ${createdAt}`, 40, 96);
        doc.text(`Status: ${status}`, 40, 112);

        // Billed To
        let y = 140;
        doc.setFontSize(12); doc.setTextColor('#666'); doc.text('Ditagihkan Kepada', 40, y); y += 16;
        doc.setFontSize(11); doc.setTextColor('#000'); doc.text(orgName, 40, y); y += 24;

        // Description
        doc.setFontSize(12); doc.setTextColor('#666'); doc.text('Deskripsi', 40, y); y += 16;
        doc.setFontSize(11); doc.setTextColor('#000'); doc.text(description, 40, y); y += 10;

        // Items table with aligned footer (Grand Total)
        const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
        const unitPrice = (m.totalAmount && descUsers) ? (m.totalAmount / descUsers) : (m.pricePerUser || amount);
        const total = amount || m.totalAmount || (descUsers * (m.pricePerUser || 0));
        autoTable(doc, {
          startY: y + 12,
          head: [['Item', 'Qty', 'Harga Satuan', 'Total']],
          body: [[ 'Akses Langganan', String(descUsers), fmt(unitPrice), fmt(total) ]],
          foot: [[ { content: 'Total Keseluruhan', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } }, fmt(total) ]],
          theme: 'grid',
          styles: { fontSize: 10 },
          headStyles: { halign: 'left' },
          columnStyles: {
            0: { halign: 'left' },
            1: { halign: 'right', cellWidth: 60 },
            2: { halign: 'right', cellWidth: 120 },
            3: { halign: 'right', cellWidth: 120 },
          },
          margin: { left: 40, right: 40 },
        });
        y = (doc as any).lastAutoTable.finalY + 24;

        // Bank Transfer (separate section)
        const bankLines: string[] = [];
        if (m.bankName) bankLines.push(`Bank: ${m.bankName}`);
        if (m.bankAccountName) bankLines.push(`Nama Rekening: ${m.bankAccountName}`);
        if (m.bankAccountNumber) bankLines.push(`Nomor Rekening: ${m.bankAccountNumber}`);
        if (m.bankInstruction) bankLines.push(`Instruksi: ${m.bankInstruction}`);
        if (bankLines.length) {
          doc.setFontSize(12); doc.setTextColor('#666'); doc.text('Transfer Bank', 40, y); y += 16;
          doc.setFontSize(10); doc.setTextColor('#000');
          bankLines.forEach(line => { doc.text(line, 40, y); y += 14; });
          y += 6;
        }

        // Notes
        if (m.notes) {
          doc.setFontSize(12); doc.setTextColor('#666'); doc.text('Catatan', 40, y); y += 16;
          doc.setFontSize(10); doc.setTextColor('#000');
          const split = (doc as any).splitTextToSize(String(m.notes), 520);
          doc.text(split, 40, y);
        }

        // Save
        const filename = `invoice-${invoiceNo}.pdf`;
        doc.save(filename);
        return;
      } catch (err) {
        // Final fallback: download HTML
        try {
          const resp = await axiosInstance.get(htmlUrl, { responseType: "text" });
          const html = resp.data as string;
          const filename = `invoice-${p.invoiceNumber || p.id}.html`;
          const blob = new Blob([html], { type: "text/html;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        } catch {
          toast.error("Gagal mengunduh invoice");
        }
      }
    }
  }

  const onApprove = async (p: PaymentItem) => {
    try {
      await subscriptionService.approveManualOrgPayment({ paymentId: p.id });
      toast.success("Pembayaran disetujui dan langganan telah aktif");
      await fetchPayments();
      setActionPayment(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal menyetujui pembayaran");
    }
  };

  const onFail = async (p: PaymentItem) => {
    try {
      await subscriptionService.failManualOrgPayment({ paymentId: p.id, reason: failReason || undefined, expireSubscriptions: expireSubs });
      toast.success("Pembayaran ditandai GAGAL");
      await fetchPayments();
      setActionPayment(null);
      setFailReason("");
      setExpireSubs(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal memproses penolakan pembayaran");
    }
  };

  const onDelete = async (p: PaymentItem) => {
    try {
      setDeleting(true);
      await subscriptionService.deletePayment(p.id);
      toast.success("Catatan pembayaran dihapus");
      await fetchPayments();
      setDeletePayment(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal menghapus pembayaran");
    } finally {
      setDeleting(false);
    }
  };

  const formatStatus = (s: string) => {
    const map: Record<string, string> = {
      'AWAITING_APPROVAL': 'Menunggu Persetujuan',
      'PENDING': 'Tertunda',
      'PAID': 'Dibayar',
      'FAILED': 'Gagal',
      'EXPIRED': 'Kadaluarsa'
    };
    return map[s] || s;
  };

  return (
    <RoleGuard allowedRoles={[Role.ADMIN, Role.SUPER_ADMIN]}>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-black">Riwayat Pembayaran</h1>
          <button onClick={fetchPayments} className="inline-flex items-center gap-2 px-3 py-2 rounded border hover:bg-gray-50 text-sm text-gray-600 transition">
            <FiRefreshCw /> Segarkan
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-4 space-y-3 border border-gray-100">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700"><FiFilter /> Filter Pencarian</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <input className="border rounded px-2 py-1.5 text-sm text-black focus:ring-2 focus:ring-slate-900 outline-none" placeholder="ID Label" value={labelId} onChange={(e)=>setLabelId(e.target.value)} />
            <select className="border rounded px-2 py-1.5 text-sm text-black focus:ring-2 focus:ring-slate-900 outline-none" value={status} onChange={(e)=>setStatus(e.target.value)}>
              <option value="">Semua Status</option>
              <option value="AWAITING_APPROVAL">Menunggu Persetujuan</option>
              <option value="PENDING">Tertunda</option>
              <option value="PAID">Sudah Bayar</option>
              <option value="FAILED">Gagal</option>
            </select>
            <select className="border rounded px-2 py-1.5 text-sm text-black focus:ring-2 focus:ring-slate-900 outline-none" value={provider} onChange={(e)=>setProvider(e.target.value)}>
              <option value="">Semua Provider</option>
              <option value="manual">Manual (Transfer)</option>
              <option value="XENDIT">Xendit</option>
              <option value="PAYPAL">PayPal</option>
            </select>
            <select className="border rounded px-2 py-1.5 text-sm text-black focus:ring-2 focus:ring-slate-900 outline-none" value={mode} onChange={(e)=>setMode(e.target.value)}>
              <option value="">Semua Mode</option>
              <option value="SINGLE_SUBSCRIPTION">Langganan Unit</option>
              <option value="ORG_INVOICE">Invois Organisasi</option>
            </select>
            <select className="border rounded px-2 py-1.5 text-sm text-black focus:ring-2 focus:ring-slate-900 outline-none" value={String(limit)} onChange={(e)=>setLimit(parseInt(e.target.value))}>
              <option value="20">Tampilkan 20</option>
              <option value="50">Tampilkan 50</option>
              <option value="100">Tampilkan 100</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchPayments} className="px-4 py-2 rounded bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition">Terapkan</button>
            <button onClick={()=>{ setLabelId(""); setStatus(""); setProvider("manual"); setMode(""); setLimit(50); }} className="px-4 py-2 rounded border text-sm font-medium hover:bg-gray-50 text-gray-600 transition">Atur Ulang</button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-100">
          <div className="p-3 border-b text-black text-sm font-medium flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-gray-50/50">
            <div>Daftar Pembayaran Invois Manual</div>
            <div className="w-full sm:w-auto flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="relative">
                <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={(e)=>{ setSearch(e.target.value); setPage(1); }} placeholder="Cari nomor invois, label, status..." className="pl-8 pr-3 py-1.5 border rounded text-xs md:text-sm text-black w-full sm:w-72 outline-none focus:ring-2 focus:ring-slate-900" />
              </div>
              <select value={String(pageSize)} onChange={(e)=>{ setPageSize(parseInt(e.target.value)); setPage(1); }} className="border rounded px-2 py-1.5 text-xs md:text-sm text-black w-full sm:w-auto outline-none">
                <option value="10">10 per hal</option>
                <option value="20">20 per hal</option>
                <option value="50">50 per hal</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs md:text-sm">
              <thead className="bg-gray-50 text-gray-700 font-semibold border-b">
                <tr>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Invois / Deskripsi</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Unit / Label</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Jumlah</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Status</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Dibuat</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Info Tambahan</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td className="px-4 py-10 text-center text-gray-400" colSpan={7}>Memuat data...</td></tr>
                ) : paged.length === 0 ? (
                  <tr><td className="px-4 py-10 text-center text-gray-400" colSpan={7}>Tidak ada data pembayaran ditemukan</td></tr>
                ) : paged.map((p) => {
                  const m = p.metadata || {};
                  const users = Array.isArray(m.userIds) ? m.userIds.length : (m.usersCount || (m.mode === 'SINGLE_SUBSCRIPTION' ? 1 : 0));
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition align-top">
                      <td className="px-4 py-3 whitespace-normal break-words">
                        <div className="text-slate-900 font-bold truncate max-w-[200px] md:max-w-none">{p.invoiceNumber || (p.metadata?.invoiceNumber as string) || p.id.slice(0,8).toUpperCase()} </div>
                        <div className="text-[11px] md:text-xs text-gray-500 whitespace-normal break-words max-w-[260px] md:max-w-none mt-0.5">{p.description}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 whitespace-normal break-words max-w-[200px] md:max-w-none font-medium">
                        {p.label?.name || (m.mode === 'SINGLE_SUBSCRIPTION' ? 'Unit Dapur' : p.labelId || '-')}
                      </td>
                      <td className="px-4 py-3 text-slate-900 whitespace-nowrap font-bold">
                        {p.currency} {p.amount.toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-[10px] md:text-[11px] px-2.5 py-1 rounded-full font-semibold border ${
                          p.status === 'PAID' ? 'bg-green-50 text-green-700 border-green-200' :
                          p.status === 'AWAITING_APPROVAL' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          p.status === 'FAILED' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-gray-100 text-gray-600 border-gray-200'
                        }`}>
                          {formatStatus(p.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-[11px] md:text-xs">
                        {new Date(p.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 text-[11px] md:text-xs text-gray-600 whitespace-normal break-words leading-relaxed">
                        {m.mode === 'SINGLE_SUBSCRIPTION' ? (
                          <div className="text-blue-600 font-medium">Langganan Unit</div>
                        ) : (
                          <div>Unit: <span className="text-slate-900 font-semibold">{users}</span></div>
                        )}
                        {m.referenceNumber && <div className="mt-0.5">Ref: <span className="text-slate-900">{m.referenceNumber}</span></div>}
                        {m.paidBy && <div className="mt-0.5">Oleh: <span className="text-slate-900">{m.paidBy}</span></div>}
                        {m.awaitingApproval && <div className="text-amber-600 font-medium mt-1 italic flex items-center gap-1"><FiRefreshCw className="animate-spin-slow h-3 w-3" /> Perlu Approval</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button onClick={()=>handleDownloadInvoice(p)} className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-gray-200 text-[11px] md:text-xs hover:bg-gray-50 text-slate-700 transition" title="Unduh Invois"><FiDownload/>Invois</button>
                          {p.status !== 'PAID' && (
                            <>
                              <button onClick={()=>onApprove(p)} className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-green-600 text-white text-[11px] md:text-xs hover:bg-green-700 transition shadow-sm"><FiCheck/>Setujui</button>
                              <button onClick={()=>{ setActionPayment(p); }} className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-red-600 text-white text-[11px] md:text-xs hover:bg-red-700 transition shadow-sm"><FiX/>Tolak</button>
                            </>
                          )}
                          {isSuperAdmin() && p.status !== 'PAID' && (
                            <button onClick={()=> setDeletePayment(p)} className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-gray-100 text-gray-600 text-[11px] md:text-xs hover:bg-red-50 hover:text-red-600 transition" title="Hapus"><FiTrash/></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs md:text-sm text-gray-600 border-t bg-gray-50/30">
            <div>Menampilkan {start + 1} - {Math.min(end, filtered.length)} dari {filtered.length} data</div>
            <div className="flex items-center gap-2">
              <button onClick={()=> setPage(p=> Math.max(1, p-1))} disabled={currentPage<=1} className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50 disabled:opacity-50 transition">Sebelumnya</button>
              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => (
                  <button key={i} onClick={() => setPage(i + 1)} className={`w-8 h-8 rounded text-xs font-medium transition ${currentPage === i + 1 ? 'bg-slate-900 text-white' : 'bg-white border hover:bg-gray-50'}`}>
                    {i + 1}
                  </button>
                ))}
              </div>
              <button onClick={()=> setPage(p=> Math.min(totalPages, p+1))} disabled={currentPage>=totalPages} className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50 disabled:opacity-50 transition">Selanjutnya</button>
            </div>
          </div>
        </div>

        {actionPayment && (
          <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={()=>setActionPayment(null)}>
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4" onClick={(e)=>e.stopPropagation()}>
              <div className="flex items-center gap-3 text-red-600">
                <div className="p-2 bg-red-50 rounded-full"><FiX className="h-6 w-6" /></div>
                <h3 className="text-lg font-bold">Tolak Pembayaran</h3>
              </div>
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                ID Pembayaran: <span className="text-slate-900 font-mono font-medium">{actionPayment.id}</span>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Alasan Penolakan</label>
                <textarea value={failReason} onChange={(e)=>setFailReason(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm text-black outline-none focus:ring-2 focus:ring-red-500 min-h-[100px]" placeholder="Berikan alasan mengapa pembayaran ini ditolak..." />
              </div>
              <label className="flex items-center gap-3 p-3 bg-red-50/50 rounded-xl border border-red-100 cursor-pointer transition hover:bg-red-50">
                <input type="checkbox" className="w-4 h-4 rounded border-red-300 text-red-600 focus:ring-red-500" checked={expireSubs} onChange={(e)=>setExpireSubs(e.target.checked)} />
                <span className="text-sm text-red-800 font-medium">Langsung nonaktifkan akses langganan terkait</span>
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={()=>setActionPayment(null)} className="px-4 py-2 rounded-xl border text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Batal</button>
                <button onClick={()=>onFail(actionPayment)} className="px-6 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition shadow-lg shadow-red-200">Konfirmasi Penolakan</button>
              </div>
            </div>
          </div>
        )}

        {deletePayment && (
          <div className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={()=> setDeletePayment(null)}>
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4" onClick={(e)=> e.stopPropagation()}>
              <div className="flex items-center gap-3 text-gray-900">
                <div className="p-2 bg-gray-100 rounded-full"><FiTrash className="h-6 w-6" /></div>
                <h3 className="text-lg font-bold">Hapus Pembayaran</h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Apakah Anda yakin ingin menghapus data pembayaran ini? Tindakan ini <strong className="text-red-600">tidak dapat dibatalkan</strong>. Data pembayaran yang sudah berstatus LUNAS tidak dapat dihapus.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={()=> setDeletePayment(null)} className="px-4 py-2 rounded-xl border text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Batal</button>
                <button disabled={deleting} onClick={()=> onDelete(deletePayment)} className="px-6 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-50 transition shadow-lg shadow-slate-200">
                  {deleting ? 'Menghapus...' : 'Ya, Hapus Data'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
