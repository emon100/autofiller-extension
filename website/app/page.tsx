import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import FAQ from '@/components/landing/FAQ';
import Footer from '@/components/landing/Footer';

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <Features />
      <FAQ />
      <Footer />
    </main>
  );
}
