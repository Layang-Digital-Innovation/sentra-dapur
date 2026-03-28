import React from 'react';

export const Logo = ({ className = "h-12", showText = true }: { className?: string; showText?: boolean }) => {
  return (
    <div className={`flex items-center ${className}`}>
      <img 
        src={showText ? "/logo.png" : "/logo-icon.png"}
        alt="Sentra Dapur" 
        className="h-full w-auto object-contain transform-gpu mix-blend-multiply"
      />
    </div>
  );
};
