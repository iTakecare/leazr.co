
import React from "react";
import Logo from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const navigate = useNavigate();
  
  return (
    <div className="relative overflow-hidden bg-white py-24 sm:py-32">
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center opacity-[0.02]" />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <Logo showText={true} className="mx-auto mb-8" />
          
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl mb-6">
            Équipement informatique durable pour les entreprises
          </h1>
          
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600 mb-10">
            Simplifiez la gestion de votre parc informatique avec nos solutions de leasing de matériel reconditionné. Économique, écologique et sans contraintes.
          </p>
          
          <div className="mt-10 flex items-center justify-center gap-6 flex-wrap">
            <Button 
              onClick={() => navigate("/catalogue")}
              className="rounded-full px-8 py-6 text-base"
              size="lg"
            >
              Découvrir nos solutions
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate("/contact")}
              className="rounded-full px-8 py-6 text-base"
              size="lg"
            >
              Demander un devis
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
