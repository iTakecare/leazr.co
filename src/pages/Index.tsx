
import React from "react";
import MainNavigation from "@/components/layout/MainNavigation";
import HeroSection from "@/components/home/HeroSection";

const Index = () => {
  return (
    <div className="bg-white min-h-screen flex flex-col overflow-x-hidden font-['Inter']">
      <MainNavigation />
      <HeroSection />
    </div>
  );
};

export default Index;
