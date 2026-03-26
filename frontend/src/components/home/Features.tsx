"use client";

import { motion } from 'framer-motion';
import { FiUsers, FiShoppingCart, FiPackage, FiTrendingUp, FiGrid, FiSettings } from 'react-icons/fi';

const Features = () => {
  const features = [
    {
      icon: <FiGrid className="w-6 h-6" />,
      title: "Manajemen Dapur",
      description: "Admin Pusat dapat membuat dan mengelola unit dapur. Setiap dapur memiliki Admin Dapur yang bertanggung jawab atas operasional harian."
    },
    {
      icon: <FiShoppingCart className="w-6 h-6" />,
      title: "Purchase Order (PO)",
      description: "Admin Dapur membuat PO ke supplier, Admin Pusat menyetujuinya. Seluruh alur pengadaan bahan baku terdokumentasi dengan rapi."
    },
    {
      icon: <FiPackage className="w-6 h-6" />,
      title: "Manajemen Stok",
      description: "Pantau ketersediaan bahan baku di setiap dapur secara real-time. Notifikasi otomatis saat stok mencapai batas minimum."
    },
    {
      icon: <FiTrendingUp className="w-6 h-6" />,
      title: "Arus Kas Dapur",
      description: "Catat dan pantau pemasukan serta pengeluaran dapur. Laporan keuangan transparan memudahkan pengambilan keputusan."
    },
    {
      icon: <FiUsers className="w-6 h-6" />,
      title: "Manajemen Supplier",
      description: "Kelola daftar supplier, katalog produk, dan harga bahan baku. Supplier bisa mengupload produk mereka ke marketplace platform."
    },
    {
      icon: <FiSettings className="w-6 h-6" />,
      title: "Role-Based Access",
      description: "Antarmuka berbeda untuk Admin Pusat, Admin Dapur, dan Supplier. Setiap peran hanya mengakses fitur yang relevan dengan tugasnya."
    }
  ];

  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="inline-block px-4 py-1 bg-orange-100 text-orange-700 text-sm font-semibold rounded-full mb-4"
          >
            🍳 Fitur Platform
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
          >
            Semua yang Anda Butuhkan untuk Kelola Dapur
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-xl text-gray-600 max-w-3xl mx-auto"
          >
            Sentra Dapur menyatukan seluruh manajemen cloud kitchen dalam satu platform — dari pengadaan bahan baku hingga monitoring arus kas.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className="group bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-orange-200 transition-all duration-300"
            >
              <div className="text-orange-600 mb-5 p-3 bg-orange-50 rounded-xl inline-block group-hover:bg-orange-100 transition-colors">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;