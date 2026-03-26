"use client";

import Link from 'next/link';
import { FiMail, FiPhone, FiMapPin, FiInstagram, FiTwitter, FiFacebook, FiLinkedin } from 'react-icons/fi';

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-xl font-bold mb-4 text-yellow-400">Sentra Dapur</h3>
            <p className="text-purple-200 mb-4">
              A platform for investment crowdfunding and global trading marketplace.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-purple-300 hover:text-yellow-400">
                <FiInstagram size={20} />
              </a>
              <a href="#" className="text-purple-300 hover:text-yellow-400">
                <FiTwitter size={20} />
              </a>
              <a href="#" className="text-purple-300 hover:text-yellow-400">
                <FiFacebook size={20} />
              </a>
              <a href="#" className="text-purple-300 hover:text-yellow-400">
                <FiLinkedin size={20} />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4 text-yellow-400">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-purple-300 hover:text-yellow-400">Home</Link>
              </li>
              <li>
                <Link href="#investment" className="text-purple-300 hover:text-yellow-400">Investment</Link>
              </li>
              <li>
                <Link href="#trading" className="text-purple-300 hover:text-yellow-400">Trading</Link>
              </li>
              <li>
                <Link href="#subscription" className="text-purple-300 hover:text-yellow-400">Subscription</Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4 text-yellow-400">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/terms" className="text-purple-300 hover:text-yellow-400">Terms of Service</Link>
              </li>
              <li>
                <Link href="/privacy" className="text-purple-300 hover:text-yellow-400">Privacy Policy</Link>
              </li>
              <li>
                <Link href="/cookies" className="text-purple-300 hover:text-yellow-400">Cookie Policy</Link>
              </li>
              <li>
                <Link href="/disclaimer" className="text-purple-300 hover:text-yellow-400">Disclaimer</Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4 text-yellow-400">Contact Us</h3>
            <ul className="space-y-2">
              <li className="flex items-center text-purple-300">
                <FiMapPin className="mr-2" />
                <span>Tasikmalaya, Jawa Barat, Indonesia</span>
              </li>
              <li className="flex items-center text-purple-300">
                <FiPhone className="mr-2" />
                <span>+62851-8232-2580</span>
              </li>
              <li className="flex items-center text-purple-300">
                <FiMail className="mr-2" />
                <span>info@sentradapur.com</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-purple-800 mt-12 pt-8 text-center text-purple-300">
          <p>&copy; {new Date().getFullYear()} Sentra Dapur. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;