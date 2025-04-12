
import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import MainNavigation from "@/components/layout/MainNavigation";

const Index = () => {
  useEffect(() => {
    // Effet de montage pour déboguer
    console.log("Index component mounted");
    
    return () => {
      console.log("Index component unmounted");
    };
  }, []);
  
  console.log("Index component rendering");
  
  return (
    <div className="bg-white min-h-screen flex flex-col">
      <MainNavigation />
      
      {/* Hero Section */}
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
                  <div className="flex-shrink-0 mt-1 text-green-500">✓</div>
                  <span className="ml-2 text-gray-800">Du matériel reconditionné haut de gamme, testé et garanti.</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 mt-1 text-green-500">✓</div>
                  <span className="ml-2 text-gray-800">Un forfait tout compris : maintenance, support et mises à jour.</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 mt-1 text-green-500">✓</div>
                  <span className="ml-2 text-gray-800">Remplacement sous 24h en cas de panne ou sinistre.</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 mt-1 text-green-500">✓</div>
                  <span className="ml-2 text-gray-800">Un choix écoresponsable et économique pour votre entreprise.</span>
                </li>
              </ul>
              
              <div className="flex flex-wrap gap-4">
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
      
      {/* Simple features section */}
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
