import React, { useState, useEffect } from 'react';
import { 
  FiUsers, 
  FiPlus, 
  FiPieChart, 
  FiDollarSign, 
  FiActivity, 
  FiTrash2, 
  FiCheckCircle, 
  FiXCircle,
  FiLoader,
  FiAlertCircle,
  FiUserPlus,
  FiSave,
  FiChevronDown
} from 'react-icons/fi';
import { microInvestmentService, MicroInvestor } from '@/services/micro-investment.service';
import { userService } from '@/services/user.service';
import { dapurService, DapurUnit } from '@/services/dapur.service';
import { User } from '@/types/user.types';
import { toast } from 'react-hot-toast';

const MicroInvestorManagement: React.FC = () => {
  const [micros, setMicros] = useState<MicroInvestor[]>([]);
  const [dapurs, setDapurs] = useState<DapurUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form state
  const [searchEmail, setSearchEmail] = useState('');
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [searchingUser, setSearchingUser] = useState(false);
  const [selectedDapurId, setSelectedDapurId] = useState('');
  const [sharePct, setSharePct] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [microsData, dapursData] = await Promise.all([
        microInvestmentService.getMyMicros(),
        dapurService.getMyDapur()
      ]);
      setMicros(microsData);
      setDapurs(dapursData);
      if (dapursData && dapursData.length > 0) {
        setSelectedDapurId(dapursData[0].id);
      }
    } catch (err) {
      console.error('Error fetching micro investors:', err);
      toast.error('Gagal memuat data micro investor');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchUser = async () => {
    if (!searchEmail) return;
    try {
      setSearchingUser(true);
      setFoundUser(null);
      const response = await userService.getAllUsers({ search: searchEmail, limit: 1 });
      if (response.users.length > 0) {
        setFoundUser(response.users[0]);
      } else {
        toast.error('User tidak ditemukan');
      }
    } catch (err) {
      toast.error('Gagal mencari user');
    } finally {
      setSearchingUser(false);
    }
  };

  const handleAddMicro = async () => {
    if (!foundUser || !selectedDapurId || sharePct <= 0) {
      toast.error('Lengkapi data terlebih dahulu');
      return;
    }

    try {
      setSubmitting(true);
      await microInvestmentService.setupMicroInvestor({
        userId: foundUser.id,
        dapurUnitId: selectedDapurId,
        internalSharePct: sharePct
      });
      toast.success('Micro-investor berhasil didaftarkan');
      setShowAddModal(false);
      setFoundUser(null);
      setSearchEmail('');
      setSharePct(0);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Gagal mendaftarkan micro-investor');
    } finally {
      setSubmitting(false);
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
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FiUsers className="text-blue-600" />
            Manajemen Private Micro-Investor
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Kelola pembagian jatah profit Anda ke investor lapis kedua secara privat.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition-all"
        >
          <FiUserPlus /> Daftarkan Member Baru
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-6 rounded-2xl text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-blue-100 text-sm font-medium">Total Member</p>
            <FiUsers className="text-white/40 w-8 h-8" />
          </div>
          <p className="text-3xl font-bold">{micros.length}</p>
          <p className="text-xs text-blue-100 mt-2">Member aktif di bawah portfolio Anda</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 rounded-2xl text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-emerald-100 text-sm font-medium">Total Terbagi</p>
            <FiPieChart className="text-white/40 w-8 h-8" />
          </div>
          <p className="text-3xl font-bold">
            {micros.reduce((acc, m) => acc + m.internalSharePct, 0).toFixed(1)}%
          </p>
          <p className="text-xs text-emerald-100 mt-2">Persentase dari total jatah Anda</p>
        </div>
        <div className="bg-white border p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-500 text-sm font-medium">Unit Dapur</p>
            <FiActivity className="text-blue-600/20 w-8 h-8" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{dapurs.length}</p>
          <p className="text-xs text-gray-400 mt-2">Dapur aktif tempat investasi Anda</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50">
          <h3 className="font-bold text-gray-900 leading-none">Daftar Micro-Investor</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Nama / Email</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Unit Dapur</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Jatah Internal (%)</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {micros.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    <FiAlertCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    Belum ada micro-investor yang terdaftar.
                  </td>
                </tr>
              ) : (
                micros.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-800">{m.user.fullname}</span>
                        <span className="text-xs text-gray-400">{m.user.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-600">{m.dapurUnit.name}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-sm font-bold border border-blue-100">
                        {m.internalSharePct}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {m.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                          <FiCheckCircle /> Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold">
                          <FiXCircle /> Non-aktif
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button className="text-gray-400 hover:text-red-500 p-2 transition-colors">
                         <FiTrash2 />
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 pb-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Setup Member Baru</h3>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FiXCircle className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Search User */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">Cari Member (Email)</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                      placeholder="contoh@pemenang.com"
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none"
                    />
                    <button
                      onClick={handleSearchUser}
                      disabled={searchingUser || !searchEmail}
                      className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 transition-all"
                    >
                      {searchingUser ? <FiLoader className="animate-spin" /> : 'Cari'}
                    </button>
                  </div>
                  {foundUser && (
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl animate-in slide-in-from-top-2">
                      <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold">
                        {foundUser.fullName ? foundUser.fullName[0].toUpperCase() : '?'}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-emerald-900">{foundUser.fullName}</p>
                        <p className="text-xs text-emerald-600">{foundUser.email}</p>
                      </div>
                      <FiCheckCircle className="text-emerald-500" />
                    </div>
                  )}
                </div>

                {/* Select Dapur */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">Pilih Unit Dapur</label>
                  <div className="relative">
                    <select
                      value={selectedDapurId}
                      onChange={(e) => setSelectedDapurId(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none bg-white text-gray-900 font-medium cursor-pointer"
                    >
                      <option value="" disabled>-- Pilih Unit Dapur --</option>
                      {dapurs.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <FiChevronDown />
                    </div>
                  </div>
                </div>

                {/* Share Percentage */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">Jatah Profit Internal (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={sharePct || ''}
                      onChange={(e) => setSharePct(parseFloat(e.target.value))}
                      placeholder="Contoh: 10.5"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">%</span>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-tight px-1 italic">
                    * Jatah ini adalah bagian dari total profit sharing yang Anda terima dari unit dapur ini.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8 bg-gray-50 border-t flex gap-4">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-4 text-gray-500 font-bold hover:bg-gray-200 rounded-2xl transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleAddMicro}
                disabled={submitting || !foundUser || sharePct <= 0}
                className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-200 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {submitting ? <FiLoader className="animate-spin" /> : <FiSave />} Simpan Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MicroInvestorManagement;
