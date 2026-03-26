"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Report, ReportType, Project } from "@/types/investment.types";
import investmentService from "@/services/investment.service";
import { fileUploadService } from "@/services/fileUploadService";
import { FiFileText, FiRefreshCcw, FiSearch } from "react-icons/fi";

const typeLabel = (type: ReportType) => {
  switch (type) {
    case ReportType.INCOME_STATEMENT:
      return "Laporan Laba Rugi";
    case ReportType.BALANCE_SHEET:
      return "Neraca";
    case ReportType.CASH_FLOW:
      return "Arus Kas";
    case ReportType.BANK_STATEMENT:
      return "Rekening Koran";
    default:
      return String(type);
  }
};

const typeBadgeClass = (type: ReportType) => {
  switch (type) {
    case ReportType.INCOME_STATEMENT:
      return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
    case ReportType.BALANCE_SHEET:
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    case ReportType.CASH_FLOW:
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
    case ReportType.BANK_STATEMENT:
      return "bg-slate-50 text-slate-700 ring-1 ring-slate-200";
    default:
      return "bg-gray-50 text-gray-700 ring-1 ring-gray-200";
  }
};

const formatDateID = (dateInput: string | Date) => {
  try {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    return date.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return typeof dateInput === "string" ? dateInput : dateInput.toString();
  }
};

const InvestorReportsPage: React.FC = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("ALL");

  const loadReports = async () => {
    setLoading(true);
    setError(null);
    try {
      // Ambil portofolio investor yang berisi daftar investments & projects
      const portfolioResponse = await investmentService.getInvestorPortfolio();
      const projectMap = new Map<string, Project>();
      (portfolioResponse.investments || []).forEach((item: any) => {
        const pid = item.project?.id || item.investment?.projectId;
        if (pid && item.project) {
          projectMap.set(pid, item.project);
        }
      });

      const projectIds = Array.from(projectMap.keys());
      if (projectIds.length === 0) {
        setReports([]);
        setLoading(false);
        return;
      }

      // Ambil laporan untuk setiap project yang diinvestasikan
      const results = await Promise.all(
        projectIds.map(async (pid) => {
          try {
            const res = await fileUploadService.getFinancialReports(pid);
            return res.map((r: any) => ({
              id: r.id,
              type: (r.reportType ?? r.type) as ReportType,
              fileUrl: r.fileUrl ?? r.file?.url ?? "",
              projectId: r.projectId ?? pid,
              project: projectMap.get(pid),
              createdAt: new Date(r.uploadedAt ?? r.createdAt ?? Date.now()),
            }) as Report);
          } catch (e) {
            console.warn(`Gagal mengambil laporan untuk project ${pid}`, e);
            return [] as Report[];
          }
        })
      );

      const combined = results.flat();
      // Urutkan terbaru dulu
      combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setReports(combined);
    } catch (err: any) {
      console.error("Failed to load reports", err);
      setError(err?.message || "Gagal memuat laporan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const filteredReports = useMemo(() => {
    const s = search.trim().toLowerCase();
    return reports.filter((r) => {
      const matchesType = filterType === "ALL" || r.type === (filterType as ReportType);
      const projectName = r.project?.title || "";
      const matchesSearch =
        !s ||
        projectName.toLowerCase().includes(s) ||
        typeLabel(r.type).toLowerCase().includes(s);
      return matchesType && matchesSearch;
    });
  }, [reports, search, filterType]);

  const uniqueProjectsCount = useMemo(() => {
    const ids = new Set<string>();
    reports.forEach((r) => ids.add(r.projectId));
    return ids.size;
  }, [reports]);

  if (!user || user.user.role !== "INVESTOR") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Only investors can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, #fff 0, transparent 25%), radial-gradient(circle at 80% 30%, #fff 0, transparent 35%)" }} />
        <div className="relative p-6 sm:p-8">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 rounded-lg p-3 text-white">
              <FiFileText className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Financial Reports</h1>
              <p className="text-white/90">Lihat laporan yang telah diunggah oleh pemilik proyek</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-sm text-gray-500">Total Laporan</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{reports.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-sm text-gray-500">Jumlah Proyek</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{uniqueProjectsCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-sm text-gray-500">Jenis Laporan</p>
          <p className="mt-1 text-sm text-gray-900">Laba Rugi, Neraca, Arus Kas, Rekening Koran</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-sm text-gray-500">Terakhir Diperbarui</p>
          <p className="mt-1 text-sm text-gray-900">{formatDateID(new Date().toISOString())}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari berdasarkan nama proyek atau jenis laporan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
            >
              <option value="ALL">Semua Jenis</option>
              <option value={ReportType.INCOME_STATEMENT}>Laporan Laba Rugi</option>
              <option value={ReportType.BALANCE_SHEET}>Neraca</option>
              <option value={ReportType.CASH_FLOW}>Arus Kas</option>
              <option value={ReportType.BANK_STATEMENT}>Rekening Koran</option>
            </select>
            <button
              onClick={loadReports}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            >
              <FiRefreshCcw className="h-4 w-4" /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
          </div>
        ) : error ? (
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
              <p className="font-medium">Terjadi kesalahan</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <FiFileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">Tidak ada laporan</h3>
            <p className="mt-1 text-gray-600">Belum ada laporan yang diunggah oleh pemilik proyek atau pencarian Anda tidak menemukan hasil.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proyek</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jenis</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{report.project?.title || "Proyek"}</p>
                        <p className="text-xs text-gray-500">ID: {report.projectId}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${typeBadgeClass(report.type)}`}>
                        {typeLabel(report.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {formatDateID(report.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => fileUploadService.downloadFile(report.fileUrl, `${report.project?.title || 'report'}-${report.type}.pdf`)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                      >
                        <FiFileText className="h-4 w-4" /> Buka / Unduh
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvestorReportsPage;