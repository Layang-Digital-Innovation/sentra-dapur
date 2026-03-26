/**
 * Laporan Keuangan — Excel Generator
 * Menggunakan SheetJS (xlsx) untuk generate file Excel
 * sesuai format referensi Google Spreadsheet Keuangan Dapur SPPG
 */

import * as XLSX from 'xlsx';

// ─── Helper ──────────────────────────────────────────────

const IDR = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });

const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function getPeriodeLabel(month: number, year: number) {
  return `${BULAN[month - 1]} ${year}`;
}

function addKopSheet(ws: XLSX.WorkSheet, dapurName: string, reportTitle: string, periodeLabel: string, startRow: number = 0) {
  // KOP surat
  XLSX.utils.sheet_add_aoa(ws, [
    [`SPPG ${dapurName.toUpperCase()}`],
    [reportTitle],
    [`Periode: ${periodeLabel}`],
    [''],
  ], { origin: { r: startRow, c: 0 } });
  return startRow + 4;
}

function setColWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws['!cols'] = widths.map(w => ({ wch: w }));
}

function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}

// ─── BKU / BKK ──────────────────────────────────────────

export interface ArusKasRow {
  id: string;
  transactionDate: string;
  referenceNo?: string;
  description: string;
  type: 'IN' | 'OUT';
  amount: number;
  status?: string;
}

export function generateBKUExcel(
  data: ArusKasRow[],
  dapurName: string,
  bookType: 'UMUM' | 'PEMBANTU',
  month: number,
  year: number,
) {
  const wb = XLSX.utils.book_new();
  const sheetName = bookType === 'UMUM' ? 'BKU' : 'BKK';
  const title = bookType === 'UMUM' ? 'BUKU KAS UMUM' : 'BUKU KAS PEMBANTU (KAS KECIL)';
  const periode = getPeriodeLabel(month, year);

  const ws: XLSX.WorkSheet = {};

  // KOP
  const dataRows: any[][] = [
    [`SPPG ${dapurName.toUpperCase()}`],
    [title],
    [`Periode: ${periode}`],
    [],
    ['No.', 'Tanggal', 'No. Bukti', 'Uraian', 'Pemasukan (Rp)', 'Pengeluaran (Rp)', 'Saldo (Rp)'],
  ];

  let saldo = 0;
  let no = 1;
  const filtered = data.filter(d => {
    const dt = new Date(d.transactionDate);
    return dt.getMonth() + 1 === month && dt.getFullYear() === year;
  });

  for (const row of filtered) {
    const masuk = row.type === 'IN' ? row.amount : 0;
    const keluar = row.type === 'OUT' ? row.amount : 0;
    saldo += masuk - keluar;
    dataRows.push([
      no++,
      fmtDate(row.transactionDate),
      row.referenceNo || '-',
      row.description,
      masuk > 0 ? masuk : '',
      keluar > 0 ? keluar : '',
      saldo,
    ]);
  }

  const totalMasuk = filtered.filter(r => r.type === 'IN').reduce((s, r) => s + r.amount, 0);
  const totalKeluar = filtered.filter(r => r.type === 'OUT').reduce((s, r) => s + r.amount, 0);
  dataRows.push(['', '', '', 'TOTAL', totalMasuk, totalKeluar, saldo]);

  XLSX.utils.sheet_add_aoa(ws, dataRows, { origin: 'A1' });
  setColWidths(ws, [5, 14, 14, 35, 18, 18, 18]);

  // Merge KOP
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  downloadWorkbook(wb, `${sheetName}_${dapurName}_${periode.replace(' ', '_')}.xlsx`);
}

// ─── LBBP ───────────────────────────────────────────────

export interface LBBPRow {
  id: string;
  transactionDate: string;
  productName: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  total: number;
  supplierName?: string;
}

export function generateLBBPExcel(
  data: LBBPRow[],
  dapurName: string,
  month: number,
  year: number,
) {
  const wb = XLSX.utils.book_new();
  const periode = getPeriodeLabel(month, year);

  const dataRows: any[][] = [
    [`SPPG ${dapurName.toUpperCase()}`],
    ['LAPORAN BIAYA BAHAN PANGAN (LBBP)'],
    [`Periode: ${periode}`],
    [],
    ['No.', 'Tanggal', 'Nama Bahan', 'Volume', 'Satuan', 'Harga Satuan (Rp)', 'Total (Rp)', 'Penyuplai'],
  ];

  const filtered = data.filter(d => {
    const dt = new Date(d.transactionDate);
    return dt.getMonth() + 1 === month && dt.getFullYear() === year;
  });

  let no = 1;
  for (const row of filtered) {
    dataRows.push([
      no++,
      fmtDate(row.transactionDate),
      row.productName,
      row.quantity,
      row.unit || 'kg',
      row.pricePerUnit,
      row.total,
      row.supplierName || '-',
    ]);
  }

  const grandTotal = filtered.reduce((s, r) => s + r.total, 0);
  dataRows.push(['', '', '', '', '', 'TOTAL', grandTotal, '']);

  const ws: XLSX.WorkSheet = {};
  XLSX.utils.sheet_add_aoa(ws, dataRows, { origin: 'A1' });
  setColWidths(ws, [5, 14, 25, 10, 10, 18, 18, 20]);
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'LBBP');
  downloadWorkbook(wb, `LBBP_${dapurName}_${periode.replace(' ', '_')}.xlsx`);
}

// ─── LBO / LBS ──────────────────────────────────────────

export function generateLBOExcel(
  data: ArusKasRow[],
  dapurName: string,
  reportType: 'LBO' | 'LBS',
  month: number,
  year: number,
) {
  const wb = XLSX.utils.book_new();
  const periode = getPeriodeLabel(month, year);
  const title = reportType === 'LBO' ? 'LAPORAN BIAYA OPERASIONAL (LBO)' : 'LAPORAN BIAYA SEWA (LBS)';

  const dataRows: any[][] = [
    [`SPPG ${dapurName.toUpperCase()}`],
    [title],
    [`Periode: ${periode}`],
    [],
    ['No.', 'Tanggal', 'Uraian', 'Nominal (Rp)', 'Keterangan'],
  ];

  const filtered = data.filter(d => {
    const dt = new Date(d.transactionDate);
    return dt.getMonth() + 1 === month && dt.getFullYear() === year && d.type === 'OUT';
  });

  let no = 1;
  for (const row of filtered) {
    dataRows.push([no++, fmtDate(row.transactionDate), row.description, row.amount, '']);
  }

  const total = filtered.reduce((s, r) => s + r.amount, 0);
  dataRows.push(['', '', 'TOTAL', total, '']);

  const ws: XLSX.WorkSheet = {};
  XLSX.utils.sheet_add_aoa(ws, dataRows, { origin: 'A1' });
  setColWidths(ws, [5, 14, 35, 18, 20]);
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, reportType);
  downloadWorkbook(wb, `${reportType}_${dapurName}_${periode.replace(' ', '_')}.xlsx`);
}

// ─── LRA ────────────────────────────────────────────────

export interface LRAData {
  pendapatan: { label: string; amount: number }[];
  belanja: { label: string; amount: number }[];
}

export function generateLRAExcel(
  lra: LRAData,
  dapurName: string,
  month: number,
  year: number,
) {
  const wb = XLSX.utils.book_new();
  const periode = getPeriodeLabel(month, year);

  const totalPendapatan = lra.pendapatan.reduce((s, r) => s + r.amount, 0);
  const totalBelanja = lra.belanja.reduce((s, r) => s + r.amount, 0);
  const surplus = totalPendapatan - totalBelanja;

  const dataRows: any[][] = [
    [`SPPG ${dapurName.toUpperCase()}`],
    ['LAPORAN REALISASI ANGGARAN (LRA)'],
    [`Periode: ${periode}`],
    [],
    ['URAIAN', 'JUMLAH (Rp)'],
    ['A. PENDAPATAN', ''],
    ...lra.pendapatan.map(p => [`  ${p.label}`, p.amount]),
    ['  TOTAL PENDAPATAN', totalPendapatan],
    [],
    ['B. BELANJA', ''],
    ...lra.belanja.map(b => [`  ${b.label}`, b.amount]),
    ['  TOTAL BELANJA', totalBelanja],
    [],
    [surplus >= 0 ? 'SURPLUS' : 'DEFISIT', surplus],
  ];

  const ws: XLSX.WorkSheet = {};
  XLSX.utils.sheet_add_aoa(ws, dataRows, { origin: 'A1' });
  setColWidths(ws, [40, 20]);
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'LRA');
  downloadWorkbook(wb, `LRA_${dapurName}_${periode.replace(' ', '_')}.xlsx`);
}

// ─── LPD2M ──────────────────────────────────────────────

export interface LPD2MRow {
  bulan: string;
  saldoAwal: number;
  penerimaan: number;
  bahanPangan: number;
  operasional: number;
  sewa: number;
  totalPengeluaran: number;
  saldoAkhir: number;
}

export function generateLPD2MExcel(
  data: LPD2MRow[],
  dapurName: string,
  year: number,
) {
  const wb = XLSX.utils.book_new();

  const dataRows: any[][] = [
    [`SPPG ${dapurName.toUpperCase()}`],
    ['REKAPITULASI BULANAN (LPD2M)'],
    [`Tahun: ${year}`],
    [],
    ['No.', 'Bulan', 'Saldo Awal', 'Penerimaan Dana', 'Pengeluaran - Bahan Pangan', 'Pengeluaran - Operasional', 'Pengeluaran - Sewa', 'TOTAL Pengeluaran', 'Saldo Akhir'],
  ];

  data.forEach((row, i) => {
    dataRows.push([
      i + 1,
      row.bulan,
      row.saldoAwal,
      row.penerimaan,
      row.bahanPangan,
      row.operasional,
      row.sewa,
      row.totalPengeluaran,
      row.saldoAkhir,
    ]);
  });

  const totals = data.reduce((acc, r) => ({
    saldoAwal: 0,
    penerimaan: acc.penerimaan + r.penerimaan,
    bahanPangan: acc.bahanPangan + r.bahanPangan,
    operasional: acc.operasional + r.operasional,
    sewa: acc.sewa + r.sewa,
    totalPengeluaran: acc.totalPengeluaran + r.totalPengeluaran,
    saldoAkhir: 0,
  }), { saldoAwal: 0, penerimaan: 0, bahanPangan: 0, operasional: 0, sewa: 0, totalPengeluaran: 0, saldoAkhir: 0 });

  dataRows.push(['', 'TOTAL', '', totals.penerimaan, totals.bahanPangan, totals.operasional, totals.sewa, totals.totalPengeluaran, '']);

  const ws: XLSX.WorkSheet = {};
  XLSX.utils.sheet_add_aoa(ws, dataRows, { origin: 'A1' });
  setColWidths(ws, [5, 14, 16, 16, 22, 20, 16, 18, 16]);
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'LPD2M');
  downloadWorkbook(wb, `LPD2M_${dapurName}_${year}.xlsx`);
}

// ─── FULL WORKBOOK (all sheets) ──────────────────────────

