"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'INVESTOR'
  });
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [termsError, setTermsError] = useState('');
  const { register, loading, error, isAuthenticated } = useAuth();
  const router = useRouter();

  // Menghapus redirect otomatis ke dashboard agar pengguna bisa mengakses halaman register

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset errors
    setPasswordError('');
    setTermsError('');
    
    // Validate form
    let isValid = true;
    
    if (formData.password !== formData.confirmPassword) {
      setPasswordError('Passwords do not match');
      isValid = false;
    }
    
    if (!agreeTerms) {
      setTermsError('You must agree to the terms and conditions');
      isValid = false;
    }
    
    if (isValid) {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-yellow-50 px-6 pt-24 pb-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 bg-red-100 text-red-800 rounded-lg shadow"
          >
            {error}
          </motion.div>
        )}
        
        <div className="bg-white shadow-2xl rounded-3xl p-8 sm:p-10 border border-gray-100">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Create Account</h1>
              <p className="text-amber-600">Sign up to start your investment journey</p>
            </motion.div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Full Name"
              type="text"
              name="name"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleChange}
              required
            />
            
            <Input
              label="Email Address"
              type="email"
              name="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
            
            <Input
              label="Password"
              type="password"
              name="password"
              placeholder="Create password (min. 8 characters)"
              value={formData.password}
              onChange={handleChange}
              error={passwordError}
              required
            />
            
            <Input
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              placeholder="Enter the same password"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={passwordError}
              required
            />
            
            <div className="space-y-3">
              <label className="block text-sm font-medium text-amber-700 mb-2">
                Select Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label 
                  className={`relative flex flex-col items-center p-4 border rounded-xl cursor-pointer transition-all duration-200 ${
                    formData.role === 'INVESTOR' 
                      ? 'border-slate-800 bg-slate-50 shadow-md' 
                      : 'border-gray-200 hover:border-purple-300 hover:bg-slate-50/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="INVESTOR"
                    checked={formData.role === 'INVESTOR'}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 mb-2 ${formData.role === 'INVESTOR' ? 'text-amber-600' : 'text-purple-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className={`font-medium ${formData.role === 'INVESTOR' ? 'text-slate-900' : 'text-amber-700'}`}>Investor</span>
                  <span className="text-xs text-amber-600 mt-1 text-center">Invest in projects</span>
                  {formData.role === 'INVESTOR' && (
                    <div className="absolute -top-1 -right-1">
                      <div className="bg-slate-900 text-white rounded-full p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  )}
                </label>
                
                <label 
                  className={`relative flex flex-col items-center p-4 border rounded-xl cursor-pointer transition-all duration-200 ${
                    formData.role === 'PROJECT_OWNER' 
                      ? 'border-slate-800 bg-slate-50 shadow-md' 
                      : 'border-gray-200 hover:border-purple-300 hover:bg-slate-50/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="PROJECT_OWNER"
                    checked={formData.role === 'PROJECT_OWNER'}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 mb-2 ${formData.role === 'PROJECT_OWNER' ? 'text-amber-600' : 'text-purple-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className={`font-medium ${formData.role === 'PROJECT_OWNER' ? 'text-slate-900' : 'text-amber-700'}`}>Project Owner</span>
                  <span className="text-xs text-amber-600 mt-1 text-center">Create projects</span>
                  {formData.role === 'PROJECT_OWNER' && (
                    <div className="absolute -top-1 -right-1">
                      <div className="bg-slate-900 text-white rounded-full p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  )}
                </label>
                
                <label 
                  className={`relative flex flex-col items-center p-4 border rounded-xl cursor-pointer transition-all duration-200 ${
                    formData.role === 'BUYER' 
                      ? 'border-slate-800 bg-slate-50 shadow-md' 
                      : 'border-gray-200 hover:border-purple-300 hover:bg-slate-50/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="BUYER"
                    checked={formData.role === 'BUYER'}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 mb-2 ${formData.role === 'BUYER' ? 'text-amber-600' : 'text-purple-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <span className={`font-medium ${formData.role === 'BUYER' ? 'text-slate-900' : 'text-amber-700'}`}>Buyer</span>
                  <span className="text-xs text-amber-600 mt-1 text-center">Purchase products</span>
                  {formData.role === 'BUYER' && (
                    <div className="absolute -top-1 -right-1">
                      <div className="bg-slate-900 text-white rounded-full p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  )}
                </label>
                
                <label 
                  className={`relative flex flex-col items-center p-4 border rounded-xl cursor-pointer transition-all duration-200 ${
                    formData.role === 'SUPPLIER' 
                      ? 'border-slate-800 bg-slate-50 shadow-md' 
                      : 'border-gray-200 hover:border-purple-300 hover:bg-slate-50/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="SUPPLIER"
                    checked={formData.role === 'SUPPLIER'}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 mb-2 ${formData.role === 'SUPPLIER' ? 'text-amber-600' : 'text-purple-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className={`font-medium ${formData.role === 'SUPPLIER' ? 'text-slate-900' : 'text-amber-700'}`}>Seller</span>
                  <span className="text-xs text-amber-600 mt-1 text-center">Sell products</span>
                  {formData.role === 'SUPPLIER' && (
                    <div className="absolute -top-1 -right-1">
                      <div className="bg-slate-900 text-white rounded-full p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  )}
                </label>
                
                {/* Admin option hidden but still available */}
                <div className="hidden">
                  <input
                    type="radio"
                    name="role"
                    value="ADMIN"
                    checked={formData.role === 'ADMIN'}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
            

            
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="h-4 w-4 text-amber-600 focus:ring-slate-900 border-purple-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="terms" className="text-slate-900">
                  I agree to the{' '}
                  <a href="#" className="text-amber-600 hover:text-amber-700">
                    Terms and Conditions
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-amber-600 hover:text-amber-700">
                    Privacy Policy
                  </a>
                </label>
                {termsError && (
                  <p className="text-red-600 text-xs mt-1">{termsError}</p>
                )}
              </div>
            </div>
            
            <Button
              type="submit"
              fullWidth
              isLoading={loading}
              className="bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 mt-2"
            >
              Sign Up Now
            </Button>
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-sm text-amber-600">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-amber-600 hover:text-amber-700">
                Sign in here
              </Link>
            </p>
          </div>
          
          
        </div>
      </motion.div>
    </div>
  );
}