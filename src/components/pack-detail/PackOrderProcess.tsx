import React from "react";
import { ClipboardCheck, ClipboardList, ClipboardSignature } from "lucide-react";

const PackOrderProcess = () => {
  return (
    <div className="my-12">
      <h2 className="text-2xl font-bold mb-8 text-center text-gray-900">Comment commander votre pack ?</h2>
      
      <div className="relative">
        {/* Timeline connector */}
        <div className="absolute left-1/2 -ml-0.5 w-1 h-full bg-indigo-200 hidden md:block"></div>
        
        <div className="space-y-12 md:space-y-0">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 md:pr-8 flex justify-end mb-6 md:mb-16">
              <div className="bg-white p-6 rounded-xl shadow-md border border-indigo-100 max-w-md transform transition-all hover:-translate-y-1 hover:shadow-lg">
                <h3 className="font-bold text-lg text-indigo-700 mb-3">1. Sélection de votre pack</h3>
                <p className="text-gray-600">
                  Choisissez le pack qui correspond à vos besoins et indiquez la quantité souhaitée. Nous vous demandons votre numéro d'entreprise (BCE) et votre email professionnel.
                </p>
              </div>
            </div>
            <div className="md:w-1/2 md:pl-8 relative flex items-center justify-start">
              <div className="absolute left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 bg-indigo-600 rounded-full h-12 w-12 flex items-center justify-center shadow-md z-10">
                <ClipboardList className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 md:pr-8 flex justify-end order-1 md:order-2 mb-6 md:mb-16">
              <div className="bg-white p-6 rounded-xl shadow-md border border-indigo-100 max-w-md transform transition-all hover:-translate-y-1 hover:shadow-lg">
                <h3 className="font-bold text-lg text-indigo-700 mb-3">2. Étude de votre demande</h3>
                <p className="text-gray-600">
                  Notre équipe étudie votre demande de pack en moins de 24 heures. Nous vérifions la disponibilité de tous les produits et vous confirmons les délais de livraison.
                </p>
              </div>
            </div>
            <div className="md:w-1/2 md:pl-8 relative flex items-center justify-end order-2 md:order-1">
              <div className="absolute left-1/2 -translate-x-1/2 md:left-auto md:right-0 md:translate-x-0 bg-indigo-600 rounded-full h-12 w-12 flex items-center justify-center shadow-md z-10">
                <ClipboardSignature className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 md:pr-8 flex justify-end mb-6 md:mb-0">
              <div className="bg-white p-6 rounded-xl shadow-md border border-indigo-100 max-w-md transform transition-all hover:-translate-y-1 hover:shadow-lg">
                <h3 className="font-bold text-lg text-indigo-700 mb-3">3. Signature et livraison</h3>
                <p className="text-gray-600">
                  Signature électronique du contrat de leasing pour votre pack complet. Livraison coordonnée de tous les équipements avec installation si nécessaire.
                </p>
              </div>
            </div>
            <div className="md:w-1/2 md:pl-8 relative flex items-center justify-start">
              <div className="absolute left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 bg-indigo-600 rounded-full h-12 w-12 flex items-center justify-center shadow-md z-10">
                <ClipboardCheck className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackOrderProcess;