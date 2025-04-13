
import React from "react";
import MainNavigation from "@/components/layout/MainNavigation";
import HeroSection from "@/components/home/HeroSection";
import PartnersSection from "@/components/home/PartnersSection";
import FeatureSection from "@/components/home/FeatureSection";
import PressSection from "@/components/home/PressSection";
import StepsSection from "@/components/home/StepsSection";
import AdvisorSection from "@/components/home/AdvisorSection";
import FaqSection from "@/components/home/FaqSection";
import HomeFooter from "@/components/home/HomeFooter";

const Index = () => {
  return (
    <div className="bg-white min-h-screen flex flex-col overflow-x-hidden font-['Inter']">
      <MainNavigation />
      <div className="pt-[130px]">
        <HeroSection />
        <PartnersSection />
        <FeatureSection />
        <PressSection />
        <StepsSection />
        <AdvisorSection />
        <FaqSection />
        <HomeFooter />
      </div>
    </div>
  );
};

export default Index;
