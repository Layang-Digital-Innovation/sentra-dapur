import Hero from '@/components/home/Hero';
import Features from '@/components/home/Features';
import HowItWorks from '@/components/home/HowItWorks';
import StatsSection from '@/components/home/StatsSection';
import SubscriptionPlans from '@/components/home/SubscriptionPlans';
import Testimonials from '@/components/home/Testimonials';
import CallToAction from '@/components/home/CallToAction';

export const metadata = {
  title: 'Sentra Dapur — Platform Manajemen Cloud Kitchen Terpadu',
  description: 'Kelola unit dapur, stok bahan baku, purchase order ke supplier, dan arus kas dalam satu platform terintegrasi. Solusi terbaik untuk cloud kitchen Indonesia.',
};

export default function Home() {
  return (
    <>
      <Hero />
      <Features />
      <HowItWorks />
      <StatsSection />
      <SubscriptionPlans />
      <Testimonials />
      <CallToAction />
    </>
  );
}
