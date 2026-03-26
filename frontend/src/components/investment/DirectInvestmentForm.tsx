'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Project } from '@/types/investment.types';
import investmentService from '@/services/investment.service';
import chatService from '@/services/chat.service';

interface DirectInvestmentFormProps {
  project: Project;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const DirectInvestmentForm: React.FC<DirectInvestmentFormProps> = ({
  project,
  onSuccess,
  onCancel
}) => {
  const { user } = useAuth();
  const router = useRouter();
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (value: string): string => {
    // Remove non-numeric characters
    const numericValue = value.replace(/[^\d]/g, '');
    
    // Format with thousand separators
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const parseAmount = (formattedAmount: string): number => {
    return parseInt(formattedAmount.replace(/\./g, '')) || 0;
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];
    const investmentAmount = parseAmount(amount);

    if (!amount.trim()) {
      newErrors.push('Jumlah investasi harus diisi');
    }

    const minInvestment = project.minInvestment || 1000000;
    if (investmentAmount < minInvestment) {
      newErrors.push(`Jumlah investasi minimal ${formatCurrency(minInvestment)}`);
    }

    const remainingAmount = (project.targetAmount || 0) - (project.totalInvestment || 0);
    if (investmentAmount > remainingAmount) {
      newErrors.push(`Jumlah investasi melebihi sisa target (${formatCurrency(remainingAmount)})`);
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatNumber(value);
    setAmount(formatted);
    setErrors([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Confirmation dialog
    const investmentAmount = parseAmount(amount);
    const confirmMessage = `Anda akan menginvestasikan ${formatCurrency(investmentAmount)} pada proyek "${project.title}".\n\nStatus investasi akan PENDING hingga disetujui admin.\n\nLanjutkan investasi?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(true);
      
      await investmentService.investInProject(project.id, {
        amount: investmentAmount
      });
      
      alert('✅ Investasi berhasil dibuat!\n\nStatus: PENDING (Menunggu persetujuan admin)\nAnda akan mendapat notifikasi setelah admin menyetujui investasi Anda.');
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error creating investment:', error);
      alert('❌ ' + (error.response?.data?.message || 'Gagal membuat investasi'));
    } finally {
      setLoading(false);
    }
  };

  const handleChatAboutInvestment = async () => {
    try {
      const title = `Consultation - ${project.title}`;
      const res = await chatService.startChat({ type: 'INVESTMENT_INQUIRY', projectId: project.id, title });
      const chatId = (res as any).id;
      if (chatId) {
        // initial context message
        const summary = `Konsultasi investasi untuk proyek ini\nProject: ${project.title}\nTarget: Rp ${(project.targetAmount||0).toLocaleString('id-ID')}\nSisa target: Rp ${(((project.targetAmount||0)-(project.totalInvestment||0))||0).toLocaleString('id-ID')}\nLink: /dashboard/investment/browse`;
        try { await chatService.postMessage(chatId, summary); } catch {}
        router.push(`/dashboard/investment-chat?chatId=${chatId}`);
      }
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Gagal memulai chat investasi');
    }
  };

  const remainingAmount = (project.targetAmount || 0) - (project.totalInvestment || 0);
  const progressPercentage = project.targetAmount ? ((project.totalInvestment || 0) / project.targetAmount) * 100 : 0;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Investasi Langsung</h2>
        <p className="text-gray-600">Berinvestasi langsung di proyek "{project.title}"</p>
      </div>

      {/* Project Info */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Informasi Proyek</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Target Dana</p>
            <p className="font-semibold text-gray-900">
              {formatCurrency(project.targetAmount || 0)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Dana Terkumpul</p>
            <p className="font-semibold text-gray-900">
              {formatCurrency(project.totalInvestment || 0)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Sisa Target</p>
            <p className="font-semibold text-green-600">
              {formatCurrency(remainingAmount)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Progress</p>
            <div className="flex items-center">
              <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {progressPercentage.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Bank Account Info */}
        {(project.financialDocs?.bankName || project.bankName) && (
          <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
            <h4 className="font-semibold text-green-900 mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Informasi Rekening Project Owner
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-3 border border-green-100 shadow-sm">
                <p className="text-xs text-green-600 font-medium mb-1">Nama Bank</p>
                <p className="font-semibold text-gray-900 text-sm">
                  {project.financialDocs?.bankName || project.bankName || '-'}
                </p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-green-100 shadow-sm">
                <p className="text-xs text-green-600 font-medium mb-1">Nomor Rekening</p>
                <p className="font-semibold text-gray-900 text-sm font-mono">
                  {project.financialDocs?.bankAccount || project.accountNumber || '-'}
                </p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-green-100 shadow-sm">
                <p className="text-xs text-green-600 font-medium mb-1">Atas Nama</p>
                <p className="font-semibold text-gray-900 text-sm">
                  {project.financialDocs?.accountHolder || project.accountHolder || '-'}
                </p>
              </div>
            </div>
            <div className="mt-3 p-2 bg-green-100 border-l-4 border-green-500 rounded-r-lg">
              <div className="flex items-start">
                <svg className="w-4 h-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-xs font-semibold text-green-800">💰 Rekening Tujuan Transfer</p>
                  <p className="text-xs text-green-700 mt-1">Transfer ke rekening ini setelah investasi disetujui admin dan deal dengan project owner.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Investment Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Investment Amount */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
            Jumlah Investasi
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black">
              Rp
            </span>
            <input
              type="text"
              id="amount"
              value={amount}
              onChange={handleAmountChange}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              placeholder="0"
              required
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Minimal investasi {formatCurrency(project.minInvestment || 1000000)}. Maksimal {formatCurrency(remainingAmount)}
          </p>
          {amount && (
            <p className="mt-1 text-sm font-medium text-blue-600">
              Jumlah: {formatCurrency(parseAmount(amount))}
            </p>
          )}
        </div>

        {/* Error Messages */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-red-800">Terdapat kesalahan:</h3>
                <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Investment Process Info */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-blue-900">Proses Investasi</h4>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
              <p className="text-sm text-blue-800 leading-relaxed">Masukkan jumlah investasi yang diinginkan</p>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
              <p className="text-sm text-blue-800 leading-relaxed">Klik "Buat Investasi" untuk membuat permintaan</p>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-amber-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
              <p className="text-sm text-blue-800 leading-relaxed">Status investasi akan menjadi <span className="font-semibold bg-amber-100 px-2 py-1 rounded text-amber-800">PENDING</span> dan menunggu persetujuan admin</p>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs font-bold">4</div>
              <p className="text-sm text-blue-800 leading-relaxed">Chat dengan Admin untuk mendiskusikan detail investasi proyek ini</p>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-bold">5</div>
              <div className="text-sm text-blue-800 leading-relaxed">
                <p className="mb-1">Setelah deal dengan Project Owner:</p>
                <ul className="ml-4 space-y-1 text-xs">
                  <li>• Transfer ke rekening Project Owner</li>
                  <li>• Kirim bukti transfer ke admin via chat</li>
                  <li>• Konfirmasi persetujuan untuk memproses investasi</li>
                </ul>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">6</div>
              <p className="text-sm text-blue-800 leading-relaxed">Admin akan meninjau dan menyetujui investasi</p>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">7</div>
              <p className="text-sm text-blue-800 leading-relaxed">Setelah disetujui, investasi menjadi <span className="font-semibold bg-green-100 px-2 py-1 rounded text-green-800">ACTIVE</span></p>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-teal-600 text-white rounded-full flex items-center justify-center text-xs font-bold">8</div>
              <p className="text-sm text-blue-800 leading-relaxed">Lihat riwayat investasi dan laporan dari Project Owner di dashboard</p>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-100 border-l-4 border-blue-500 rounded-r-lg">
            <div className="flex items-start">
              <svg className="w-4 h-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-xs font-semibold text-blue-800">Catatan Penting:</p>
                <p className="text-xs text-blue-700 mt-1">Investasi akan langsung dibuat dengan status PENDING dan menunggu persetujuan admin.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col space-y-6">
          {/* Primary Action - Investment */}
          <div className="space-y-2">
            <button
              type="submit"
              disabled={loading || !amount.trim() || parseAmount(amount) < (project.minInvestment || 1000000)}
              className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all duration-200 flex items-center justify-center"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Memproses Investasi...
                </div>
              ) : (
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  💰 Investasi Sekarang
                </div>
              )}
            </button>
            <div className="text-center">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Langsung investasi</span> • Status: PENDING hingga disetujui admin
              </p>
              <p className="text-xs text-gray-500 mt-1">
                ✅ Investasi akan dibuat langsung dengan jumlah yang Anda masukkan
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">atau</span>
            </div>
          </div>

          {/* Secondary Action - Consultation */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleChatAboutInvestment}
              className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              💬 Chat Admin Investment tentang proyek ini
            </button>
            <div className="text-center">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Konsultasi</span> • Diskusikan rincian proyek sebelum berinvestasi
              </p>
            </div>
          </div>
          
          {/* Secondary Actions */}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Batal
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default DirectInvestmentForm;