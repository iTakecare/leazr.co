
import React from "react";
import { Button } from "@/components/ui/button";
import { Product } from "@/types/catalog";
import { useCart } from "@/context/CartContext";
import { ShoppingCart, Plus } from "lucide-react";

interface AddToCartButtonProps {
  product: Product;
  quantity?: number;
  selectedAttributes?: Record<string, string>;
  className?: string;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

const AddToCartButton: React.FC<AddToCartButtonProps> = ({
  product,
  quantity = 1,
  selectedAttributes,
  className = "",
  variant = "default",
  size = "default"
}) => {
  const { addToCart } = useCart();

  const handleAddToCart = () => {
    addToCart(product, quantity, selectedAttributes);
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleAddToCart}
    >
      {size === "icon" ? (
        <Plus className="h-4 w-4" />
      ) : (
        <>
          <ShoppingCart className="h-4 w-4 mr-2" />
          Ajouter au panier
        </>
      )}
    </Button>
  );
};

export default AddToCartButton;
