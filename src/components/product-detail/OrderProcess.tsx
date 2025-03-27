
import React from "react";
import { ClipboardCheckIcon, ClipboardCopyIcon, ClipboardEditIcon } from "lucide-react";

const OrderProcess = () => {
  return (
    <div className="my-12 bg-gray-50 p-6 rounded-lg border border-gray-200">
      <h2 className="text-xl font-bold mb-6">Fonctionnement de la demande</h2>
      
      <div className="space-y-6">
        <div className="flex">
          <ClipboardCopyIcon className="h-6 w-6 text-indigo-600 mr-4 flex-shrink-0 mt-1" />
          <div>
            <p className="text-gray-700">
              Pour identifier votre entreprise, nous allons vous demander votre numéro de SIREN et votre adresse email professionnelle.
            </p>
          </div>
        </div>
        
        <div className="flex">
          <ClipboardEditIcon className="h-6 w-6 text-indigo-600 mr-4 flex-shrink-0 mt-1" />
          <div>
            <p className="text-gray-700">
              Une fois vos informations rentrées, votre sélection faite et votre adresse de livraison indiquée, nous procédons à l'étude de 
              votre dossier en moins 24 heures.
            </p>
          </div>
        </div>
        
        <div className="flex">
          <ClipboardCheckIcon className="h-6 w-6 text-indigo-600 mr-4 flex-shrink-0 mt-1" />
          <div>
            <p className="text-gray-700">
              Si votre dossier est accepté, votre RIB + votre CNI vous seront demandés pour la signature du contrat en ligne. 
              Vous pouvez les télécharger par avance depuis la commande en ligne.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderProcess;
