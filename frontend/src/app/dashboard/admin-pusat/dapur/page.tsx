"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { dapurService, DapurUnit } from "@/services/dapur.service";
import { FiPlus, FiArrowRight } from "react-icons/fi";

export default function DapurUnitListPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [dapurList, setDapurList] = useState<DapurUnit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.user.role !== "ADMIN_PUSAT" && user?.user.role !== "PROJECT_OWNER") {
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Unit Dapur</h1>
          <p className="text-gray-500 mt-1">Daftar semua Unit Dapur yang dikelola</p>
        </div>
        <button
          onClick={() => router.push("/dashboard/admin-pusat/dapur/create")}
          className="flex items-center px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
        >
          <FiPlus className="mr-2" />
          Tambah Dapur
        </button>
      </div>

      {loading ? (
        <div className="p-6 text-center text-gray-500">Memuat data...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dapurList.map((dapur) => (
            <div key={dapur.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition">
              <div className="p-5 border-b border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-gray-900">{dapur.name}</h3>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                    {dapur.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{dapur.location || "Lokasi belum diatur"}</p>
              </div>
              <div className="p-5 bg-gray-50 rounded-b-xl flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{dapur.adminDapurId ? "Admin: Aktif" : "Belum ada Admin"}</span>
                </div>
                <button
                   className="text-amber-600 hover:text-amber-800 text-sm font-medium flex items-center"
                   onClick={() => router.push(`/dashboard/admin-pusat/dapur/${dapur.id}`)}
                >
                  Detail <FiArrowRight className="ml-1"/>
                </button>
              </div>
            </div>
          ))}
          {dapurList.length === 0 && (
            <div className="col-span-full text-center py-10 bg-white rounded-xl border border-gray-100 shadow-sm">
              <p className="text-gray-500">Anda belum memiliki Unit Dapur.</p>
              <button 
                onClick={() => router.push("/dashboard/admin-pusat/dapur/create")}
                className="mt-4 text-amber-600 font-medium hover:underline"
              >
                Buat satu sekarang
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
