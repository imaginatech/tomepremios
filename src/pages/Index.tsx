
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import RaffleSelector from '@/components/RaffleSelector';
import AffiliateRanking from '@/components/AffiliateRanking';
import Winners from '@/components/Winners';
import HowItWorks from '@/components/HowItWorks';
import Footer from '@/components/Footer';

const Index = () => {
  const [searchParams] = useSearchParams();
  const affiliateCode = searchParams.get('ref');

  return (
    <div className="min-h-screen bg-background">
      <Header affiliateCode={affiliateCode} />
      <main>
        <Hero />
        <RaffleSelector />
        <div className="container mx-auto px-4 py-8">
          <AffiliateRanking />
        </div>
        <Winners />
        <HowItWorks />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
