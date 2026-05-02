"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { dapurService, DapurUnit } from "@/services/dapur.service";
import { FiDollarSign, FiPackage, FiShoppingBag, FiPlus } from "react-icons/fi";

export default function AdminDapurDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [dapurList, setDapurList] = useState<DapurUnit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const allowedRoles = ["ADMIN_DAPUR", "AKUNTAN", "PROJECT_OWNER"];
    if (!allowedRoles.includes(user?.user.role || "")) {
      router.replace("/dashboard");
      return;
    }

    const fetchDapur = async () => {
      try {
        const data = await dapurService.getMyDapur();
        setDapurList(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDapur();
  }, [user, router]);

  if (loading) return <div className="p-6">Loading data...</div>;

  // Assume Admin Dapur usually handles 1 kitchen, but may handle multiple. We just aggregate here.
  let myDapur = dapurList[0]; // Active Dapur
  
  if (!myDapur) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Belum Ada Unit Dapur</h2>
          <p className="text-gray-500">Anda belum ditugaskan ke Unit Dapur manapun oleh Admin Pusat.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-700 to-indigo-800 p-8 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="relative z-10 text-white">
          <h1 className="text-3xl font-bold">{myDapur.name}</h1>
          <p className="mt-2 text-purple-100 opacity-90">{myDapur.location || "Lokasi Belum Diatur"}</p>
          <div className="mt-6 flex gap-4">
            <button
               onClick={() => router.push("/dashboard/admin-dapur/arus-kas")}
              className="px-5 py-2.5 bg-white text-amber-700 font-medium rounded-lg hover:bg-gray-50 flex items-center shadow-sm"
            >
              <FiPlus className="mr-2" />
              Lapor Kas
            </button>
            <button
              onClick={() => router.push("/dashboard/admin-dapur/po")}
              className="px-5 py-2.5 bg-slate-900 border border-slate-800 text-white font-medium rounded-lg hover:bg-slate-500 flex items-center shadow-sm"
            >
              <FiShoppingBag className="mr-2" />
              Request PO
            </button>
          </div>
        </div>
        {/* Decorative background shapes */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white opacity-10"></div>
        <div className="absolute bottom-0 right-20 -mb-16 w-32 h-32 rounded-full bg-white opacity-5"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Arus Kas Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-gray-900 flex items-center">
              <span className="bg-green-100 text-green-600 p-2 rounded-lg mr-3">
                <FiDollarSign />
              </span>
              Arus Kas Terbaru
            </h3>
            <button onClick={() => router.push('/dashboard/admin-dapur/arus-kas')} className="text-sm font-medium text-amber-600 hover:text-amber-700">Lihat Semua</button>
          </div>
          <div className="space-y-4">
             {myDapur.arusKas && myDapur.arusKas.length > 0 ? (
               myDapur.arusKas.slice(0, 3).map((kas: any) => (
                 <div key={kas.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-100 transition-all">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{kas.description}</p>
                      <p className="text-xs text-gray-400">{new Date(kas.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`font-semibold ${kas.type === 'IN' ? 'text-green-600' : 'text-red-500'}`}>
                      {kas.type === 'IN' ? '+' : '-'} Rp {kas.amount.toLocaleString()}
                    </span>
                 </div>
               ))
             ) : (
               <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded text-center">Belum ada transaksi</p>
             )}
          </div>
        </div>

        {/* Purchase Orders pending Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-gray-900 flex items-center">
              <span className="bg-blue-100 text-blue-600 p-2 rounded-lg mr-3">
                <FiPackage />
              </span>
              Status Purchase Order (PO)
            </h3>
            <button onClick={() => router.push('/dashboard/admin-dapur/po')} className="text-sm font-medium text-amber-600 hover:text-amber-700">Manajemen PO</button>
          </div>
           <div className="space-y-4">
             {myDapur.purchaseOrders && myDapur.purchaseOrders.length > 0 ? (
               myDapur.purchaseOrders.slice(0, 3).map((po: any) => (
                 <div key={po.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-100 transition-all">
                   <div>
                     <p className="text-sm font-medium text-gray-900">Order #{po.id.substring(0,6)}</p>
                     <p className="text-xs text-gray-400">{new Date(po.createdAt).toLocaleDateString()}</p>
                   </div>
                   <span className={`px-2 py-1 text-xs font-semibold rounded-full ${po.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : po.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {po.status}
                   </span>
                 </div>
               ))
             ) : (
               <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded text-center">Tidak ada PO yang aktif</p>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
