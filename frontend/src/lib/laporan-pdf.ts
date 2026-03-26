/**
 * Laporan Keuangan — PDF Generator
 * Menggunakan jsPDF + jspdf-autotable
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ArusKasRow, LBBPRow, LRAData, LPD2MRow } from './laporan-excel';

type JsPDFInstance = InstanceType<typeof jsPDF>;

const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function getPeriodeLabel(month: number, year: number) {
  return `${BULAN[month - 1]} ${year}`;
}

const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });

const fmtIDR = (v: number) =>
  new Intl.NumberFormat('id-ID').format(v);

function addKop(doc: JsPDFInstance, dapurName: string, title: string, periode: string) {
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`SPPG ${dapurName.toUpperCase()}`, pageW / 2, 18, { align: 'center' });

  doc.setFontSize(11);
  doc.text(title, pageW / 2, 25, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Periode: ${periode}`, pageW / 2, 31, { align: 'center' });

  // divider
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 34, pageW - 14, 34);

  return 38; // next Y
}

// ─── BKU / BKK ───────────────────────────────────────────

export function generateBKUPdf(
  data: ArusKasRow[],
  dapurName: string,
  bookType: 'UMUM' | 'PEMBANTU',
  month: number,
  year: number,
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const periode = getPeriodeLabel(month, year);
  const title = bookType === 'UMUM' ? 'BUKU KAS UMUM' : 'BUKU KAS PEMBANTU (KAS KECIL)';
  const startY = addKop(doc, dapurName, title, periode);

  const filtered = data.filter(d => {
    const dt = new Date(d.transactionDate);
    return dt.getMonth() + 1 === month && dt.getFullYear() === year;
  });

  let saldo = 0;
  let no = 1;
  const rows = filtered.map(row => {
    const masuk = row.type === 'IN' ? row.amount : 0;
    const keluar = row.type === 'OUT' ? row.amount : 0;
    saldo += masuk - keluar;
    return [
      no++,
      fmtDate(row.transactionDate),
      row.referenceNo || '-',
      row.description,
      masuk > 0 ? fmtIDR(masuk) : '-',
      keluar > 0 ? fmtIDR(keluar) : '-',
      fmtIDR(saldo),
    ];
  });

  const totalIn = filtered.filter(r => r.type === 'IN').reduce((s, r) => s + r.amount, 0);
  const totalOut = filtered.filter(r => r.type === 'OUT').reduce((s, r) => s + r.amount, 0);
  rows.push(['', '', '', 'TOTAL', fmtIDR(totalIn), fmtIDR(totalOut), fmtIDR(saldo)] as any);

  autoTable(doc, {
    startY,
    head: [['No.', 'Tanggal', 'No. Bukti', 'Uraian', 'Pemasukan (Rp)', 'Pengeluaran (Rp)', 'Saldo (Rp)']],
    body: rows,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 24 },
      2: { cellWidth: 24 },
      3: { cellWidth: 80 },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 30, halign: 'right' },
      6: { cellWidth: 30, halign: 'right' },
    },
    foot: [['', '', '', 'TOTAL', fmtIDR(totalIn), fmtIDR(totalOut), fmtIDR(saldo)]],
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
  });

  // TTD area
  addTtdArea(doc, dapurName);
  doc.save(`${bookType === 'UMUM' ? 'BKU' : 'BKK'}_${dapurName}_${periode.replace(' ', '_')}.pdf`);
}

// ─── LBBP ────────────────────────────────────────────────

export function generateLBBPPdf(
  data: LBBPRow[],
  dapurName: string,
  month: number,
  year: number,
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const periode = getPeriodeLabel(month, year);
  const startY = addKop(doc, dapurName, 'LAPORAN BIAYA BAHAN PANGAN (LBBP)', periode);

  const filtered = data.filter(d => {
    const dt = new Date(d.transactionDate);
    return dt.getMonth() + 1 === month && dt.getFullYear() === year;
  });

  let no = 1;
  const rows = filtered.map(row => [
    no++,
    fmtDate(row.transactionDate),
    row.productName,
    row.quantity,
    row.unit || 'kg',
    fmtIDR(row.pricePerUnit),
    fmtIDR(row.total),
    row.supplierName || '-',
  ]);

  const grandTotal = filtered.reduce((s, r) => s + r.total, 0);

  autoTable(doc, {
    startY,
    head: [['No.', 'Tanggal', 'Nama Bahan', 'Volume', 'Satuan', 'Harga Satuan (Rp)', 'Total (Rp)', 'Penyuplai']],
    body: rows,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [20, 83, 45], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 22 },
      2: { cellWidth: 55 },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 16, halign: 'center' },
      5: { cellWidth: 30, halign: 'right' },
      6: { cellWidth: 30, halign: 'right' },
      7: { cellWidth: 40 },
    },
    foot: [['', '', '', '', '', 'TOTAL', fmtIDR(grandTotal), '']],
    footStyles: { fillColor: [236, 253, 245], textColor: [20, 83, 45], fontStyle: 'bold' },
  });

  addTtdArea(doc, dapurName);
  doc.save(`LBBP_${dapurName}_${periode.replace(' ', '_')}.pdf`);
}

// ─── LBO / LBS ───────────────────────────────────────────

export function generateLBOPdf(
  data: ArusKasRow[],
  dapurName: string,
  reportType: 'LBO' | 'LBS',
  month: number,
  year: number,
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const periode = getPeriodeLabel(month, year);
  const title = reportType === 'LBO' ? 'LAPORAN BIAYA OPERASIONAL (LBO)' : 'LAPORAN BIAYA SEWA (LBS)';
  const startY = addKop(doc, dapurName, title, periode);

  const filtered = data.filter(d => {
    const dt = new Date(d.transactionDate);
    return dt.getMonth() + 1 === month && dt.getFullYear() === year && d.type === 'OUT';
  });

  let no = 1;
  const rows = filtered.map(row => [no++, fmtDate(row.transactionDate), row.description, fmtIDR(row.amount), '']);
  const total = filtered.reduce((s, r) => s + r.amount, 0);

  autoTable(doc, {
    startY,
    head: [['No.', 'Tanggal', 'Uraian', 'Nominal (Rp)', 'Keterangan']],
    body: rows,
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [67, 56, 202], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [238, 242, 255] },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 28 },
      2: { cellWidth: 80 },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 30 },
    },
    foot: [['', '', 'TOTAL', fmtIDR(total), '']],
    footStyles: { fillColor: [238, 242, 255], textColor: [67, 56, 202], fontStyle: 'bold' },
  });

  addTtdArea(doc, dapurName);
  doc.save(`${reportType}_${dapurName}_${periode.replace(' ', '_')}.pdf`);
}

// ─── LRA ─────────────────────────────────────────────────

export function generateLRAPdf(
  lra: LRAData,
  dapurName: string,
  month: number,
  year: number,
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const periode = getPeriodeLabel(month, year);
  let y = addKop(doc, dapurName, 'LAPORAN REALISASI ANGGARAN (LRA)', periode);

  const totalPendapatan = lra.pendapatan.reduce((s, r) => s + r.amount, 0);
  const totalBelanja = lra.belanja.reduce((s, r) => s + r.amount, 0);
  const surplus = totalPendapatan - totalBelanja;

  const rows: any[] = [
    [{ content: 'A. PENDAPATAN', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }],
    ...lra.pendapatan.map(p => [`   ${p.label}`, fmtIDR(p.amount)]),
    [{ content: '   TOTAL PENDAPATAN', styles: { fontStyle: 'bold' } }, { content: fmtIDR(totalPendapatan), styles: { fontStyle: 'bold', halign: 'right' } }],
    [{ content: '', colSpan: 2, styles: { minCellHeight: 3 } }],
    [{ content: 'B. BELANJA', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }],
    ...lra.belanja.map(b => [`   ${b.label}`, fmtIDR(b.amount)]),
    [{ content: '   TOTAL BELANJA', styles: { fontStyle: 'bold' } }, { content: fmtIDR(totalBelanja), styles: { fontStyle: 'bold', halign: 'right' } }],
    [{ content: '', colSpan: 2, styles: { minCellHeight: 3 } }],
    [
      { content: surplus >= 0 ? '✓ SURPLUS' : '✗ DEFISIT', styles: { fontStyle: 'bold', fillColor: surplus >= 0 ? [220, 252, 231] : [254, 226, 226], textColor: surplus >= 0 ? [21, 128, 61] : [185, 28, 28] } },
      { content: fmtIDR(Math.abs(surplus)), styles: { fontStyle: 'bold', halign: 'right', fillColor: surplus >= 0 ? [220, 252, 231] : [254, 226, 226], textColor: surplus >= 0 ? [21, 128, 61] : [185, 28, 28] } },
    ],
  ];

  autoTable(doc, {
    startY: y,
    head: [['URAIAN', 'JUMLAH (Rp)']],
    body: rows,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 55, halign: 'right' },
    },
  });

  addTtdArea(doc, dapurName);
  doc.save(`LRA_${dapurName}_${periode.replace(' ', '_')}.pdf`);
}

// ─── LPD2M ───────────────────────────────────────────────

export function generateLPD2MPdf(
  data: LPD2MRow[],
  dapurName: string,
  year: number,
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const startY = addKop(doc, dapurName, 'REKAPITULASI BULANAN (LPD2M)', `Tahun ${year}`);

  const rows = data.map((r, i) => [
    i + 1, r.bulan, fmtIDR(r.saldoAwal), fmtIDR(r.penerimaan),
    fmtIDR(r.bahanPangan), fmtIDR(r.operasional), fmtIDR(r.sewa), fmtIDR(r.totalPengeluaran), fmtIDR(r.saldoAkhir),
  ]);

  autoTable(doc, {
    startY,
    head: [['No.', 'Bulan', 'Saldo Awal', 'Penerimaan', 'Bahan Pangan', 'Operasional', 'Sewa', 'Total Keluar', 'Saldo Akhir']],
    body: rows,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 22 },
      2: { cellWidth: 28, halign: 'right' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 28, halign: 'right' },
      6: { cellWidth: 22, halign: 'right' },
      7: { cellWidth: 28, halign: 'right' },
      8: { cellWidth: 28, halign: 'right' },
    },
  });

  addTtdArea(doc, dapurName);
  doc.save(`LPD2M_${dapurName}_${year}.pdf`);
}

// ─── KARTU STOK ──────────────────────────────────────────

export function generateKartuStokPdf(
  data: any[],
  dapurName: string,
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const dateStr = new Date().toLocaleDateString('id-ID');
  const startY = addKop(doc, dapurName, 'KARTU PERSEDIAAN BAHAN PANGAN', `Tanggal Unduh: ${dateStr}`);

  const rows = data.map((r, i) => [
    i + 1, r.itemName, r.unit, r.category, r.quantity,
  ]);

  autoTable(doc, {
    startY,
    head: [['No.', 'Nama Bahan', 'Satuan', 'Kategori', 'Stok Sistem Saat Ini']],
    body: rows,
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [49, 46, 129], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [238, 242, 255] },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 80 },
      2: { cellWidth: 30 },
      3: { cellWidth: 30 },
      4: { cellWidth: 35, halign: 'right' },
    },
  });

  addTtdArea(doc, dapurName);
  doc.save(`Kartu_Stok_${dapurName}.pdf`);
}

// ─── STOK OPNAME ─────────────────────────────────────────

export function generateStokOpnamePdf(
  data: any[],
  dapurName: string,
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const dateStr = new Date().toLocaleDateString('id-ID');
  const startY = addKop(doc, dapurName, 'BERITA ACARA STOK OPNAME', `Tanggal Unduh: ${dateStr}`);

  const rows = data.map((r, i) => [
    i + 1, r.itemName, r.unit, r.quantity, '', '', '',
  ]);

  autoTable(doc, {
    startY,
    head: [['No.', 'Nama Bahan', 'Satuan', 'Stok Sistem', 'Stok Fisik', 'Selisih', 'Keterangan']],
    body: rows,
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [159, 18, 57], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [255, 241, 242] },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 50 },
      2: { cellWidth: 20 },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' }, // fisik (blank box)
      5: { cellWidth: 20, halign: 'right' }, // selisih (blank box)
      6: { cellWidth: 35 }, // ket
    },
    didDrawCell: function (data: any) {
      // Draw dotted boxes for editable fields
      if (data.row.section === 'body' && (data.column.index === 4 || data.column.index === 5 || data.column.index === 6)) {
        doc.setDrawColor(200, 200, 200);
        // doc.setLineDashPattern([1, 1], 0); // dotted is not supported cleanly on some jspdf typings without internal magic
        doc.line(data.cell.x + 2, data.cell.y + data.cell.height - 2, data.cell.x + data.cell.width - 2, data.cell.y + data.cell.height - 2);
      }
    }
  });

  addTtdArea(doc, dapurName);
  doc.save(`Stok_Opname_${dapurName}.pdf`);
}

// ─── FULL PDF ─────────────────────────────────────────────

export function generateFullLaporanPdf(params: {
  dapurName: string; month: number; year: number;
  bku: ArusKasRow[]; bkk: ArusKasRow[]; lbbp: LBBPRow[];
  lboList: ArusKasRow[]; lra: LRAData;
  lpd: LPD2MRow[]; stok: any[];
}) {
  const { dapurName, month, year, bku, bkk, lbbp, lboList, lra, lpd, stok } = params;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const periode = getPeriodeLabel(month, year);
  const dateStr = new Date().toLocaleDateString('id-ID');

  const addReportHeader = (title: string, periodText: string = periode) => {
    const pageW = doc.internal.pageSize.getWidth();
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`SPPG ${dapurName.toUpperCase()}`, pageW / 2, 18, { align: 'center' });
    doc.setFontSize(12);
    doc.text(title, pageW / 2, 25, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Periode: ${periodText}`, pageW / 2, 31, { align: 'center' });
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 34, pageW - 14, 34);
    return 38;
  };

  // 1. BKU
  let y = addReportHeader('BUKU KAS UMUM');
  let saldoBku = 0;
  let no = 1;
  const bkuFiltered = bku.filter(d => { const dt = new Date(d.transactionDate); return dt.getMonth() + 1 === month && dt.getFullYear() === year; });
  const bkuRows = bkuFiltered.map(r => {
    const inVal = r.type === 'IN' ? r.amount : 0;
    const outVal = r.type === 'OUT' ? r.amount : 0;
    saldoBku += inVal - outVal;
    return [no++, fmtDate(r.transactionDate), r.referenceNo || '-', r.description, inVal > 0 ? fmtIDR(inVal) : '-', outVal > 0 ? fmtIDR(outVal) : '-', fmtIDR(saldoBku)];
  });
  autoTable(doc, {
    startY: y,
    head: [['No.', 'Tanggal', 'No. Bukti', 'Uraian', 'Masuk (Rp)', 'Keluar (Rp)', 'Saldo (Rp)']],
    body: bkuRows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 41, 59] },
  });

  // 2. BKK
  doc.addPage();
  y = addReportHeader('BUKU KAS PEMBANTU (KAS KECIL)');
  let saldoBkk = 0;
  no = 1;
  const bkkFiltered = bkk.filter(d => { const dt = new Date(d.transactionDate); return dt.getMonth() + 1 === month && dt.getFullYear() === year; });
  const bkkRows = bkkFiltered.map(r => {
    const inVal = r.type === 'IN' ? r.amount : 0;
    const outVal = r.type === 'OUT' ? r.amount : 0;
    saldoBkk += inVal - outVal;
    return [no++, fmtDate(r.transactionDate), r.referenceNo || '-', r.description, inVal > 0 ? fmtIDR(inVal) : '-', outVal > 0 ? fmtIDR(outVal) : '-', fmtIDR(saldoBkk)];
  });
  autoTable(doc, {
    startY: y,
    head: [['No.', 'Tanggal', 'No. Bukti', 'Uraian', 'Masuk (Rp)', 'Keluar (Rp)', 'Saldo (Rp)']],
    body: bkkRows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [79, 70, 229] },
  });

  // 3. LBBP
  doc.addPage();
  y = addReportHeader('LAPORAN BIAYA BAHAN PANGAN (LBBP)');
  const lbbpFiltered = lbbp.filter(d => { const dt = new Date(d.transactionDate); return dt.getMonth() + 1 === month && dt.getFullYear() === year; });
  const lbbpRows = lbbpFiltered.map((r, i) => [i + 1, fmtDate(r.transactionDate), r.productName, r.quantity, r.unit || 'kg', fmtIDR(r.pricePerUnit), fmtIDR(r.total), r.supplierName || '-']);
  autoTable(doc, {
    startY: y,
    head: [['No.', 'Tanggal', 'Nama Bahan', 'Vol', 'Sat', 'Harga', 'Total', 'Supplier']],
    body: lbbpRows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [21, 128, 61] },
  });

  // 4. LRA
  doc.addPage('a4', 'portrait');
  y = addReportHeader('LAPORAN REALISASI ANGGARAN (LRA)');
  const totalP = lra.pendapatan.reduce((s, r) => s + r.amount, 0);
  const totalB = lra.belanja.reduce((s, r) => s + r.amount, 0);
  const lraRows = [
    [{ content: 'A. PENDAPATAN', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }],
    ...lra.pendapatan.map(p => [`   ${p.label}`, fmtIDR(p.amount)]),
    [{ content: '   TOTAL PENDAPATAN', styles: { fontStyle: 'bold' } }, { content: fmtIDR(totalP), styles: { fontStyle: 'bold', halign: 'right' } }],
    [{ content: 'B. BELANJA', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }],
    ...lra.belanja.map(b => [`   ${b.label}`, fmtIDR(b.amount)]),
    [{ content: '   TOTAL BELANJA', styles: { fontStyle: 'bold' } }, { content: fmtIDR(totalB), styles: { fontStyle: 'bold', halign: 'right' } }],
    [{ content: totalP - totalB >= 0 ? '✓ SURPLUS' : '✗ DEFISIT', styles: { fontStyle: 'bold', fillColor: totalP - totalB >= 0 ? [220, 252, 231] : [254, 226, 226] } }, { content: fmtIDR(Math.abs(totalP - totalB)), styles: { fontStyle: 'bold', halign: 'right', fillColor: totalP - totalB >= 0 ? [220, 252, 231] : [254, 226, 226] } }],
  ];
  autoTable(doc, {
    startY: y,
    head: [['URAIAN', 'JUMLAH (Rp)']],
    body: lraRows,
    styles: { fontSize: 10 },
  });

  // 5. STOK
  doc.addPage('a4', 'landscape');
  y = addReportHeader('KARTU PERSEDIAAN BAHAN PANGAN', `Unduh: ${dateStr}`);
  const stokRows = stok.map((r, i) => [i + 1, r.itemName, r.unit, r.category, r.quantity]);
  autoTable(doc, {
    startY: y,
    head: [['No.', 'Nama Bahan', 'Satuan', 'Kategori', 'Stok Sistem']],
    body: stokRows,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [49, 46, 129] },
  });

  addTtdArea(doc, dapurName);
  doc.save(`Full_Laporan_SentraDapur_${dapurName}_${periode.replace(' ', '_')}.pdf`);
}

// ─── TTD Area ─────────────────────────────────────────────

function addTtdArea(doc: JsPDFInstance, dapurName: string) {
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  const y = pageH - 35;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Diketahui oleh,`, 14, y);
  doc.text('Admin Dapur,', pageW - 60, y);

  doc.line(14, y + 18, 55, y + 18);
  doc.line(pageW - 60, y + 18, pageW - 14, y + 18);

  doc.setFontSize(7);
  doc.text('Admin Pusat', 14, y + 22);
  doc.text(dapurName, pageW - 60, y + 22);
}
