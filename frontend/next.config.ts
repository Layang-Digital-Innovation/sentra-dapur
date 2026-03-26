import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  async rewrites() {
    // Backend URL untuk server-side proxy
    const backendUrl = process.env.BACKEND_URL || 'http://tic-backend:3001';
    const cleanBackend = backendUrl.replace(/\/+$/, '');
    const apiBase = cleanBackend.endsWith('/api') 
      ? cleanBackend 
      : `${cleanBackend}/api`;
    const uploadsBase = cleanBackend.replace(/\/api$/, '');
    
    console.log('Next.js Proxy Configuration:', { backendUrl, apiBase });
    
    return [
      { 
        source: '/api/:path*', 
        destination: `${apiBase}/:path*` 
      },
      {
        source: '/uploads/:path*',
        destination: `${uploadsBase}/uploads/:path*`
      },
    ];
  },
  
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ];
  },
  
  // Disable strict mode untuk menghindari double rendering
  reactStrictMode: false,
};

export default nextConfig;