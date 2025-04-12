
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
      {/* Hero Section */}
      <HeroSection />
      
      {/* Partners Section (Social Proof) */}
      <section id="partners" className="mt-8">
        <PartnersSection />
      </section>
      
      {/* Features Section (Advantages) */}
      <section id="features" className="mt-8">
        <FeatureSection />
      </section>
      
      {/* Additional Sections */}
      <section id="stats" className="mt-8">
        <StatsSection />
      </section>
      
      <section id="testimonials" className="mt-8">
        <TestimonialSection />
      </section>
      
      <section id="cta" className="mt-8">
        <CtaSection />
      </section>
      
      <HomeFooter />
    </HomeLayout>
  );
};

export default HomePage;
