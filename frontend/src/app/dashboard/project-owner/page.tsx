"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { dapurService, DapurUnit } from "@/services/dapur.service";
import { FiUsers, FiFolder, FiDollarSign } from "react-icons/fi";

export default function ProjectOwnerDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [dapurList, setDapurList] = useState<DapurUnit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.user.role !== "PROJECT_OWNER") {
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

  let totalDapur = dapurList.length;
  let totalIn = 0;
  let totalOut = 0;

  dapurList.forEach((d) => {
    if (d.arusKas) {
      d.arusKas.forEach((a) => {
        if (a.type === "IN") totalIn += a.amount;
        if (a.type === "OUT") totalOut += a.amount;
      });
    }
  });

  const netProfit = totalIn - totalOut;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-gray-900 to-indigo-900 p-8 rounded-2xl shadow-lg text-white">
        <h1 className="text-3xl font-bold">Halo, Project Owner</h1>
        <p className="mt-2 text-gray-300">Pantau performa bisnis Sentra Dapur MBG Anda lintas Admin Pusat.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center cursor-pointer hover:shadow-md transition" onClick={() => router.push('/dashboard/project-owner/admin-pusat')}>
          <div className="p-3 rounded-lg bg-blue-100 text-blue-600 mr-4">
            <FiUsers className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Manejememen Admin Pusat</p>
            <h3 className="text-xl font-bold text-gray-900 text-amber-600 mt-1">Kelola Akses</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center cursor-pointer hover:shadow-md transition" onClick={() => router.push('/dashboard/project-owner/dapur')}>
          <div className="p-3 rounded-lg bg-slate-100 text-amber-600 mr-4">
            <FiFolder className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Portofolio Dapur</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{totalDapur}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center cursor-pointer hover:shadow-md transition" onClick={() => router.push('/dashboard/project-owner/dividen')}>
          <div className="p-3 rounded-lg bg-green-100 text-green-600 mr-4">
            <FiDollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Estimasi Laba Kotor</p>
            <h3 className="text-xl font-bold text-gray-900 mt-1">Rp {netProfit.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      <div className="mt-8 px-4 py-8 bg-white border border-gray-200 rounded-xl">
        <h3 className="text-lg font-bold text-gray-900 mb-4 px-2">Insight Ringkas</h3>
        <p className="text-gray-600 mb-4 px-2">Anda memiliki {dapurList.length} Dapur MBG yang saat ini beroperasi dengan total arus kas masuk sebesar Rp {totalIn.toLocaleString()}.</p>
        <button onClick={() => router.push('/dashboard/project-owner/dapur')} className="ml-2 px-4 py-2 border border-slate-900 text-amber-600 rounded hover:bg-slate-50">
           Lihat Detail Dapur
        </button>
      </div>
    </div>
  );
}