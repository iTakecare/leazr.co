
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Check } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { Product } from "@/types/catalog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

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
  navigateToCart = false // Changed default to false
}) => {
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [isAnimating, setIsAnimating] = useState(false);
  
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
    
    // Show animation
    setIsAnimating(true);
    
    // Show toast notification
    toast.success(`${product.name} ajouté au panier`, {
      description: `${quantity} produit(s) ajouté(s) au panier`
    });
    
    // Reset animation after delay
    setTimeout(() => {
      setIsAnimating(false);
      
      // Only navigate if explicitly requested
      if (navigateToCart) {
        navigate('/panier');
      }
    }, 1000);
  };
  
  return (
    <div className="relative">
      <Button 
        onClick={handleAddToCart}
        className={`text-xs w-full sm:w-auto bg-[#2d618f] hover:bg-[#347599] h-8 px-3 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}
        type="button"
        disabled={isAnimating}
      >
        <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
        Ajouter au panier
      </Button>
      
      <AnimatePresence>
        {isAnimating && (
          <motion.div 
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-green-500 text-white rounded flex items-center justify-center w-full h-8 px-3">
              <Check className="mr-1.5 h-3.5 w-3.5" />
              <span className="text-xs">Produit ajouté</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AddToCartButton;
