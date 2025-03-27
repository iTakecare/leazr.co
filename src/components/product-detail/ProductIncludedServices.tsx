
import React from "react";
import { Headphones, ShieldCheck, Truck, RotateCw } from "lucide-react";

const ProductIncludedServices = () => {
  return (
    <div className="my-12 bg-gray-50 p-6 rounded-lg border border-gray-200">
      <h2 className="text-xl font-bold mb-6">Services inclus</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-start">
          <div className="bg-indigo-100 p-2 rounded-full mr-3 mt-1">
            <Truck className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">Livraison rapide</h3>
            <p className="text-gray-600 text-sm">
              Livraison offerte dans toute la France métropolitaine et l'Europe.
            </p>
          </div>
        </div>
        
        <div className="flex items-start">
          <div className="bg-indigo-100 p-2 rounded-full mr-3 mt-1">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">Garantie incluse</h3>
            <p className="text-gray-600 text-sm">
              Garantie pendant toute la durée du contrat, y compris dommages accidentels.
            </p>
          </div>
        </div>
        
        <div className="flex items-start">
          <div className="bg-indigo-100 p-2 rounded-full mr-3 mt-1">
            <Headphones className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">Support technique</h3>
            <p className="text-gray-600 text-sm">
              Une équipe dédiée pour vous accompagner tout au long de votre contrat.
            </p>
          </div>
        </div>
        
        <div className="flex items-start">
          <div className="bg-indigo-100 p-2 rounded-full mr-3 mt-1">
            <RotateCw className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">Renouvellement facile</h3>
            <p className="text-gray-600 text-sm">
              Possibilité de renouveler ou remplacer votre équipement à la fin du contrat.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductIncludedServices;
