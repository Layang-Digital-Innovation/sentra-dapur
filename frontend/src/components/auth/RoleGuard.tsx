"use client";

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Role } from '@/types/user.types';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: Role[];
  fallback?: React.ReactNode;
  requireAll?: boolean; // If true, user must have ALL roles, if false, user needs ANY role
}

const RoleGuard: React.FC<RoleGuardProps> = ({ 
  children, 
  allowedRoles, 
  fallback = null,
  requireAll = false 
}) => {
  const { user, hasAnyRole, hasRole } = useAuth();

  if (!user) {
    return <>{fallback}</>;
  }

  const userRole = user.user.role as Role;
  
  // Check if user has required role(s)
  const hasAccess = requireAll 
    ? allowedRoles.every(role => hasRole(role))
    : hasAnyRole(allowedRoles);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default RoleGuard;