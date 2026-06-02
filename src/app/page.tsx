import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import Services from '@/components/landing/Services';
import WhyUs from '@/components/landing/WhyUs';
import Process from '@/components/landing/Process';
import Testimonials from '@/components/landing/Testimonials';
import CtaBanner from '@/components/landing/CtaBanner';
import Footer from '@/components/landing/Footer';
import FloatingCta from '@/components/landing/FloatingCta';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <Hero />
      <Services />
      <WhyUs />
      <Process />
      <Testimonials />
      <CtaBanner />
      <Footer />
      <FloatingCta />
    </>
  );
}
