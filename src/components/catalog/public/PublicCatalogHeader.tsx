
import React from "react";
import { Button } from "@/components/ui/button";
import { Search, ArrowRight, MessageCircle } from "lucide-react";

const PublicCatalogHeader = () => {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#275D8C] via-[#347599] to-[#4196b4] shadow-xl overflow-hidden">
      <div className="relative flex flex-col md:flex-row max-h-[460px] md:max-h-[380px]">
        <div className="z-10 p-6 md:p-8 md:w-3/5">
          <h1 className="font-bold text-2xl md:text-3xl lg:text-4xl text-white leading-tight mb-3">
            Équipement premium reconditionné pour des équipes performantes
          </h1>
          
          <p className="text-white/90 text-sm md:text-base mb-6 max-w-xl">
            Donnez à vos collaborateurs les outils dont ils ont besoin avec notre sélection 
            de matériel Apple et PC haute qualité, à l'impact environnemental réduit.
          </p>
          
          <div className="flex flex-wrap gap-3">
            <Button 
              size="sm"
              variant="outline" 
              className="bg-white text-[#275D8C] hover:bg-white/90 border-white text-xs md:text-sm group"
            >
              <MessageCircle className="mr-2 h-4 w-4 transition-transform group-hover:rotate-12" />
              Parler à un conseiller
            </Button>
            <Button 
              size="sm" 
              className="bg-[#d13157] hover:bg-[#b82a4d] border-0 text-xs md:text-sm group"
            >
              Demander un devis <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>

        <div className="md:w-2/5 md:h-full relative">
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#275D8C]/50 to-[#275D8C] z-10 md:block hidden"></div>
          <img 
            src="/lovable-uploads/ef94bc45-f0ba-466b-876d-aea80c78f89c.png" 
            alt="Équipement premium reconditionné" 
            className="w-full h-60 md:h-full object-cover object-center"
          />
          <div className="absolute top-0 right-0 bottom-0 left-0 bg-gradient-to-t from-[#275D8C] to-transparent opacity-70 md:hidden"></div>
        </div>
      </div>
      
      <div className="bg-white p-3 border-t border-gray-100">
        <div className="relative max-w-3xl mx-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un produit..."
            className="w-full rounded-full border border-gray-200 py-2 px-10 focus:outline-none focus:ring-2 focus:ring-[#275D8C]/30 text-gray-700"
          />
        </div>
      </div>
    </div>
  );
};

export default PublicCatalogHeader;
