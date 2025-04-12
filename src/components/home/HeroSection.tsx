
import React from "react";
import Logo from "@/components/layout/Logo";

const HeroSection = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <Logo showText={true} className="mx-auto" />
    </div>
  );
};

export default HeroSection;
