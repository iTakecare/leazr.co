
import React from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { Product } from "@/types/catalog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface AddToCartButtonProps {
  product: Product;
  quantity: number;
  duration: number;
  selectedOptions?: Record<string, string>;
  navigateToCart?: boolean;
}

const AddToCartButton: React.FC<AddToCartButtonProps> = ({
  product,
  quantity,
  duration,
  selectedOptions = {},
  navigateToCart = true // Default to true to always navigate to cart page
}) => {
  const { addToCart } = useCart();
  const navigate = useNavigate();
  
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent the default behavior
    e.stopPropagation(); // Stop event propagation
    
    // Ensure the product has a valid price before adding to cart
    if (typeof product.monthly_price !== 'number' || product.monthly_price === 0) {
      console.warn("Warning: Product has no monthly price", product);
    }
    
    console.log("Adding to cart:", { 
      product, 
      quantity, 
      duration, 
      selectedOptions,
      price: product.monthly_price 
    });
    
    addToCart({
      product,
      quantity,
      duration,
      selectedOptions
    });
    
    toast.success(`${product.name} ajouté au panier`);
    
    // Always navigate to the cart page if navigateToCart is true
    if (navigateToCart) {
      navigate('/panier');
    }
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
