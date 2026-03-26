"use client";

import { motion } from 'framer-motion';

const HowItWorks = () => {
  const steps = [
    {
      number: "01",
      role: "Admin Pusat",
      emoji: "⭐",
      color: "orange",
      title: "Kelola Dapur & Pengguna",
      description: "Admin Pusat mendaftarkan unit dapur, menunjuk Admin Dapur, dan mengelola akun supplier. Semua dalam satu dashboard terpusat."
    },
    {
      number: "02",
      role: "Admin Dapur",
      emoji: "🍳",
      color: "amber",
      title: "Operasional Harian",
      description: "Admin Dapur membuat Purchase Order ke supplier, memantau stok bahan baku, dan mencatat arus kas dapur mereka sehari-hari."
    },
    {
      number: "03",
      role: "Admin Pusat",
      emoji: "✅",
      color: "green",
      title: "Approval & Monitoring",
      description: "Admin Pusat me-review dan menyetujui PO yang masuk, memantau performa semua dapur, serta mengelola katalog produk marketplace."
    },
    {
      number: "04",
      role: "Supplier",
      emoji: "🏭",
      color: "blue",
      title: "Kirim & Update Produk",
      description: "Supplier menerima PO, memproses pesanan, dan mengupload katalog produk beserta harga terbaru ke marketplace secara mandiri."
    }
  ];

  const colorMap: Record<string, { bg: string; border: string; tag: string; num: string }> = {
    orange: { bg: "bg-orange-50", border: "border-orange-200", tag: "bg-orange-100 text-orange-700", num: "text-orange-500" },
    amber:  { bg: "bg-amber-50",  border: "border-amber-200",  tag: "bg-amber-100 text-amber-700",  num: "text-amber-500" },
    green:  { bg: "bg-green-50",  border: "border-green-200",  tag: "bg-green-100 text-green-700",  num: "text-green-500" },
    blue:   { bg: "bg-blue-50",   border: "border-blue-200",   tag: "bg-blue-100 text-blue-700",   num: "text-blue-500" },
  };

  return (
    <section className="py-20 bg-gradient-to-b from-orange-50 to-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1 bg-orange-100 text-orange-700 text-sm font-semibold rounded-full mb-4"
          >
            Cara Kerja Platform
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
          >
            Alur Kerja Sentra Dapur
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-xl text-gray-600 max-w-3xl mx-auto"
          >
            Sistem yang terstruktur untuk setiap peran — dari Admin Pusat, Admin Dapur, hingga Supplier.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => {
            const c = colorMap[step.color];
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative ${c.bg} border ${c.border} p-7 rounded-2xl hover:shadow-md transition-all duration-300`}
              >
                <div className={`text-5xl font-black ${c.num} opacity-20 absolute top-4 right-5`}>{step.number}</div>
                <div className="text-4xl mb-4">{step.emoji}</div>
                <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full mb-3 ${c.tag}`}>{step.role}</span>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
