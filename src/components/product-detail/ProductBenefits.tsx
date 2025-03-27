
import React from "react";
import { Check } from "lucide-react";

const ProductBenefits = () => {
  return (
    <div className="my-12 bg-gray-50 p-6 rounded-lg border border-gray-200">
      <h2 className="text-xl font-bold mb-6">Les avantages de la location</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-start">
          <div className="bg-indigo-100 p-2 rounded-full mr-3 mt-1">
            <Check className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">Pas d'investissement initial</h3>
            <p className="text-gray-600 text-sm">
              Préservez votre trésorerie et votre capacité d'emprunt pour d'autres projets.
            </p>
          </div>
        </div>
        
        <div className="flex items-start">
          <div className="bg-indigo-100 p-2 rounded-full mr-3 mt-1">
            <Check className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">Équipements toujours à jour</h3>
            <p className="text-gray-600 text-sm">
              Remplacez facilement vos équipements en fin de contrat par des modèles plus récents.
            </p>
          </div>
        </div>
        
        <div className="flex items-start">
          <div className="bg-indigo-100 p-2 rounded-full mr-3 mt-1">
            <Check className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">Coûts maîtrisés et prévisibles</h3>
            <p className="text-gray-600 text-sm">
              Un loyer fixe mensuel pour une meilleure gestion budgétaire.
            </p>
          </div>
        </div>
        
        <div className="flex items-start">
          <div className="bg-indigo-100 p-2 rounded-full mr-3 mt-1">
            <Check className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">Avantage fiscal</h3>
            <p className="text-gray-600 text-sm">
              Les loyers sont des charges déductibles du résultat imposable de l'entreprise.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductBenefits;
