
import React from "react";
import { ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useClientCart } from "@/context/ClientCartContext";
import { Link } from "react-router-dom";

interface ClientCartBadgeProps {
  className?: string;
}

const ClientCartBadge: React.FC<ClientCartBadgeProps> = ({ className }) => {
  const { itemCount } = useClientCart();
  
  return (
    <Link to="/client/cart">
      <Button 
        variant="ghost" 
        size="icon" 
        className={className}
        aria-label="Panier client"
      >
        <ShoppingCart className="h-5 w-5" />
        {itemCount > 0 && (
          <Badge 
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-primary text-white"
          >
            {itemCount > 99 ? '99+' : itemCount}
          </Badge>
        )}
      </Button>
    </Link>
  );
};

export default ClientCartBadge;
