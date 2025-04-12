
import React from "react";
import { Button } from "@/components/ui/button";
import { Search, ArrowRight, MessageCircle } from "lucide-react";

const CatalogHeader = () => {
  return (
    <div className="rounded-2xl overflow-hidden shadow-xl relative">
      {/* Fond avec dégradé */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#2E5D8A] via-[#3178A0] to-[#4599B8] z-0"></div>
      
      {/* Motif abstrait en overlay */}
      <div 
        className="absolute inset-0 z-[1] opacity-20" 
        style={{
          backgroundImage: `url('/lovable-uploads/aa8987dc-8d4a-4d62-befa-c6a2e29844c6.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          mixBlendMode: 'soft-light'
        }}
      ></div>
      
      {/* Effet de particules ou de légère texture */}
      <div className="absolute inset-0 z-[2] opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
      
      <div className="relative z-10 flex flex-col md:flex-row">
        <div className="p-8 md:p-12 md:w-3/5">
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
              className="backdrop-blur-sm bg-white/20 text-white hover:bg-white hover:text-[#275D8C] border-white/40 text-sm md:text-base group transition-all duration-300"
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

        <div className="md:w-2/5 md:h-full relative overflow-hidden">
          {/* Dégradé qui cache la jonction entre le contenu et l'image */}
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#275D8C]/30 to-[#275D8C] z-10 md:block hidden"></div>
          
          {/* Image abstraite de fond */}
          <div className="h-80 md:h-full relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#275D8C] to-[#4196b4] z-0"></div>
            <div 
              className="absolute inset-0 z-1 opacity-60"
              style={{
                backgroundImage: `url('/lovable-uploads/aa8987dc-8d4a-4d62-befa-c6a2e29844c6.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                mixBlendMode: 'overlay'
              }}
            ></div>
            
            {/* Effet de lumière qui donne de la profondeur */}
            <div className="absolute inset-0 z-2 opacity-30 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
          </div>
          
          {/* Fondu pour mobile vers le bas */}
          <div className="absolute top-0 right-0 bottom-0 left-0 bg-gradient-to-t from-[#275D8C] to-transparent opacity-70 md:hidden"></div>
        </div>
      </div>
      
      {/* Section de recherche avec transition douce */}
      <div className="relative">
        {/* Zone de transition principale - un dégradé plus progressif */}
        <div className="absolute -top-40 left-0 right-0 h-40 bg-gradient-to-b from-transparent via-[#275D8C]/80 to-white z-10"></div>
        
        {/* Seconde couche de transition pour un effet plus naturel */}
        <div className="absolute -top-20 left-0 right-0 h-40 bg-gradient-to-b from-transparent via-white/30 to-white/90 z-20"></div>
        
        {/* Barre de recherche */}
        <div className="bg-white pt-6 pb-4 px-4 relative z-30">
          <div className="relative max-w-3xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              className="w-full rounded-full border border-gray-200 py-3 px-12 focus:outline-none focus:ring-2 focus:ring-[#275D8C]/30 text-gray-700 shadow-sm"
            />
          </div>
        </div>
        
        {/* Ombre douce sous la barre de recherche */}
        <div className="h-8 bg-gradient-to-b from-white to-transparent relative z-30"></div>
      </div>
    </div>
  );
};

export default CatalogHeader;
