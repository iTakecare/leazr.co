
import React from "react";
import { Link } from "react-router-dom";
import MainNavigation from "@/components/layout/MainNavigation";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="bg-white min-h-screen flex flex-col">
      <MainNavigation />
      
      <div className="w-full max-w-[1320px] mx-auto px-4 py-6 relative">
        <div className="flex flex-col md:flex-row items-center">
          {/* Colonne Gauche - Texte */}
          <div className="md:w-1/2 mb-10 md:mb-0 pr-0 md:pr-12">
            <h1 className="text-[40px] md:text-[50px] lg:text-[55px] font-bold leading-tight mb-2 text-[#242424]">
              Leasing de matériel <br />
              informatique <span className="bg-[#42B6C5]/20 text-[#42B6C5] px-4 py-1 rounded-full">Reconditionné</span> <br />
              sans contraintes
            </h1>
            
            <p className="text-lg mt-5 mb-6 text-gray-700">
              Optez pour un parc informatique performant et écoresponsable, à moindre coût:
            </p>
            
            <ul className="space-y-3 mb-8">
              <li className="flex items-start">
                <div className="flex-shrink-0 mr-2">
                  <div className="bg-green-500 text-white w-5 h-5 flex items-center justify-center rounded-sm">
                    ✓
                  </div>
                </div>
                <span className="text-gray-800">Du matériel reconditionné haut de gamme, testé et garanti.</span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 mr-2">
                  <div className="bg-green-500 text-white w-5 h-5 flex items-center justify-center rounded-sm">
                    ✓
                  </div>
                </div>
                <span className="text-gray-800">Un forfait tout compris : maintenance, support et mises à jour.</span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 mr-2">
                  <div className="bg-green-500 text-white w-5 h-5 flex items-center justify-center rounded-sm">
                    ✓
                  </div>
                </div>
                <span className="text-gray-800">Remplacement sous 24h en cas de panne ou sinistre.</span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 mr-2">
                  <div className="bg-green-500 text-white w-5 h-5 flex items-center justify-center rounded-sm">
                    ✓
                  </div>
                </div>
                <span className="text-gray-800">Un choix écoresponsable et économique pour votre entreprise.</span>
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
                  className="w-16 h-16 rounded-full"
                />
              </div>
              <div>
                <p className="text-sm text-gray-700">
                  "Rapide et professionnel. Bien reçu mon MacBook Pro avec lequel j'écris ces lignes. Très content du matériel !"
                </p>
                <div className="flex items-center mt-2">
                  <div className="flex items-center">
                    <span className="text-yellow-400 text-2xl">★</span>
                    <span className="ml-2 font-semibold">
                      4,8/5
                      <span className="ml-2 font-normal text-gray-500">satisfactions clients</span>
                    </span>
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
          
          {/* Colonne Droite - Image du MacBook */}
          <div className="md:w-1/2 flex justify-center">
            <img 
              src="/lovable-uploads/5c6e8763-e237-4646-96d9-c54a63bf6893.png" 
              alt="MacBook avec écran" 
              className="w-full max-w-xl h-auto object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
