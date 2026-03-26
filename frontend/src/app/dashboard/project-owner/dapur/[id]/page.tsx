"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { dapurService, DapurUnit } from "@/services/dapur.service";
import { userService } from "@/services/user.service";
import { User, Role } from "@/types/user.types";
import {
  FiArrowLeft, FiMapPin, FiUsers, FiDollarSign,
  FiTrendingUp, FiTrendingDown, FiUser, FiShoppingBag
} from "react-icons/fi";

export default function DapurDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const dapurId = params.id as string;

  const [dapur, setDapur] = useState<DapurUnit | null>(null);
  const [adminDapur, setAdminDapur] = useState<User | null>(null);
  const [adminPusat, setAdminPusat] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.user.role !== "PROJECT_OWNER") {
      router.replace("/dashboard");
      return;
    }

    const fetch = async () => {
      try {
        const list = await dapurService.getMyDapur();
        const found = list.find(d => d.id === dapurId);
        if (!found) {
          router.replace("/dashboard/project-owner/dapur");
          return;
        }
        setDapur(found);

        // Fetch admin details if assigned
        if (found.adminDapurId) {
          try {
            const ad = await userService.getUserById(found.adminDapurId);
            setAdminDapur(ad);
          } catch (_) {}
        }
        if (found.adminPusatId) {
          try {
            const ap = await userService.getUserById(found.adminPusatId);
            setAdminPusat(ap);
          } catch (_) {}
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user, router, dapurId]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
    </div>
  );

  if (!dapur) return null;

  const totalIn = dapur.arusKas?.filter((k: any) => k.type === "IN").reduce((a: number, b: any) => a + b.amount, 0) || 0;
  const totalOut = dapur.arusKas?.filter((k: any) => k.type === "OUT").reduce((a: number, b: any) => a + b.amount, 0) || 0;
  const netBalance = totalIn - totalOut;

  const statusColor: Record<string, string> = {
    APPROVED: "bg-green-100 text-green-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    ACTIVE: "bg-blue-100 text-blue-700",
    INACTIVE: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back + Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <button
          onClick={() => router.back()}
          className="flex items-center text-sm text-gray-500 hover:text-gray-800 mb-4 transition"
        >
          <FiArrowLeft className="mr-1.5 h-4 w-4" />
          Kembali ke Portofolio
        </button>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{dapur.name}</h1>
            {dapur.location && (
              <div className="flex items-center mt-1 text-gray-500 text-sm">
                <FiMapPin className="mr-1.5 h-4 w-4" />
                {dapur.location}
              </div>
            )}
          </div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${statusColor[dapur.status] || "bg-gray-100 text-gray-600"}`}>
            {dapur.status}
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-500">Saldo Bersih</p>
            <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
              <FiDollarSign className="h-4 w-4" />
            </div>
          </div>
          <h3 className={`text-xl font-bold ${netBalance >= 0 ? "text-gray-900" : "text-red-600"}`}>
            Rp {netBalance.toLocaleString("id-ID")}
          </h3>
        </div>
        <div className="bg-green-50 p-5 rounded-xl border border-green-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-green-700">Total Masuk</p>
            <div className="p-2 bg-green-100 rounded-lg text-green-700">
              <FiTrendingUp className="h-4 w-4" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-green-800">Rp {totalIn.toLocaleString("id-ID")}</h3>
        </div>
        <div className="bg-red-50 p-5 rounded-xl border border-red-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-red-700">Total Keluar</p>
            <div className="p-2 bg-red-100 rounded-lg text-red-700">
              <FiTrendingDown className="h-4 w-4" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-red-800">Rp {totalOut.toLocaleString("id-ID")}</h3>
        </div>
      </div>

      {/* Pengelola */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
            <FiUser className="h-4 w-4" /> Admin Pusat
          </h3>
          {adminPusat ? (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-900 to-slate-700 text-white flex items-center justify-center font-bold">
                {(adminPusat.fullName || adminPusat.email).charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{adminPusat.fullName || "—"}</p>
                <p className="text-sm text-gray-500">{adminPusat.email}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 italic text-sm">Belum ditugaskan</p>
          )}
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
            <FiUsers className="h-4 w-4" /> Admin Dapur (Lapangan)
          </h3>
          {adminDapur ? (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-600 to-amber-400 text-white flex items-center justify-center font-bold">
                {(adminDapur.fullName || adminDapur.email).charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{adminDapur.fullName || "—"}</p>
                <p className="text-sm text-gray-500">{adminDapur.email}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 italic text-sm">Belum ditugaskan</p>
          )}
        </div>
      </div>

      {/* Riwayat Arus Kas */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Riwayat Arus Kas</h2>
          <span className="text-xs text-gray-400">{dapur.arusKas?.length || 0} transaksi</span>
        </div>
        <div className="divide-y divide-gray-100">
          {dapur.arusKas && dapur.arusKas.length > 0 ? (
            dapur.arusKas.slice(0, 10).map((kas: any) => (
              <div key={kas.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${kas.type === "IN" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                    {kas.type === "IN" ? <FiTrendingUp className="h-4 w-4" /> : <FiTrendingDown className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{kas.description}</p>
                    <p className="text-xs text-gray-400">{new Date(kas.createdAt).toLocaleString("id-ID")}</p>
                  </div>
                </div>
                <span className={`font-bold text-sm ${kas.type === "IN" ? "text-green-600" : "text-red-600"}`}>
                  {kas.type === "IN" ? "+" : "-"} Rp {kas.amount.toLocaleString("id-ID")}
                </span>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-400 text-sm">Belum ada riwayat arus kas.</div>
          )}
        </div>
      </div>

      {/* Purchase Orders */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <FiShoppingBag className="h-4 w-4" /> Purchase Orders
          </h2>
          <span className="text-xs text-gray-400">{dapur.purchaseOrders?.length || 0} PO</span>
        </div>
        <div className="divide-y divide-gray-100">
          {dapur.purchaseOrders && dapur.purchaseOrders.length > 0 ? (
            dapur.purchaseOrders.slice(0, 5).map((po: any) => (
              <div key={po.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition">
                <div>
                  <p className="font-medium text-gray-900 text-sm">PO #{po.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-gray-400">{new Date(po.createdAt).toLocaleDateString("id-ID")}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  po.status === "APPROVED" ? "bg-green-100 text-green-700" :
                  po.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                  po.status === "REJECTED" ? "bg-red-100 text-red-700" :
                  "bg-gray-100 text-gray-600"
                }`}>
                  {po.status}
                </span>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-400 text-sm">Belum ada Purchase Order.</div>
          )}
        </div>
      </div>
    </div>
  );
}
