'use client';

import React, { useState, useRef, useEffect } from 'react';
import { fileUploadService, FinancialReport, FileUploadProgress } from '@/services/fileUploadService';
import investmentService from '@/services/investment.service';

interface FinancialReportUploadProps {
  projectId?: string;
  onUploadComplete?: (reportId: string) => void;
}

export default function FinancialReportUpload({ projectId, onUploadComplete }: FinancialReportUploadProps) {
  const [formData, setFormData] = useState({
    reportType: 'INCOME_STATEMENT' as 'INCOME_STATEMENT' | 'BALANCE_SHEET' | 'CASH_FLOW' | 'BANK_STATEMENT',
    title: '',
    description: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || '');
  const [reports, setReports] = useState<FinancialReport[]>([]);
  const [showReports, setShowReports] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProjects();
    if (projectId) {
      setSelectedProjectId(projectId);
    }
  }, [projectId]);

  useEffect(() => {
    if (selectedProjectId) {
      loadReports();
    }
  }, [selectedProjectId]);

  const loadProjects = async () => {
    try {
      const projectsData = await investmentService.getMyProjects();
      setProjects(projectsData);
      if (!selectedProjectId && projectsData.length > 0) {
        setSelectedProjectId(projectsData[0].id);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const loadReports = async () => {
    try {
      const reportsData = await fileUploadService.getFinancialReports(selectedProjectId);
      setReports(reportsData);
    } catch (error) {
      console.error('Failed to load reports:', error);
    }
  };

  const reportTypes = [
    { value: 'INCOME_STATEMENT', label: 'Laporan Laba Rugi' },
    { value: 'BALANCE_SHEET', label: 'Neraca' },
    { value: 'CASH_FLOW', label: 'Laporan Arus Kas' },
    { value: 'BANK_STATEMENT', label: 'Rekening Koran' },
  ];

  // Helper untuk menampilkan label tipe yang mudah dipahami
  const typeLabel = (type: string) => {
    switch (type) {
      case 'INCOME_STATEMENT':
        return 'Laporan Laba Rugi';
      case 'BALANCE_SHEET':
        return 'Neraca';
      case 'CASH_FLOW':
        return 'Arus Kas';
      case 'BANK_STATEMENT':
        return 'Rekening Koran';
      default:
        return type;
    }
  };

  // Format tanggal ke bahasa Indonesia (mengakomodasi string atau Date)
  const formatDateID = (dateInput: string | Date) => {
    try {
      const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return typeof dateInput === 'string' ? dateInput : dateInput?.toString?.() || '';
    }
  };

  // Humanize judul laporan: ganti enum mentah ke label ramah pengguna
  const humanizeReportTitle = (report: any): string => {
    const rawType: string | undefined = report?.reportType || report?.type;
    const label = rawType ? typeLabel(rawType) : undefined;
    const uploadedAt = report?.uploadedAt || report?.createdAt;
    const dateStr = uploadedAt ? formatDateID(uploadedAt) : '';
    const rawTitle: string | undefined = report?.title;

    if (rawTitle && typeof rawTitle === 'string') {
      let t = rawTitle.trim();

      // Pola 1: "<TYPE> Report - <date>"
      if (rawType) {
        const reTypeReportDash = new RegExp(`^${rawType}\\s+Report\\s*-\\s*(.+)$`, 'i');
        t = t.replace(reTypeReportDash, (_m, datePart: string) => `${label || rawType} - ${datePart}`);

        // Pola 2: "<TYPE> financial report for <project>"
        const reTypeFinancialFor = new RegExp(`^${rawType}\\s+financial\\s+report\\s+for\\s+(.+)$`, 'i');
        t = t.replace(reTypeFinancialFor, (_m, projPart: string) => `${label || rawType} untuk ${projPart}`);

        // Ganti sisa kemunculan rawType di judul dengan label ramah pengguna
        if (label) {
          const reRawType = new RegExp(rawType, 'g');
          t = t.replace(reRawType, label);
        }
      }

      // Terjemahkan frasa umum ke Indonesia tanpa menambah duplikasi "Laporan"
      t = t.replace(/\bfinancial report\b/gi, 'Laporan Keuangan');

      return t;
    }

    // Jika tidak ada judul, bangun dari label + tanggal
    if (label) {
      return dateStr ? `${label} - ${dateStr}` : label;
    }

    return 'Laporan Keuangan';
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleFileSelect = (file: File) => {
    const validation = fileUploadService.validateFile(file, {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['application/pdf'],
    });

    if (!validation.isValid) {
      setErrors(prev => ({
        ...prev,
        file: validation.error || 'Invalid file',
      }));
      return;
    }

    setSelectedFile(file);
    setErrors(prev => ({
      ...prev,
      file: '',
    }));
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedProjectId) {
      newErrors.project = 'Please select a project';
    }

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!selectedFile) {
      newErrors.file = 'Please select a file to upload';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !selectedFile) {
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const onProgress = (progress: FileUploadProgress) => {
        setUploadProgress(progress.percentage);
      };

      const report = await fileUploadService.uploadFinancialReport(
        {
          projectId: selectedProjectId,
          reportType: formData.reportType,
          title: formData.title,
          description: formData.description,
          file: selectedFile,
        },
        onProgress
      );

      // Reset form
      setFormData({
        reportType: 'INCOME_STATEMENT',
        title: '',
        description: '',
      });
      setSelectedFile(null);
      setUploadProgress(0);

      // Reload reports
      await loadReports();

      if (onUploadComplete) {
        onUploadComplete(report.id);
      }

      alert('Financial report uploaded successfully!');
    } catch (error) {
      console.error('Upload failed:', error);
      setErrors({ submit: 'Failed to upload financial report. Please try again.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) {
      return;
    }

    try {
      await fileUploadService.deleteFinancialReport(reportId);
      await loadReports();
      alert('Report deleted successfully!');
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete report. Please try again.');
    }
  };

  const handleDownloadReport = async (report: FinancialReport | any) => {
    try {
      const fileUrl = report?.file?.url || report?.fileUrl;
      const filename = report?.file?.originalName || report?.fileName || report?.title || 'report.pdf';
      if (!fileUrl) {
        alert('File report tidak tersedia.');
        return;
      }
      await fileUploadService.downloadFile(fileUrl, filename);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download report. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Upload Financial Report</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Selection */}
          {!projectId && (
            <div>
              <label htmlFor="project" className="block text-sm font-medium text-gray-700 mb-2">
                Select Project
              </label>
              <select
                id="project"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              >
                <option value="">Choose a project...</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
              {errors.project && (
                <p className="mt-1 text-sm text-red-600">{errors.project}</p>
              )}
            </div>
          )}

          {/* Report Type */}
          <div>
            <label htmlFor="reportType" className="block text-sm font-medium text-gray-700 mb-2">
              Report Type
            </label>
            <select
              id="reportType"
              name="reportType"
              value={formData.reportType}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
            >
              {reportTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Report Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              placeholder="Enter report title"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              placeholder="Enter report description"
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload PDF File
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragOver
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-gray-900">{selectedFile.name}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <svg className="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Click to upload
                    </button>
                    <span className="text-gray-500"> or drag and drop</span>
                  </div>
                  <p className="text-xs text-gray-500">PDF files only, max 10MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileInputChange}
              className="hidden"
            />
            {errors.file && (
              <p className="mt-1 text-sm text-red-600">{errors.file}</p>
            )}
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="submit"
              disabled={isUploading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isUploading ? 'Uploading...' : 'Upload Report'}
            </button>
          </div>

          {errors.submit && (
            <p className="text-sm text-red-600">{errors.submit}</p>
          )}
        </form>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Financial Reports</h2>
          <button
            onClick={() => setShowReports(!showReports)}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm md:text-base"
          >
            {showReports ? 'Hide Reports' : 'Show Reports'}
          </button>
        </div>


        {showReports && (
          <div className="space-y-4">
            {reports.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No financial reports uploaded yet.</p>
            ) : (
              reports.map((report) => (
                <div key={report.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-3 items-start">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{humanizeReportTitle(report as any)}</h3>
                      {report.description && (
                        <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                      )}

                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>Tipe: {typeLabel((report as any).reportType || (report as any).type)}</span>
                        <span>
                          Diunggah: {new Date((report as any).uploadedAt || (report as any).createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                        {(report as any).file?.size || (report as any).fileSize ? (
                          <span>
                            Ukuran: {(((report as any).file?.size || (report as any).fileSize) / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        ) : null}
                        {(report as any).status && (
                          <span className={`px-2 py-1 rounded-full ${
                            (report as any).status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                            (report as any).status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {(report as any).status}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 ml-0 sm:ml-4">
                      <button
                        onClick={() => handleDownloadReport(report)}
                        className="px-2.5 py-1.5 rounded border text-[11px] md:text-sm text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => handleDeleteReport(report.id)}
                        className="px-2.5 py-1.5 rounded border text-[11px] md:text-sm text-red-600 border-red-200 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}