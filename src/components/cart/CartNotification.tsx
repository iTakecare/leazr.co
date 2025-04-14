
import React, { useEffect, useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface CartNotificationProps {
  className?: string;
}

const CartNotification: React.FC<CartNotificationProps> = ({ className }) => {
  const { cartCount } = useCart();
  const [animated, setAnimated] = useState(false);
  
  // Animation lorsque le nombre d'articles change
  useEffect(() => {
    if (cartCount > 0) {
      setAnimated(true);
      const timer = setTimeout(() => setAnimated(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [cartCount]);
  
  if (cartCount === 0) {
    return (
      <Link to="/panier" className={cn("relative", className)}>
        <ShoppingCart className="h-5 w-5" />
      </Link>
    );
  }
  
  return (
    <Link to="/panier" className={cn("relative", className)}>
      <ShoppingCart className={cn(
        "h-5 w-5 transition-transform", 
        animated && "animate-bounce"
      )} />
      <Badge 
        variant="destructive" 
        className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
      >
        {cartCount}
      </Badge>
    </Link>
  );
};

export default CartNotification;
