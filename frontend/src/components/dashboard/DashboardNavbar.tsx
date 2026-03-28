"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectNotifications } from '@/contexts/ProjectNotificationContext';
import InvestmentService from '@/services/investment.service';
import { Notification } from '@/types/investment.types';
import { 
  FiBell, 
  FiSearch, 
  FiUser, 
  FiLogOut, 
  FiMenu, 
  FiX,
  FiChevronDown,
  FiHelpCircle,
  FiSun,
  FiMoon,
  FiSidebar,
  FiHome,
  FiFolder,
  FiShoppingBag,
  FiDollarSign,
  FiBook,
  FiCalendar,
  FiClipboard,
  FiUsers,
  FiPackage,
  FiSettings,
  FiActivity,
  FiUserCheck,
} from 'react-icons/fi';
import { Logo } from '@/components/ui/Logo';

interface DashboardNavbarProps {
  onMobileMenuToggle: () => void;
  isMobileMenuOpen: boolean;
  onSidebarToggle: () => void;
  isSidebarCollapsed: boolean;
}

// Menu links per role untuk search
const ROLE_MENUS: Record<string, { name: string; href: string; icon: React.ReactNode; keywords: string[] }[]> = {
  ADMIN_DAPUR: [
    { name: 'Dashboard Dapur', href: '/dashboard/admin-dapur', icon: <FiHome />, keywords: ['dashboard', 'beranda', 'home'] },
    { name: 'Kas Umum', href: '/dashboard/admin-dapur/arus-kas/umum', icon: <FiDollarSign />, keywords: ['kas', 'umum', 'keuangan', 'buku'] },
    { name: 'Kas Pembantu', href: '/dashboard/admin-dapur/arus-kas/pembantu', icon: <FiDollarSign />, keywords: ['kas', 'pembantu', 'keuangan', 'buku'] },
    { name: 'Gudang Bahan', href: '/dashboard/admin-dapur/gudang/bahan', icon: <FiPackage />, keywords: ['gudang', 'bahan', 'stok', 'inventori'] },
    { name: 'Gudang Lain-lain', href: '/dashboard/admin-dapur/gudang/lain', icon: <FiPackage />, keywords: ['gudang', 'lain', 'stok', 'inventori'] },
    { name: 'Master Menu', href: '/dashboard/admin-dapur/menu', icon: <FiBook />, keywords: ['menu', 'master', 'resep', 'makanan'] },
    { name: 'Penjadwalan Menu', href: '/dashboard/admin-dapur/kalender', icon: <FiCalendar />, keywords: ['jadwal', 'kalender', 'menu', 'planning'] },
    { name: 'PO Automation (Kalkulasi)', href: '/dashboard/admin-dapur/kalkulasi', icon: <FiClipboard />, keywords: ['kalkulasi', 'otomatis', 'po', 'purchase', 'order'] },
    { name: 'List Purchase Order', href: '/dashboard/admin-dapur/po', icon: <FiShoppingBag />, keywords: ['po', 'purchase', 'order', 'pembelian', 'daftar'] },
    { name: 'Invoice & Pembayaran', href: '/dashboard/admin-dapur/po/invoices', icon: <FiDollarSign />, keywords: ['invoice', 'pembayaran', 'tagihan', 'bayar'] },
    { name: 'Tim Produksi', href: '/dashboard/admin-dapur/produksi', icon: <FiUsers />, keywords: ['tim', 'produksi', 'karyawan', 'staff'] },
    { name: 'Laporan Keuangan', href: '/dashboard/admin-dapur/laporan', icon: <FiBook />, keywords: ['laporan', 'keuangan', 'bku', 'bkk', 'lbbp', 'lra', 'lbo', 'lbs', 'lpd2m', 'pdf', 'excel', 'download'] },
    { name: 'Settings', href: '/dashboard/settings', icon: <FiSettings />, keywords: ['pengaturan', 'settings', 'profil'] },
  ],
  ADMIN_PUSAT: [
    { name: 'Dashboard Pusat', href: '/dashboard/admin-pusat', icon: <FiActivity />, keywords: ['dashboard', 'beranda', 'pusat'] },
    { name: 'Approval Transaksi', href: '/dashboard/admin-pusat/approvals', icon: <FiUserCheck />, keywords: ['approval', 'persetujuan', 'transaksi'] },
    { name: 'Unit Dapur', href: '/dashboard/admin-pusat/dapur', icon: <FiFolder />, keywords: ['dapur', 'unit', 'kitchen'] },
    { name: 'Manajemen User', href: '/dashboard/admin-pusat/users', icon: <FiUsers />, keywords: ['user', 'pengguna', 'manajemen', 'akun'] },
    { name: 'Master Porsi', href: '/dashboard/admin-pusat/porsi', icon: <FiSettings />, keywords: ['porsi', 'master', 'ukuran'] },
    { name: 'Master Menu', href: '/dashboard/admin-pusat/menu', icon: <FiBook />, keywords: ['menu', 'master', 'makanan'] },
    { name: 'Katalog Supplier', href: '/dashboard/admin-pusat/marketplace', icon: <FiPackage />, keywords: ['supplier', 'katalog', 'produk', 'marketplace'] },
    { name: 'Purchase Orders', href: '/dashboard/admin-pusat/po', icon: <FiShoppingBag />, keywords: ['po', 'purchase', 'order', 'pembelian'] },
    { name: 'Settings', href: '/dashboard/settings', icon: <FiSettings />, keywords: ['pengaturan', 'settings'] },
  ],
  PROJECT_OWNER: [
    { name: 'Dashboard PO', href: '/dashboard/project-owner', icon: <FiHome />, keywords: ['dashboard', 'beranda'] },
    { name: 'Approval Transaksi', href: '/dashboard/admin-pusat/approvals', icon: <FiUserCheck />, keywords: ['approval', 'persetujuan'] },
    { name: 'Admin Pusat', href: '/dashboard/project-owner/admin-pusat', icon: <FiUsers />, keywords: ['admin', 'pusat', 'manajemen'] },
    { name: 'Data Dapur', href: '/dashboard/project-owner/dapur', icon: <FiFolder />, keywords: ['dapur', 'data', 'unit'] },
    { name: 'Dividen & Laba', href: '/dashboard/project-owner/dividen', icon: <FiDollarSign />, keywords: ['dividen', 'laba', 'profit', 'keuangan'] },
    { name: 'Settings', href: '/dashboard/settings', icon: <FiSettings />, keywords: ['pengaturan', 'settings'] },
  ],
  PRODUKSI: [
    { name: 'Dashboard', href: '/dashboard/produksi', icon: <FiHome />, keywords: ['dashboard', 'beranda'] },
    { name: 'Master Menu', href: '/dashboard/admin-dapur/menu', icon: <FiBook />, keywords: ['menu', 'resep', 'makanan'] },
    { name: 'Penjadwalan Menu', href: '/dashboard/admin-dapur/kalender', icon: <FiCalendar />, keywords: ['jadwal', 'kalender', 'planning'] },
    { name: 'Kalkulasi PO', href: '/dashboard/admin-dapur/kalkulasi', icon: <FiClipboard />, keywords: ['kalkulasi', 'po', 'purchase'] },
    { name: 'Stok Bahan Baku', href: '/dashboard/admin-dapur/stok', icon: <FiPackage />, keywords: ['stok', 'bahan', 'baku', 'gudang'] },
    { name: 'Settings', href: '/dashboard/settings', icon: <FiSettings />, keywords: ['pengaturan', 'settings'] },
  ],
};

