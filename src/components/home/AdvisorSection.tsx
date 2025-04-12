
import React from "react";
import Container from "@/components/layout/Container";
import { Button } from "@/components/ui/button";

const AdvisorSection = () => {
  return (
    <section className="py-20 bg-white">
      <Container maxWidth="custom">
        <div className="relative bg-gray-50 rounded-3xl overflow-hidden p-12">
          <div className="flex flex-col lg:flex-row items-center">
            {/* Partie texte gauche */}
            <div className="w-full lg:w-2/3 z-10">
              <div className="mb-10">
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-2">
                  Vous hésitez sur le <span className="inline-block bg-[#48b5c3]/30 text-[#48b5c3] px-4 py-2 rounded-full">choix du matériel ?</span>
                </h2>
                <p className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900">
                  On est là pour vous aider !
                </p>
                
                {/* Flèche pointant vers l'image */}
                <div className="hidden lg:block absolute top-[100px] right-[450px]">
                  <img 
                    src="/lovable-uploads/481ee77e-2767-4044-b4dd-801e1b70036a.png" 
                    alt="Flèche" 
                    className="w-40 h-auto"
                  />
                </div>
              </div>
              
              <div className="bg-white p-8 rounded-xl shadow-sm mb-8 max-w-2xl">
                <blockquote className="text-lg md:text-xl text-gray-700 mb-6">
                  "Chaque entreprise, école, institution ont des besoins uniques. Nos conseillers, vous guident vers la solution la plus adaptée, sans engagement et en toute transparence."
                </blockquote>
                
                <div className="flex items-start">
                  <div className="mr-4">
                    <h3 className="font-bold text-xl text-gray-900">Michaela</h3>
                    <p className="text-gray-600">Responsable Service client</p>
                  </div>
                </div>
                
                <div className="mt-6">
                  <Button 
                    className="bg-[#48B5C3] hover:bg-[#48B5C3]/90 text-white font-semibold rounded-full px-8 py-6 text-lg h-auto"
                  >
                    Parler à un conseiller
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Image de la conseillère */}
            <div className="w-full lg:w-1/3 flex justify-end items-end self-end mt-10 lg:mt-0">
              <img 
                src="/lovable-uploads/56939bad-b11e-421e-8dca-13f8a485973b.png" 
                alt="Conseillère iTakecare" 
                className="w-full h-auto max-w-md z-10"
              />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default AdvisorSection;
