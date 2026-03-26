"use client";

import React, { useState, useEffect } from 'react';
import { FiX, FiEye, FiEyeOff } from 'react-icons/fi';
import { User, Role, CreateUserRequest, UpdateUserRequest } from '@/types/user.types';
import { userService } from '@/services/user.service';
import { uploadService, UploadedFile } from '@/services/upload.service';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user?: User | null;
  mode: 'create' | 'edit';
}

const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  user,
  mode
}) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: Role.BUYER,
    kycDocs: ''
  });
  const [kycFiles, setKycFiles] = useState<FileList | null>(null);
  const [kycFileNames, setKycFileNames] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && user) {
        setFormData({
          email: user.email,
          password: '',
          confirmPassword: '',
          role: user.role,
          kycDocs: user.kycDocs || ''
        });
      } else {
        setFormData({
          email: '',
          password: '',
          confirmPassword: '',
          role: Role.BUYER,
          kycDocs: ''
        });
      }
      setKycFiles(null);
      setKycFileNames([]);
      setUploadedFiles([]);
      setError(null);
    }
  }, [isOpen, mode, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
      setError('Email is required');
      return false;
    }

    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }

    if (mode === 'create') {
      if (!formData.password) {
        setError('Password is required');
        return false;
      }

      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters long');
        return false;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
    }

    if (mode === 'edit' && formData.password) {
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters long');
        return false;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
    }

    // Validate kycDocs JSON format if provided
    if (formData.kycDocs && formData.kycDocs.trim()) {
      try {
        JSON.parse(formData.kycDocs);
      } catch (e) {
        setError('KYC Documents must be in valid JSON format');
        return;
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

    try {
      let kycDocsData = formData.kycDocs;

      // Upload files if any
      if (kycFiles && kycFiles.length > 0) {
        const uploadResult = await uploadService.uploadKycDocuments(kycFiles);
        kycDocsData = JSON.stringify(uploadResult.files);
      }

      if (mode === 'create') {
        const createData: CreateUserRequest = {
          email: formData.email,
          password: formData.password,
          role: formData.role
        };
        await userService.createUser(createData);
      } else if (mode === 'edit' && user) {
        const updateData: UpdateUserRequest = {
          email: formData.email,
          role: formData.role,
          ...(kycDocsData && { kycDocs: kycDocsData }),
          ...(formData.password && { password: formData.password })
        };
        await userService.updateUser(user.id, updateData);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative mx-auto p-6 border border-gray-200 w-full max-w-md shadow-2xl rounded-xl bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {mode === 'create' ? 'Tambah User Baru' : 'Edit User'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              placeholder="user@example.com"
            />
          </div>

          {/* Role */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            >
              <option value={Role.BUYER}>Buyer</option>
              <option value={Role.SUPPLIER}>Seller</option>
              <option value={Role.INVESTOR}>Investor</option>
              <option value={Role.PROJECT_OWNER}>Project Owner</option>
              <option value={Role.ADMIN}>Admin</option>
              <option value={Role.SUPER_ADMIN}>Super Admin</option>
            </select>
          </div>

          {/* KYC Documents Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              KYC Documents
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-purple-400 transition-colors">
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
                className="cursor-pointer flex flex-col items-center space-y-2"
              >
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-sm text-gray-600">
                  Click to upload KYC documents
                </span>
                <span className="text-xs text-gray-500">
                  PNG, JPG, PDF up to 10MB each
                </span>
              </label>
            </div>
            
            {/* File List */}
            {kycFileNames.length > 0 && (
              <div className="mt-3 space-y-2">
                {kycFileNames.map((fileName, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
                    <span className="text-sm text-gray-700 truncate">{fileName}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700 ml-2"
                    >
                      <FiX size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              {mode === 'create' ? 'Password' : 'Password Baru (kosongkan jika tidak ingin mengubah)'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required={mode === 'create'}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                placeholder={mode === 'create' ? 'Masukkan password' : 'Kosongkan jika tidak ingin mengubah'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <FiEyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <FiEye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          {(mode === 'create' || formData.password) && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Konfirmasi Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required={mode === 'create' || !!formData.password}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="Konfirmasi password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <FiEyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <FiEye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {mode === 'create' ? 'Membuat...' : 'Menyimpan...'}
                </div>
              ) : (
                mode === 'create' ? 'Buat User' : 'Simpan Perubahan'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;