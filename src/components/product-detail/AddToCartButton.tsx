
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
  currentPrice?: number;
  selectedOptions?: Record<string, string>;
  navigateToCart?: boolean;
}

const AddToCartButton: React.FC<AddToCartButtonProps> = ({
  product,
  quantity,
  duration,
  currentPrice,
  selectedOptions = {},
  navigateToCart = true
}) => {
  const { addToCart } = useCart();
  const navigate = useNavigate();
  
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Make a deep copy of the product to avoid any reference issues
    const productClone = JSON.parse(JSON.stringify(product));
    
    // Always set the current price explicitly if provided
    if (currentPrice !== undefined && currentPrice !== null && !isNaN(currentPrice)) {
      console.log(`AddToCartButton: Setting currentPrice to ${currentPrice} for ${productClone.name}`);
      productClone.currentPrice = currentPrice;
      
      // Also set monthly_price directly to ensure consistency
      productClone.monthly_price = currentPrice;
    } else {
      console.warn(`AddToCartButton: Missing or invalid currentPrice for ${productClone.name}`);
    }
    
    // Log the product and its price for debugging
    console.log("AddToCartButton: Adding product to cart:", { 
      productName: productClone.name,
      originalPrice: productClone.monthly_price,
      currentPrice: currentPrice,
      finalCurrentPrice: productClone.currentPrice,
      priceType: typeof productClone.monthly_price,
      quantity, 
      duration, 
      selectedOptions
    });
    
    addToCart({
      product: productClone,
      quantity,
      duration,
      selectedOptions
    });
    
    toast.success(`${product.name} ajouté au panier`);
    
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
