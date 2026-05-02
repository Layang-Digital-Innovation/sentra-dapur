"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { dapurService, DapurUnit } from "@/services/dapur.service";
import {
  FiArrowLeft,
  FiCalendar,
  FiEdit2,
  FiTrash2,
  FiAlertTriangle,
  FiPlus,
  FiX,
} from "react-icons/fi";
import toast from "react-hot-toast";

interface KasRow {
  id: string;
  type: string;
  bookType: string;
  amount: number;
  description: string;
  referenceNo?: string | null;
  evidenceUrl?: string | null;
  transactionDate: string;
  status: string;
  pendingPoApproval?: boolean;
  markedForDeletion?: boolean;
  pendingEditData?: Record<string, unknown> | null;
  items?: Array<{
    id?: string;
    name: string;
    quantity: number;
    unit?: string | null;
    pricePerUnit?: number | null;
    total?: number | null;
  }>;
}

function KasSection({
  title,
  subtitle,
  rows,
  onEdit,
  onRequestDelete,
}: {
  title: string;
  subtitle: string;
  rows: KasRow[];
  onEdit: (r: KasRow) => void;
  onRequestDelete: (r: KasRow) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-slate-50">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-100">
            <tr>
              <th className="px-4 py-3">Tanggal</th>
              <th className="px-4 py-3">Jenis</th>
              <th className="px-4 py-3">Keterangan</th>
              <th className="px-4 py-3 text-right">Nominal</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                  Tidak ada transaksi.
                </td>
              </tr>
            ) : (
              rows.map((trx) => {
                const pending = trx.pendingPoApproval;
                const del = trx.markedForDeletion;
                const blocked = pending;
                return (
                  <tr key={trx.id} className={del ? "bg-rose-50/40" : ""}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-gray-800 font-medium">
                        <FiCalendar className="h-3.5 w-3.5 text-gray-400" />
                        {new Date(trx.transactionDate).toLocaleDateString("id-ID")}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                          trx.type === "IN"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {trx.type === "IN" ? "Masuk" : "Keluar"}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-gray-800 line-clamp-2">{trx.description}</p>
                      {trx.referenceNo && (
                        <p className="text-[11px] text-gray-400 mt-0.5">Ref: {trx.referenceNo}</p>
                      )}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        trx.type === "IN" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {trx.type === "IN" ? "+" : "-"} {trx.amount.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 items-start">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            trx.status === "APPROVED"
                              ? "bg-green-50 text-green-800"
                              : trx.status === "PENDING"
                                ? "bg-amber-50 text-amber-800"
                                : trx.status === "REJECTED"
                                  ? "bg-gray-100 text-gray-700"
                                  : "bg-gray-50 text-gray-600"
                          }`}
                        >
                          {trx.status}
                        </span>
                        {pending && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-100">
                            {del ? "Menunggu PO — hapus" : "Menunggu PO — ubah"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          disabled={blocked || trx.status !== "APPROVED"}
                          title={
                            trx.status !== "APPROVED"
                              ? "Hanya transaksi disetujui yang dapat diubah"
                              : blocked
                                ? "Menunggu keputusan Project Owner"
                                : "Edit"
                          }
                          onClick={() => onEdit(trx)}
                          className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <FiEdit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={blocked || trx.status !== "APPROVED"}
                          onClick={() => onRequestDelete(trx)}
                          className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function KasDapurDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const dapurId = params?.dapurId as string;

  const [dapurName, setDapurName] = useState("");
  const [rows, setRows] = useState<KasRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<KasRow | null>(null);
  const [form, setForm] = useState({
    type: "IN" as "IN" | "OUT",
    bookType: "UMUM" as "UMUM" | "PEMBANTU",
    amount: "",
    description: "",
    referenceNo: "",
    evidenceUrl: "",
    transactionDate: "",
  });
  const [itemRows, setItemRows] = useState<
    { name: string; quantity: string; unit: string; pricePerUnit: string }[]
  >([]);

  const load = useCallback(async () => {
    if (!dapurId) return;
    try {
      const list = await dapurService.getMyDapur();
      const unit = (list as DapurUnit[]).find((d) => d.id === dapurId);
      setDapurName(unit?.name || "Dapur");
      const kas = await dapurService.getArusKas(dapurId);
      setRows((kas || []) as KasRow[]);
    } catch {
      toast.error("Gagal memuat buku kas");
    } finally {
      setLoading(false);
    }
  }, [dapurId]);

  useEffect(() => {
    if (user?.user.role !== "ADMIN_PUSAT") {
      router.replace("/dashboard");
      return;
    }
    load();
  }, [user, router, load]);

  const umum = useMemo(() => rows.filter((r) => r.bookType === "UMUM"), [rows]);
  const pembantu = useMemo(() => rows.filter((r) => r.bookType === "PEMBANTU"), [rows]);

  const openEdit = (r: KasRow) => {
    setEditing(r);
    const proposed = r.pendingEditData as Record<string, unknown> | undefined;
    const src = proposed && typeof proposed === "object" ? proposed : r;
    const txRaw =
      typeof src.transactionDate === "string"
        ? src.transactionDate
        : (r.transactionDate as string);
    const txIso =
      typeof txRaw === "string"
        ? txRaw
        : new Date(txRaw as unknown as string).toISOString();
    setForm({
      type: (src.type as "IN" | "OUT") || (r.type as "IN" | "OUT"),
      bookType: (src.bookType as "UMUM" | "PEMBANTU") || (r.bookType as "UMUM" | "PEMBANTU"),
      amount: String(src.amount ?? r.amount),
      description: String(src.description ?? r.description ?? ""),
      referenceNo: String(src.referenceNo ?? r.referenceNo ?? ""),
      evidenceUrl: String(src.evidenceUrl ?? r.evidenceUrl ?? ""),
      transactionDate: txIso.slice(0, 10),
    });
    const items =
      proposed && Array.isArray(proposed.items)
        ? (proposed.items as KasRow["items"])
        : r.items || [];
    setItemRows(
      items.length
        ? items.map((i) => ({
            name: i.name || "",
            quantity: String(i.quantity ?? ""),
            unit: i.unit || "",
            pricePerUnit: i.pricePerUnit != null ? String(i.pricePerUnit) : "",
          }))
        : [],
    );
    setModalOpen(true);
  };

  const submitEdit = async () => {
    if (!editing) return;
    const amount = parseFloat(form.amount.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Nominal tidak valid");
      return;
    }
    try {
      const items =
        itemRows.length > 0
          ? itemRows.map((i) => {
              const qty = parseFloat(i.quantity.replace(/\./g, "").replace(",", ".")) || 0;
              const ppu = i.pricePerUnit
                ? parseFloat(i.pricePerUnit.replace(/\./g, "").replace(",", "."))
                : 0;
              const total = qty * (ppu || 0);
              return {
                name: i.name,
                quantity: qty,
                unit: i.unit || undefined,
                pricePerUnit: ppu || undefined,
                total,
              };
            })
          : undefined;

      await dapurService.proposeArusKasPendingEdit(editing.id, {
        type: form.type,
        bookType: form.bookType,
        amount,
        description: form.description.trim(),
        referenceNo: form.referenceNo.trim() || undefined,
        evidenceUrl: form.evidenceUrl.trim() || undefined,
        transactionDate: form.transactionDate
          ? new Date(form.transactionDate).toISOString()
          : undefined,
        items,
      });
      toast.success("Perubahan diajukan — menunggu persetujuan Project Owner");
      setModalOpen(false);
      setEditing(null);
      load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Gagal mengajukan perubahan";
      toast.error(msg);
    }
  };

  const requestDelete = async (r: KasRow) => {
    if (
      !confirm(
        "Ajukan penghapusan transaksi ini? Project Owner harus menyetujui sebelum data dihapus.",
      )
    ) {
      return;
    }
    try {
      await dapurService.requestDeleteArusKas(r.id);
      toast.success("Pengajuan hapus dikirim ke Project Owner");
      load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Gagal mengajukan hapus";
      toast.error(msg);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[320px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 pb-24">
      <button
        type="button"
        onClick={() => router.push("/dashboard/admin-pusat/buku-kas/dapur")}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <FiArrowLeft className="h-4 w-4" />
        Kembali ke pilih dapur
      </button>

      <div className="rounded-2xl border border-amber-100 bg-amber-50/60 px-6 py-4 flex gap-3 items-start">
        <FiAlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-900">
          <strong>Edit</strong> dan <strong>hapus</strong> dari halaman ini memerlukan persetujuan{" "}
          <strong>Project Owner</strong>. Transaksi yang terhubung ke pembayaran PO tidak dapat
          diajukan penghapusan.
        </p>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rincian kas — {dapurName}</h1>
        <p className="text-gray-500 text-sm mt-1">
          Kas Umum dan Kas Pembantu (kas kecil). Transaksi dengan status selain disetujui tidak dapat
          diubah dari sini.
        </p>
      </div>

      <KasSection
        title="Kas Umum"
        subtitle="Alokasi utama keuangan unit"
        rows={umum}
        onEdit={openEdit}
        onRequestDelete={requestDelete}
      />

      <KasSection
        title="Kas Pembantu"
        subtitle="Kas kecil / pembantu operasional"
        rows={pembantu}
        onEdit={openEdit}
        onRequestDelete={requestDelete}
      />

      {modalOpen && editing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl border border-gray-100">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Ajukan perubahan</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-gray-600">
                  Jenis
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "IN" | "OUT" }))}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                  >
                    <option value="IN">Masuk</option>
                    <option value="OUT">Keluar</option>
                  </select>
                </label>
                <label className="block text-xs font-semibold text-gray-600">
                  Buku
                  <select
                    value={form.bookType}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, bookType: e.target.value as "UMUM" | "PEMBANTU" }))
                    }
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                  >
                    <option value="UMUM">Umum</option>
                    <option value="PEMBANTU">Pembantu</option>
                  </select>
                </label>
              </div>
              <label className="block text-xs font-semibold text-gray-600">
                Nominal (Rp)
                <input
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                  placeholder="0"
                />
              </label>
              <label className="block text-xs font-semibold text-gray-600">
                Tanggal transaksi
                <input
                  type="date"
                  value={form.transactionDate}
                  onChange={(e) => setForm((f) => ({ ...f, transactionDate: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </label>
              <label className="block text-xs font-semibold text-gray-600">
                Keterangan
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-gray-600">
                  No. referensi
                  <input
                    value={form.referenceNo}
                    onChange={(e) => setForm((f) => ({ ...f, referenceNo: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                  />
                </label>
                <label className="block text-xs font-semibold text-gray-600">
                  URL bukti
                  <input
                    value={form.evidenceUrl}
                    onChange={(e) => setForm((f) => ({ ...f, evidenceUrl: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                  />
                </label>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-gray-600">Rincian item (opsional)</span>
                  <button
                    type="button"
                    onClick={() =>
                      setItemRows((prev) => [
                        ...prev,
                        { name: "", quantity: "", unit: "", pricePerUnit: "" },
                      ])
                    }
                    className="text-xs font-semibold text-indigo-600 inline-flex items-center gap-1"
                  >
                    <FiPlus className="h-3 w-3" /> Baris
                  </button>
                </div>
                <div className="space-y-2">
                  {itemRows.map((row, idx) => (
                    <div key={idx} className="flex gap-2 items-center flex-wrap">
                      <input
                        placeholder="Nama"
                        value={row.name}
                        onChange={(e) => {
                          const next = [...itemRows];
                          next[idx] = { ...next[idx], name: e.target.value };
                          setItemRows(next);
                        }}
                        className="flex-1 min-w-[120px] rounded border border-gray-200 px-2 py-1 text-sm"
                      />
                      <input
                        placeholder="Qty"
                        value={row.quantity}
                        onChange={(e) => {
                          const next = [...itemRows];
                          next[idx] = { ...next[idx], quantity: e.target.value };
                          setItemRows(next);
                        }}
                        className="w-20 rounded border border-gray-200 px-2 py-1 text-sm"
                      />
                      <input
                        placeholder="Satuan"
                        value={row.unit}
                        onChange={(e) => {
                          const next = [...itemRows];
                          next[idx] = { ...next[idx], unit: e.target.value };
                          setItemRows(next);
                        }}
                        className="w-24 rounded border border-gray-200 px-2 py-1 text-sm"
                      />
                      <input
                        placeholder="Harga"
                        value={row.pricePerUnit}
                        onChange={(e) => {
                          const next = [...itemRows];
                          next[idx] = { ...next[idx], pricePerUnit: e.target.value };
                          setItemRows(next);
                        }}
                        className="w-28 rounded border border-gray-200 px-2 py-1 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setItemRows((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1 text-rose-600"
                      >
                        <FiX className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={submitEdit}
                className="w-full py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800"
              >
                Kirim pengajuan ke Project Owner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
