'use client';

import React from 'react';

interface NotificationBadgeProps {
  count: number;
  maxCount?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({ 
  count, 
  maxCount = 99, 
  size = 'sm',
  className = '' 
}) => {
  if (count <= 0) return null;

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();
  
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 min-w-[18px] h-[18px]',
    md: 'text-sm px-2 py-1 min-w-[20px] h-[20px]',
    lg: 'text-base px-2.5 py-1.5 min-w-[24px] h-[24px]'
  };

  return (
    <span 
      className={`
        inline-flex items-center justify-center 
        bg-red-500 text-white font-semibold rounded-full 
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {displayCount}
    </span>
  );
};

export default NotificationBadge;