'use client';

import React, { useState, useEffect } from 'react';
import { 
  CreateProjectRequest, 
  UpdateProjectRequest, 
  Project,
  ProjectFormErrors 
} from '@/types/investment.types';
import investmentService from '@/services/investment.service';

interface ProjectFormProps {
  initialData?: Partial<Project>;
  onSubmit: (data: CreateProjectRequest | UpdateProjectRequest) => void;
  onCancel: () => void;
  isLoading?: boolean;
  isEdit?: boolean;
}

const ProjectForm: React.FC<ProjectFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  isEdit = false,
}) => {
  const [formData, setFormData] = useState<CreateProjectRequest>({
    title: '',
    description: '',
    targetAmount: undefined,
    deadline: undefined,
    bankAccount: '',
    bankName: '',
    accountHolder: '',
    profitSharingPercentage: undefined,
    profitSharingPercentageAfterBEP: undefined,
    minInvestment: undefined,
    prospectusUrl: '',
    prospectusFileName: '',
  });

  const [errors, setErrors] = useState<ProjectFormErrors>({});
  const [prospectusFile, setProspectusFile] = useState<File | null>(null);
  const [uploadingProspectus, setUploadingProspectus] = useState(false);

  const getAuthHeaders = (): Record<string, string> => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return {
        'Authorization': `Bearer ${user.access_token}`,
      };
    }
    return {};
  };

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        targetAmount: initialData.targetAmount || initialData.financialDocs?.targetAmount,
        deadline: initialData.deadline || initialData.financialDocs?.deadline,
        bankAccount: initialData.accountNumber || initialData.financialDocs?.bankAccount || '',
        bankName: initialData.bankName || initialData.financialDocs?.bankName || '',
        accountHolder: initialData.accountHolder || initialData.financialDocs?.accountHolder || '',
        profitSharingPercentage: initialData.profitSharingPercentage,
        profitSharingPercentageAfterBEP: initialData.profitSharingPercentageAfterBEP,
        minInvestment: initialData.minInvestment,
        prospectusUrl: initialData.prospectusUrl || '',
        prospectusFileName: initialData.prospectusFileName || '',
      });
    }
  }, [initialData]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'targetAmount' || name === 'profitSharingPercentage' || name === 'profitSharingPercentageAfterBEP' || name === 'minInvestment') 
        ? (value ? Number(value) : undefined) 
        : value,
    }));

    // Clear error when user starts typing
    if (errors[name as keyof ProjectFormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleProspectusFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (PDF only)
    if (file.type !== 'application/pdf') {
      setErrors(prev => ({
        ...prev,
        prospectus: 'File harus berformat PDF'
      }));
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrors(prev => ({
        ...prev,
        prospectus: 'Ukuran file maksimal 10MB'
      }));
      return;
    }

    setProspectusFile(file);
    setFormData(prev => ({
      ...prev,
      prospectusFileName: file.name
    }));

    // Clear any previous errors
    setErrors(prev => ({
      ...prev,
      prospectus: undefined
    }));
  };

  const validateForm = (): boolean => {
    const validationErrors = investmentService.validateProjectData(formData);
    const errorObj: ProjectFormErrors = {};

    validationErrors.forEach(error => {
      if (error.includes('Judul')) errorObj.title = error;
      if (error.includes('Deskripsi')) errorObj.description = error;
      if (error.includes('Target dana')) errorObj.targetAmount = error;
      if (error.includes('Deadline')) errorObj.deadline = error;
    });

    // Additional bank account validation for create mode
    if (!isEdit) {
      if (!formData.bankAccount?.trim()) {
        errorObj.bankAccount = 'Nomor rekening harus diisi';
      }
      if (!formData.bankName?.trim()) {
        errorObj.bankName = 'Nama bank harus diisi';
      }
      if (!formData.accountHolder?.trim()) {
        errorObj.accountHolder = 'Nama pemegang rekening harus diisi';
      }
    }

    setErrors(errorObj);
    return Object.keys(errorObj).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      let finalFormData = { ...formData };

      // Upload prospectus file if selected
      if (prospectusFile) {
        setUploadingProspectus(true);
        
        const uploadFormData = new FormData();
        uploadFormData.append('file', prospectusFile);

        // Normalisasi base URL API: gunakan NEXT_PUBLIC_API_URL (otomatis tambahkan /api),
        // jika tidak ada gunakan path relatif '/api' agar sesuai domain produksi
        const normalizeApiBase = (): string => {
          const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
          if (raw && raw.length > 0) {
            const noTrailingSlash = raw.replace(/\/+$/, '');
            return noTrailingSlash.endsWith('/api') ? noTrailingSlash : `${noTrailingSlash}/api`;
          }
          return '/api';
        };
        const API_BASE_URL = normalizeApiBase();
        
        // Upload file to backend
        const response = await fetch(`${API_BASE_URL}/upload/prospectus`, {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
          },
          body: uploadFormData,
        });

        if (!response.ok) {
          throw new Error('Gagal mengupload prospektus');
        }

        const uploadResult = await response.json();
        finalFormData.prospectusUrl = uploadResult.url;
        finalFormData.prospectusFileName = prospectusFile.name;
      }

      onSubmit(finalFormData);
    } catch (error) {
      console.error('Error uploading prospectus:', error);
      setErrors(prev => ({
        ...prev,
        prospectus: 'Gagal mengupload prospektus. Silakan coba lagi.'
      }));
    } finally {
      setUploadingProspectus(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit Proyek' : 'Buat Proyek Baru'}
        </h2>
        <p className="text-gray-600 mt-2">
          {isEdit 
            ? 'Perbarui informasi proyek Anda' 
            : 'Lengkapi informasi proyek untuk mendapatkan pendanaan'
          }
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Judul Proyek *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Masukkan judul proyek"
              disabled={isLoading}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Deskripsi Proyek *
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Jelaskan detail proyek Anda"
              disabled={isLoading}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          <div>
            <label htmlFor="targetAmount" className="block text-sm font-medium text-gray-700 mb-2">
              Target Dana (IDR)
            </label>
            <input
              type="number"
              id="targetAmount"
              name="targetAmount"
              value={formData.targetAmount || ''}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                errors.targetAmount ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="1000000"
              min="0"
              disabled={isLoading}
            />
            {errors.targetAmount && (
              <p className="mt-1 text-sm text-red-600">{errors.targetAmount}</p>
            )}
          </div>

          <div>
            <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-2">
              Deadline
            </label>
            <input
              type="date"
              id="deadline"
              name="deadline"
              value={formData.deadline ? new Date(formData.deadline).toISOString().split('T')[0] : ''}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                errors.deadline ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-gray-500">
              Deadline akan diatur pada akhir hari (23:59:59) dari tanggal yang dipilih
            </p>
            {errors.deadline && (
              <p className="mt-1 text-sm text-red-600">{errors.deadline}</p>
            )}
          </div>

          <div>
            <label htmlFor="minInvestment" className="block text.sm font-medium text-gray-700 mb-2">
              Min Investasi (IDR)
            </label>
            <input
              type="number"
              id="minInvestment"
              name="minInvestment"
              value={formData.minInvestment || ''}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                errors.minInvestment ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="500000"
              min="0"
              disabled={isLoading}
            />
            {errors.minInvestment && (
              <p className="mt-1 text-sm text-red-600">{errors.minInvestment}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Nilai minimal investasi yang diizinkan untuk proyek ini
            </p>
          </div>

          <div>
            <label htmlFor="profitSharingPercentage" className="block text-sm font-medium text-gray-700 mb-2">
              Persentase Bagi Hasil (%) Sebelum BEP
            </label>
            <input
              type="number"
              id="profitSharingPercentage"
              name="profitSharingPercentage"
              value={formData.profitSharingPercentage || ''}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                errors.profitSharingPercentage ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="10"
              min="0"
              max="100"
              step="0.1"
              disabled={isLoading}
            />
            {errors.profitSharingPercentage && (
              <p className="mt-1 text-sm text-red-600">{errors.profitSharingPercentage}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Persentase keuntungan yang akan dibagikan kepada investor sebelum mencapai BEP
            </p>
          </div>

          <div>
            <label htmlFor="profitSharingPercentageAfterBEP" className="block text-sm font-medium text-gray-700 mb-2">
              Persentase Bagi Hasil (%) Setelah BEP
            </label>
            <input
              type="number"
              id="profitSharingPercentageAfterBEP"
              name="profitSharingPercentageAfterBEP"
              value={formData.profitSharingPercentageAfterBEP || ''}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                errors.profitSharingPercentageAfterBEP ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="8"
              min="0"
              max="100"
              step="0.1"
              disabled={isLoading}
            />
            {errors.profitSharingPercentageAfterBEP && (
              <p className="mt-1 text-sm text-red-600">{errors.profitSharingPercentageAfterBEP}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Persentase keuntungan yang akan dibagikan kepada investor setelah mencapai BEP
            </p>
          </div>
        </div>

        {/* Prospectus Upload */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Dokumen Prospektus
          </h3>
          
          <div>
            <label htmlFor="prospectus" className="block text-sm font-medium text-gray-700 mb-2">
              Upload Prospektus (PDF)
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
              <div className="space-y-1 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="prospectus"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                  >
                    <span>Upload file</span>
                    <input
                      id="prospectus"
                      name="prospectus"
                      type="file"
                      accept=".pdf"
                      onChange={handleProspectusFileChange}
                      className="sr-only"
                      disabled={isLoading || uploadingProspectus}
                    />
                  </label>
                  <p className="pl-1">atau drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PDF hingga 10MB</p>
                {prospectusFile && (
                  <div className="mt-2 text-sm text-green-600">
                    ✓ {prospectusFile.name}
                  </div>
                )}
                {formData.prospectusFileName && !prospectusFile && (
                  <div className="mt-2 text-sm text-blue-600">
                    📄 {formData.prospectusFileName} (sudah terupload)
                  </div>
                )}
              </div>
            </div>
            {errors.prospectus && (
              <p className="mt-1 text-sm text-red-600">{errors.prospectus}</p>
            )}
            <p className="mt-2 text-xs text-gray-500">
              Prospektus berisi informasi detail tentang proyek, rencana bisnis, dan proyeksi keuangan
            </p>
          </div>
        </div>

        {/* Bank Account Information */}
        <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Informasi Rekening Penerima Dana
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="bankName" className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Bank *
                </label>
                <input
                  type="text"
                  id="bankName"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                    errors.bankName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Bank Central Asia"
                  disabled={isLoading}
                />
                {errors.bankName && (
                  <p className="mt-1 text-sm text-red-600">{errors.bankName}</p>
                )}
              </div>

              <div>
                <label htmlFor="bankAccount" className="block text-sm font-medium text-gray-700 mb-2">
                  Nomor Rekening *
                </label>
                <input
                  type="text"
                  id="bankAccount"
                  name="bankAccount"
                  value={formData.bankAccount}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                    errors.bankAccount ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="1234567890"
                  disabled={isLoading}
                />
                {errors.bankAccount && (
                  <p className="mt-1 text-sm text-red-600">{errors.bankAccount}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="accountHolder" className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Pemegang Rekening *
                </label>
                <input
                  type="text"
                  id="accountHolder"
                  name="accountHolder"
                  value={formData.accountHolder}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                    errors.accountHolder ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="John Doe"
                  disabled={isLoading}
                />
                {errors.accountHolder && (
                  <p className="mt-1 text-sm text-red-600">{errors.accountHolder}</p>
                )}
              </div>
            </div>
          </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || uploadingProspectus}
          >
            {uploadingProspectus 
              ? 'Mengupload Prospektus...' 
              : isLoading 
                ? 'Menyimpan...' 
                : (isEdit ? 'Perbarui Proyek' : 'Buat Proyek')
            }
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProjectForm;