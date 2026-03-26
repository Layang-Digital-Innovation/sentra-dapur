"use client";

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

const InvestmentSection = () => {
  return (
    <section id="investment" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Investment Module</h2>
            <p className="text-lg text-gray-600 mb-8">
              Our investment crowdfunding platform connects investors with promising export-oriented projects. 
              Invest in vetted opportunities and track your portfolio with complete transparency.
            </p>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-amber-600 mr-4">
                  <span className="text-sm font-semibold">1</span>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Browse Investment Opportunities</h3>
                  <p className="mt-1 text-gray-600">Explore projects seeking funding with detailed information and projections.</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-amber-600 mr-4">
                  <span className="text-sm font-semibold">2</span>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Invest Securely</h3>
                  <p className="mt-1 text-gray-600">Chat with admin to complete your investment with secure payment options.</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-amber-600 mr-4">
                  <span className="text-sm font-semibold">3</span>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Track Performance</h3>
                  <p className="mt-1 text-gray-600">Monitor project progress, financial reports, and profit sharing in real-time.</p>
                </div>
              </div>
            </div>
            
            <Link href="/investment" className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-amber-600 hover:bg-amber-700">
              Explore Investment Opportunities
            </Link>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-slate-500 to-yellow-500 rounded-xl transform rotate-3 scale-105 opacity-10"></div>
            <div className="relative bg-white p-6 rounded-xl shadow-lg border border-gray-100">
              <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-100">
                <h3 className="text-xl font-bold text-gray-900">Featured Projects</h3>
                <span className="text-sm font-medium text-amber-600">View All</span>
              </div>
              
              <div className="space-y-6">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="flex space-x-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0"></div>
                    <div className="flex-1">
                      <h4 className="text-base font-medium text-gray-900">Coffee Export Project {item}</h4>
                      <div className="flex items-center mt-1">
                        <div className="flex-1">
                          <div className="h-2 bg-gray-100 rounded-full">
                            <div className={`h-2 bg-blue-600 rounded-full w-${item * 2}/12`}></div>
                          </div>
                        </div>
                        <span className="ml-2 text-sm text-gray-500">{item * 20}% Funded</span>
                      </div>
                      <div className="mt-2 flex justify-between text-sm">
                        <span className="text-gray-500">Target: $250,000</span>
                        <span className="text-blue-600 font-medium">ROI: 15-20%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-100">
                <button className="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium rounded-lg transition-colors">
                  See More Projects
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default InvestmentSection;