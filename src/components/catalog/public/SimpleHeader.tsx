
import React from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import Logo from "@/components/layout/Logo";
import { useCart } from "@/context/CartContext";


interface SimpleHeaderProps {
  companyId?: string;
  companyLogo?: string;
  companyName?: string;
}

const SimpleHeader: React.FC<SimpleHeaderProps> = ({ companyId, companyLogo, companyName }) => {
  const { cartCount } = useCart();
  const location = useLocation();
  
  // Hide header in embed mode (check URL parameter)
  const params = new URLSearchParams(location.search);
  const isEmbed = params.get('embed') === '1';
  
  if (isEmbed) {
    return null;
  }
  
  const { companySlug } = useParams<{ companySlug: string }>();
  
  // Determine the correct cart URL based on context
  const getCartUrl = () => {
    const isInClientSpace = location.pathname.includes('/client/');
    
    if (isInClientSpace && companySlug) {
      return `/${companySlug}/client/panier`;
    } else if (companySlug) {
      return `/${companySlug}/panier`;
    } else if (companyId) {
      return `/public/${companyId}/panier`;
    }
    return "/panier";
  };
  
  return (
    <header className="bg-white border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link 
            to="/" 
            className="text-xl md:text-2xl font-bold text-[#33638E] flex items-center group"
          >
            {companyLogo ? (
              <img 
                src={companyLogo} 
                alt={companyName || "Logo entreprise"} 
                className="h-10 w-10 mr-3 rounded-lg object-cover transition-transform duration-300 group-hover:scale-110"
              />
            ) : (
              <Logo variant="avatar" logoSize="md" showText={false} className="mr-3 transition-transform duration-300 group-hover:scale-110" />
            )}
            <span className="bg-gradient-to-r from-[#33638E] to-[#48b5c3] bg-clip-text text-transparent text-xl">
              {companyName || "iTakecare"}
            </span>
          </Link>
          
          <Link
            to={getCartUrl()}
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
