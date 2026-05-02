"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import authService, { LoginData, RegisterData, LoginResponse } from '../services/auth.service';

interface AuthContextType {
  user: LoginResponse | null;
  loading: boolean;
  error: string | null;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  isAuthenticated: () => boolean;
  getUserRole: () => string | null;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  isSuperAdmin: () => boolean;
  isAdmin: () => boolean;
  isAdminOrSuperAdmin: () => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<LoginResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();

    // Listen to global logout events (e.g., from axios interceptors)
    const onExternalLogout = () => {
      setUser(null);
      setError(null);
      // Ensure redirect to login with status flag to avoid stale navbar
      router.push('/login?expired=true');
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:logout', onExternalLogout);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth:logout', onExternalLogout);
      }
    };
  }, [router]);

  const login = async (data: LoginData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authService.login(data);
      setUser(response);
      
      // Redirect based on user role
      const role = response.user.role;
      if (role === 'SUPER_ADMIN') {
        router.push('/dashboard/super-admin');
      } else if (role === 'ADMIN') {
        router.push('/dashboard/admin');
      } else if (role === 'ADMIN_INVESTMENT') {
        router.push('/dashboard/admin');
      } else if (role === 'ADMIN_TRADING') {
        router.push('/dashboard/admin/trading/products');
      } else if (role === 'INVESTOR') {
        router.push('/dashboard/investor');
      } else if (role === 'PROJECT_OWNER') {
        router.push('/dashboard/project-owner');
      } else if (role === 'BUYER') {
        router.push('/dashboard/buyer');
      } else if (role === 'SUPPLIER') {
        router.push('/dashboard/seller');
      } else if (role === 'ADMIN_PUSAT') {
        router.push('/dashboard/admin-pusat');
      } else if (role === 'ADMIN_DAPUR') {
        router.push('/dashboard/admin-dapur');
      } else if (role === 'AKUNTAN') {
        router.push('/dashboard/admin-dapur');
      } else if (role === 'PRODUKSI' || role === 'AHLI_GIZI' || role === 'CHEF') {
        router.push('/dashboard/produksi');
      } else if (role === 'GUDANG') {
        router.push('/dashboard/admin-dapur/gudang/bahan');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('Login failed. Please check your credentials.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    try {
      setLoading(true);
      setError(null);
      await authService.register(data);
      router.push('/login?registered=true');
    } catch (err) {
      setError('Registration failed. Please try again.');
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setError(null);
    // Redirect to login page for consistent UX
    router.push('/login');
  };

  const isAuthenticated = () => {
    return !!user;
  };

  const getUserRole = () => {
    return user?.user.role || null;
  };

  const hasRole = (role: string) => {
    return user?.user.role === role;
  };

  const hasAnyRole = (roles: string[]) => {
    return roles.includes(user?.user.role || '');
  };

  const isSuperAdmin = () => {
    return user?.user.role === 'SUPER_ADMIN';
  };

  const isAdmin = () => {
    const r = user?.user.role;
    return r === 'ADMIN' || r === 'ADMIN_INVESTMENT' || r === 'ADMIN_TRADING';
  };

  const isAdminOrSuperAdmin = () => {
    return hasAnyRole(['ADMIN', 'ADMIN_INVESTMENT', 'ADMIN_TRADING', 'SUPER_ADMIN']);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        logout,
        isAuthenticated,
        getUserRole,
        hasRole,
        hasAnyRole,
        isSuperAdmin,
        isAdmin,
        isAdminOrSuperAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};