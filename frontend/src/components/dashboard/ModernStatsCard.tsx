"use client";

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface ModernStatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  gradient: string;
  iconBg: string;
  delay?: number;
}

export default function ModernStatsCard({
  title,
  value,
  icon,
  trend,
  gradient,
  iconBg,
  delay = 0
}: ModernStatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ 
        scale: 1.05,
        transition: { duration: 0.2 }
      }}
      className="group relative overflow-hidden rounded-xl shadow-xl"
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} rounded-xl`} />
      
      {/* Glass effect overlay */}
      <div className="absolute inset-0 bg-white bg-opacity-10 backdrop-filter backdrop-blur-sm rounded-xl" />
      
      {/* Border glow effect */}
      <div className="absolute inset-0 rounded-xl border border-white border-opacity-30 group-hover:border-opacity-50 transition-all duration-300 shadow-lg" />
      
      {/* Content */}
      <div className="relative p-6 rounded-xl h-32 flex flex-col justify-between">
        {/* Header section with icon */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 drop-shadow-lg truncate">
              {title}
            </p>
          </div>
          
          {/* Icon container */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: delay + 0.2
            }}
            className={`flex-shrink-0 p-2 rounded-lg ${iconBg} shadow-lg group-hover:shadow-xl transition-shadow duration-300`}
          >
            <div className="text-white text-lg">
              {icon}
            </div>
          </motion.div>
        </div>

        {/* Value and trend section */}
        <div className="flex items-baseline space-x-3">
          <h3 className="text-2xl font-bold text-black drop-shadow-lg">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </h3>
          
          {/* Trend indicator */}
          {trend && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + 0.3 }}
              className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold ${
                trend.isPositive
                  ? 'bg-green-500 bg-opacity-30 text-white border border-green-400 border-opacity-30'
                  : 'bg-red-500 bg-opacity-30 text-white border border-red-400 border-opacity-30'
              }`}
            >
              <span className="mr-1">
                {trend.isPositive ? '📈' : '📉'}
              </span>
              {trend.value}
            </motion.span>
          )}
        </div>
        
        {/* Bottom accent line */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 0.8, delay: delay + 0.5 }}
          className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-white to-transparent opacity-40 rounded-bl-xl"
        />
        
        {/* Floating particles effect */}
        <div className="absolute inset-0 overflow-hidden rounded-xl">
          <motion.div
            animate={{
              x: [0, 100, 0],
              y: [0, -100, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute -top-4 -right-4 w-8 h-8 bg-white bg-opacity-10 rounded-full"
          />
          <motion.div
            animate={{
              x: [0, -80, 0],
              y: [0, 120, 0],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "linear",
              delay: 5
            }}
            className="absolute -bottom-2 -left-2 w-6 h-6 bg-white bg-opacity-5 rounded-full"
          />
        </div>
      </div>
    </motion.div>
  );
}