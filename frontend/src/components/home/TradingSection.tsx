"use client";

import { motion } from 'framer-motion';
import { FiPackage, FiTruck, FiGlobe, FiMessageCircle } from 'react-icons/fi';
import Link from 'next/link';

const TradingSection = () => {
  return (
    <section id="trading" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
          >
            Trading Marketplace
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-xl text-gray-600 max-w-3xl mx-auto"
          >
            Connect with global buyers and sellers through our collaborative export-import platform
          </motion.p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="order-2 lg:order-1"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="text-amber-600 mb-4 p-3 bg-slate-50 rounded-full inline-block">
                  <FiPackage className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Product Listings</h3>
                <p className="text-gray-600">Sellers can create detailed product listings with specifications, pricing, and shipping information.</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="text-amber-600 mb-4 p-3 bg-slate-50 rounded-full inline-block">
                  <FiTruck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Shipping Options</h3>
                <p className="text-gray-600">Multiple shipping methods including air freight, sea freight, and express courier services.</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="text-amber-600 mb-4 p-3 bg-slate-50 rounded-full inline-block">
                  <FiGlobe className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Global Reach</h3>
                <p className="text-gray-600">Connect with buyers and sellers from around the world across multiple commodities.</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="text-amber-600 mb-4 p-3 bg-slate-50 rounded-full inline-block">
                  <FiMessageCircle className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Direct Communication</h3>
                <p className="text-gray-600">Integrated WhatsApp chat with admin for seamless order processing and support.</p>
              </div>
            </div>
            
            <div className="mt-8 text-center lg:text-left">
              <Link href="/trading" className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-amber-600 hover:bg-amber-700">
                Explore Marketplace
              </Link>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="order-1 lg:order-2"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl transform -rotate-3 scale-105 opacity-10"></div>
              <div className="relative bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6 pb-6 border-b border-gray-100">How It Works</h3>
                
                <div className="space-y-6">
                  <div className="flex">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-4">
                      <span className="text-lg font-semibold">1</span>
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">Browse Products</h4>
                      <p className="mt-1 text-gray-600">Explore a wide range of products from verified sellers worldwide.</p>
                    </div>
                  </div>
                  
                  <div className="flex">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-4">
                      <span className="text-lg font-semibold">2</span>
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">Place Order</h4>
                      <p className="mt-1 text-gray-600">Select products and specify your requirements with detailed notes.</p>
                    </div>
                  </div>
                  
                  <div className="flex">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-4">
                      <span className="text-lg font-semibold">3</span>
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">Connect with Admin</h4>
                      <p className="mt-1 text-gray-600">Discuss details via WhatsApp chat for seamless communication.</p>
                    </div>
                  </div>
                  
                  <div className="flex">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-4">
                      <span className="text-lg font-semibold">4</span>
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">Track Shipment</h4>
                      <p className="mt-1 text-gray-600">Monitor your order status and shipment in real-time.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default TradingSection;