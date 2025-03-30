
import React from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { Product } from "@/types/catalog";
import { toast } from "sonner";

interface AddToCartButtonProps {
  product: Product;
  quantity: number;
  duration: number;
  selectedOptions?: Record<string, string>;
}

const AddToCartButton: React.FC<AddToCartButtonProps> = ({
  product,
  quantity,
  duration,
  selectedOptions = {}
}) => {
  const { addToCart } = useCart();
  
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); // Empêche la navigation ou l'ouverture d'une modale
    e.stopPropagation(); // Arrête la propagation de l'événement
    
    console.log("Adding to cart:", { product, quantity, duration, selectedOptions });
    
    addToCart({
      product,
      quantity,
      duration,
      selectedOptions
    });
    
    toast.success(`${product.name} ajouté au panier`);
  };
  
  return (
    <Button 
      onClick={handleAddToCart}
      className="px-8 bg-[#2d618f] hover:bg-[#347599] w-full sm:w-auto"
      type="button"
    >
      <ShoppingCart className="mr-2 h-4 w-4" />
      Ajouter au panier
    </Button>
  );
};

export default AddToCartButton;
