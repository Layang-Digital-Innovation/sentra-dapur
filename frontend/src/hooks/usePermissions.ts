"use client";

import { useAuth } from '@/contexts/AuthContext';
import { Role } from '@/types/user.types';

export const usePermissions = () => {
  const { 
    user, 
    hasRole, 
    hasAnyRole, 
    isSuperAdmin, 
    isAdmin, 
    isAdminOrSuperAdmin 
  } = useAuth();

  // Permission checking functions
  const canManageUsers = () => {
    return isAdminOrSuperAdmin();
  };

  const canManageAllProjects = () => {
    return isAdminOrSuperAdmin();
  };

  const canViewAnalytics = () => {
    return hasAnyRole([Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_OWNER]);
  };

  const canViewSystemAnalytics = () => {
    return isSuperAdmin();
  };

  const canManageSubscriptions = () => {
    return isAdminOrSuperAdmin();
  };

  const canManagePayments = () => {
    return isAdminOrSuperAdmin();
  };

  const canViewUserManagement = () => {
    return isAdminOrSuperAdmin();
  };

  const canManageRoles = () => {
    return isSuperAdmin(); // Only SUPER_ADMIN can manage roles
  };

  const canViewReports = () => {
    return hasAnyRole([Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_OWNER]);
  };

  const canManageSettings = () => {
    return isAdminOrSuperAdmin();
  };

  const canViewDashboard = (dashboardType: string) => {
    const userRole = user?.user.role;
    
    switch (dashboardType) {
      case 'super-admin':
        return isSuperAdmin();
      case 'admin':
        return isAdmin();
      case 'investor':
        return hasRole(Role.INVESTOR);
      case 'project-owner':
        return hasRole(Role.PROJECT_OWNER);
      case 'buyer':
        return hasRole(Role.BUYER);
      case 'seller':
        return hasRole(Role.SUPPLIER);
      default:
        return true; // General dashboard accessible to all
    }
  };

  const getAccessibleRoutes = () => {
    const userRole = user?.user.role;
    const routes: string[] = ['/dashboard'];

    if (isSuperAdmin()) {
      routes.push(
        '/dashboard/super-admin',
        '/dashboard/users',
        '/dashboard/analytics',
        '/dashboard/system-analytics',
        '/dashboard/subscriptions',
        '/dashboard/payments',
        '/dashboard/reports',
        '/dashboard/settings'
      );
    } else if (isAdmin()) {
      routes.push(
        '/dashboard/admin',
        '/dashboard/users',
        '/dashboard/analytics',
        '/dashboard/reports',
        '/dashboard/settings'
      );
    } else if (hasRole(Role.INVESTOR)) {
      routes.push(
        '/dashboard/investor',
        '/dashboard/portfolio',
        '/dashboard/investments',
        '/dashboard/projects'
      );
    } else if (hasRole(Role.PROJECT_OWNER)) {
      routes.push(
        '/dashboard/project-owner',
        '/dashboard/my-projects',
        '/dashboard/funding',
        '/dashboard/analytics'
      );
    } else if (hasRole(Role.BUYER)) {
      routes.push(
        '/dashboard/buyer',
        '/dashboard/marketplace',
        '/dashboard/orders'
      );
    } else if (hasRole(Role.SUPPLIER)) {
      routes.push(
        '/dashboard/seller',
        '/dashboard/products',
        '/dashboard/orders',
        '/dashboard/analytics'
      );
    }

    return routes;
  };

  return {
    // Role checking
    hasRole,
    hasAnyRole,
    isSuperAdmin,
    isAdmin,
    isAdminOrSuperAdmin,
    
    // Permission checking
    canManageUsers,
    canManageAllProjects,
    canViewAnalytics,
    canViewSystemAnalytics,
    canManageSubscriptions,
    canManagePayments,
    canViewUserManagement,
    canManageRoles,
    canViewReports,
    canManageSettings,
    canViewDashboard,
    
    // Utility
    getAccessibleRoutes,
    userRole: user?.user.role || null,
  };
};