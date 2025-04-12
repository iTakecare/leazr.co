
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, PackageCheck, CreditCard, Shield, Leaf } from "lucide-react";
import Container from "@/components/layout/Container";
import { useIsMobile } from "@/hooks/use-mobile";
import MainNavigation from "@/components/layout/MainNavigation";
import HeroSection from "@/components/home/HeroSection";

const Index = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  useEffect(() => {
    console.log("Index page mounted - public access");
    document.title = "iTakecare - Leasing de matériel informatique reconditionné";
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <MainNavigation />
      
      <main className="flex-1">
        <HeroSection />
        
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
