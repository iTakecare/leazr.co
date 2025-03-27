
import React from "react";
import { ShieldCheckIcon, PhoneIcon, MonitorSmartphoneIcon, RecycleIcon, RefreshCcwIcon } from "lucide-react";

const ProductIncludedServices = () => {
  return (
    <div className="my-12">
      <h2 className="text-xl font-bold mb-6">Inclus dans votre location</h2>
      
      <div className="space-y-4">
        <div className="flex items-center">
          <div className="bg-indigo-100 p-2 rounded-full mr-4">
            <ShieldCheckIcon className="h-5 w-5 text-indigo-700" />
          </div>
          <p className="text-gray-700">Garantie étendue et assurance casse, vol et oxydation</p>
        </div>
        
        <div className="flex items-center">
          <div className="bg-indigo-100 p-2 rounded-full mr-4">
            <PhoneIcon className="h-5 w-5 text-indigo-700" />
          </div>
          <p className="text-gray-700">Support depuis l'application ou par téléphone pour les pannes logicielles</p>
        </div>
        
        <div className="flex items-center">
          <div className="bg-indigo-100 p-2 rounded-full mr-4">
            <MonitorSmartphoneIcon className="h-5 w-5 text-indigo-700" />
          </div>
          <p className="text-gray-700">Accès à notre application de gestion de flotte en ligne MyValaia</p>
        </div>
        
        <div className="flex items-center">
          <div className="bg-indigo-100 p-2 rounded-full mr-4">
            <RecycleIcon className="h-5 w-5 text-indigo-700" />
          </div>
          <p className="text-gray-700">Recyclage ou reconditionnement de vos appareils en fin de contrat</p>
        </div>
        
        <div className="flex items-center">
          <div className="bg-indigo-100 p-2 rounded-full mr-4">
            <RefreshCcwIcon className="h-5 w-5 text-indigo-700" />
          </div>
          <p className="text-gray-700">La possibilité de mettre à niveau votre appareil au bout de 12 mois</p>
        </div>
      </div>
    </div>
  );
};

export default ProductIncludedServices;
