"use client";

import { motion } from 'framer-motion';

const StatsSection = () => {
  const stats = [
    { value: "50+", label: "Unit Dapur Aktif", emoji: "🍳" },
    { value: "200+", label: "Supplier Terdaftar", emoji: "🏭" },
    { value: "10.000+", label: "PO Diproses", emoji: "📋" },
    { value: "99.9%", label: "Uptime Platform", emoji: "⚡" },
  ];

  return (
    <section className="py-16 bg-gradient-to-r from-orange-700 to-amber-600 text-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="text-center"
            >
              <div className="text-4xl mb-2">{stat.emoji}</div>
              <div className="text-4xl md:text-5xl font-black mb-1">{stat.value}</div>
              <div className="text-orange-100 text-sm font-medium">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
