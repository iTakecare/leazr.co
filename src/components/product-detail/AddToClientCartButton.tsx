
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Check, Loader2 } from "lucide-react";
import { useClientCart } from "@/context/ClientCartContext";
import { toast } from "sonner";
import { Product } from "@/types/catalog";

interface AddToClientCartButtonProps {
  product: Product;
  quantity: number;
  duration: number;
  selectedOptions?: Record<string, string>;
  disabled?: boolean;
  showLabel?: boolean;
}

const AddToClientCartButton: React.FC<AddToClientCartButtonProps> = ({
  product,
  quantity,
  duration,
  selectedOptions,
  disabled = false,
  showLabel = true
}) => {
  const { addItem } = useClientCart();
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToCart = () => {
    setIsAdding(true);
    
    try {
      addItem(product, quantity, duration, selectedOptions);
      setIsAdded(true);
      
      // Reset the added state after 2 seconds
      setTimeout(() => {
        setIsAdded(false);
      }, 2000);
    } catch (error) {
      console.error("Error adding product to cart:", error);
      toast.error("Erreur lors de l'ajout du produit au panier");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Button
      onClick={handleAddToCart}
      disabled={disabled || isAdding}
      className="w-full gap-2"
    >
      {isAdding ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {showLabel && "Ajout en cours..."}
        </>
      ) : isAdded ? (
        <>
          <Check className="h-4 w-4" />
          {showLabel && "Ajouté au panier"}
        </>
      ) : (
        <>
          <ShoppingCart className="h-4 w-4" />
          {showLabel && "Ajouter au panier"}
        </>
      )}
    </Button>
  );
};

export default AddToClientCartButton;
