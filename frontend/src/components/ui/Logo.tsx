import React from 'react';
import Image from 'next/image';

export const Logo = ({ className = "h-8", showText = true }: { className?: string; showText?: boolean }) => {
  return (
    // Gunakan overflow-hidden agar putih-putih dari image tidak bocor ke bawah navbar (overflow).
    // Pertahankan w-32 sm:w-48 agar teks tidak terpotong (clipped) secara horizontal seperti sebelumnya.
    <div className={`flex items-center ${className} w-40 sm:w-56 overflow-hidden rounded-md`}>
      <img
        src={showText ? "/logo.png" : "/logo-icon.png"}
        alt="Sentra Dapur"
        // Gunakan mix-blend-multiply juga untuk menyamarkan background putih bawaan logo
        className={`h-full w-auto object-contain mix-blend-multiply ${showText ? 'scale-[2.2] sm:scale-[2.6] origin-left transform-gpu ml-4' : 'scale-[1.8] transform-gpu'}`}
      />
    </div>
  );
};
