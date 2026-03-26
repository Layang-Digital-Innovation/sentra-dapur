"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiEye, FiEyeOff, FiX, FiUser, FiMail, FiLock, FiShield, FiUpload } from 'react-icons/fi';
import { Role, CreateUserRequest } from '@/types/user.types';
import { userService } from '@/services/user.service';
import { uploadService, UploadedFile } from '@/services/upload.service';

const CreateUserPage: React.FC = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    fullname: '',
    password: '',
    confirmPassword: '',
    role: Role.BUYER,
    kycDocs: ''
  });
  const [kycFiles, setKycFiles] = useState<FileList | null>(null);
  const [kycFileNames, setKycFileNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setKycFiles(files);
      setKycFileNames(Array.from(files).map(file => file.name));
    }
  };

  const removeFile = (index: number) => {
    if (kycFiles) {
      const dt = new DataTransfer();
      const files = Array.from(kycFiles);
      files.splice(index, 1);
      files.forEach(file => dt.items.add(file));
      setKycFiles(dt.files);
      setKycFileNames(files.map(file => file.name));
    }
  };

  const validateForm = () => {
    if (!formData.email) {
      setError('Email wajib diisi');
      return false;
    }

    if (!formData.email.includes('@')) {
      setError('Masukkan alamat email yang valid');
      return false;
    }

    if (!formData.password) {
      setError('Password wajib diisi');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Password minimal 6 karakter');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Password dan konfirmasi password tidak cocok');
      return false;
    }

    // Validate kycDocs JSON format if provided
    if (formData.kycDocs && formData.kycDocs.trim()) {
      try {
        JSON.parse(formData.kycDocs);
      } catch (e) {
        setError('KYC Documents harus dalam format JSON yang valid');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let kycDocsData = formData.kycDocs;

      // Upload files if any
      if (kycFiles && kycFiles.length > 0) {
        const uploadResult = await uploadService.uploadKycDocuments(kycFiles);
        kycDocsData = JSON.stringify(uploadResult.files);
      }

      const createData: CreateUserRequest = {
        email: formData.email,
        fullName: formData.fullname,
        password: formData.password,
        role: formData.role,
        ...(kycDocsData && { kycDocs: kycDocsData })
      };

      await userService.createUser(createData);
      setSuccess('User berhasil dibuat!');
      
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/dashboard/users');
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat membuat user');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/users');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleCancel}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <FiArrowLeft className="mr-2" />
            Kembali ke User Management
          </button>
          <div className="flex items-center">
            <div className="bg-slate-100 p-3 rounded-lg mr-4">
              <FiUser className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Buat User Baru</h1>
              <p className="text-gray-600 mt-1">Tambahkan user baru ke sistem</p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">{success}</p>
                <p className="text-sm text-green-700 mt-1">Anda akan diarahkan ke halaman User Management...</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white shadow-lg rounded-lg">
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* Basic Information Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <FiUser className="mr-2 text-amber-600" />
                Informasi Dasar
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Fullname */}
                <div>
                  <label htmlFor="fullname" className="block text-sm font-medium text-gray-700 mb-2">
                    <FiUser className="inline mr-1" />
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    id="fullname"
                    name="fullname"
                    value={formData.fullname}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-colors text-gray-900 bg-white"
                    placeholder="Nama lengkap"
                  />
                </div>
                
                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    <FiMail className="inline mr-1" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-colors text-gray-900 bg-white"
                    placeholder="user@example.com"
                  />
                </div>

                {/* Role */}
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                    <FiShield className="inline mr-1" />
                    Role
                  </label>
                  <select
                    id="role"
                    name="role"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-colors text-gray-900 bg-white"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                  >
                    <option value={Role.BUYER}>Buyer</option>
                    <option value={Role.SUPPLIER}>Seller</option>
                    <option value={Role.INVESTOR}>Investor</option>
                    <option value={Role.PROJECT_OWNER}>Project Owner</option>
                    <option value={Role.ADMIN}>Admin</option>
                    <option value={Role.ADMIN_INVESTMENT}>Admin Investment</option>
                    <option value={Role.ADMIN_TRADING}>Admin Trading</option>
                    <option value={Role.SUPER_ADMIN}>Super Admin</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Security Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <FiLock className="mr-2 text-amber-600" />
                Keamanan
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-colors text-gray-900 bg-white"
                      placeholder="Masukkan password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Minimal 6 karakter</p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Konfirmasi Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-colors text-gray-900 bg-white"
                      placeholder="Konfirmasi password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* KYC Documents Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <FiUpload className="mr-2 text-amber-600" />
                KYC Documents
              </h2>
              <div className="space-y-4">
                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Dokumen KYC
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
                    <input
                      type="file"
                      id="kycFiles"
                      multiple
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="kycFiles"
                      className="cursor-pointer flex flex-col items-center space-y-3"
                    >
                      <div className="bg-gray-100 p-3 rounded-full">
                        <FiUpload className="w-8 h-8 text-gray-400" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          Klik untuk upload dokumen KYC
                        </span>
                        <p className="text-sm text-gray-500 mt-1">
                          PNG, JPG, PDF hingga 10MB per file
                        </p>
                      </div>
                    </label>
                  </div>
                  
                  {/* File List */}
                  {kycFileNames.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium text-gray-700">File yang dipilih:</p>
                      {kycFileNames.map((fileName, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg border">
                          <span className="text-sm text-gray-700 truncate flex-1">{fileName}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700 ml-3 p-1"
                          >
                            <FiX size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Membuat User...
                  </div>
                ) : (
                  'Buat User'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateUserPage;