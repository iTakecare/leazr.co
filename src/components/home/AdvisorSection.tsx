
import React from "react";
import Container from "@/components/layout/Container";
import { Button } from "@/components/ui/button";

const AdvisorSection = () => {
  return (
    <section className="py-10 bg-transparent relative">
      {/* Image blur en arrière-plan - positionnée par rapport à la section */}
      <div className="absolute top-[-200px] right-0 w-[65%] h-[120%] z-0">
        <img 
          src="/lovable-uploads/ad810d22-f182-4048-aae9-fd658e229330.png" 
          alt="Background blur" 
          className="w-full h-full object-contain opacity-90"
        />
      </div>
      
      <Container maxWidth="custom">
        <div className="relative bg-transparent rounded-3xl overflow-hidden">
          {/* Rectangle gris clair en arrière-plan, ajusté pour s'aligner avec la fin de la photo */}
          <div className="absolute top-[40%] inset-x-0 bg-[#F1F1F1] rounded-3xl h-[56%]"></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row items-center">
            {/* Partie texte gauche */}
            <div className="w-full lg:w-3/5 z-10 p-12 lg:p-16">
              <div className="mb-16">
                <h2 className="text-5xl font-bold text-gray-900 mb-2">
                  Vous hésitez sur le{" "}
                  <span className="inline-block bg-[#48b5c3]/30 text-[#48b5c3] px-4 py-1 rounded-lg">
                    choix du matériel ?
                  </span>
                </h2>
                <p className="text-5xl font-bold text-gray-900">
                  On est là pour vous aider !
                </p>
                
                {/* Flèche pointant vers l'image */}
                <div className="hidden lg:block absolute top-[120px] right-[450px] z-20">
                  <img 
                    src="/lovable-uploads/9a1919eb-054c-4be8-acb5-0a02b18696da.png" 
                    alt="Flèche" 
                    className="w-40 h-auto"
                  />
                </div>
              </div>
              
              <div className="p-8 rounded-3xl mb-8 max-w-2xl">
                <blockquote className="text-xl text-gray-700 mb-6">
                  "Chaque entreprise, école, institution ont des besoins uniques. Nos conseillers, vous guident vers la solution la plus adaptée, sans engagement et en toute transparence."
                </blockquote>
                
                <div className="flex flex-row items-center justify-between">
                  <div className="flex flex-col">
                    <h3 className="font-bold text-2xl text-gray-900">Michaela</h3>
                    <p className="text-gray-600">Responsable Service client</p>
                  </div>
                  
                  <Button 
                    className="bg-[#48B5C3] hover:bg-[#48B5C3]/90 text-white font-semibold rounded-lg px-8 py-3 text-lg h-auto"
                  >
                    Parler à un conseiller
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Image de la conseillère */}
            <div className="w-full lg:w-2/5 flex justify-end items-center lg:self-center z-20">
              <img 
                src="/lovable-uploads/56939bad-b11e-421e-8dca-13f8a485973b.png" 
                alt="Conseillère iTakecare" 
                className="w-full h-auto z-10 relative"
              />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default AdvisorSection;
