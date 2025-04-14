
import React from "react";
import Container from "@/components/layout/Container";
import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { Badge } from "@/components/ui/badge";

interface CatalogHeaderProps {
  title?: string;
  description?: string;
}

const CatalogHeader: React.FC<CatalogHeaderProps> = ({ 
  title = "Catalogue de produits", 
  description = "Parcourez notre sélection d'équipements reconditionnés pour votre entreprise" 
}) => {
  const { cartCount } = useCart();

  return (
    <Container maxWidth="full" className="mb-8 bg-gradient-to-r from-blue-50/50 to-slate-50/50 py-8">
      <div className="max-w-3xl mx-auto text-left flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-3 text-left">{title}</h1>
          <p className="text-muted-foreground text-base md:text-lg text-left">
            {description}
          </p>
        </div>
        <Link to="/panier" className="relative">
          <ShoppingCart className="h-7 w-7 text-gray-700 hover:text-blue-600" />
          {cartCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {cartCount}
            </Badge>
          )}
        </Link>
      </div>
    </Container>
  );
};

export default CatalogHeader;
