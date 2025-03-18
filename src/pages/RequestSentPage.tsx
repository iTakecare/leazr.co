
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowLeft } from "lucide-react";
import PublicHeader from "@/components/catalog/public/PublicHeader";

const RequestSentPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <div className="mb-6 flex justify-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          
          <h1 className="text-2xl font-bold mb-4">Demande envoyée avec succès !</h1>
          
          <p className="text-gray-600 mb-8">
            Merci pour votre demande. Notre équipe l'examinera dans les plus brefs délais 
            et vous contactera sous 24 heures ouvrées.
          </p>
          
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-6 text-left">
              <h3 className="font-medium mb-4">Fonctionnement de la demande</h3>
              
              <ol className="space-y-4">
                <li className="flex">
                  <span className="flex-shrink-0 flex items-center justify-center bg-indigo-100 text-indigo-800 h-6 w-6 rounded-full mr-3 text-sm font-medium">1</span>
                  <span>Pour identifier votre entreprise, nous allons vous demander votre numéro de SIRET et votre adresse email professionnelle.</span>
                </li>
                <li className="flex">
                  <span className="flex-shrink-0 flex items-center justify-center bg-indigo-100 text-indigo-800 h-6 w-6 rounded-full mr-3 text-sm font-medium">2</span>
                  <span>Une fois vos informations rentrées, votre sélection faite et votre adresse de livraison indiquée, nous procéderons à l'étude de votre dossier en moins de 24 heures.</span>
                </li>
                <li className="flex">
                  <span className="flex-shrink-0 flex items-center justify-center bg-indigo-100 text-indigo-800 h-6 w-6 rounded-full mr-3 text-sm font-medium">3</span>
                  <span>Si votre dossier est accepté, votre RIB + votre CNI vous seront demandés pour la signature du contrat en ligne.</span>
                </li>
              </ol>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                className="w-full sm:w-auto" 
                onClick={() => navigate("/catalogue")}
                variant="outline"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour au catalogue
              </Button>
              
              <Button 
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700" 
                onClick={() => navigate("/")}
              >
                Découvrir nos solutions
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestSentPage;
