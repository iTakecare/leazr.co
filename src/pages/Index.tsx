
import React from "react";
import { Link } from "react-router-dom";
import MainNavigation from "@/components/layout/MainNavigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const Index = () => {
  return (
    <div className="bg-white min-h-screen flex flex-col">
      <MainNavigation />
      
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Arrière-plan avec texture */}
        <div 
          className="absolute inset-0 z-0" 
          style={{ 
            backgroundImage: `url('/lovable-uploads/c4382620-f35f-4304-8e16-d058304e3c52.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.5
          }}
        />
        
        <div className="container mx-auto px-4 py-8 md:py-12 relative z-10">
          <div className="flex flex-col lg:flex-row items-center">
            <div className="lg:w-1/2 lg:pr-12 mb-10 lg:mb-0">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                Leasing de matériel informatique{" "}
                <span className="text-[#42B6C5]">Reconditionné</span>{" "}
                <span className="block">sans contraintes</span>
              </h1>
              
              <p className="text-lg mb-8 text-gray-700">
                Optez pour un parc informatique performant et écoresponsable, à moindre coût:
              </p>
              
              <ul className="space-y-3 mb-8">
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
              
              <div className="flex flex-wrap gap-4 mb-12">
                <Link 
                  to="/catalogue" 
                  className="bg-[#42B6C5] hover:bg-[#389aa7] text-white rounded-full px-6 py-3 inline-block font-medium"
                >
                  Découvrir le catalogue
                </Link>
                <Link
                  to="/login" 
                  className="border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-full px-6 py-3 inline-block font-medium"
                >
                  En savoir plus
                </Link>
              </div>
              
              <div className="flex items-center">
                <div className="flex-shrink-0 mr-4">
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
                      {Array(5).fill(0).map((_, i) => (
                        <span key={i} className="text-yellow-400 text-lg">
                          {i < 4 ? "★" : "☆"}
                        </span>
                      ))}
                    </div>
                    <div className="ml-2 font-medium">
                      4,8/5
                      <span className="ml-2 font-normal text-gray-500">satisfactions clients</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex-shrink-0 ml-4 relative hidden md:block">
                  <img 
                    src="/lovable-uploads/8515dcd2-20f4-4247-8ea4-5929ac725d46.png" 
                    alt="Flèche" 
                    className="w-20 h-auto"
                  />
                </div>
              </div>
            </div>
            
            <div className="lg:w-1/2 flex justify-center lg:justify-end">
              <img 
                src="/lovable-uploads/5c6e8763-e237-4646-96d9-c54a63bf6893.png" 
                alt="MacBook avec écran" 
                className="w-full max-w-lg h-auto object-contain z-10"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Features Section */}
      <div className="w-full bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center">Nos Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Qualité certifiée</h3>
              <p>Matériel reconditionné de qualité avec garantie complète.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Formules adaptées</h3>
              <p>Solutions de leasing sur-mesure avec services inclus.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Empreinte réduite</h3>
              <p>Réduction de votre empreinte carbone grâce à l'économie circulaire.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