const DashboardNavbar: React.FC<DashboardNavbarProps> = ({ 
  onMobileMenuToggle, 
  isMobileMenuOpen,
  onSidebarToggle,
  isSidebarCollapsed
}) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { pendingProjectsCount } = useProjectNotifications();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Init dark mode dari localStorage
  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved === 'true') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  };

  // Search logic: filter menu items sesuai role
  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      setIsSearchOpen(false);
      return;
    }
    const role = user?.user?.role || '';
    const menus = ROLE_MENUS[role] || [];
    const lower = q.toLowerCase();
    const results = menus.filter(item =>
      item.name.toLowerCase().includes(lower) ||
      item.keywords.some(k => k.includes(lower))
    );
    setSearchResults(results);
    setIsSearchOpen(true);
  }, [user?.user?.role]);

  const handleSelectResult = (href: string) => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchOpen(false);
    router.push(href);
  };

  // Load notifications
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        setIsLoadingNotifications(true);
        const [notificationsData, unreadCountData] = await Promise.all([
          InvestmentService.getNotifications(1, 10),
          InvestmentService.getUnreadNotificationCount()
        ]);
        const notificationsArray = notificationsData.notifications || [];
        let unreadCountValue = 0;
        if (typeof unreadCountData?.count === 'number') {
          unreadCountValue = unreadCountData.count;
        } else if (typeof notificationsData?.unreadCount === 'number') {
          unreadCountValue = notificationsData.unreadCount;
        } else if (typeof unreadCountData === 'number') {
          unreadCountValue = unreadCountData;
        }
        setNotifications(notificationsArray);
        setUnreadCount(unreadCountValue);
      } catch {
        setNotifications([]);
        setUnreadCount(0);
      } finally {
        setIsLoadingNotifications(false);
      }
    };
    if (user) loadNotifications();
  }, [user]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await InvestmentService.markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const formatTimeAgo = (date: Date | string) => {
    try {
      const now = new Date();
      const d = typeof date === 'string' ? new Date(date) : date;
      if (!d || isNaN(d.getTime())) return 'Baru saja';
      const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
      if (mins < 1) return 'Baru saja';
      if (mins < 60) return `${mins} menit lalu`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs} jam lalu`;
      return `${Math.floor(hrs / 24)} hari lalu`;
    } catch {
      return 'Baru saja';
    }
  };

  const role = user?.user?.role || '';
  const hasSearchSupport = !!ROLE_MENUS[role];
  const placeholderByRole: Record<string, string> = {
    ADMIN_DAPUR: 'Cari menu, kas, gudang, PO...',
    ADMIN_PUSAT: 'Cari dapur, user, PO, katalog...',
    PROJECT_OWNER: 'Cari dapur, dividen, approval...',
    PRODUKSI: 'Cari menu, jadwal, kalkulasi...',
  };
  const searchPlaceholder = placeholderByRole[role] || 'Cari fitur...';

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-lg border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 transition-colors duration-200">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left - Mobile toggle & Logo */}
          <div className="flex items-center">
            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-slate-900 transition-colors duration-200"
              onClick={onMobileMenuToggle}
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? <FiX className="block h-6 w-6" /> : <FiMenu className="block h-6 w-6" />}
            </button>
            <div className="md:hidden ml-1 flex items-center">
              <Logo className="h-10" showText={false} />
            </div>
          </div>

          {/* Center - Sidebar toggle & Search */}
          <div className="hidden md:flex items-center flex-1 max-w-lg mx-8">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none transition-colors duration-200 mr-3"
              onClick={onSidebarToggle}
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <FiSidebar className="block h-5 w-5" />
            </button>

            {/* Search box */}
            <div className="relative w-full" ref={searchRef}>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder={hasSearchSupport ? searchPlaceholder : 'Cari fitur...'}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => searchQuery && setIsSearchOpen(true)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
              />
              {/* Dropdown hasil pencarian */}
              {isSearchOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl z-50 overflow-hidden">
                  {searchResults.length > 0 ? (
                    <>
                      <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-gray-700">
                        Halaman Ditemukan
                      </div>
                      {searchResults.map((item) => (
                        <button
                          key={item.href}
                          onClick={() => handleSelectResult(item.href)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-amber-50 dark:hover:bg-gray-700 transition-colors text-left"
                        >
                          <span className="text-amber-600 flex-shrink-0">{item.icon}</span>
                          <span className="font-medium">{item.name}</span>
                          <span className="ml-auto text-xs text-gray-400 truncate max-w-[160px]">{item.href}</span>
                        </button>
                      ))}
                    </>
                  ) : (
                    <div className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                      Tidak ditemukan hasil untuk &quot;{searchQuery}&quot;
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right - Actions */}
          <div className="flex items-center space-x-1">
            {/* Mobile search icon */}
            <button className="md:hidden p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-200">
              <FiSearch className="h-5 w-5" />
            </button>

            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              title={isDarkMode ? 'Mode Terang' : 'Mode Gelap'}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-gray-800 rounded-lg transition-all duration-200"
            >
              {isDarkMode 
                ? <FiSun className="h-5 w-5 text-amber-500" /> 
                : <FiMoon className="h-5 w-5" />
              }
            </button>

            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-200"
              >
                <FiBell className="h-5 w-5" />
                {(unreadCount > 0 || pendingProjectsCount > 0) && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {unreadCount + pendingProjectsCount}
                  </span>
                )}
              </button>

              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Notifikasi</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {isLoadingNotifications ? (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">Memuat...</div>
                    ) : notifications.length === 0 && pendingProjectsCount === 0 ? (
                      <div className="p-6 text-center text-gray-400 dark:text-gray-500 text-sm">Belum ada notifikasi</div>
                    ) : (
                      <>
                        {pendingProjectsCount > 0 && (
                          <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Project Menunggu Review</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{pendingProjectsCount} project menunggu persetujuan</p>
                          </div>
                        )}
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            onClick={() => handleMarkAsRead(notification.id)}
                            className={`p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${!notification.isRead ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{notification.title}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{notification.message}</p>
                                <p className="text-[10px] text-gray-400 mt-1">{formatTimeAgo(notification.createdAt)}</p>
                              </div>
                              {!notification.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />}
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                  <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <button className="w-full text-center text-xs text-amber-600 hover:text-amber-700 font-semibold">
                      Lihat semua notifikasi
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-slate-900 to-slate-700 flex items-center justify-center text-white font-bold text-sm">
                  {user?.user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-32">
                    {user?.user.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 capitalize">
                    {user?.user.role?.toLowerCase().replace(/_/g, ' ') || 'User'}
                  </p>
                </div>
                <FiChevronDown className="hidden md:block h-4 w-4 text-gray-400" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.user.email}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-0.5">
                      {user?.user.role?.toLowerCase().replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/dashboard/settings"
                      className="flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <FiUser className="mr-3 h-4 w-4" />
                      Profile &amp; Settings
                    </Link>
                    <Link
                      href="/dashboard/help"
                      className="flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <FiHelpCircle className="mr-3 h-4 w-4" />
                      Bantuan
                    </Link>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 py-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <FiLogOut className="mr-3 h-4 w-4" />
                      Keluar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default DashboardNavbar;