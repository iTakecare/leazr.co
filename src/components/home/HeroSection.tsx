
import React from "react";
import Logo from "@/components/layout/Logo";
import Container from "@/components/layout/Container";

const HeroSection = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <Container className="text-center">
        <Logo showText={true} className="mx-auto" />
      </Container>
    </div>
  );
};

export default HeroSection;
