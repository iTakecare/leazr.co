
import React from "react";
import MainNavigation from "@/components/layout/MainNavigation";
import HeroSection from "@/components/home/HeroSection";
import PartnersSection from "@/components/home/PartnersSection";
import FeatureSection from "@/components/home/FeatureSection";
import PressSection from "@/components/home/PressSection";
import StatsSection from "@/components/home/StatsSection";
import TestimonialSection from "@/components/home/TestimonialSection";
import CtaSection from "@/components/home/CtaSection";
import HomeFooter from "@/components/home/HomeFooter";

const Index = () => {
  return (
    <div className="bg-white min-h-screen flex flex-col overflow-x-hidden font-['Inter']">
      <MainNavigation />
      <HeroSection />
      <PartnersSection />
      <FeatureSection />
      <PressSection />
      <StatsSection />
      <TestimonialSection />
      <CtaSection />
      <HomeFooter />
    </div>
  );
};

export default Index;
