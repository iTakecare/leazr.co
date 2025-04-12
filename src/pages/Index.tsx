
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, PackageCheck, CreditCard, Shield, Leaf } from "lucide-react";
import Container from "@/components/layout/Container";
import { useIsMobile } from "@/hooks/use-mobile";
import MainNavigation from "@/components/layout/MainNavigation";

const Index = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  useEffect(() => {
    console.log("Index page mounted - public access");
    document.title = "iTakecare - Leasing de matériel informatique reconditionné";
  }, []);

  console.log("Rendering Index component"); // Log de débogage

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <MainNavigation />
      
      <main className="flex-1">
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
                    <div className="flex-shrink-0 mt-1">
                      <PackageCheck className="h-5 w-5 text-green-500" />
                    </div>
                    <span className="ml-2 text-gray-800">Du matériel reconditionné haut de gamme, testé et garanti.</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <PackageCheck className="h-5 w-5 text-green-500" />
                    </div>
                    <span className="ml-2 text-gray-800">Un forfait tout compris : maintenance, support et mises à jour.</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <PackageCheck className="h-5 w-5 text-green-500" />
                    </div>
                    <span className="ml-2 text-gray-800">Remplacement sous 24h en cas de panne ou sinistre.</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <PackageCheck className="h-5 w-5 text-green-500" />
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
        
        {/* Features Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 py-12 px-4 md:px-0 md:py-16 mb-12 container mx-auto"
        >
          <div className="rounded-xl p-6 md:p-8 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border border-gray-100">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-[#42B6C5]/10 to-[#42B6C5]/30 flex items-center justify-center mb-5 shadow-md">
              <PackageCheck className="h-7 w-7 text-[#42B6C5]" />
            </div>
            <h3 className="text-xl font-semibold mb-3">
              Qualité certifiée
            </h3>
            <p className="text-gray-600">
              Chaque appareil reconditionné est soumis à des tests rigoureux et bénéficie d'une garantie complète pour une expérience premium.
            </p>
          </div>
          <div className="rounded-xl p-6 md:p-8 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border border-gray-100">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-[#42B6C5]/10 to-[#42B6C5]/30 flex items-center justify-center mb-5 shadow-md">
              <CreditCard className="h-7 w-7 text-[#42B6C5]" />
            </div>
            <h3 className="text-xl font-semibold mb-3">
              Formules adaptées
            </h3>
            <p className="text-gray-600">
              Des solutions de leasing sur-mesure avec services inclus pour optimiser votre trésorerie et faciliter la gestion de votre parc informatique.
            </p>
          </div>
          <div className="rounded-xl p-6 md:p-8 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border border-gray-100">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-[#42B6C5]/10 to-[#42B6C5]/30 flex items-center justify-center mb-5 shadow-md">
              <Leaf className="h-7 w-7 text-[#42B6C5]" />
            </div>
            <h3 className="text-xl font-semibold mb-3">
              Empreinte réduite
            </h3>
            <p className="text-gray-600">
              Réduction significative de votre empreinte carbone grâce à l'économie circulaire et des pratiques respectueuses de l'environnement.
            </p>
          </div>
        </motion.div>
        
        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="container mx-auto py-8 px-4 md:px-8 mb-16 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/30 shadow-md"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Technologie responsable, résultats exceptionnels</h2>
              <p className="text-gray-600 max-w-lg">Réduisez vos coûts informatiques et votre impact environnemental sans compromettre sur la qualité et les performances de vos équipements.</p>
            </div>
            <Button 
              className="bg-[#42B6C5] hover:bg-[#389aa7] text-white px-6 py-6 h-auto text-base min-w-36"
              onClick={() => navigate("/catalogue")}
            >
              Découvrir nos produits
              <Shield className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Index;
