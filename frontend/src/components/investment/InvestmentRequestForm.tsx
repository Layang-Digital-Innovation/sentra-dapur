'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Project } from '@/types/investment.types';
import investmentService from '@/services/investment.service';
// Hapus import chat sementara fitur chat disembunyikan
// Removed: import { chatService } from '@/services/chat.service';
// Removed: import { ChatType, MessageType } from '@/types/chat.types';

interface InvestmentRequestFormProps {
  project: Project;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const InvestmentRequestForm: React.FC<InvestmentRequestFormProps> = ({
  project,
  onSuccess,
  onCancel
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    projectId: project.id,
    chatId: '' // Will be set when chat is created
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [interestMessage, setInterestMessage] = useState('');

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!interestMessage.trim()) {
      newErrors.push('Pesan minat investasi harus diisi');
    }

    if (interestMessage.trim().length < 10) {
      newErrors.push('Pesan minat investasi minimal 10 karakter');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      // Fitur chat disembunyikan sementara: langsung kirim request investasi tanpa membuat chat
      await investmentService.requestInvestment({
        projectId: project.id,
        chatId: ''
      });
      
      alert('Minat investasi berhasil dikirim! Fitur chat sedang disembunyikan sementara. Admin akan menghubungi Anda melalui kanal lain.');
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error submitting investment interest:', error);
      alert(error.response?.data?.message || 'Gagal mengirim minat investasi');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Minat Investasi</h2>
        <p className="text-gray-600">Tunjukkan minat investasi untuk proyek "{project.title}"</p>
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
              {formatCurrency((project.targetAmount || 0) - (project.totalInvestment || 0))}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Progress</p>
            <div className="flex items-center">
              <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ 
                width: `${project.targetAmount ? ((project.totalInvestment || 0) / project.targetAmount) * 100 : 0}%`
              }}
                ></div>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {project.targetAmount ? (((project.totalInvestment || 0) / project.targetAmount) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Bank Account Info */}
        {project.financialDocs?.bankName && project.financialDocs?.bankAccount && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-2">Informasi Rekening</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Bank</p>
                <p className="font-medium">{project.financialDocs.bankName}</p>
              </div>
              <div>
                <p className="text-gray-600">No. Rekening</p>
                <p className="font-medium">{project.financialDocs.bankAccount}</p>
              </div>
              <div>
                <p className="text-gray-600">Atas Nama</p>
                <p className="font-medium">{project.financialDocs.accountHolder}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Investment Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Interest Message */}
        <div>
          <label htmlFor="interestMessage" className="block text-sm font-medium text-gray-700 mb-2">
            Pesan Minat Investasi
          </label>
          <textarea
            id="interestMessage"
            value={interestMessage}
            onChange={(e) => {
              setInterestMessage(e.target.value);
              setErrors([]);
            }}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Jelaskan minat dan alasan Anda ingin berinvestasi di proyek ini..."
            rows={4}
            required
          />
          <p className="mt-1 text-sm text-gray-500">
            Ceritakan mengapa Anda tertarik dengan proyek ini dan berapa estimasi investasi yang ingin Anda lakukan.
          </p>
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Proses Investasi Baru</h4>
          <ol className="text-sm text-blue-800 space-y-1">
            <li>1. Kirim minat investasi dengan pesan</li>
            <li>2. Admin akan menghubungi Anda melalui chat</li>
            <li>3. Diskusi detail investasi dengan admin</li>
            <li>4. Admin menetapkan jumlah investasi</li>
            <li>5. Investasi langsung disetujui dan aktif</li>
          </ol>
          <p className="text-xs text-blue-700 mt-2">
            <strong>Catatan:</strong> Tidak perlu upload bukti transfer lagi. Admin akan langsung mengatur investasi Anda.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={loading || !interestMessage.trim()}
            className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Mengirim...
              </div>
            ) : (
              'Kirim Minat Investasi'
            )}
          </button>
          
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Batal
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default InvestmentRequestForm;