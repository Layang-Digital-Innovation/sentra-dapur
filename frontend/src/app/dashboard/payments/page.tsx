"use client";

import React, { useEffect, useMemo, useState } from "react";
import RoleGuard from "@/components/auth/RoleGuard";
import { Role } from "@/types/user.types";
import { subscriptionService } from "@/services/subscription.service";
import axiosInstance from "@/utils/axiosConfig";
import { toast } from "react-toastify";
import { FiCheck, FiX, FiRefreshCw, FiFilter, FiDownload, FiTrash } from "react-icons/fi";
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
  const [mode, setMode] = useState<string>("ORG_INVOICE");
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
      toast.error(e?.response?.data?.message || "Gagal memuat payments");
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
        const createdAt = p.createdAt ? new Date(p.createdAt).toLocaleString() : '';
        const status = (p.status || '').toUpperCase();
        const orgName = p.label?.name || m.paidBy || '-';
        const descUsers = Array.isArray(m.userIds) ? m.userIds.length : (m.usersCount || 1);
        const period = m.period || 'MONTHLY';
        const description = `Enterprise Custom ${period} - ${descUsers} users`;
        const currency = p.currency || 'IDR';
        const amount = p.amount || 0;

        // Header
        doc.setFontSize(16); doc.setTextColor('#4b2aad'); doc.text(title, 40, 40);
        doc.setFontSize(10); doc.setTextColor('#444'); doc.text(subtitle, 40, 56);
        doc.setTextColor('#000');
        doc.setFontSize(11);
        doc.text(`Invoice: ${invoiceNo}`, 40, 80);
        doc.text(`Date: ${createdAt}`, 40, 96);
        doc.text(`Status: ${status}`, 40, 112);

        // Billed To
        let y = 140;
        doc.setFontSize(12); doc.setTextColor('#666'); doc.text('Billed To', 40, y); y += 16;
        doc.setFontSize(11); doc.setTextColor('#000'); doc.text(orgName, 40, y); y += 24;

        // Description
        doc.setFontSize(12); doc.setTextColor('#666'); doc.text('Description', 40, y); y += 16;
        doc.setFontSize(11); doc.setTextColor('#000'); doc.text(description, 40, y); y += 10;

        // Items table with aligned footer (Grand Total)
        const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
        const unitPrice = (m.totalAmount && descUsers) ? (m.totalAmount / descUsers) : (m.pricePerUser || amount);
        const total = amount || m.totalAmount || (descUsers * (m.pricePerUser || 0));
        autoTable(doc, {
          startY: y + 12,
          head: [['Item', 'Qty', 'Unit Price', 'Total']],
          body: [[ 'Subscription seats', String(descUsers), fmt(unitPrice), fmt(total) ]],
          foot: [[ { content: 'Grand Total', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } }, fmt(total) ]],
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
        if (m.bankAccountName) bankLines.push(`Account Name: ${m.bankAccountName}`);
        if (m.bankAccountNumber) bankLines.push(`Account Number: ${m.bankAccountNumber}`);
        if (m.bankInstruction) bankLines.push(`Instruction: ${m.bankInstruction}`);
        if (bankLines.length) {
          doc.setFontSize(12); doc.setTextColor('#666'); doc.text('Bank Transfer', 40, y); y += 16;
          doc.setFontSize(10); doc.setTextColor('#000');
          bankLines.forEach(line => { doc.text(line, 40, y); y += 14; });
          y += 6;
        }

        // Notes
        if (m.notes) {
          doc.setFontSize(12); doc.setTextColor('#666'); doc.text('Notes', 40, y); y += 16;
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
      toast.success("Payment disetujui dan user diaktifkan");
      await fetchPayments();
      setActionPayment(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal approve payment");
    }
  };

  const onFail = async (p: PaymentItem) => {
    try {
      await subscriptionService.failManualOrgPayment({ paymentId: p.id, reason: failReason || undefined, expireSubscriptions: expireSubs });
      toast.success("Payment ditandai FAILED");
      await fetchPayments();
      setActionPayment(null);
      setFailReason("");
      setExpireSubs(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal gagal-kan payment");
    }
  };

  const onDelete = async (p: PaymentItem) => {
    try {
      setDeleting(true);
      await subscriptionService.deletePayment(p.id);
      toast.success("Payment dihapus");
      await fetchPayments();
      setDeletePayment(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal menghapus payment");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <RoleGuard allowedRoles={[Role.ADMIN, Role.SUPER_ADMIN]}>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-black">Payments</h1>
          <button onClick={fetchPayments} className="inline-flex items-center gap-2 px-3 py-2 rounded border hover:bg-gray-50 text-sm text-gray-600">
            <FiRefreshCw /> Refresh
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm text-black"><FiFilter /> Filters</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <input className="border rounded px-2 py-1.5 text-sm text-black" placeholder="Label ID" value={labelId} onChange={(e)=>setLabelId(e.target.value)} />
            <select className="border rounded px-2 py-1.5 text-sm text-black" value={status} onChange={(e)=>setStatus(e.target.value)}>
              <option value="">Any Status</option>
              <option value="AWAITING_APPROVAL">Awaiting Approval</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="FAILED">Failed</option>
            </select>
            <select className="border rounded px-2 py-1.5 text-sm text-black" value={provider} onChange={(e)=>setProvider(e.target.value)}>
              <option value="">Any Provider</option>
              <option value="manual">Manual</option>
              <option value="XENDIT">Xendit</option>
              <option value="PAYPAL">PayPal</option>
            </select>
            <select className="border rounded px-2 py-1.5 text-sm text-black" value={mode} onChange={(e)=>setMode(e.target.value)}>
              <option value="">Any Mode</option>
              <option value="ORG_INVOICE">ORG_INVOICE</option>
            </select>
            <select className="border rounded px-2 py-1.5 text-sm text-black" value={String(limit)} onChange={(e)=>setLimit(parseInt(e.target.value))}>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchPayments} className="px-3 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">Apply</button>
            <button onClick={()=>{ setLabelId(""); setStatus(""); setProvider("manual"); setMode("ORG_INVOICE"); setLimit(50); }} className="px-3 py-2 rounded border text-sm hover:bg-gray-50 text-gray-600">Reset</button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-3 border-b text-black text-sm font-medium flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>Manual Invoice Payments</div>
            <div className="w-full sm:w-auto flex flex-col sm:flex-row sm:items-center gap-2">
              <input value={search} onChange={(e)=>{ setSearch(e.target.value); setPage(1); }} placeholder="Search invoice, label, status, notes" className="border rounded px-2 py-1.5 text-xs md:text-sm text-black w-full sm:w-72" />
              <select value={String(pageSize)} onChange={(e)=>{ setPageSize(parseInt(e.target.value)); setPage(1); }} className="border rounded px-2 py-1.5 text-xs md:text-sm text-black w-full sm:w-auto">
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs md:text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="text-left px-3 py-2 whitespace-nowrap">Invoice</th>
                  <th className="text-left px-3 py-2 whitespace-nowrap">Label</th>
                  <th className="text-left px-3 py-2 whitespace-nowrap">Amount</th>
                  <th className="text-left px-3 py-2 whitespace-nowrap">Status</th>
                  <th className="text-left px-3 py-2 whitespace-nowrap">Created</th>
                  <th className="text-left px-3 py-2 whitespace-nowrap">Metadata</th>
                  <th className="text-left px-3 py-2 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="px-3 py-3" colSpan={7}>Loading...</td></tr>
                ) : paged.length === 0 ? (
                  <tr><td className="px-3 py-3" colSpan={7}>No payments</td></tr>
                ) : paged.map((p) => {
                  const m = p.metadata || {};
                  const users = Array.isArray(m.userIds) ? m.userIds.length : 0;
                  return (
                    <tr key={p.id} className="border-t align-top">
                      <td className="px-3 py-2 whitespace-normal break-words">
                        <div className="text-black font-medium truncate max-w-[200px] md:max-w-none">{p.invoiceNumber || (p.metadata?.invoiceNumber as string) || '-'} </div>
                        <div className="text-[11px] md:text-xs text-gray-600 whitespace-normal break-words truncate max-w-[260px] md:max-w-none">{p.description}</div>
                      </td>
                      <td className="px-3 py-2 text-black whitespace-normal break-words truncate max-w-[200px] md:max-w-none">{p.label?.name || p.labelId || '-'}</td>
                      <td className="px-3 py-2 text-black whitespace-nowrap">{p.amount.toLocaleString()} {p.currency}</td>
                      <td className="px-3 py-2 whitespace-nowrap"><span className="text-[11px] md:text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">{p.status}</span></td>
                      <td className="px-3 py-2 text-black whitespace-nowrap">{new Date(p.createdAt).toLocaleString()}</td>
                      <td className="px-3 py-2 text-[11px] md:text-xs text-gray-700 whitespace-normal break-words">
                        <div>Users: <span className="text-black font-medium">{users}</span></div>
                        {m.referenceNumber && <div>Ref: {m.referenceNumber}</div>}
                        {m.paidBy && <div>PaidBy: {m.paidBy}</div>}
                        {m.awaitingApproval ? <div className="text-yellow-700">Awaiting Approval</div> : null}
                        {m.additionalSeats ? <div className="text-blue-700">Additional Seats</div> : null}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2 text-orange-700">
                          <button onClick={()=>handleDownloadInvoice(p)} className="inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] md:text-xs hover:bg-gray-50"><FiDownload/>Download</button>
                          <button disabled={p.status === 'PAID'} onClick={()=>onApprove(p)} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-600 text-white text-[11px] md:text-xs disabled:opacity-50"><FiCheck/>Approve</button>
                          <button onClick={()=>{ setActionPayment(p); }} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-600 text-white text-[11px] md:text-xs"><FiX/>Fail</button>
                          {isSuperAdmin() && (
                            <button onClick={()=> setDeletePayment(p)} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-200 text-black text-[11px] md:text-xs hover:bg-gray-300"><FiTrash/>Delete</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 text-xs md:text-sm text-black border-t">
            <span>Page {currentPage} / {totalPages}</span>
            <button onClick={()=> setPage(p=> Math.max(1, p-1))} disabled={currentPage<=1} className="px-2 py-1 md:px-3 md:py-1 rounded border hover:bg-gray-50 disabled:opacity-50">Prev</button>
            <button onClick={()=> setPage(p=> Math.min(totalPages, p+1))} disabled={currentPage>=totalPages} className="px-2 py-1 md:px-3 md:py-1 rounded border hover:bg-gray-50 disabled:opacity-50">Next</button>
          </div>
        </div>

        {actionPayment && (
          <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center" onClick={()=>setActionPayment(null)}>
            <div className="bg-white rounded-lg w-full max-w-md p-4 space-y-3" onClick={(e)=>e.stopPropagation()}>
              <div className="text-base font-semibold text-black">Fail Payment</div>
              <div className="text-sm text-gray-700">Payment ID: <span className="text-black">{actionPayment.id}</span></div>
              <label className="block text-xs text-gray-600">Reason</label>
              <input value={failReason} onChange={(e)=>setFailReason(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm text-black" placeholder="Alasan (opsional)" />
              <label className="flex items-center gap-2 text-sm text-black"><input type="checkbox" checked={expireSubs} onChange={(e)=>setExpireSubs(e.target.checked)} /> Expire subscriptions immediately</label>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={()=>setActionPayment(null)} className="px-3 py-2 rounded border text-sm hover:bg-gray-50">Batal</button>
                <button onClick={()=>onFail(actionPayment)} className="px-3 py-2 rounded bg-red-600 text-white text-sm hover:bg-red-700">Konfirmasi Fail</button>
              </div>
            </div>
          </div>
        )}

        {deletePayment && (
          <div className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center" onClick={()=> setDeletePayment(null)}>
            <div className="bg-white rounded-lg w-full max-w-md p-4 space-y-3" onClick={(e)=> e.stopPropagation()}>
              <div className="text-base font-semibold text-black">Delete Payment</div>
              <div className="text-sm text-gray-700">Payment ID: <span className="text-black">{deletePayment.id}</span></div>
              <div className="text-xs text-gray-600">Aksi ini tidak bisa dibatalkan. Payment dengan status PAID tidak dapat dihapus.</div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={()=> setDeletePayment(null)} className="px-3 py-2 rounded border text-sm hover:bg-gray-50">Batal</button>
                <button disabled={deleting} onClick={()=> onDelete(deletePayment)} className="px-3 py-2 rounded bg-gray-800 text-white text-sm hover:bg-gray-900 disabled:opacity-50">{deleting ? 'Menghapus...' : 'Hapus'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
