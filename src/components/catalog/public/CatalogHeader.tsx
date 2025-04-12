
import React from "react";
import { Button } from "@/components/ui/button";
import { Search, ArrowRight, MessageCircle } from "lucide-react";

const CatalogHeader = () => {
  return (
    <div className="rounded-2xl overflow-hidden shadow-xl relative bg-gradient-to-br from-[#275D8C] via-[#347599] to-[#4196b4]">
      <div className="absolute top-0 left-0 w-full h-full opacity-30 bg-[url('/lovable-uploads/2e7870dd-4bcb-4dcc-81ae-57bd739da7eb.png')] bg-cover bg-center mix-blend-overlay"></div>
      
      <div className="relative flex flex-col md:flex-row">
        <div className="z-10 p-8 md:p-12 md:w-3/5">
          <h1 className="font-bold text-3xl md:text-4xl lg:text-5xl text-white leading-tight mb-4">
            Équipement premium reconditionné pour des équipes performantes
          </h1>
          
          <p className="text-white/90 text-base md:text-lg mb-8 max-w-xl">
            Donnez à vos collaborateurs les outils dont ils ont besoin avec notre sélection 
            de matériel Apple et PC haute qualité, à l'impact environnemental réduit.
          </p>
          
          <div className="flex flex-wrap gap-4">
            <Button 
              size="lg"
              variant="outline" 
              className="bg-white text-[#275D8C] hover:bg-white/90 border-white text-sm md:text-base group transition-all duration-300"
            >
              <MessageCircle className="mr-2 h-4 w-4 transition-transform group-hover:rotate-12" />
              Parler à un conseiller
            </Button>
            <Button 
              size="lg" 
              className="bg-[#d13157] hover:bg-[#b82a4d] border-0 text-sm md:text-base group transition-all duration-300"
            >
              Demander un devis <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>

        <div className="md:w-2/5 md:h-full relative">
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#275D8C]/50 to-[#275D8C] z-10 md:block hidden"></div>
          <div className="h-80 md:h-full bg-gradient-to-r from-[#275D8C] to-[#4196b4] overflow-hidden relative">
            <div className="absolute inset-0 bg-[url('/lovable-uploads/2e7870dd-4bcb-4dcc-81ae-57bd739da7eb.png')] bg-cover bg-center opacity-50 mix-blend-overlay"></div>
          </div>
          <div className="absolute top-0 right-0 bottom-0 left-0 bg-gradient-to-t from-[#275D8C] to-transparent opacity-70 md:hidden"></div>
        </div>
      </div>
      
      <div className="relative">
        {/* Effet de fondu créé avec un dégradé qui recouvre à la fois l'image et une partie de la barre de recherche */}
        <div className="absolute -top-12 left-0 right-0 h-20 bg-gradient-to-b from-transparent to-white z-10"></div>
        
        <div className="bg-white p-4 border-t border-gray-100 relative z-20">
          <div className="relative max-w-3xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              className="w-full rounded-full border border-gray-200 py-3 px-12 focus:outline-none focus:ring-2 focus:ring-[#275D8C]/30 text-gray-700 shadow-sm"
            />
          </div>
        </div>
        
        {/* Effet d'ombre subtil créant une transition plus douce */}
        <div className="absolute -bottom-6 left-0 right-0 h-6 bg-gradient-to-t from-transparent to-white/30 z-10"></div>
      </div>
    </div>
  );
};

export default CatalogHeader;
