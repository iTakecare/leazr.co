
import React from "react";
import Container from "@/components/layout/Container";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const AdvisorSection = () => {
  return (
    <section className="py-16 bg-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-50/30"></div>
      <Container maxWidth="custom">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12 relative z-10">
          <div className="w-full md:w-1/2 flex flex-col space-y-6">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900">
              Avez-vous besoin d'un conseiller en leasing ?
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl">
              Nous sommes là pour vous aider à trouver la meilleure solution de
              leasing pour votre entreprise. Contactez-nous dès maintenant !
            </p>
            <Button 
              className="bg-[#48b5c3] text-white hover:bg-[#3a95a1] w-full sm:w-auto"
              size="lg"
            >
              Demander un conseil
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
          
          <div className="w-full md:w-1/2 flex justify-center">
            <img
              src="/lovable-uploads/93b1f0bc-f724-452e-9187-7fbf56303736.png"
              alt="Conseiller en leasing"
              className="w-full max-w-md h-auto rounded-lg shadow-lg"
            />
          </div>
        </div>
      </Container>
    </section>
  );
};

export default AdvisorSection;
