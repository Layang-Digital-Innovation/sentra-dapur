import React from 'react';
import Image from 'next/image';

export const Logo = ({ className = "h-8", showText = true }: { className?: string; showText?: boolean }) => {
  return (
    // Menghapus overflow-hidden agar gambar yang di-scale tidak terpotong (clipped).
    // Menambahkan w-40 agar div container memiliki lebar layout yang cukup untuk gambar yang membesar.
    <div className={`flex items-center ${className} w-32 sm:w-48`}>
      <img
        src={showText ? "/logo.png" : "/logo-icon.png"}
        alt="Sentra Dapur"
        // menggunakan object-contain namun menghilangkan overflow-hidden dari parent
        className={`h-full w-auto object-contain ${showText ? 'scale-[2.2] sm:scale-[2.8] origin-left transform-gpu ml-4 sm:ml-6' : 'scale-[1.8] transform-gpu'}`}
      />
    </div>
  );
};
