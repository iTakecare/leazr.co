import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/hooks/use-toast";
import { useSafeNavigate } from "@/hooks/useSafeNavigate";
import { ProductPack } from "@/types/pack";
import { Product } from "@/types/catalog";

interface PackAddToCartButtonProps {
  pack: ProductPack;
  quantity: number;
  currentPrice: number;
  duration?: number;
  navigateToCart?: boolean;
}

// Convert pack to product format for cart compatibility
const convertPackToProduct = (pack: ProductPack, currentPrice: number): Product => {
  return {
    id: pack.id,
    name: pack.name,
    description: pack.description || "",
    brand: 'Pack',
    category: 'pack',
    price: currentPrice,
    monthly_price: currentPrice,
    currentPrice: currentPrice,
    image_url: pack.image_url || '',
    active: pack.is_active,
    company_id: pack.company_id,
    specifications: { type: 'pack' }, // Mark as pack type for pricing logic
    createdAt: pack.created_at,
    updatedAt: pack.updated_at
  };
};

const PackAddToCartButton: React.FC<PackAddToCartButtonProps> = ({
  pack,
  quantity,
  currentPrice,
  duration = 36,
  navigateToCart = true
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const { addToCart } = useCart();
  const { toast } = useToast();
  const safeNavigate = useSafeNavigate();

  const handleAddToCart = async () => {
    if (!pack) return;

    try {
      // Convert pack to product format
      const productForCart = convertPackToProduct(pack, currentPrice);

      // Add to cart
      addToCart({
        product: productForCart,
        quantity,
        duration
      });

      // Success animation
      setIsAnimating(true);
      
      // Toast notification
      toast({
        title: "Pack ajouté au panier",
        description: `${pack.name} (×${quantity}) a été ajouté à votre panier`,
      });

      // Reset animation after delay
      setTimeout(() => {
        setIsAnimating(false);
        
        // Navigate to cart if requested (same logic as AddToCartButton)
        if (navigateToCart) {
          safeNavigate('/panier');
        }
      }, 1500);

    } catch (error) {
      console.error("Error adding pack to cart:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le pack au panier",
        variant: "destructive"
      });
    }
  };

  return (
    <Button
      onClick={handleAddToCart}
      className={`w-full transition-all duration-300 ${
        isAnimating 
          ? "bg-green-600 hover:bg-green-600" 
          : "bg-[#33638e] hover:bg-[#33638e]/90"
      } text-white`}
      size="lg"
      disabled={isAnimating}
    >
      <AnimatePresence mode="wait">
        {isAnimating ? (
          <motion.div
            key="success"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Ajouté au panier
          </motion.div>
        ) : (
          <motion.div
            key="add"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            Ajouter au panier
          </motion.div>
        )}
      </AnimatePresence>
    </Button>
  );
};

export default PackAddToCartButton;