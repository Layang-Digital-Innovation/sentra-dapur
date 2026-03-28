import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths that require authentication
const protectedPaths = [
  '/dashboard',
  '/dashboard/admin',
  '/dashboard/investor',
  '/dashboard/project-owner',
  '/dashboard/buyer',
  '/dashboard/supplier',
  '/dashboard/admin/trading',
  '/dashboard/admin/trading/products',
  '/dashboard/admin/trading/orders',
  '/dashboard/projects',
  '/dashboard/chat',
  '/dashboard/investment-chat',
  '/dashboard/admin-pusat',
  '/dashboard/admin-dapur',
  '/dashboard/produksi',
  '/dashboard/super-admin',
];

// Role-specific paths
const roleSpecificPaths = {
  'ADMIN': ['/dashboard/admin'],
  'ADMIN_INVESTMENT': ['/dashboard/admin', '/dashboard/projects', '/dashboard/chat', '/dashboard/investment-chat'],
  'ADMIN_TRADING': ['/dashboard/admin/trading', '/dashboard/admin/trading/products', '/dashboard/admin/trading/orders', '/dashboard/chat'],
  'INVESTOR': ['/dashboard/investor', '/dashboard/investment-chat'],
  'PROJECT_OWNER': ['/dashboard/project-owner', '/dashboard/investment-chat'],
  'ADMIN_PUSAT': ['/dashboard/admin-pusat', '/dashboard/chat'],
  'ADMIN_DAPUR': ['/dashboard/admin-dapur', '/dashboard/chat'],
  'PRODUKSI': ['/dashboard/produksi', '/dashboard/admin-dapur', '/dashboard/chat'],
  'SUPER_ADMIN': ['/dashboard/super-admin', '/dashboard/chat'],
  'BUYER': ['/dashboard/buyer', '/dashboard/chat'],
  'SUPPLIER': ['/dashboard/supplier', '/dashboard/chat'],
} as const;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Redirect authenticated users away from public pages to their dashboard
  const publicRedirectPaths = ['/', '/login', '/register'];
  const token = request.cookies.get('auth_token')?.value;
  const userRole = request.cookies.get('user_role')?.value;
  if (publicRedirectPaths.includes(pathname) && token) {
    if (userRole === 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard/admin', request.url));
    } else if (userRole === 'ADMIN_INVESTMENT') {
      return NextResponse.redirect(new URL('/dashboard/admin', request.url));
    } else if (userRole === 'ADMIN_TRADING') {
      return NextResponse.redirect(new URL('/dashboard/admin/trading', request.url));
    } else if (userRole === 'INVESTOR') {
      return NextResponse.redirect(new URL('/dashboard/investor', request.url));
    } else if (userRole === 'PROJECT_OWNER') {
      return NextResponse.redirect(new URL('/dashboard/project-owner', request.url));
    } else if (userRole === 'ADMIN_PUSAT') {
      return NextResponse.redirect(new URL('/dashboard/admin-pusat', request.url));
    } else if (userRole === 'ADMIN_DAPUR') {
      return NextResponse.redirect(new URL('/dashboard/admin-dapur', request.url));
    } else if (userRole === 'PRODUKSI') {
      return NextResponse.redirect(new URL('/dashboard/produksi', request.url));
    } else if (userRole === 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/dashboard/super-admin', request.url));
    } else if (userRole === 'BUYER') {
      return NextResponse.redirect(new URL('/dashboard/buyer', request.url));
    } else if (userRole === 'SUPPLIER') {
      return NextResponse.redirect(new URL('/dashboard/supplier', request.url));
    } else {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }
  
  // Check if the path is protected
  const isProtectedPath = protectedPaths.some(path => 
    pathname === path || pathname.startsWith(`${path}/`)
  );
  
  if (isProtectedPath) {
    // Get the token from cookies
    const protectedToken = request.cookies.get('auth_token')?.value;
    
    if (!protectedToken) {
      // Redirect to login if no token
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
    
    // Get user role from cookies
    const protectedUserRole = request.cookies.get('user_role')?.value;
    
    if (protectedUserRole) {
      // If user opens generic /dashboard, route to role-specific landing
      if (pathname === '/dashboard') {
        if (protectedUserRole === 'ADMIN' || protectedUserRole === 'ADMIN_INVESTMENT') {
          return NextResponse.redirect(new URL('/dashboard/admin', request.url));
        } else if (protectedUserRole === 'ADMIN_TRADING') {
          return NextResponse.redirect(new URL('/dashboard/admin/trading', request.url));
        } else if (protectedUserRole === 'INVESTOR') {
          return NextResponse.redirect(new URL('/dashboard/investor', request.url));
        } else if (protectedUserRole === 'PROJECT_OWNER') {
          return NextResponse.redirect(new URL('/dashboard/project-owner', request.url));
        } else if (protectedUserRole === 'ADMIN_PUSAT') {
          return NextResponse.redirect(new URL('/dashboard/admin-pusat', request.url));
        } else if (protectedUserRole === 'ADMIN_DAPUR') {
          return NextResponse.redirect(new URL('/dashboard/admin-dapur', request.url));
        } else if (protectedUserRole === 'PRODUKSI') {
          return NextResponse.redirect(new URL('/dashboard/produksi', request.url));
        } else if (protectedUserRole === 'SUPER_ADMIN') {
          return NextResponse.redirect(new URL('/dashboard/super-admin', request.url));
        } else if (protectedUserRole === 'BUYER') {
          return NextResponse.redirect(new URL('/dashboard/buyer', request.url));
        } else if (protectedUserRole === 'SUPPLIER') {
          return NextResponse.redirect(new URL('/dashboard/supplier', request.url));
        }
      }
      // Check if user has access to the specific dashboard
      const allowedPaths = (roleSpecificPaths as any)[protectedUserRole] || [];
      const isRoleSpecificPath = (Object.values(roleSpecificPaths).flat() as string[]).some((path: string) => 
        pathname === path || pathname.startsWith(`${path}/`)
      );
      
      // If it's a role-specific path and user doesn't have access, redirect to their dashboard
      if (isRoleSpecificPath && !allowedPaths.some((path: string) => pathname === path || pathname.startsWith(`${path}/`))) {
        // Redirect to appropriate dashboard based on role
        if (protectedUserRole === 'ADMIN') {
          return NextResponse.redirect(new URL('/dashboard/admin', request.url));
        } else if (protectedUserRole === 'ADMIN_INVESTMENT') {
          return NextResponse.redirect(new URL('/dashboard/admin', request.url));
        } else if (protectedUserRole === 'ADMIN_TRADING') {
          return NextResponse.redirect(new URL('/dashboard/admin/trading', request.url));
        } else if (protectedUserRole === 'INVESTOR') {
          return NextResponse.redirect(new URL('/dashboard/investor', request.url));
        } else if (protectedUserRole === 'PROJECT_OWNER') {
          return NextResponse.redirect(new URL('/dashboard/project-owner', request.url));
        } else if (protectedUserRole === 'ADMIN_PUSAT') {
          return NextResponse.redirect(new URL('/dashboard/admin-pusat', request.url));
        } else if (protectedUserRole === 'ADMIN_DAPUR') {
          return NextResponse.redirect(new URL('/dashboard/admin-dapur', request.url));
        } else if (protectedUserRole === 'PRODUKSI') {
          return NextResponse.redirect(new URL('/dashboard/produksi', request.url));
        } else if (protectedUserRole === 'SUPER_ADMIN') {
          return NextResponse.redirect(new URL('/dashboard/super-admin', request.url));
        } else if (protectedUserRole === 'BUYER') {
          return NextResponse.redirect(new URL('/dashboard/buyer', request.url));
        } else if (protectedUserRole === 'SUPPLIER') {
          return NextResponse.redirect(new URL('/dashboard/supplier', request.url));
        } else {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
      }
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/login',
    '/register',
  ],
};