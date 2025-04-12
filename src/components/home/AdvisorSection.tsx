
import React from "react";
import Container from "@/components/layout/Container";
import { MessageCircleMore, Phone, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

const AdvisorSection = () => {
  return (
    <section className="py-20 bg-white">
      <Container maxWidth="custom">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Image de la conseillère */}
          <div className="relative order-2 lg:order-1">
            <div className="absolute -top-10 -left-10 lg:-top-16 lg:-left-16 bg-[#e1f5f7] p-4 lg:p-6 rounded-xl rotate-2 z-0">
              <div className="text-[28px] lg:text-[40px] font-bold text-gray-900">
                Vous hésitez sur le <span className="bg-[#48b5c3]/30 text-[#48b5c3] px-4 py-1 rounded-lg">choix du matériel ?</span>
              </div>
              <div className="text-[28px] lg:text-[40px] font-bold text-gray-900 mt-2">
                On est là pour vous aider !
              </div>
              <img 
                src="/lovable-uploads/aa41f092-7d73-4917-9bb9-78e029f4a786.png" 
                alt="Conseillère iTakecare" 
                className="absolute -bottom-8 -right-8 lg:-bottom-12 lg:-right-12 rounded-lg transform rotate-3 w-32 lg:w-48"
              />
            </div>
            <div className="relative z-10">
              <img 
                src="/lovable-uploads/aa41f092-7d73-4917-9bb9-78e029f4a786.png" 
                alt="Conseillère iTakecare"
                className="rounded-3xl shadow-lg w-full h-auto object-cover z-10"
              />
            </div>
          </div>
          
          {/* Contenu texte et boutons */}
          <div className="order-1 lg:order-2">
            <h2 className="text-[46px] font-bold text-gray-900 mb-6">
              Un conseiller dédié à votre disposition
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Nous comprenons que le choix du matériel informatique peut être complexe. 
              C'est pourquoi nos experts sont disponibles pour vous guider et répondre à 
              toutes vos questions. Bénéficiez d'un accompagnement personnalisé pour 
              trouver les solutions les mieux adaptées à vos besoins spécifiques.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-[#48b5c3]/10 rounded-full p-3">
                  <MessageCircleMore className="w-6 h-6 text-[#48b5c3]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-1">Chat en direct</h3>
                  <p className="text-gray-600">Obtenez une réponse immédiate à vos questions via notre messagerie en ligne</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="bg-[#48b5c3]/10 rounded-full p-3">
                  <Phone className="w-6 h-6 text-[#48b5c3]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-1">Consultation téléphonique</h3>
                  <p className="text-gray-600">Échangez directement avec nos experts pour des conseils personnalisés</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="bg-[#48b5c3]/10 rounded-full p-3">
                  <Calendar className="w-6 h-6 text-[#48b5c3]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-1">Rendez-vous personnalisé</h3>
                  <p className="text-gray-600">Planifiez une démonstration ou une réunion pour analyser vos besoins</p>
                </div>
              </div>
            </div>
            
            <div className="mt-10 flex flex-wrap gap-4">
              <Button 
                className="bg-[#48B5C3] hover:bg-[#33638E] text-white rounded-full px-8 py-6 text-lg font-semibold h-auto"
              >
                Prendre rendez-vous
              </Button>
              <Button 
                variant="outline" 
                className="border-[#48B5C3] text-[#48B5C3] hover:bg-[#48B5C3]/10 rounded-full px-8 py-6 text-lg font-semibold h-auto"
              >
                Nous contacter
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default AdvisorSection;
