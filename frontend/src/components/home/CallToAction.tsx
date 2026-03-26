"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';

const CallToAction = () => {
  return (
    <section className="py-24 bg-gradient-to-br from-stone-900 via-orange-900 to-amber-700 text-white relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-400 opacity-10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-300 opacity-10 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>

      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 relative z-10">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-6xl mb-6"
          >
            🍳
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-4xl font-bold mb-6"
          >
            Siap Kelola Dapur Anda Lebih Efisien?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-xl text-orange-100 max-w-3xl mx-auto mb-10 leading-relaxed"
          >
            Bergabunglah dengan Sentra Dapur dan rasakan kemudahan manajemen cloud kitchen — dari Purchase Order, stok bahan baku, arus kas, hingga koordinasi supplier, semuanya dalam satu platform.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              href="/register"
              className="px-9 py-4 bg-white text-orange-700 font-bold rounded-xl hover:bg-orange-50 transition-all shadow-lg text-center text-lg"
            >
              Daftar Sekarang — Gratis
            </Link>
            <Link
              href="/login"
              className="px-9 py-4 bg-white/10 backdrop-blur-sm border border-white/30 text-white font-bold rounded-xl hover:bg-white/20 transition-all text-center text-lg"
            >
              Masuk ke Dashboard
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-6 text-orange-200 text-sm"
          >
            Tidak perlu kartu kredit · Setup dalam menit · Dukungan tim kami siap membantu
          </motion.p>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;