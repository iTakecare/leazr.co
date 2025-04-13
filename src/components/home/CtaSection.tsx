
import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Container from "@/components/layout/Container";

const CtaSection = () => {
  const navigate = useNavigate();
  
  return (
    <section className="py-16 bg-transparent text-white">
      <Container maxWidth="custom">
        <div className="text-center relative">
          {/* Image turquoise placée derrière le texte */}
          <div className="absolute inset-x-0 top-1/4 bottom-1/4 rounded-xl overflow-hidden z-0">
            <img 
              src="/lovable-uploads/f3127226-39ba-4431-a251-f9b5cf02613d.png" 
              alt="Fond turquoise" 
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Contenu texte et boutons positionnés au-dessus de l'image */}
          <div className="relative z-10 py-16">
            <h2 className="text-[32px] md:text-[46px] font-bold mb-4">
              Le leasing de matériel informatique
              <br />
              n'a plus de <span className="bg-[#33949F]/40 px-4 py-1 rounded-full">secrets</span> pour vous
            </h2>
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              <Button 
                className="bg-[#33949F] hover:bg-[#2C8089] text-white font-bold rounded-full px-8 py-3 h-auto"
                onClick={() => navigate("/catalogue")}
              >
                Découvrir le catalogue
              </Button>
              <Button 
                variant="outline" 
                className="bg-white hover:bg-gray-100 text-gray-800 font-bold border-none rounded-full px-8 py-3 h-auto"
                onClick={() => navigate("/contact")}
              >
                Parler à un conseiller
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default CtaSection;
