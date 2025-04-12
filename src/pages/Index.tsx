
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PackageCheck, Leaf, CreditCard, Shield } from "lucide-react";
import MainNavigation from "@/components/layout/MainNavigation";

const Index = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    console.log("Index page mounted");
    document.title = "iTakecare - Leasing de matériel informatique reconditionné";
  }, []);

  console.log("Rendering Index component with simplified structure");

  return (
    <>
      <MainNavigation />
      
      <div className="bg-white min-h-screen">
        {/* Hero Section - Structure simplifiée */}
        <section className="container mx-auto px-4 py-12">
          <div className="flex flex-col lg:flex-row items-center">
            <div className="lg:w-1/2 mb-10 lg:mb-0">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Leasing de matériel informatique{" "}
                <span className="text-[#42B6C5]">Reconditionné</span>
              </h1>
              
              <p className="text-lg mb-8">
                Optez pour un parc informatique performant et écoresponsable
              </p>
              
              <Button 
                className="bg-[#42B6C5] hover:bg-[#389aa7] text-white rounded-full px-6"
                onClick={() => navigate("/catalogue")}
              >
                Découvrir le catalogue
              </Button>
            </div>
            
            <div className="lg:w-1/2 flex justify-center">
              <img 
                src="/lovable-uploads/10277032-6bec-4f1c-a1b5-884fb4f2a2ce.png" 
                alt="MacBook" 
                className="w-full max-w-md"
              />
            </div>
          </div>
        </section>
        
        {/* Features Section - Simplifié */}
        <section className="container mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-gray-100 rounded-xl p-6 hover:shadow-lg transition-all">
            <PackageCheck className="h-8 w-8 text-[#42B6C5] mb-4" />
            <h3 className="text-xl font-semibold mb-3">Qualité certifiée</h3>
            <p className="text-gray-600">Matériel reconditionné de qualité avec garantie complète.</p>
          </div>
          
          <div className="border border-gray-100 rounded-xl p-6 hover:shadow-lg transition-all">
            <CreditCard className="h-8 w-8 text-[#42B6C5] mb-4" />
            <h3 className="text-xl font-semibold mb-3">Formules adaptées</h3>
            <p className="text-gray-600">Solutions de leasing sur-mesure avec services inclus.</p>
          </div>
          
          <div className="border border-gray-100 rounded-xl p-6 hover:shadow-lg transition-all">
            <Leaf className="h-8 w-8 text-[#42B6C5] mb-4" />
            <h3 className="text-xl font-semibold mb-3">Empreinte réduite</h3>
            <p className="text-gray-600">Réduction de votre empreinte carbone grâce à l'économie circulaire.</p>
          </div>
        </section>
        
        {/* CTA Section - Simplifié */}
        <section className="container mx-auto px-4 py-8 mb-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-md">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Technologie responsable</h2>
              <p className="text-gray-600">Réduisez vos coûts informatiques et votre impact environnemental.</p>
            </div>
            <Button 
              className="bg-[#42B6C5] hover:bg-[#389aa7] text-white px-6 py-5"
              onClick={() => navigate("/catalogue")}
            >
              Découvrir nos produits
              <Shield className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </section>
      </div>
    </>
  );
};

export default Index;
