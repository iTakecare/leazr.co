
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import PublicHeader from "@/components/catalog/public/PublicHeader";
import { useCart } from "@/context/CartContext";

const ConfirmationPage = () => {
  const navigate = useNavigate();
  const { clearCart } = useCart();
  
  // Nettoyer le panier après la confirmation
  useEffect(() => {
    clearCart();
  }, [clearCart]);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="inline-flex items-center justify-center rounded-full bg-green-100 p-4 mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          
          <h1 className="text-2xl font-bold mb-4">Demande envoyée avec succès</h1>
          
          <p className="text-gray-600 mb-8">
            Merci pour votre demande. Un conseiller iTakecare vous contactera 
            dans les plus brefs délais pour finaliser votre contrat de leasing.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 mb-8">
            <p className="text-sm text-gray-600 mb-2">
              Un email de confirmation a été envoyé à l'adresse email que vous avez fournie.
            </p>
            <p className="text-sm text-gray-600">
              Vous pouvez également suivre votre demande dans votre espace client.
            </p>
          </div>
          
          <Button 
            className="bg-[#2d618f] hover:bg-[#347599] px-8 w-full"
            onClick={() => navigate("/catalogue")}
          >
            Retour au catalogue
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationPage;
