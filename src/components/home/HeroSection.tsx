
import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    console.log("HeroSection mounted");
  }, []);
  
  return (
    <div className="relative overflow-hidden">
      {/* Arrière-plan avec texture */}
      <div 
        className="absolute inset-0 bg-white z-0" 
        style={{ 
          backgroundImage: `url('/lovable-uploads/63f47eb5-1f2c-4f19-8659-b3b8015027ec.png')`,
          backgroundRepeat: 'repeat',
          opacity: 0.1
        }}
      />
      
      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="flex flex-col lg:flex-row items-center">
          <div className="lg:w-1/2 lg:pr-12 mb-10 lg:mb-0">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Leasing de matériel informatique{" "}
              <span className="text-[#42B6C5]">Reconditionné</span>{" "}
              sans contraintes
            </h1>
            
            <p className="text-lg mb-8 text-gray-700">
              Optez pour un parc informatique performant et écoresponsable, à moindre coût:
            </p>
            
            <ul className="space-y-2 mb-8">
              <li className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <Check className="h-5 w-5 text-green-500" />
                </div>
                <span className="ml-2 text-gray-800">Du matériel reconditionné haut de gamme, testé et garanti.</span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <Check className="h-5 w-5 text-green-500" />
                </div>
                <span className="ml-2 text-gray-800">Un forfait tout compris : maintenance, support et mises à jour.</span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <Check className="h-5 w-5 text-green-500" />
                </div>
                <span className="ml-2 text-gray-800">Remplacement sous 24h en cas de panne ou sinistre.</span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <Check className="h-5 w-5 text-green-500" />
                </div>
                <span className="ml-2 text-gray-800">Un choix écoresponsable et économique pour votre entreprise.</span>
              </li>
            </ul>
            
            <div className="flex flex-wrap gap-4">
              <Button 
                className="bg-[#42B6C5] hover:bg-[#389aa7] text-white rounded-full px-6 py-2 h-auto font-medium"
                onClick={() => navigate("/catalogue")}
              >
                Découvrir le catalogue
              </Button>
              <Button 
                variant="outline" 
                className="border-gray-300 hover:bg-gray-100 text-gray-700 rounded-full px-6 py-2 h-auto font-medium"
              >
                En savoir plus
              </Button>
            </div>
            
            <div className="flex items-center mt-12">
              <div className="flex-shrink-0 mr-6">
                <img 
                  src="https://i.pravatar.cc/80" 
                  alt="Avis client" 
                  className="w-16 h-16 rounded-full border-2 border-[#42B6C5]"
                />
              </div>
              <div>
                <p className="text-sm text-gray-700 italic">
                  "Rapide et professionnel. Bien reçu mon MacBook Pro avec lequel j'écris ces lignes. Très content du matériel !"
                </p>
                <div className="flex items-center mt-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-yellow-400 text-lg">
                        {i < 4 ? "★" : "☆"}
                      </span>
                    ))}
                  </div>
                  <div className="ml-2 font-semibold">
                    4,8/5
                    <span className="ml-2 font-normal text-gray-500">satisfactions clients</span>
                  </div>
                </div>
              </div>
              <div className="ml-6 relative">
                <img 
                  src="/lovable-uploads/73661021-af85-4ce5-925d-701c27282221.png" 
                  alt="Flèche" 
                  className="w-20 h-auto"
                />
              </div>
            </div>
          </div>
          
          <div className="lg:w-1/2 flex justify-center lg:justify-end relative">
            <img 
              src="/lovable-uploads/10277032-6bec-4f1c-a1b5-884fb4f2a2ce.png" 
              alt="MacBook avec écran" 
              className="w-full max-w-lg h-auto object-contain z-10"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
