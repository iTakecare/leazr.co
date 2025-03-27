
import React from "react";
import { Check, DollarSign, RefreshCw, TrendingUp, FileText } from "lucide-react";

const ProductBenefits = () => {
  return (
    <div className="my-12 bg-gradient-to-br from-[#33638e]/30 to-[#4ab6c4]/30 text-gray-700 p-8 rounded-2xl shadow-md border border-[#4ab6c4]/20">
      <h2 className="text-2xl font-bold mb-8 text-[#33638e] flex items-center">
        <TrendingUp className="h-6 w-6 mr-3 text-[#da2959]/80" />
        Pourquoi choisir la location ?
      </h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        <div className="flex items-start backdrop-blur-sm bg-white/60 rounded-xl p-5 transform transition hover:scale-105 hover:bg-white/80 border border-[#4ab6c4]/10">
          <div className="bg-[#33638e]/10 rounded-full p-2 mr-4 mt-1">
            <DollarSign className="h-5 w-5 text-[#33638e]" />
          </div>
          <div>
            <h3 className="font-semibold text-[#33638e] text-lg mb-2">Préservez votre trésorerie</h3>
            <p className="text-gray-600">
              Pas d'investissement initial important. Conservez votre capacité d'emprunt pour d'autres projets stratégiques.
            </p>
          </div>
        </div>
        
        <div className="flex items-start backdrop-blur-sm bg-white/60 rounded-xl p-5 transform transition hover:scale-105 hover:bg-white/80 border border-[#4ab6c4]/10">
          <div className="bg-[#33638e]/10 rounded-full p-2 mr-4 mt-1">
            <RefreshCw className="h-5 w-5 text-[#33638e]" />
          </div>
          <div>
            <h3 className="font-semibold text-[#33638e] text-lg mb-2">Toujours à la pointe</h3>
            <p className="text-gray-600">
              Renouvelez facilement vos équipements en fin de contrat pour disposer des dernières technologies et éviter l'obsolescence.
            </p>
          </div>
        </div>
        
        <div className="flex items-start backdrop-blur-sm bg-white/60 rounded-xl p-5 transform transition hover:scale-105 hover:bg-white/80 border border-[#4ab6c4]/10">
          <div className="bg-[#33638e]/10 rounded-full p-2 mr-4 mt-1">
            <Check className="h-5 w-5 text-[#33638e]" />
          </div>
          <div>
            <h3 className="font-semibold text-[#33638e] text-lg mb-2">Budgétisation simplifiée</h3>
            <p className="text-gray-600">
              Loyers fixes mensuels prévisibles, incluant souvent les services et la maintenance, pour une meilleure maîtrise budgétaire.
            </p>
          </div>
        </div>
        
        <div className="flex items-start backdrop-blur-sm bg-white/60 rounded-xl p-5 transform transition hover:scale-105 hover:bg-white/80 border border-[#4ab6c4]/10">
          <div className="bg-[#33638e]/10 rounded-full p-2 mr-4 mt-1">
            <FileText className="h-5 w-5 text-[#33638e]" />
          </div>
          <div>
            <h3 className="font-semibold text-[#33638e] text-lg mb-2">Optimisation fiscale</h3>
            <p className="text-gray-600">
              Les loyers sont intégralement déductibles des résultats de l'entreprise, offrant un avantage fiscal par rapport à l'achat.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductBenefits;
