
import React from 'react';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import RaffleSelector from '@/components/RaffleSelector';
import Winners from '@/components/Winners';
import HowItWorks from '@/components/HowItWorks';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <RaffleSelector />
        <Winners />
        <HowItWorks />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
