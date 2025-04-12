
import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Container from "@/components/layout/Container";

const CtaSection = () => {
  const navigate = useNavigate();
  
  return (
    <section className="py-16 bg-gradient-to-r from-[#48B5C3] to-[#33638E] text-white">
      <Container maxWidth="custom">
        <div className="text-center">
          <h2 className="text-[46px] font-bold mb-4">
            Prêt à moderniser votre parc informatique de façon durable ?
          </h2>
          <p className="text-lg mb-8 max-w-2xl mx-auto">
            Contactez-nous dès aujourd'hui pour obtenir un devis personnalisé et découvrir comment nous pouvons vous aider à réduire vos coûts tout en agissant pour l'environnement.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button 
              className="bg-white text-[#48B5C3] hover:bg-gray-100 rounded-full px-8 text-[18px] font-bold h-auto py-3"
              onClick={() => navigate("/catalogue")}
            >
              Découvrir notre catalogue
            </Button>
            <Button 
              variant="outline" 
              className="border-white text-white hover:bg-white/10 rounded-full px-8 text-[18px] font-bold h-auto py-3"
              onClick={() => navigate("/contact")}
            >
              Demander un devis
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default CtaSection;
