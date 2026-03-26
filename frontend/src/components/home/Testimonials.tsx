"use client";

import { motion } from 'framer-motion';

const Testimonials = () => {
  const testimonials = [
    {
      quote: "Sentra Dapur mengubah cara kami mengelola bahan baku. Dulu butuh waktu berjam-jam untuk rekap stok, sekarang cukup buka dashboard dan semua tersedia dalam hitungan detik.",
      author: "Budi Santoso",
      role: "Admin Dapur, Cloud Kitchen Jakarta Selatan",
      emoji: "🍳"
    },
    {
      quote: "Sebagai supplier, platform ini sangat memudahkan kami. PO masuk langsung tercatat, kami bisa update status pengiriman, dan pembayaran lebih transparan dari sebelumnya.",
      author: "Rina Dewi",
      role: "Manager, CV Rempah Nusantara (Supplier)",
      emoji: "🏭"
    },
    {
      quote: "Fitur approval PO dari Admin Pusat sangat membantu kontrol pengeluaran. Kami bisa pantau semua dapur sekaligus tanpa harus datang langsung ke lokasi.",
      author: "Dimas Prasetyo",
      role: "Admin Pusat, Sentra Dapur Surabaya",
      emoji: "⭐"
    }
  ];

  return (
    <section className="py-20 bg-stone-50">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1 bg-orange-100 text-orange-700 text-sm font-semibold rounded-full mb-4"
          >
            Testimoni Pengguna
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-4xl font-bold text-stone-900 mb-4"
          >
            Apa Kata Pengguna Kami
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-xl text-gray-600 max-w-3xl mx-auto"
          >
            Kisah sukses dari Admin Dapur, Admin Pusat, dan Supplier yang menggunakan Sentra Dapur
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative"
            >
              <div className="absolute top-5 left-5 text-6xl text-orange-100 font-serif select-none">"</div>
              <div className="relative z-10">
                <div className="text-3xl mb-4">{testimonial.emoji}</div>
                <p className="text-gray-700 mb-6 leading-relaxed italic">{testimonial.quote}</p>
                <div className="border-t border-gray-100 pt-4">
                  <p className="font-semibold text-stone-900">{testimonial.author}</p>
                  <p className="text-orange-600 text-sm mt-0.5">{testimonial.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;