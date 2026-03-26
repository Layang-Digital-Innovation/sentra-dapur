"use client";

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

const DashboardFooter = () => {
  const { user } = useAuth();
  const userRole = user?.user.role;

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-4">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <span>&copy; 2025 Sentra Dapur. All rights reserved.</span>
            </div>
            
            <div className="flex items-center space-x-1">
              {user?.user.email && (
                <>
                  <span>Logged in as: {user.user.email}</span>
                  <span>•</span>
                  <span className="capitalize">{userRole?.toLowerCase() || 'admin'}</span>
                </>
              )}
            </div>
            
            <div className="flex items-center space-x-1">
              <span>Version 1.0.0</span>
              <span>•</span>
              <span>Last updated: 9/27/2025</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default DashboardFooter;