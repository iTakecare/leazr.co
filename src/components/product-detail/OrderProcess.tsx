
import React from "react";
import { ClipboardCheck, ClipboardList, ClipboardSignature } from "lucide-react";

const OrderProcess = () => {
  return (
    <div className="my-12">
      <h2 className="text-2xl font-bold mb-8 text-center text-gray-900">Comment ça marche ?</h2>
      
      <div className="relative">
        {/* Timeline connector */}
        <div className="absolute left-1/2 -ml-0.5 w-1 h-full bg-indigo-200 hidden md:block"></div>
        
        <div className="space-y-12 md:space-y-0">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 md:pr-8 flex justify-end mb-6 md:mb-16">
              <div className="bg-white p-6 rounded-xl shadow-md border border-indigo-100 max-w-md transform transition-all hover:-translate-y-1 hover:shadow-lg">
                <h3 className="font-bold text-lg text-indigo-700 mb-3">1. Identification simple</h3>
                <p className="text-gray-600">
                  Nous vous demandons simplement votre numéro d'entreprise (BCE) et votre email professionnel pour identifier votre entreprise belge.
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
                <h3 className="font-bold text-lg text-indigo-700 mb-3">2. Étude rapide de votre dossier</h3>
                <p className="text-gray-600">
                  Une fois vos informations et votre sélection complétées, nous étudions votre dossier en moins de 24 heures. Des documents complémentaires pourront éventuellement vous être demandés.
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
                <h3 className="font-bold text-lg text-indigo-700 mb-3">3. Finalisation en ligne</h3>
                <p className="text-gray-600">
                  Après acceptation de votre dossier, téléchargez simplement votre carte d'identité pour la signature électronique du contrat. 
                  Vous pouvez la fournir dès la commande en ligne.
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

export default OrderProcess;
