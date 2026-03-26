"use client";

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FiCheck } from 'react-icons/fi';
import Link from 'next/link';
import { subscriptionService } from '@/services/subscription.service';

const SubscriptionPlans = () => {
  const [backendPlans, setBackendPlans] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await subscriptionService.getSubscriptionPlans();
        setBackendPlans(Array.isArray(res) ? res : []);
      } catch (e) {
        // ignore silently on landing page
      }
    };
    load();
  }, []);

  const goldMonthlyUSD = useMemo(() => backendPlans.find((p) => p.plan === 'GOLD_MONTHLY' && p.currency === 'USD'), [backendPlans]);
  const goldMonthlyIDR = useMemo(() => backendPlans.find((p) => p.plan === 'GOLD_MONTHLY' && p.currency === 'IDR'), [backendPlans]);
  const goldYearlyUSD = useMemo(() => backendPlans.find((p) => p.plan === 'GOLD_YEARLY' && p.currency === 'USD'), [backendPlans]);
  const goldYearlyIDR = useMemo(() => backendPlans.find((p) => p.plan === 'GOLD_YEARLY' && p.currency === 'IDR'), [backendPlans]);

  const fmtUSD = (n?: number) => {
    if (typeof n !== 'number') return '-';
    try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n); } catch { return `$${n}`; }
  };
  const fmtIDR = (n?: number) => {
    if (typeof n !== 'number') return '-';
    try { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n); } catch { return `Rp ${n.toLocaleString('id-ID')}`; }
  };

  const plans = [
    {
      name: "Free Trial",
      price: "Gratis",
      duration: "7 hari",
      features: [
        "Akses dasar ke platform",
        "1 unit dapur",
        "Manajemen stok dasar",
        "Buat & kelola PO (maks. 10/bulan)",
        "Dukungan email"
      ],
      buttonText: "Coba Gratis",
      buttonLink: "/register",
      highlighted: false
    },
    {
      name: "Gold Plan",
      price: `${fmtUSD(goldMonthlyUSD?.price)} | ${fmtIDR(goldMonthlyIDR?.price)}`,
      duration: "per bulan (USD | IDR)",
      features: [
        "Akses penuh ke semua fitur",
        "Dapur tidak terbatas",
        "Manajemen stok real-time",
        "PO & approval tidak terbatas",
        "Monitoring arus kas lengkap",
        "Katalog supplier & marketplace",
        "Laporan & analitik dapur",
        "Prioritas dukungan tim"
      ],
      buttonText: "Berlangganan Sekarang",
      buttonLink: "/subscribe",
      highlighted: true,
      yearlyPrice: `${fmtUSD(goldYearlyUSD?.price)} | ${fmtIDR(goldYearlyIDR?.price)}`
    },
    {
      name: "Enterprise",
      price: "Custom",
      duration: "solusi khusus",
      features: [
        "Semua fitur Gold Plan",
        "Account manager dedikasi",
        "Integrasi sistem kustom",
        "Analitik & laporan lanjutan",
        "Onboarding tim lengkap",
        "Dukungan 24/7"
      ],
      buttonText: "Hubungi Kami",
      buttonLink: "/contact",
      highlighted: false
    }
  ];

  return (
    <section id="subscription" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
          >
            Paket Langganan
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-xl text-gray-600 max-w-3xl mx-auto"
          >
            Pilih paket yang sesuai dengan kebutuhan dapur Anda
          </motion.p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`rounded-lg overflow-hidden ${
                plan.highlighted 
                  ? 'ring-2 ring-yellow-500 shadow-xl' 
                  : 'border border-gray-200 shadow-sm'
              }`}
            >
              {plan.highlighted && (
                <div className="bg-slate-900 text-white text-center py-2 text-sm font-medium">
                  Paling Populer
                </div>
              )}
              
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{plan.name}</h3>
                <div className="flex items-baseline mb-6">
                  <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                  <span className="ml-2 text-gray-500">{plan.duration}</span>
                </div>
                
                {plan.highlighted && (
                  <div className="mb-6 p-3 bg-slate-50 rounded-md text-center">
                    <p className="text-amber-700 font-medium">Hemat 50% dengan pembayaran tahunan</p>
                    <p className="text-slate-900 font-bold mt-1">{plan.yearlyPrice} per year</p>
                  </div>
                )}
                
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <FiCheck className="h-5 w-5 text-amber-600 mr-2 mt-0.5" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Link 
                  href={plan.buttonLink}
                  className={`w-full block text-center px-6 py-3 rounded-md font-medium ${
                    plan.highlighted
                      ? 'bg-amber-600 text-white hover:bg-amber-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {plan.buttonText}
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-gray-500">
            Semua paket termasuk uji coba gratis 7 hari. Tidak perlu kartu kredit untuk memulai.
          </p>
        </div>
      </div>
    </section>
  );
};

export default SubscriptionPlans;