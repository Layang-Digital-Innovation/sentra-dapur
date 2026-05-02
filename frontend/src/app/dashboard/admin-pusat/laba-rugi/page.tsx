"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { dapurService, DapurUnit } from "@/services/dapur.service";
import { FiCalendar, FiDollarSign, FiTrendingUp, FiTrendingDown, FiCheckCircle } from "react-icons/fi";

interface LabaRugiCalculation {
  dapurId: string;
  period: string;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  isPublished: boolean;
  publishedAt?: string;
}

export default function LabaRugiAdminPusatPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [dapurList, setDapurList] = useState<DapurUnit[]>([]);
  const [selectedDapurId, setSelectedDapurId] = useState("");
  
  // Default to previous month or current month? Current month makes sense for tutupan
  const today = new Date();
  const defaultPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [selectedPeriod, setSelectedPeriod] = useState(defaultPeriod);
  
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  
  const [calcResult, setCalcResult] = useState<LabaRugiCalculation | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (user?.user.role !== "ADMIN_PUSAT" && user?.user.role !== "SUPER_ADMIN") {
      router.replace("/dashboard");
      return;
    }
    
    const fetchDapur = async () => {
      setLoading(true);
      try {
        const data = await dapurService.getMyDapur();
        setDapurList(data);
        if (data.length > 0) {
          setSelectedDapurId(data[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDapur();
  }, [user, router]);

  const handleCalculate = async () => {
    if (!selectedDapurId || !selectedPeriod) return;
    
    setCalculating(true);
    setErrorMsg("");
    setCalcResult(null);
    
    try {
      const data = await dapurService.calculateLabaRugi(selectedDapurId, selectedPeriod);
      setCalcResult(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal mengkalkulasi laba rugi.");
    } finally {
      setCalculating(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedDapurId || !selectedPeriod) return;
    
    if (!window.confirm(`Tutup Buku dan Publish Laba Rugi periode ${selectedPeriod}? Data yang sudah dipublish tidak dapat diubah.`)) {
      return;
    }
    
    setPublishing(true);
    setErrorMsg("");
    
    try {
      await dapurService.publishLabaRugi(selectedDapurId, selectedPeriod);
      // Refresh calculation to show as published
      await handleCalculate();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal mem-publish laba rugi.");
    } finally {
      setPublishing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Memuat data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">Laporan Laba Rugi</h1>
        <p className="text-gray-500 mt-1">Kalkulasi dan tutup buku bulanan untuk masing-masing Unit Dapur</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1">Unit Dapur</label>
          <select
            value={selectedDapurId}
            onChange={(e) => setSelectedDapurId(e.target.value)}
            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition"
          >
            {dapurList.map(d => (
              <option key={d.id} value={d.id}>{d.name} {d.location ? `(${d.location})` : ""}</option>
            ))}
          </select>
        </div>
        
        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1">Periode Bulan</label>
          <div className="relative">
            <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="month"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition"
            />
          </div>
        </div>
        
        <button
          onClick={handleCalculate}
          disabled={calculating || !selectedDapurId || !selectedPeriod}
          className="w-full md:w-auto px-6 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 transition"
        >
          {calculating ? "Menghitung..." : "Kalkulasi"}
        </button>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-sm font-medium">
          {errorMsg}
        </div>
      )}

      {calcResult && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fadeIn">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
            <h2 className="text-lg font-bold text-gray-900">Hasil Kalkulasi: {calcResult.period}</h2>
            {calcResult.isPublished && (
              <span className="flex items-center text-green-700 bg-green-100 px-3 py-1 rounded-full text-sm font-semibold border border-green-200">
                <FiCheckCircle className="mr-1.5" /> Telah Dipublish
              </span>
            )}
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-100 relative overflow-hidden">
              <div className="absolute right-0 top-0 opacity-10 text-emerald-500 translate-x-4 -translate-y-4">
                <FiTrendingUp size={100} />
              </div>
              <p className="text-emerald-800 font-medium text-sm mb-1">Total Pemasukan</p>
              <h3 className="text-2xl font-bold text-emerald-900">{formatCurrency(calcResult.totalIncome)}</h3>
            </div>
            
            <div className="bg-rose-50 rounded-xl p-5 border border-rose-100 relative overflow-hidden">
              <div className="absolute right-0 top-0 opacity-10 text-rose-500 translate-x-4 -translate-y-4">
                <FiTrendingDown size={100} />
              </div>
              <p className="text-rose-800 font-medium text-sm mb-1">Total Pengeluaran</p>
              <h3 className="text-2xl font-bold text-rose-900">{formatCurrency(calcResult.totalExpense)}</h3>
            </div>
            
            <div className={`${calcResult.netProfit >= 0 ? 'bg-blue-50 border-blue-100 text-blue-900' : 'bg-red-50 border-red-100 text-red-900'} rounded-xl p-5 border relative overflow-hidden`}>
               <div className={`absolute right-0 top-0 opacity-10 ${calcResult.netProfit >= 0 ? 'text-blue-500' : 'text-red-500'} translate-x-4 -translate-y-4`}>
                <FiDollarSign size={100} />
              </div>
              <p className="font-medium text-sm mb-1">Laba Bersih</p>
              <h3 className="text-2xl font-bold">{formatCurrency(calcResult.netProfit)}</h3>
            </div>
          </div>
          
          {!calcResult.isPublished && (
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-col items-center justify-center text-center">
              <p className="text-gray-600 mb-4 max-w-lg">
                Pastikan seluruh transaksi arus kas pada periode ini telah diperiksa dan disetujui. Setelah ditutup buku, laporan akan tersedia untuk Investor.
              </p>
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="px-8 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 focus:ring-4 focus:ring-amber-200 transition shadow-sm disabled:opacity-50"
              >
                {publishing ? "Memproses..." : "Tutup Buku & Publish Laporan"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
