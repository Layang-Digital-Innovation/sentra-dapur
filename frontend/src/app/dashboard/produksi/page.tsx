"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { dapurService, DapurUnit } from "@/services/dapur.service";
import {
  FiPackage, FiCalendar, FiList, FiSettings, FiUsers,
  FiMenu, FiArrowRight, FiBook, FiClipboard
} from "react-icons/fi";
import Link from "next/link";

const menuCards = [
  {
    title: "Template Menu",
    desc: "Buat & atur menu beserta bahan bakunya",
    icon: FiBook,
    href: "/dashboard/admin-dapur/menu",
    color: "from-emerald-500 to-teal-500",
    bg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  {
    title: "Kalender Menu",
    desc: "Rencana menu harian selama 1 bulan",
    icon: FiCalendar,
    href: "/dashboard/admin-dapur/kalender",
    color: "from-blue-500 to-indigo-500",
    bg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    title: "Kalkulasi PO",
    desc: "Hitung kebutuhan bahan baku untuk PO",
    icon: FiClipboard,
    href: "/dashboard/admin-dapur/kalkulasi",
    color: "from-purple-500 to-violet-500",
    bg: "bg-purple-50",
    iconColor: "text-purple-600",
  },
  {
    title: "Stok Bahan Baku",
    desc: "Lihat & perbarui stok bahan baku dapur",
    icon: FiPackage,
    href: "/dashboard/admin-dapur/stok",
    color: "from-rose-500 to-pink-500",
    bg: "bg-rose-50",
    iconColor: "text-rose-600",
  },
];

export default function ProduksiDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [dapur, setDapur] = useState<DapurUnit | null>(null);
  const [loading, setLoading] = useState(true);
  const now = new Date();

  useEffect(() => {
    if (user?.user.role !== "PRODUKSI") {
      router.replace("/dashboard");
      return;
    }
    dapurService.getMyDapur()
      .then(data => setDapur(data?.[0] || null))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, router]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
    </div>
  );

  const monthName = now.toLocaleString("id-ID", { month: "long" });
  const year = now.getFullYear();

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-500 rounded-2xl p-8 relative overflow-hidden shadow-lg">
        <div className="relative z-10 text-white">
          <p className="text-amber-100 text-sm font-medium uppercase tracking-wide mb-1">Dashboard Produksi</p>
          <h1 className="text-3xl font-bold">
            Selamat Datang, {user?.user.fullName || user?.user.email?.split("@")[0]}!
          </h1>
          {dapur && (
            <p className="mt-2 text-amber-100">
              {dapur.name} — {dapur.location || "Lokasi belum diatur"}
            </p>
          )}
          <p className="mt-1 text-amber-200 text-sm">
            Bulan aktif: <span className="font-semibold text-white">{monthName} {year}</span>
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard/admin-dapur/kalender"
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-amber-700 font-semibold rounded-lg hover:bg-amber-50 shadow-sm transition-all"
            >
              <FiCalendar className="w-4 h-4" />
              Atur Kalender Menu
            </Link>
            <Link
              href="/dashboard/admin-dapur/kalkulasi"
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-800 text-white font-semibold rounded-lg hover:bg-amber-900 shadow-sm transition-all"
            >
              <FiClipboard className="w-4 h-4" />
              Kalkulasi PO
            </Link>
          </div>
        </div>
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white opacity-10" />
        <div className="absolute bottom-0 right-24 -mb-16 w-40 h-40 rounded-full bg-white opacity-5" />
      </div>

      {/* Menu Grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Menu Utama</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {menuCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md p-5 flex items-start gap-4 transition-all hover:-translate-y-0.5"
            >
              <div className={`p-3 rounded-xl ${card.bg} flex-shrink-0`}>
                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 group-hover:text-amber-600 transition-colors">
                  {card.title}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">{card.desc}</p>
              </div>
              <FiArrowRight className="w-4 h-4 text-gray-300 group-hover:text-amber-500 mt-1 flex-shrink-0 transition-colors" />
            </Link>
          ))}
        </div>
      </div>

      {/* Info stok singkat jika ada dapur */}
      {!dapur && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <FiPackage className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <h3 className="font-semibold text-amber-900">Belum Ada Unit Dapur</h3>
          <p className="text-amber-700 text-sm mt-1">
            Hubungi Admin Dapur Anda untuk mendapatkan akses ke unit dapur.
          </p>
        </div>
      )}
    </div>
  );
}
