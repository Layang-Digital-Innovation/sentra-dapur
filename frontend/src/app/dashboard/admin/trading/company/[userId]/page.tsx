"use client";

import React, { useEffect, useState } from 'react';
import RoleGuard from '@/components/auth/RoleGuard';
import { Role } from '@/types/user.types';
import { useParams, useRouter } from 'next/navigation';
import { tradingService } from '@/services/trading.service';

export default function AdminCompanyDetailPage() {
  const { userId } = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!userId) return;
      setLoading(true);
      setError(null);
      try {
        const data = await tradingService.getSellerProfileById(String(userId));
        if (!mounted) return;
        setProfile(data || null);
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load company profile');
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [userId]);

  return (
    <RoleGuard allowedRoles={[Role.ADMIN, Role.ADMIN_TRADING, Role.SUPER_ADMIN]}>
      <div className="py-6">
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
          <button onClick={() => router.back()} className="px-3 py-1 rounded border hover:bg-gray-50">Back</button>
          <span>/</span>
          <span className="text-gray-900 font-medium">Company Detail (Admin)</span>
        </div>

        {loading && <div>Loading...</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}

        {profile && (
          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              {profile.companyLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.companyLogo} alt="company" className="h-16 w-16 rounded-full object-cover border" />
              ) : (
                <div className="h-16 w-16 rounded-full bg-gray-200" />
              )}
              <div className="flex-1">
                <div className="text-lg font-semibold text-gray-900">{profile.companyName || 'Company'}</div>
                <div className="text-sm text-gray-600 whitespace-pre-line">{profile.descriptions || '-'}</div>
                <div className="mt-2 text-xs text-gray-500">Country: {profile.country || '-'}</div>
                <div className="text-xs text-gray-500">Address: {profile.address || '-'}</div>
                {profile.profileCompanyUrl && (
                  <a href={profile.profileCompanyUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs px-3 py-1.5 rounded border bg-gray-50 hover:bg-gray-100 text-amber-600">View Profile Company</a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
