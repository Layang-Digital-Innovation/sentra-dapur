"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const Hero = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: "Kelola Dapur Sentral Anda dengan Mudah",
      description: "Sentra Dapur adalah platform manajemen cloud kitchen terpadu — kelola stok, arus kas, purchase order, dan supplier dalam satu sistem.",
      color: "from-orange-700 to-amber-500",
      highlight: "Platform Cloud Kitchen #1 Indonesia"
    },
    {
      title: "Manajemen Purchase Order & Supplier",
      description: "Buat, kelola, dan pantau Purchase Order ke supplier secara real-time. Persetujuan PO lebih cepat, transparan, dan terdokumentasi.",
      color: "from-amber-800 to-orange-500",
      highlight: "Efisiensi Pengadaan Bahan Baku"
    },
    {
      title: "Kontrol Stok & Arus Kas Real-Time",
      description: "Pantau stok bahan baku dan arus kas dapur Anda secara langsung. Admin dapur bisa fokus memasak, bukan menghitung manual.",
      color: "from-stone-800 to-amber-600",
      highlight: "Operasional Dapur Lebih Efisien"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const handleDotClick = (index: number) => setCurrentSlide(index);
  const handlePrevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  const handleNextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);

  return (
    <section className="relative overflow-hidden text-white pt-24 pb-16 md:pt-32 md:pb-24 min-h-[90vh] flex items-center">
      {/* Background gradient */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          className={`absolute inset-0 bg-gradient-to-br ${slides[currentSlide].color} z-0`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
        />
      </AnimatePresence>

      {/* Decorative blobs */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-orange-300 opacity-10 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-amber-200 opacity-5 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>

      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 relative z-10 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

          {/* Text Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-block px-4 py-1.5 bg-white/20 backdrop-blur-sm text-sm font-semibold rounded-full mb-4 border border-white/30">
                🍳 {slides[currentSlide].highlight}
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                {slides[currentSlide].title}
              </h1>
              <p className="text-lg md:text-xl text-orange-100 mb-8 leading-relaxed">
                {slides[currentSlide].description}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/register" className="px-7 py-3.5 bg-white text-orange-700 font-semibold rounded-lg hover:bg-orange-50 transition-all shadow-lg text-center">
                  Mulai Sekarang
                </Link>
                <Link href="#features" className="px-7 py-3.5 bg-white/10 border border-white/40 text-white font-semibold rounded-lg hover:bg-white/20 transition-all text-center backdrop-blur-sm">
                  Pelajari Lebih Lanjut
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Visual SVG Illustration */}
          <div className="relative h-[400px] md:h-[450px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.6 }}
                className="w-full h-full relative"
              >
                {/* Slide 0: Cloud Kitchen Dashboard SVG */}
                {currentSlide === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-full h-full max-w-md" viewBox="0 0 240 220" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
                          <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
                        </linearGradient>
                      </defs>
                      {/* Main dashboard card */}
                      <rect x="20" y="20" width="200" height="180" rx="16" fill="url(#cardGrad)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                      {/* Header bar */}
                      <rect x="20" y="20" width="200" height="40" rx="16" fill="rgba(255,255,255,0.15)" />
                      <rect x="20" y="44" width="200" height="16" fill="rgba(255,255,255,0.15)" />
                      <circle cx="40" cy="40" r="6" fill="rgba(255,200,100,0.8)" />
                      <text x="55" y="44" fontFamily="Arial" fontSize="10" fill="white" fontWeight="bold">Sentra Dapur Dashboard</text>
                      {/* Stat cards */}
                      <rect x="30" y="70" width="80" height="50" rx="8" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="1">
                        <animate attributeName="opacity" values="0.7;1;0.7" dur="3s" repeatCount="indefinite" />
                      </rect>
                      <text x="70" y="90" fontFamily="Arial" fontSize="8" fill="rgba(255,220,150,1)" textAnchor="middle">Stok Bahan</text>
                      <text x="70" y="105" fontFamily="Arial" fontSize="14" fill="white" textAnchor="middle" fontWeight="bold">248</text>
                      <text x="70" y="116" fontFamily="Arial" fontSize="6" fill="rgba(255,255,255,0.6)" textAnchor="middle">item tersedia</text>

                      <rect x="130" y="70" width="80" height="50" rx="8" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="1">
                        <animate attributeName="opacity" values="0.7;1;0.7" dur="3.5s" repeatCount="indefinite" />
                      </rect>
                      <text x="170" y="90" fontFamily="Arial" fontSize="8" fill="rgba(255,220,150,1)" textAnchor="middle">PO Aktif</text>
                      <text x="170" y="105" fontFamily="Arial" fontSize="14" fill="white" textAnchor="middle" fontWeight="bold">12</text>
                      <text x="170" y="116" fontFamily="Arial" fontSize="6" fill="rgba(255,255,255,0.6)" textAnchor="middle">pending approval</text>

                      {/* Mini bar chart */}
                      <rect x="30" y="135" width="180" height="55" rx="8" fill="rgba(255,255,255,0.07)" />
                      <text x="40" y="148" fontFamily="Arial" fontSize="7" fill="rgba(255,220,150,1)">Arus Kas Bulan Ini</text>
                      <rect x="40" y="155" width="18" height="25" rx="3" fill="rgba(255,200,100,0.6)"><animate attributeName="height" values="20;25;20" dur="2s" repeatCount="indefinite" /></rect>
                      <rect x="65" y="150" width="18" height="30" rx="3" fill="rgba(255,200,100,0.8)"><animate attributeName="height" values="25;30;25" dur="2.5s" repeatCount="indefinite" /></rect>
                      <rect x="90" y="158" width="18" height="22" rx="3" fill="rgba(255,200,100,0.5)"><animate attributeName="height" values="18;22;18" dur="3s" repeatCount="indefinite" /></rect>
                      <rect x="115" y="148" width="18" height="32" rx="3" fill="rgba(255,200,100,0.9)"><animate attributeName="height" values="28;32;28" dur="2.2s" repeatCount="indefinite" /></rect>
                      <rect x="140" y="153" width="18" height="27" rx="3" fill="rgba(255,200,100,0.7)"><animate attributeName="height" values="23;27;23" dur="2.8s" repeatCount="indefinite" /></rect>
                      <rect x="165" y="146" width="18" height="34" rx="3" fill="rgba(255,200,100,1)"><animate attributeName="height" values="30;34;30" dur="1.8s" repeatCount="indefinite" /></rect>
                    </svg>
                  </div>
                )}
                {/* Slide 1: Purchase Order Flow */}
                {currentSlide === 1 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-full h-full max-w-md" viewBox="0 0 240 220" xmlns="http://www.w3.org/2000/svg">
                      {/* Admin Dapur */}
                      <rect x="15" y="80" width="65" height="60" rx="10" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                      <text x="47" y="103" fontFamily="Arial" fontSize="7" fill="white" textAnchor="middle">Admin</text>
                      <text x="47" y="114" fontFamily="Arial" fontSize="7" fill="rgba(255,220,150,1)" textAnchor="middle" fontWeight="bold">Dapur</text>
                      <text x="47" y="128" fontFamily="Arial" fontSize="6" fill="rgba(255,255,255,0.6)" textAnchor="middle">Buat PO</text>
                      <circle cx="47" cy="92" r="8" fill="rgba(255,200,100,0.4)" stroke="rgba(255,200,100,0.8)" strokeWidth="1" />
                      <text x="47" y="94" fontFamily="Arial" fontSize="8" fill="white" textAnchor="middle">🍳</text>

                      {/* Arrow 1 */}
                      <path d="M82,110 L105,110" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" markerEnd="url(#arrow)" strokeDasharray="4,2">
                        <animate attributeName="stroke-dashoffset" from="0" to="-12" dur="1.5s" repeatCount="indefinite" />
                      </path>
                      <defs>
                        <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                          <path d="M0,0 L0,6 L6,3 z" fill="rgba(255,255,255,0.7)" />
                        </marker>
                      </defs>

                      {/* Admin Pusat */}
                      <rect x="87" y="70" width="66" height="80" rx="10" fill="rgba(255,200,80,0.25)" stroke="rgba(255,200,80,0.6)" strokeWidth="1.5" />
                      <circle cx="120" cy="92" r="8" fill="rgba(255,200,100,0.5)" stroke="rgba(255,200,100,0.9)" strokeWidth="1" />
                      <text x="120" y="94" fontFamily="Arial" fontSize="8" fill="white" textAnchor="middle">⭐</text>
                      <text x="120" y="107" fontFamily="Arial" fontSize="7" fill="white" textAnchor="middle">Admin</text>
                      <text x="120" y="118" fontFamily="Arial" fontSize="7" fill="rgba(255,220,150,1)" textAnchor="middle" fontWeight="bold">Pusat</text>
                      <text x="120" y="130" fontFamily="Arial" fontSize="6" fill="rgba(255,255,255,0.7)" textAnchor="middle">Review PO</text>
                      <rect x="100" y="136" width="40" height="10" rx="3" fill="rgba(100,220,100,0.4)" />
                      <text x="120" y="144" fontFamily="Arial" fontSize="6" fill="white" textAnchor="middle">✓ Approve</text>

                      {/* Arrow 2 */}
                      <path d="M155,110 L178,110" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeDasharray="4,2">
                        <animate attributeName="stroke-dashoffset" from="0" to="-12" dur="1.5s" repeatCount="indefinite" />
                      </path>

                      {/* Supplier */}
                      <rect x="158" y="80" width="65" height="60" rx="10" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                      <circle cx="190" cy="92" r="8" fill="rgba(255,200,100,0.4)" stroke="rgba(255,200,100,0.8)" strokeWidth="1" />
                      <text x="190" y="94" fontFamily="Arial" fontSize="8" fill="white" textAnchor="middle">🏭</text>
                      <text x="190" y="107" fontFamily="Arial" fontSize="7" fill="white" textAnchor="middle">Supplier</text>
                      <text x="190" y="118" fontFamily="Arial" fontSize="7" fill="rgba(255,220,150,1)" textAnchor="middle">Kirim</text>
                      <text x="190" y="128" fontFamily="Arial" fontSize="6" fill="rgba(255,255,255,0.6)" textAnchor="middle">Pesanan</text>

                      {/* Bottom label */}
                      <rect x="60" y="165" width="120" height="22" rx="8" fill="rgba(255,255,255,0.1)" />
                      <text x="120" y="179" fontFamily="Arial" fontSize="8" fill="rgba(255,220,150,1)" textAnchor="middle" fontWeight="bold">Alur Purchase Order</text>
                    </svg>
                  </div>
                )}
                {/* Slide 2: Stock & Arus Kas */}
                {currentSlide === 2 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-full h-full max-w-md" viewBox="0 0 240 220" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="lineGrad3" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="rgba(255,200,80,0.9)" />
                          <stop offset="100%" stopColor="rgba(255,255,255,0.4)" />
                        </linearGradient>
                      </defs>
                      {/* Background card */}
                      <rect x="15" y="15" width="210" height="190" rx="16" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                      {/* Title */}
                      <text x="120" y="38" fontFamily="Arial" fontSize="10" fill="rgba(255,220,150,1)" textAnchor="middle" fontWeight="bold">Arus Kas & Stok Dapur</text>
                      {/* Stok progress bars */}
                      <text x="28" y="58" fontFamily="Arial" fontSize="7" fill="rgba(255,255,255,0.8)">Beras</text>
                      <rect x="28" y="62" width="150" height="8" rx="4" fill="rgba(255,255,255,0.1)" />
                      <rect x="28" y="62" width="110" height="8" rx="4" fill="rgba(255,200,80,0.8)">
                        <animate attributeName="width" from="60" to="110" dur="2s" fill="freeze" />
                      </rect>
                      <text x="185" y="69" fontFamily="Arial" fontSize="7" fill="white">73%</text>

                      <text x="28" y="82" fontFamily="Arial" fontSize="7" fill="rgba(255,255,255,0.8)">Minyak Goreng</text>
                      <rect x="28" y="86" width="150" height="8" rx="4" fill="rgba(255,255,255,0.1)" />
                      <rect x="28" y="86" width="60" height="8" rx="4" fill="rgba(255,120,50,0.9)">
                        <animate attributeName="width" from="20" to="60" dur="2.3s" fill="freeze" />
                      </rect>
                      <text x="185" y="93" fontFamily="Arial" fontSize="7" fill="white">40%</text>

                      <text x="28" y="106" fontFamily="Arial" fontSize="7" fill="rgba(255,255,255,0.8)">Bumbu Rempah</text>
                      <rect x="28" y="110" width="150" height="8" rx="4" fill="rgba(255,255,255,0.1)" />
                      <rect x="28" y="110" width="130" height="8" rx="4" fill="rgba(100,220,150,0.8)">
                        <animate attributeName="width" from="50" to="130" dur="1.8s" fill="freeze" />
                      </rect>
                      <text x="185" y="117" fontFamily="Arial" fontSize="7" fill="white">87%</text>

                      {/* Divider */}
                      <line x1="28" y1="128" x2="212" y2="128" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

                      {/* Arus kas chart */}
                      <text x="28" y="142" fontFamily="Arial" fontSize="7" fill="rgba(255,220,150,1)" fontWeight="bold">Arus Kas (6 Bulan)</text>
                      {/* Axes */}
                      <line x1="35" y1="190" x2="215" y2="190" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                      <line x1="35" y1="148" x2="35" y2="190" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                      {/* Line Chart */}
                      <polyline points="35,180 65,172 95,178 125,160 155,154 185,145 215,140"
                        stroke="url(#lineGrad3)" strokeWidth="2.5" fill="none" strokeDasharray="300" strokeDashoffset="300">
                        <animate attributeName="stroke-dashoffset" from="300" to="0" dur="2s" fill="freeze" />
                      </polyline>
                      {/* Area fill */}
                      <polygon points="35,190 35,180 65,172 95,178 125,160 155,154 185,145 215,140 215,190"
                        fill="rgba(255,200,80,0.12)" />
                      {/* Data points */}
                      {[
                        [35,180],[65,172],[95,178],[125,160],[155,154],[185,145],[215,140]
                      ].map(([cx,cy],i) => (
                        <circle key={i} cx={cx} cy={cy} r="3" fill="rgba(255,200,80,1)">
                          <animate attributeName="r" values="2;4;2" dur={`${2+i*0.3}s`} repeatCount="indefinite" />
                        </circle>
                      ))}
                      {/* Month labels */}
                      {['Okt','Nov','Des','Jan','Feb','Mar'].map((m,i) => (
                        <text key={i} x={47 + i*36} y="198" fontFamily="Arial" fontSize="6" fill="rgba(255,255,255,0.6)" textAnchor="middle">{m}</text>
                      ))}
                    </svg>
                  </div>
                )}

                {/* Feature highlights card */}
                <div className="absolute bottom-0 right-0 w-full md:w-3/4 bg-white/10 backdrop-blur-sm p-5 rounded-xl shadow-xl border border-white/20">
                  <h3 className="text-lg font-semibold mb-3">Fitur Utama Platform</h3>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                      <span className="w-5 h-5 bg-green-400/30 rounded-full flex items-center justify-center text-green-300 flex-shrink-0">✓</span>
                      Manajemen Dapur Terpusat
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <span className="w-5 h-5 bg-green-400/30 rounded-full flex items-center justify-center text-green-300 flex-shrink-0">✓</span>
                      Purchase Order ke Supplier
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <span className="w-5 h-5 bg-green-400/30 rounded-full flex items-center justify-center text-green-300 flex-shrink-0">✓</span>
                      Monitoring Stok & Arus Kas
                    </li>
                  </ul>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Carousel dots */}
        <div className="flex justify-center mt-8 space-x-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => handleDotClick(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                currentSlide === index ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Prev/Next arrows */}
      <div className="absolute top-1/2 left-4 transform -translate-y-1/2 z-20">
        <button onClick={handlePrevSlide} className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors" aria-label="Prev">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
      <div className="absolute top-1/2 right-4 transform -translate-y-1/2 z-20">
        <button onClick={handleNextSlide} className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors" aria-label="Next">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-16 bg-white" style={{ clipPath: 'polygon(0 100%, 100% 100%, 100% 0)' }}></div>
    </section>
  );
};

export default Hero;