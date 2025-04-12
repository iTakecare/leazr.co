
import React from "react";
import MainNavigation from "@/components/layout/MainNavigation";
import HeroSection from "@/components/home/HeroSection";
import FeatureSection from "@/components/home/FeatureSection";
import StatsSection from "@/components/home/StatsSection";
import PartnersSection from "@/components/home/PartnersSection";
import TestimonialSection from "@/components/home/TestimonialSection";
import CtaSection from "@/components/home/CtaSection";

const Index = () => {
  return (
    <div className="bg-white min-h-screen flex flex-col overflow-x-hidden font-['Inter']">
      <MainNavigation />
      <HeroSection />
      <FeatureSection />
      <StatsSection />
      <PartnersSection />
      <TestimonialSection />
      <CtaSection />
    </div>
  );
};

export default Index;
