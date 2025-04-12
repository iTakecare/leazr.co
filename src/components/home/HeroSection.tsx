
import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Container from "@/components/layout/Container";

const HeroSection = () => {
  const navigate = useNavigate();
  
  return (
    <div 
      className="w-full relative min-h-screen"
      style={{
        backgroundImage: `
          linear-gradient(to bottom, 
            rgba(255, 255, 255, 0.8) 1px, 
            transparent 1px
          ),
          url('/lovable-uploads/bfd80850-97c9-4b37-90f1-f01c51c08b06.png')
        `,
        backgroundSize: "100% 50px, cover",
        backgroundPosition: "0 0, center",
        backgroundRepeat: "repeat, no-repeat"
      }}
    >
      <Container maxWidth="custom" className="py-12 md:py-16">
        <div className="flex flex-col md:flex-row items-center">
          {/* Colonne Gauche - Texte */}
          <div className="md:w-1/2 mb-10 md:mb-0 pr-0 md:pr-12">
            <h1 className="text-[45px] md:text-[50px] font-black leading-tight mb-2 text-[#242424] font-['Inter']">
              Leasing de matériel <br />
              informatique <span className="bg-[#48B5C3]/20 text-[#48B5C3] px-4 py-1 rounded-full">Reconditionné</span> <br />
              sans contraintes
            </h1>
            
            <p className="text-lg mt-8 mb-8 text-gray-700 font-['Inter'] font-normal">
              Optez pour un parc informatique performant et écoresponsable, à moindre coût:
            </p>
            
            <ul className="space-y-4 mb-10">
              <li className="flex items-start">
                <div className="flex-shrink-0 mr-3">
                  <div className="bg-green-500 text-white w-5 h-5 flex items-center justify-center rounded-sm">
                    ✓
                  </div>
                </div>
                <span className="text-gray-800 font-['Inter']">Du matériel reconditionné haut de gamme, testé et garanti.</span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 mr-3">
                  <div className="bg-green-500 text-white w-5 h-5 flex items-center justify-center rounded-sm">
                    ✓
                  </div>
                </div>
                <span className="text-gray-800 font-['Inter']">Un forfait tout compris : maintenance, support et mises à jour.</span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 mr-3">
                  <div className="bg-green-500 text-white w-5 h-5 flex items-center justify-center rounded-sm">
                    ✓
                  </div>
                </div>
                <span className="text-gray-800 font-['Inter']">Remplacement sous 24h en cas de panne ou sinistre.</span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 mr-3">
                  <div className="bg-green-500 text-white w-5 h-5 flex items-center justify-center rounded-sm">
                    ✓
                  </div>
                </div>
                <span className="text-gray-800 font-['Inter']">Un choix écoresponsable et économique pour votre entreprise.</span>
              </li>
            </ul>
            
            <div className="flex flex-wrap gap-4 mb-12">
              <Button 
                className="bg-[#48B5C3] hover:bg-[#389aa7] text-white rounded-full px-8 py-3 h-auto font-medium font-['Inter'] text-[16px]"
                onClick={() => navigate("/catalogue")}
              >
                Découvrir le catalogue
              </Button>
              <Button 
                variant="outline" 
                className="border-gray-300 hover:bg-gray-100 text-gray-700 rounded-full px-8 py-3 h-auto font-medium font-['Inter'] text-[16px]"
              >
                En savoir plus
              </Button>
            </div>
            
            <div className="flex items-center relative">
              <div className="flex-shrink-0 mr-4">
                <img 
                  src="https://i.pravatar.cc/80" 
                  alt="Avis client" 
                  className="w-14 h-14 rounded-full"
                />
              </div>
              <div>
                <p className="text-sm text-gray-700 font-['Inter']">
                  "Rapide et professionnel. Bien reçu mon MacBook Pro avec lequel j'écris ces lignes. Très content du matériel !"
                </p>
                <div className="flex items-center mt-1">
                  <div className="flex items-center">
                    <span className="text-yellow-400 text-2xl">★</span>
                    <span className="ml-2 font-semibold font-['Inter']">
                      4,8/5
                      <span className="ml-2 font-normal text-gray-500">satisfactions clients</span>
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="absolute top-[-25px] right-[-20px] md:relative md:top-auto md:right-auto md:ml-4">
                <img 
                  src="/lovable-uploads/8515dcd2-20f4-4247-8ea4-5929ac725d46.png" 
                  alt="Flèche" 
                  className="w-20 h-auto transform rotate-[-15deg]"
                />
              </div>
            </div>
          </div>
          
          {/* Colonne Droite - Image du MacBook */}
          <div className="md:w-1/2 flex justify-center items-center">
            <img 
              src="/lovable-uploads/5c6e8763-e237-4646-96d9-c54a63bf6893.png" 
              alt="MacBook avec écran" 
              className="w-full max-w-xl h-auto object-contain"
            />
          </div>
        </div>
      </Container>
    </div>
  );
};

export default HeroSection;
