import React from 'react';

export const Logo = ({ className = "h-8", showText = true }: { className?: string; showText?: boolean }) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img 
        src={showText ? "/logo.png" : "/logo-icon.png"}
        alt="Sentra Dapur" 
        className={`h-full w-auto object-contain ${showText ? 'scale-[2.5] sm:scale-[3] origin-left transform-gpu ml-6' : 'scale-[2] transform-gpu'}`}
      />
    </div>
  );
};
