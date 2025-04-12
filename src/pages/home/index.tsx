
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
      <div className="flex flex-col">
        {/* Hero Section */}
        <HeroSection />
        
        {/* Partners Section (Social Proof) */}
        <div id="partners" className="mt-8">
          <PartnersSection />
        </div>
        
        {/* Features Section (Advantages) */}
        <div id="features" className="mt-8">
          <FeatureSection />
        </div>
        
        {/* Additional Sections */}
        <div id="stats" className="mt-8">
          <StatsSection />
        </div>
        
        <div id="testimonials" className="mt-8">
          <TestimonialSection />
        </div>
        
        <div id="cta" className="mt-8">
          <CtaSection />
        </div>
        
        <HomeFooter />
      </div>
    </HomeLayout>
  );
};

export default HomePage;
