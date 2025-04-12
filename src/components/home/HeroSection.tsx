
import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Container from "@/components/layout/Container";

const HeroSection = () => {
  const navigate = useNavigate();
  
  return (
    <div 
      className="w-full relative pt-24 pb-12"
      style={{
        background: `linear-gradient(180deg, #ffffff 0%, #e6f5fa 100%)`,
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='horizontalLines' width='20' height='20' patternTransform='rotate(0 0 0)' patternUnits='userSpaceOnUse'%3E%3Cline x1='0' y='20' x2='20' y2='20' stroke='%23e6f5fa' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23horizontalLines)'/%3E%3C/svg%3E")`
      }}
    >
      <Container maxWidth="custom" className="py-12 md:py-16">
        <div className="flex flex-col md:flex-row items-center">
          {/* Colonne Gauche - Texte */}
          <div className="md:w-1/2 mb-10 md:mb-0 pr-0 md:pr-12">
            <h1 className="text-4xl md:text-5xl font-black leading-tight mb-4 text-gray-900">
              Leasing de matériel informatique 
              <span className="block mt-2">
                <span className="bg-[#48B5C3]/20 text-[#48B5C3] px-4 py-1 rounded-full inline-block">
                  Reconditionné
                </span> 
                <span className="ml-2">sans contraintes</span>
              </span>
            </h1>
            
            <p className="text-lg mt-8 mb-8 text-gray-700">
              Optez pour un parc informatique performant et écoresponsable, à moindre coût:
            </p>
            
            <ul className="space-y-4 mb-10">
              <li className="flex items-start">
                <div className="flex-shrink-0 mr-3">
                  <div className="bg-green-500 text-white w-5 h-5 flex items-center justify-center rounded-sm">
                    ✓
                  </div>
                </div>
                <span className="text-gray-800">Du matériel reconditionné haut de gamme, testé et garanti.</span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 mr-3">
                  <div className="bg-green-500 text-white w-5 h-5 flex items-center justify-center rounded-sm">
                    ✓
                  </div>
                </div>
                <span className="text-gray-800">Un forfait tout compris : maintenance, support et mises à jour.</span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 mr-3">
                  <div className="bg-green-500 text-white w-5 h-5 flex items-center justify-center rounded-sm">
                    ✓
                  </div>
                </div>
                <span className="text-gray-800">Remplacement sous 24h en cas de panne ou sinistre.</span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 mr-3">
                  <div className="bg-green-500 text-white w-5 h-5 flex items-center justify-center rounded-sm">
                    ✓
                  </div>
                </div>
                <span className="text-gray-800">Un choix écoresponsable et économique pour votre entreprise.</span>
              </li>
            </ul>
            
            <div className="flex flex-wrap gap-4 mb-12">
              <Button 
                className="bg-[#48B5C3] hover:bg-[#389aa7] text-white rounded-full px-8 py-6 h-auto font-medium text-base"
                onClick={() => navigate("/catalogue")}
              >
                Découvrir le catalogue
              </Button>
              <Button 
                variant="outline" 
                className="border-gray-300 hover:bg-gray-100 text-gray-700 rounded-full px-8 py-6 h-auto font-medium text-base"
              >
                En savoir plus
              </Button>
            </div>
            
            <div className="flex items-center relative">
              <div className="flex-shrink-0 mr-4">
                <img 
                  src="https://i.pravatar.cc/80" 
                  alt="Avis client" 
                  className="w-14 h-14 rounded-full border-2 border-white shadow-md"
                />
              </div>
              <div>
                <p className="text-sm text-gray-700">
                  "Rapide et professionnel. Bien reçu mon MacBook Pro avec lequel j'écris ces lignes. Très content du matériel !"
                </p>
                <div className="flex items-center mt-1">
                  <div className="flex items-center">
                    <span className="text-yellow-400">★</span>
                    <span className="ml-2 font-semibold">
                      4,8/5
                      <span className="ml-2 font-normal text-gray-500">satisfactions clients</span>
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="absolute right-[-40px] bottom-[20px]">
                <img 
                  src="/lovable-uploads/8515dcd2-20f4-4247-8ea4-5929ac725d46.png" 
                  alt="Flèche" 
                  className="w-60 h-auto transform rotate-[30deg]"
                />
              </div>
            </div>
          </div>
          
          {/* Colonne Droite - Image du MacBook */}
          <div className="md:w-1/2 flex justify-center items-center">
            <img 
              src="/lovable-uploads/5c6e8763-e237-4646-96d9-c54a63bf6893.png" 
              alt="MacBook avec écran" 
              className="w-full max-w-lg h-auto object-contain"
            />
          </div>
        </div>
      </Container>
    </div>
  );
};

export default HeroSection;
