import React from "react";
import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import Logo from "@/components/layout/Logo";
import { useCart } from "@/context/CartContext";

interface SimpleHeaderProps {
  companyId?: string;
}

const SimpleHeader = ({ companyId }: SimpleHeaderProps) => {
  const { cartCount } = useCart();
  
  return (
    <header className="bg-white border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link 
            to="/" 
            className="text-xl md:text-2xl font-bold text-[#33638E] flex items-center group"
          >
            <Logo variant="avatar" logoSize="md" showText={false} className="mr-3 transition-transform duration-300 group-hover:scale-110" />
            <span className="bg-gradient-to-r from-[#33638E] to-[#48b5c3] bg-clip-text text-transparent text-xl">
              iTakecare
            </span>
          </Link>
          
          <Link
            to={companyId ? `/public/${companyId}/panier` : "/panier"}
            className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Voir le panier"
          >
            <ShoppingCart className="h-6 w-6 text-gray-700" />
            {cartCount > 0 && (
              <span className={cn(
                "absolute -top-1 -right-1 bg-[#33638E] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center",
                cartCount > 0 && "animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]"
              )}>
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
};

export default SimpleHeader;