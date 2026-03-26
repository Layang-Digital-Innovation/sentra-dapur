"use client";

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiMenu, FiX, FiGrid } from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/ui/Logo';
import { Role } from '@/types/user.types';

const getDashboardUrl = (role: Role): string => {
  switch (role) {
    case Role.ADMIN_PUSAT:
      return '/dashboard/admin-pusat';
    case Role.ADMIN_DAPUR:
      return '/dashboard/admin-dapur';
    case Role.PRODUKSI:
      return '/dashboard/produksi';
    case Role.SUPPLIER:
      return '/dashboard/supplier';
    case Role.SUPER_ADMIN:
      return '/dashboard/super-admin';
    case Role.ADMIN:
      return '/dashboard/admin';
    case Role.INVESTOR:
      return '/dashboard/investor';
    case Role.PROJECT_OWNER:
      return '/dashboard/project-owner';
    case Role.BUYER:
      return '/dashboard/buyer';
    case Role.ADMIN_INVESTMENT:
      return '/dashboard/investment';
    case Role.ADMIN_TRADING:
      return '/dashboard/admin';
    default:
      return '/dashboard';
  }
};

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();

  const dashboardUrl = user ? getDashboardUrl(user.user.role) : '/dashboard';

  return (
    <nav className="bg-white shadow-sm fixed w-full z-50">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center pt-2">
              <Logo className="h-12" />
            </Link>
          </div>

          {/* Desktop nav links */}
          <div className="hidden md:ml-6 md:flex md:items-center md:space-x-4">
            <Link href="/" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-amber-600 hover:bg-gray-50">
              Home
            </Link>
            <Link href="#features" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-amber-600 hover:bg-gray-50">
              Fitur
            </Link>
            <Link href="#cara-kerja" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-amber-600 hover:bg-gray-50">
              Cara Kerja
            </Link>
            <Link href="#subscription" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-amber-600 hover:bg-gray-50">
              Langganan
            </Link>
            {user?.user?.role === Role.INVESTOR && (
              <Link href="/dashboard/investor?view=micro-investors" className="px-3 py-2 rounded-md text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                Micro Investors
              </Link>
            )}
          </div>

          {/* Desktop auth buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500 hidden lg:block">
                  {user.user.email}
                </span>
                <Link
                  href={dashboardUrl}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-all shadow-sm hover:shadow-md"
                >
                  <FiGrid className="w-4 h-4" />
                  Dashboard
                </Link>
                <button
                  onClick={logout}
                  className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  Logout
                </button>
              </div>
            ) : (
              <>
                <Link href="/login" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-amber-600 rounded-lg hover:bg-gray-50 transition-all">
                  Masuk
                </Link>
                <Link href="/register" className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-all shadow-sm">
                  Daftar Gratis
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-amber-600 hover:bg-gray-50 focus:outline-none"
            >
              {isOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="md:hidden"
        >
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white shadow-lg">
            <Link href="/" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-amber-600 hover:bg-gray-50">
              Home
            </Link>
            <Link href="#features" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-amber-600 hover:bg-gray-50">
              Fitur
            </Link>
            <Link href="#cara-kerja" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-amber-600 hover:bg-gray-50">
              Cara Kerja
            </Link>
            <Link href="#subscription" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-amber-600 hover:bg-gray-50">
              Langganan
            </Link>
            {user?.user?.role === Role.INVESTOR && (
              <Link href="/dashboard/investor?view=micro-investors" className="block px-3 py-2 rounded-md text-base font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => setIsOpen(false)}>
                Micro Investors
              </Link>
            )}

            <div className="pt-4 pb-3 border-t border-gray-200 space-y-2">
              {user ? (
                <>
                  <div className="px-3 py-2 text-sm text-gray-500">
                    {user.user.email}
                  </div>
                  <Link
                    href={dashboardUrl}
                    className="flex items-center gap-2 mx-3 px-4 py-2.5 rounded-lg text-base font-semibold text-white bg-amber-600 hover:bg-amber-700 transition-all"
                    onClick={() => setIsOpen(false)}
                  >
                    <FiGrid className="w-4 h-4" />
                    Ke Dashboard
                  </Link>
                  <button
                    onClick={() => { logout(); setIsOpen(false); }}
                    className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 transition-all"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-amber-600 hover:bg-gray-50">
                    Masuk
                  </Link>
                  <Link href="/register" className="block mx-3 px-4 py-2.5 mt-1 rounded-lg text-base font-semibold text-white bg-amber-600 hover:bg-amber-700 text-center">
                    Daftar Gratis
                  </Link>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </nav>
  );
};

export default Navbar;