
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowRight, MessageCircle, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { useClientCart } from "@/context/ClientCartContext";
import { Badge } from "@/components/ui/badge";

const ClientCatalogHeader = () => {
  const { itemCount } = useClientCart();
  
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
            src="/lovable-uploads/1d3ac6e1-5c24-4197-af4f-5aa8f2dd014b.png" 
            alt="Équipement premium reconditionné" 
            className="w-full h-60 md:h-full object-cover object-center"
          />
          <div className="absolute top-0 right-0 bottom-0 left-0 bg-gradient-to-t from-[#275D8C] to-transparent opacity-70 md:hidden"></div>
        </div>
      </div>
      
      <div className="bg-white p-3 border-t border-gray-100">
        <div className="relative max-w-3xl mx-auto flex items-center justify-between">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Rechercher un produit..."
              className="w-full rounded-full border border-gray-200 py-2 px-10 focus:outline-none focus:ring-2 focus:ring-[#275D8C]/30 text-gray-700"
            />
          </div>
          
          <Link to="/client/cart" className="ml-3">
            <Button variant="ghost" size="sm" className="relative">
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <Badge 
                  className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-primary text-white"
                >
                  {itemCount > 99 ? '99+' : itemCount}
                </Badge>
              )}
              <span className="sr-only">Panier</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ClientCatalogHeader;
