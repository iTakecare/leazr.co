
import React from "react";
import Container from "@/components/layout/Container";
import { Search, CheckCircle, Truck } from "lucide-react";

const StepsSection = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-white to-blue-50/30">
      <Container maxWidth="custom">
        <div className="text-center mb-12">
          <h2 className="text-[46px] font-bold text-gray-900 mb-4">
            Passer au leasing de matériel informatique
          </h2>
          <div className="inline-block bg-[#48b5c3]/20 text-[#48b5c3] px-8 py-2 rounded-full text-2xl font-medium">
            en seulement 3 étapes
          </div>
        </div>

        {/* Première étape */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 items-stretch">
          <div className="bg-[#e1f5f7] rounded-3xl p-8 relative overflow-hidden h-full flex flex-col justify-center">
            <div className="bg-[#48b5c3] rounded-full w-16 h-16 flex items-center justify-center mb-6">
              <Search className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              Choisissez votre matériel dans notre catalogue
            </h3>
            <p className="text-gray-700">
              Tout est inclus dans la mensualité qui apparaît : le prix de la location, la maintenance et la garantie.
            </p>
          </div>
          <div className="flex justify-center h-full">
            <div className="h-full w-full flex items-center justify-center">
              <img 
                src="/lovable-uploads/fa09c5a3-4aa6-4356-8079-00f67a30dbb5.png" 
                alt="Matériel informatique" 
                className="rounded-3xl shadow-lg w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Deuxième étape */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 items-stretch">
          <div className="flex justify-center order-2 md:order-1 h-full">
            <div className="h-full w-full flex items-center justify-center">
              <img 
                src="/lovable-uploads/c4c12c0b-5962-41ec-9c06-ee0ddbf0915c.png" 
                alt="Confirmation de commande" 
                className="rounded-3xl shadow-lg w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="bg-[#e1f5f7] rounded-3xl p-8 relative overflow-hidden order-1 md:order-2 h-full flex flex-col justify-center">
            <div className="bg-[#48b5c3] rounded-full w-16 h-16 flex items-center justify-center mb-6">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              Confirmez votre commande
            </h3>
            <p className="text-gray-700">
              Dès réception des documents, nous livrons votre matériel dans les plus bref délais (entre 3 à 5 jours) gratuitement.
            </p>
          </div>
        </div>

        {/* Troisième étape */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          <div className="bg-[#e1f5f7] rounded-3xl p-8 relative overflow-hidden h-full flex flex-col justify-center">
            <div className="bg-[#48b5c3] rounded-full w-16 h-16 flex items-center justify-center mb-6">
              <Truck className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              Receptionnez votre matériel
            </h3>
            <p className="text-gray-700">
              Vous profitez immédiatement de votre nouveau matériel, l'esprit tranquille !
            </p>
          </div>
          <div className="flex justify-center h-full">
            <div className="h-full w-full flex items-center justify-center">
              <img 
                src="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1772&q=80" 
                alt="Réception du matériel" 
                className="rounded-3xl shadow-lg w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default StepsSection;
