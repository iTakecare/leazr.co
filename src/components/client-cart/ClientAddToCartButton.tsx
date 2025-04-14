
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Check } from "lucide-react";
import { useClientCart } from "@/context/ClientCartContext";
import { Product } from "@/types/catalog";

interface ClientAddToCartButtonProps {
  product: Product;
  quantity: number;
  duration?: number;
  selectedOptions?: Record<string, string>;
  variant?: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  monthlyPrice?: number;
}

const ClientAddToCartButton: React.FC<ClientAddToCartButtonProps> = ({
  product,
  quantity,
  duration = 36, // Contrat fixé à 36 mois
  selectedOptions = {},
  variant = "default",
  size = "default",
  className = "",
  monthlyPrice
}) => {
  const { addItem, isInCart } = useClientCart();
  const [added, setAdded] = useState<boolean>(false);
  
  const alreadyInCart = isInCart(product.id);

  const handleAddToCart = () => {
    addItem({
      product,
      quantity,
      duration,
      selectedOptions,
      monthlyPrice
    });
    
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <Button
      variant={added || alreadyInCart ? "secondary" : variant}
      size={size}
      className={className}
      onClick={handleAddToCart}
      disabled={added}
    >
      {added ? (
        <>
          <Check className="h-4 w-4 mr-2" />
          Ajouté
        </>
      ) : alreadyInCart ? (
        <>
          <ShoppingBag className="h-4 w-4 mr-2" />
          Déjà dans le panier
        </>
      ) : (
        <>
          <ShoppingBag className="h-4 w-4 mr-2" />
          Ajouter au panier
        </>
      )}
    </Button>
  );
};

export default ClientAddToCartButton;
