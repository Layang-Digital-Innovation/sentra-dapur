import React, { useState, useEffect } from 'react';
import { 
  FiBriefcase, 
  FiClock, 
  FiCheckCircle, 
  FiBarChart2, 
  FiLoader, 
  FiTrello,
  FiShoppingBag,
  FiDollarSign
} from 'react-icons/fi';
import { microInvestmentService, Wallet, DividendLog } from '@/services/micro-investment.service';
import { toast } from 'react-hot-toast';

const MicroInvestorDashboard: React.FC = () => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [logs, setLogs] = useState<DividendLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [walletData, logsData] = await Promise.all([
        microInvestmentService.getWallet(),
        microInvestmentService.getDividendLogs()
      ]);
      setWallet(walletData);
      setLogs(logsData);
    } catch (err) {
      console.error('Error fetching micro investor data:', err);
      toast.error('Gagal memuat data portfolio');
    } finally {
      setLoading(false);
    }
  };

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <FiLoader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome & Saldo */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-950 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <h2 className="text-2xl font-bold flex items-center justify-center md:justify-start gap-2">
              <span className="p-2 bg-blue-500/20 rounded-lg">🚀</span> Selamat Datang, Partner!
            </h2>
            <p className="text-blue-200 mt-2">Portfolio Investasi Anda di Sentra Dapur</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10 text-center min-w-[280px]">
             <p className="text-xs text-blue-300 font-bold uppercase tracking-wider mb-1">Saldo Bagi Hasil Anda</p>
             <p className="text-4xl font-black">{formatIDR(wallet?.balance || 0)}</p>
          </div>
        </div>
        
        {/* Background blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-[80px] -mr-32 -mt-32 rounded-full" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-600/20 blur-[60px] -ml-24 -mb-24 rounded-full" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Statistics or Activity */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <FiBarChart2 className="text-blue-600" />
            Statistik Bagi Hasil
          </h3>
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
               <p className="text-xs text-blue-600 font-bold mb-1">Total Cair</p>
               <p className="text-xl font-bold text-blue-900">{logs.length} Kali</p>
             </div>
             <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
               <p className="text-xs text-emerald-600 font-bold mb-1">Rata-rata/Bulan</p>
               <p className="text-xl font-bold text-emerald-900">
                 {logs.length > 0 ? formatIDR(logs.reduce((a, b) => a + b.amount, 0) / logs.length) : 'Rp 0'}
               </p>
             </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <FiBriefcase className="text-indigo-600" />
            Informasi Keanggotaan
          </h3>
          <div className="space-y-3">
             <div className="flex items-center justify-between text-sm py-2 border-b border-gray-50">
                <span className="text-gray-500 font-medium">Status Akun</span>
                <span className="flex items-center gap-1.5 text-emerald-600 font-bold"><FiCheckCircle /> Aktif</span>
             </div>
             <div className="flex items-center justify-between text-sm py-2 border-b border-gray-50">
                <span className="text-gray-500 font-medium">Jenis Investor</span>
                <span className="text-gray-800 font-bold">Micro-Investor (Silo)</span>
             </div>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 leading-none">Riwayat Bagi Hasil</h3>
          <span className="text-xs font-bold text-blue-600 px-2 py-1 bg-blue-50 rounded">Real-time</span>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 sticky top-0 backdrop-blur-md">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Tipe</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Tanggal</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Penerimaan</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    Belum ada riwayat bagi hasil yang masuk.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                         <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                            <FiDollarSign />
                         </div>
                         <span className="text-sm font-bold text-gray-700">Profit Share</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                          <FiClock className="w-3.5 h-3.5" />
                          {new Date(log.createdAt).toLocaleDateString('id-ID', { dateStyle: 'long' })}
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className="text-emerald-600 font-black text-lg">+{formatIDR(log.amount)}</span>
                    </td>
                    <td className="px-6 py-4">
                       <button className="text-blue-600 text-xs font-bold hover:underline">Detail Transaksi</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MicroInvestorDashboard;
