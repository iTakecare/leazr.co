
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
          {/* Rectangle turquoise placé derrière le texte */}
          <div className="absolute inset-0 bg-[#41A6B2] rounded-xl overflow-hidden z-0">
            {/* Formes décoratives dans le coin supérieur gauche */}
            <div className="absolute top-0 left-0 w-1/3 h-1/3">
              <div className="absolute top-0 left-0 w-full h-full bg-[#33949F] transform -skew-x-12"></div>
            </div>
            {/* Formes décoratives dans le coin inférieur droit */}
            <div className="absolute bottom-0 right-0 w-1/3 h-1/3">
              <div className="absolute bottom-0 right-0 w-full h-full bg-[#33949F] transform skew-x-12"></div>
            </div>
          </div>
          
          {/* Contenu texte et boutons positionnés au-dessus du rectangle */}
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
