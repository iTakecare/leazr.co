
import React from 'react';
import HeroSection from '@/components/home/HeroSection';
import HomeLayout from '@/components/home/HomeLayout';
import FeatureSection from '@/components/home/FeatureSection';
import StatsSection from '@/components/home/StatsSection';
import TestimonialSection from '@/components/home/TestimonialSection';
import PartnersSection from '@/components/home/PartnersSection';
import CtaSection from '@/components/home/CtaSection';
import HomeFooter from '@/components/home/HomeFooter';

const HomePage = () => {
  return (
    <HomeLayout>
      <div className="flex flex-col bg-white">
        {/* HeroSection */}
        <section className="mb-16">
          <HeroSection />
        </section>
        
        {/* Autres sections */}
        <section id="partners">
          <PartnersSection />
        </section>
        
        <section id="features">
          <FeatureSection />
        </section>
        
        <section id="stats">
          <StatsSection />
        </section>
        
        <section id="testimonials">
          <TestimonialSection />
        </section>
        
        <section id="cta">
          <CtaSection />
        </section>
        
        <HomeFooter />
      </div>
    </HomeLayout>
  );
};

export default HomePage;
