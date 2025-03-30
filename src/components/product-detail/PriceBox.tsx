
import React from "react";
import { Button } from "@/components/ui/button";
import { Check, ShoppingCart } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { toast } from "sonner";

interface PriceBoxProps {
  totalPrice: number;
  duration: number;
  onRequestOffer: () => void;
  product: any;
  quantity: number;
  selectedOptions: Record<string, string>;
}

const PriceBox: React.FC<PriceBoxProps> = ({ 
  totalPrice, 
  duration,
  onRequestOffer,
  product,
  quantity,
  selectedOptions
}) => {
  const handleAddToCart = () => {
    // Récupérer le panier existant du stockage local
    const existingCartJSON = localStorage.getItem('itakecare-cart') || '[]';
    let cart = [];
    
    try {
      cart = JSON.parse(existingCartJSON);
    } catch (error) {
      console.error("Erreur lors de la lecture du panier:", error);
      cart = [];
    }
    
    // Créer l'objet à ajouter au panier
    const cartItem = {
      id: crypto.randomUUID(),
      productId: product.id,
      name: product.name,
      image: product.image_url,
      price: product.price,
      monthlyPrice: totalPrice / quantity, // Prix mensuel unitaire
      totalMonthlyPrice: totalPrice, // Prix mensuel total
      quantity: quantity,
      selectedOptions: selectedOptions,
      addedAt: new Date().toISOString()
    };
    
    // Ajouter le nouvel article au panier
    cart.push(cartItem);
    
    // Enregistrer le panier mis à jour
    localStorage.setItem('itakecare-cart', JSON.stringify(cart));
    
    // Afficher un toast de confirmation
    toast.success(
      <div>
        <p className="font-semibold">{product.name} ajouté au panier</p>
        <p className="text-sm">Quantité: {quantity}</p>
      </div>,
      {
        action: {
          label: "Voir le panier",
          onClick: () => window.location.href = "/panier"
        },
        duration: 5000
      }
    );
  };

  return (
    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-gray-700 font-medium">Votre sélection pour {duration} mois</span>
        <span className="text-2xl font-bold text-[#2d618f]">{formatCurrency(totalPrice)} HT / mois</span>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Button 
          className="w-full sm:w-auto px-8 bg-[#2d618f] hover:bg-[#347599] flex items-center gap-2"
          onClick={handleAddToCart}
        >
          <ShoppingCart className="h-4 w-4" />
          Ajouter au panier
        </Button>
        <Button 
          variant="outline" 
          className="w-full sm:w-auto border-blue-200 text-[#2d618f] hover:bg-blue-50"
          onClick={() => toast.info("Un conseiller vous contactera bientôt.")}
        >
          Parler à un conseiller
        </Button>
      </div>
      
      <div className="space-y-1 text-sm">
        <div className="flex items-center text-gray-600">
          <Check className="h-4 w-4 text-[#347599] mr-2" />
          <span>Livraison gratuite en Europe</span>
        </div>
        <div className="flex items-center text-gray-600">
          <Check className="h-4 w-4 text-[#347599] mr-2" />
          <span>Pas de premier loyer majoré</span>
        </div>
      </div>
    </div>
  );
};

export default PriceBox;