export function generateFullLaporanExcel(params: {
  dapurName: string;
  month: number;
  year: number;
  bku: ArusKasRow[];
  bkk: ArusKasRow[];
  lbbp: LBBPRow[];
  lbo: ArusKasRow[];
  lbs: ArusKasRow[];
  lra: LRAData;
  lpd2m: LPD2MRow[];
  stok: any[];
}) {
  const { dapurName, month, year, bku, bkk, lbbp, lbo, lbs, lra, lpd2m, stok } = params;
  const wb = XLSX.utils.book_new();
  const periode = getPeriodeLabel(month, year);

  function makeKasSheet(data: ArusKasRow[], bookType: 'UMUM' | 'PEMBANTU') {
    const rows: any[][] = [
      [`SPPG ${dapurName.toUpperCase()}`],
      [bookType === 'UMUM' ? 'BUKU KAS UMUM' : 'BUKU KAS PEMBANTU (KAS KECIL)'],
      [`Periode: ${periode}`],
      [],
      ['No.', 'Tanggal', 'No. Bukti', 'Uraian', 'Pemasukan (Rp)', 'Pengeluaran (Rp)', 'Saldo (Rp)'],
    ];
    const filtered = data.filter(d => {
      const dt = new Date(d.transactionDate);
      return dt.getMonth() + 1 === month && dt.getFullYear() === year;
    });
    let saldo = 0, no = 1;
    for (const row of filtered) {
      const masuk = row.type === 'IN' ? row.amount : 0;
      const keluar = row.type === 'OUT' ? row.amount : 0;
      saldo += masuk - keluar;
      rows.push([no++, fmtDate(row.transactionDate), row.referenceNo || '-', row.description, masuk || '', keluar || '', saldo]);
    }
    const totalIn = filtered.filter(r => r.type === 'IN').reduce((s, r) => s + r.amount, 0);
    const totalOut = filtered.filter(r => r.type === 'OUT').reduce((s, r) => s + r.amount, 0);
    rows.push(['', '', '', 'TOTAL', totalIn, totalOut, saldo]);
    const ws: XLSX.WorkSheet = {};
    XLSX.utils.sheet_add_aoa(ws, rows, { origin: 'A1' });
    setColWidths(ws, [5, 14, 14, 35, 18, 18, 18]);
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } },
    ];
    return ws;
  }

  XLSX.utils.book_append_sheet(wb, makeKasSheet(bku, 'UMUM'), 'BKU');
  XLSX.utils.book_append_sheet(wb, makeKasSheet(bkk, 'PEMBANTU'), 'BKK');

  // LBBP
  const lbbpFiltered = lbbp.filter(d => {
    const dt = new Date(d.transactionDate);
    return dt.getMonth() + 1 === month && dt.getFullYear() === year;
  });
  const lbbpRows: any[][] = [
    [`SPPG ${dapurName.toUpperCase()}`],
    ['LAPORAN BIAYA BAHAN PANGAN (LBBP)'],
    [`Periode: ${periode}`],
    [],
    ['No.', 'Tanggal', 'Nama Bahan', 'Volume', 'Satuan', 'Harga Satuan (Rp)', 'Total (Rp)', 'Penyuplai'],
  ];
  lbbpFiltered.forEach((r, i) => lbbpRows.push([i + 1, fmtDate(r.transactionDate), r.productName, r.quantity, r.unit || 'kg', r.pricePerUnit, r.total, r.supplierName || '-']));
  lbbpRows.push(['', '', '', '', '', 'TOTAL', lbbpFiltered.reduce((s, r) => s + r.total, 0), '']);
  const wsLBBP: XLSX.WorkSheet = {};
  XLSX.utils.sheet_add_aoa(wsLBBP, lbbpRows, { origin: 'A1' });
  setColWidths(wsLBBP, [5, 14, 25, 10, 10, 18, 18, 20]);
  wsLBBP['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }, { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } }];
  XLSX.utils.book_append_sheet(wb, wsLBBP, 'LBBP');

  // LBO
  const lboFiltered = lbo.filter(d => { const dt = new Date(d.transactionDate); return dt.getMonth() + 1 === month && dt.getFullYear() === year && d.type === 'OUT'; });
  const lboRows: any[][] = [`SPPG ${dapurName.toUpperCase()}`, 'LAPORAN BIAYA OPERASIONAL (LBO)', `Periode: ${periode}`, [], ['No.', 'Tanggal', 'Uraian', 'Nominal (Rp)', 'Keterangan']].map(r => Array.isArray(r) ? r : [r]);
  lboFiltered.forEach((r, i) => lboRows.push([i + 1, fmtDate(r.transactionDate), r.description, r.amount, '']));
  lboRows.push(['', '', 'TOTAL', lboFiltered.reduce((s, r) => s + r.amount, 0), '']);
  const wsLBO: XLSX.WorkSheet = {};
  XLSX.utils.sheet_add_aoa(wsLBO, lboRows, { origin: 'A1' });
  setColWidths(wsLBO, [5, 14, 35, 18, 20]);
  wsLBO['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }, { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } }];
  XLSX.utils.book_append_sheet(wb, wsLBO, 'LBO');

  // LBS
  const lbsFiltered = lbs.filter(d => { const dt = new Date(d.transactionDate); return dt.getMonth() + 1 === month && dt.getFullYear() === year && d.type === 'OUT'; });
  const lbsRows: any[][] = [`SPPG ${dapurName.toUpperCase()}`, 'LAPORAN BIAYA SEWA (LBS)', `Periode: ${periode}`, [], ['No.', 'Tanggal', 'Uraian', 'Nominal (Rp)', 'Keterangan']].map(r => Array.isArray(r) ? r : [r]);
  lbsFiltered.forEach((r, i) => lbsRows.push([i + 1, fmtDate(r.transactionDate), r.description, r.amount, '']));
  lbsRows.push(['', '', 'TOTAL', lbsFiltered.reduce((s, r) => s + r.amount, 0), '']);
  const wsLBS: XLSX.WorkSheet = {};
  XLSX.utils.sheet_add_aoa(wsLBS, lbsRows, { origin: 'A1' });
  setColWidths(wsLBS, [5, 14, 35, 18, 20]);
  wsLBS['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }, { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } }];
  XLSX.utils.book_append_sheet(wb, wsLBS, 'LBS');

  // LRA
  const totalPendapatan = lra.pendapatan.reduce((s, r) => s + r.amount, 0);
  const totalBelanja = lra.belanja.reduce((s, r) => s + r.amount, 0);
  const surplus = totalPendapatan - totalBelanja;
  const lraRows: any[][] = [
    [`SPPG ${dapurName.toUpperCase()}`], ['LAPORAN REALISASI ANGGARAN (LRA)'], [`Periode: ${periode}`], [],
    ['URAIAN', 'JUMLAH (Rp)'], ['A. PENDAPATAN', ''],
    ...lra.pendapatan.map(p => [`  ${p.label}`, p.amount]),
    ['  TOTAL PENDAPATAN', totalPendapatan], [],
    ['B. BELANJA', ''],
    ...lra.belanja.map(b => [`  ${b.label}`, b.amount]),
    ['  TOTAL BELANJA', totalBelanja], [],
    [surplus >= 0 ? 'SURPLUS' : 'DEFISIT', surplus],
  ];
  const wsLRA: XLSX.WorkSheet = {};
  XLSX.utils.sheet_add_aoa(wsLRA, lraRows, { origin: 'A1' });
  setColWidths(wsLRA, [40, 20]);
  wsLRA['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }, { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } }];
  XLSX.utils.book_append_sheet(wb, wsLRA, 'LRA');

  // LPD2M
  const lpd2mRows: any[][] = [
    [`SPPG ${dapurName.toUpperCase()}`], ['REKAPITULASI BULANAN (LPD2M)'], [`Tahun: ${year}`], [],
    ['No.', 'Bulan', 'Saldo Awal', 'Penerimaan Dana', 'Bahan Pangan', 'Operasional', 'Sewa', 'TOTAL Pengeluaran', 'Saldo Akhir'],
  ];
  lpd2m.forEach((r, i) => lpd2mRows.push([i + 1, r.bulan, r.saldoAwal, r.penerimaan, r.bahanPangan, r.operasional, r.sewa, r.totalPengeluaran, r.saldoAkhir]));
  const wsLPD2M: XLSX.WorkSheet = {};
  XLSX.utils.sheet_add_aoa(wsLPD2M, lpd2mRows, { origin: 'A1' });
  setColWidths(wsLPD2M, [5, 14, 16, 16, 22, 20, 16, 18, 16]);
  wsLPD2M['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }, { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } }];
  XLSX.utils.book_append_sheet(wb, wsLPD2M, 'LPD2M');

  // KARTU STOK
  const kartuStokRows: any[][] = [
    [`SPPG ${dapurName.toUpperCase()}`], ['KARTU PERSEDIAAN BAHAN PANGAN'], [`Tanggal Unduh: ${new Date().toLocaleDateString('id-ID')}`], [],
    ['No.', 'Nama Bahan', 'Satuan', 'Kategori', 'Stok Sistem Saat Ini'],
  ];
  stok.forEach((row, i) => kartuStokRows.push([i + 1, row.itemName, row.unit, row.category, row.quantity]));
  const wsKartu: XLSX.WorkSheet = {};
  XLSX.utils.sheet_add_aoa(wsKartu, kartuStokRows, { origin: 'A1' });
  setColWidths(wsKartu, [5, 30, 15, 15, 20]);
  wsKartu['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }, { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } }];
  XLSX.utils.book_append_sheet(wb, wsKartu, 'Kartu Stok');

  // OPNAME
  const opnameRows: any[][] = [
    [`SPPG ${dapurName.toUpperCase()}`], ['BERITA ACARA STOK OPNAME'], [`Tanggal Unduh: ${new Date().toLocaleDateString('id-ID')}`], [],
    ['No.', 'Nama Bahan', 'Satuan', 'Stok Sistem', 'Stok Fisik', 'Selisih', 'Keterangan'],
  ];
  stok.forEach((row, i) => opnameRows.push([i + 1, row.itemName, row.unit, row.quantity, '', '', '']));
  const wsOpname: XLSX.WorkSheet = {};
  XLSX.utils.sheet_add_aoa(wsOpname, opnameRows, { origin: 'A1' });
  setColWidths(wsOpname, [5, 30, 15, 15, 15, 15, 25]);
  wsOpname['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }, { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } }];
  XLSX.utils.book_append_sheet(wb, wsOpname, 'Stok Opname');

  downloadWorkbook(wb, `Full_Laporan_SentraDapur_${dapurName}_${periode.replace(' ', '_')}.xlsx`);
}

// ─── KARTU STOK ─────────────────────────────────────────

export function generateKartuStokExcel(data: any[], dapurName: string) {
  const wb = XLSX.utils.book_new();
  const dateStr = new Date().toLocaleDateString('id-ID');
  
  const dataRows: any[][] = [
    [`SPPG ${dapurName.toUpperCase()}`],
    ['KARTU PERSEDIAAN BAHAN PANGAN'],
    [`Tanggal Unduh: ${dateStr}`],
    [],
    ['No.', 'Nama Bahan', 'Satuan', 'Kategori', 'Stok Sistem Saat Ini'],
  ];

  data.forEach((row, i) => {
    dataRows.push([i + 1, row.itemName, row.unit, row.category, row.quantity]);
  });

  const ws: XLSX.WorkSheet = {};
  XLSX.utils.sheet_add_aoa(ws, dataRows, { origin: 'A1' });
  setColWidths(ws, [5, 30, 15, 15, 20]);
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Kartu_Stok');
  downloadWorkbook(wb, `Kartu_Stok_${dapurName}.xlsx`);
}

// ─── STOK OPNAME ─────────────────────────────────────────

export function generateStokOpnameExcel(data: any[], dapurName: string) {
  const wb = XLSX.utils.book_new();
  const dateStr = new Date().toLocaleDateString('id-ID');
  
  const dataRows: any[][] = [
    [`SPPG ${dapurName.toUpperCase()}`],
    ['BERITA ACARA STOK OPNAME'],
    [`Tanggal Unduh: ${dateStr}`],
    [],
    ['No.', 'Nama Bahan', 'Satuan', 'Stok Sistem', 'Stok Fisik', 'Selisih', 'Keterangan'],
  ];

  data.forEach((row, i) => {
    dataRows.push([i + 1, row.itemName, row.unit, row.quantity, '', '', '']);
  });

  const ws: XLSX.WorkSheet = {};
  XLSX.utils.sheet_add_aoa(ws, dataRows, { origin: 'A1' });
  setColWidths(ws, [5, 30, 15, 15, 15, 15, 25]);
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Stok_Opname');
  downloadWorkbook(wb, `Stok_Opname_${dapurName}.xlsx`);
}
