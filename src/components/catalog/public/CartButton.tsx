
import React from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

interface CartButtonProps {
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

const CartButton: React.FC<CartButtonProps> = ({
  className = "",
  variant = "outline"
}) => {
  const { getTotalItems } = useCart();
  const itemCount = getTotalItems();

  return (
    <Button
      variant={variant}
      size="sm"
      className={`relative ${className}`}
      asChild
    >
      <Link to="/panier">
        <ShoppingCart className="h-4 w-4 mr-2" />
        Panier
        {itemCount > 0 && (
          <Badge 
            variant="destructive"
            className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center rounded-full"
          >
            {itemCount}
          </Badge>
        )}
      </Link>
    </Button>
  );
};

export default CartButton;
