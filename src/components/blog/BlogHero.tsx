
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const BlogHero = () => {
  return (
    <div className="flex flex-col min-h-[50vh] items-center gap-6 md:gap-10 py-4 md:py-10 relative">
      {/* Background image - same as homepage */}
      <div className="flex flex-col w-full h-[50vh] items-start gap-2.5 absolute top-0 left-0">
        <img
          className="relative w-full h-[50vh] object-cover"
          alt="Background"
          src="/clip-path-group.png"
        />
        {/* Gradient fade to white overlay */}
        <div className="absolute bottom-0 left-0 w-full h-96 bg-gradient-to-t from-white to-transparent" />
      </div>

      {/* Hero content */}
      <header className="relative w-full max-w-[1000px] mx-auto z-10 px-5 md:px-[37px] mt-24">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4">
            <Badge className="bg-[#48b5c34f] text-[#48b5c3] rounded-[10px] px-3 py-1 text-sm font-medium">
              Actualités & Ressources
            </Badge>
          </div>
          
          <h1 className="font-black text-[#222222] text-3xl sm:text-4xl md:text-[40px] leading-tight mb-4">
            Blog iTakecare
          </h1>
          
          <p className="font-normal text-[#222222] text-base md:text-lg mb-8 max-w-[700px]">
            Découvrez nos derniers articles sur le leasing informatique durable, la gestion de parc, 
            et les bonnes pratiques écologiques pour votre entreprise.
          </p>

          <div className="relative w-full max-w-md">
            <Input 
              placeholder="Rechercher un article..." 
              className="pl-10 py-6 rounded-full border-gray-300 focus:border-[#48b5c3] focus:ring-[#48b5c3]"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          </div>
        </div>
      </header>
    </div>
  );
};

export default BlogHero;
