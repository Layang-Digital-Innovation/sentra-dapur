import React from 'react';

export const Logo = ({ className = "h-12", showText = true }: { className?: string; showText?: boolean }) => {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <img 
        src="/logo-icon.png"
        alt="Sentra Dapur" 
        className="h-full w-auto object-contain transform-gpu mix-blend-multiply"
      />
      {showText && (
        <div className="flex items-center whitespace-nowrap">
          <span className="text-xl md:text-2xl font-black tracking-tight text-slate-900">Sentra</span>
          <span className="text-xl md:text-2xl font-black tracking-tight text-amber-600">Dapur</span>
        </div>
      )}
    </div>
  );
};
