
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
      <div className="flex flex-col bg-white overflow-x-hidden">
        <HeroSection />
        <div className="relative z-20">
          <PartnersSection />
          <FeatureSection />
          <StatsSection />
          <TestimonialSection />
          <CtaSection />
          <HomeFooter />
        </div>
      </div>
    </HomeLayout>
  );
};

export default HomePage;
