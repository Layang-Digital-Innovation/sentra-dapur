import { useState } from 'react';

interface UseFileUploadOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
}

interface FileUploadResult {
  files: File[];
  fileErrors: string[];
  addFiles: (newFiles: FileList | File[]) => void;
  removeFile: (index: number) => void;
  clearFiles: () => void;
  isValidFile: (file: File) => boolean;
}

export const useFileUpload = (options?: UseFileUploadOptions): FileUploadResult => {
  const [files, setFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);

  const maxSize = options?.maxSize || 10 * 1024 * 1024; // Default 10MB
  const allowedTypes = options?.allowedTypes || [];

  const isValidFile = (file: File): boolean => {
    // Check file size
    if (file.size > maxSize) {
      setFileErrors(prev => [...prev, `File "${file.name}" terlalu besar. Maksimal ${maxSize / (1024 * 1024)}MB`]);
      return false;
    }

    // Check file type if allowedTypes is specified
    if (allowedTypes.length > 0 && !allowedTypes.some(type => file.type.includes(type))) {
      setFileErrors(prev => [...prev, `File "${file.name}" tidak didukung. Tipe yang diizinkan: ${allowedTypes.join(', ')}`]);
      return false;
    }

    return true;
  };

  const addFiles = (newFiles: FileList | File[]) => {
    setFileErrors([]);
    
    const filesToAdd: File[] = [];
    const filesArray = Array.from(newFiles);
    
    filesArray.forEach(file => {
      if (isValidFile(file)) {
        filesToAdd.push(file);
      }
    });
    
    setFiles(prev => [...prev, ...filesToAdd]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearFiles = () => {
    setFiles([]);
    setFileErrors([]);
  };

  return {
    files,
    fileErrors,
    addFiles,
    removeFile,
    clearFiles,
    isValidFile
  };
};

export default useFileUpload;