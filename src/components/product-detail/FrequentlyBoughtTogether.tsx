import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Package, ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { getProductUpsells } from "@/services/catalogService";
import { Product } from "@/types/catalog";
import { supabase } from "@/integrations/supabase/client";

interface FrequentlyBoughtTogetherProps {
  productId: string;
  companyId: string;
  category?: string;
  brand?: string;
  currentProduct: Product;
}

const FrequentlyBoughtTogether: React.FC<FrequentlyBoughtTogetherProps> = ({
  productId,
  companyId,
  category,
  brand,
  currentProduct
}) => {
  const [upsellProducts, setUpsellProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [companySlug, setCompanySlug] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { addToCart } = useCart();

  // Get company slug from ID
  useEffect(() => {
    const fetchCompanySlug = async () => {
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('slug')
          .eq('id', companyId)
          .single();
        
        if (error) throw error;
        setCompanySlug(data?.slug || null);
      } catch (error) {
        console.error('Error fetching company slug:', error);
      }
    };
    
    fetchCompanySlug();
  }, [companyId]);

  useEffect(() => {
    const fetchUpsellProducts = async () => {
      if (!companySlug) return;
      
      try {
        setLoading(true);
        const products = await getProductUpsells(companySlug, productId, 5);
        setUpsellProducts(products);
      } catch (error) {
        console.error('Error fetching upsell products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUpsellProducts();
  }, [companySlug, productId]);

  const checkScrollButtons = () => {
    if (!scrollContainerRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scrollLeft = () => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollBy({
      left: -208, // Card width (192px) + gap (16px) 
      behavior: 'smooth'
    });
  };

  const scrollRight = () => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollBy({
      left: 208, // Card width (192px) + gap (16px)
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    checkScrollButtons();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollButtons);
      window.addEventListener('resize', checkScrollButtons);
      return () => {
        container.removeEventListener('scroll', checkScrollButtons);
        window.removeEventListener('resize', checkScrollButtons);
      };
    }
  }, [upsellProducts]);

  const addToCartHandler = (product: Product) => {
    addToCart({
      product: product,
      quantity: 1,
      duration: 36, // Fixed duration
      selectedOptions: {}
    });
    
    toast.success(`${product.name} ajouté au panier`);
  };

  if (loading) {
    return (
      <div className="mt-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-6 bg-muted rounded-lg w-80 mb-4"></div>
            <div className="flex gap-3 overflow-hidden">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex-shrink-0 w-48">
                  <div className="bg-muted rounded-xl h-40"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (upsellProducts.length === 0) {
    return null;
  }

  return (
    <section className="mt-16 bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-2 rounded-full bg-primary/10">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              Produits complémentaires recommandés
            </h2>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Optimisez votre équipement avec ces accessoires sélectionnés spécialement pour votre produit
          </p>
        </div>

        {/* Products with Navigation */}
        <div className="relative">
          {/* Navigation Buttons */}
          {canScrollLeft && (
            <Button
              variant="outline"
              size="icon"
              onClick={scrollLeft}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm shadow-lg hover:shadow-xl"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          
          {canScrollRight && (
            <Button
              variant="outline"
              size="icon"
              onClick={scrollRight}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm shadow-lg hover:shadow-xl"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}

          <div 
            ref={scrollContainerRef}
            className="flex gap-3 overflow-x-auto pb-4 scroll-smooth scrollbar-hide px-8"
          >
            {upsellProducts.map((product, index) => (
              <div
                key={product.id}
                className="group flex-shrink-0 w-48 bg-card rounded-xl border border-border/50 hover:border-primary/30 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-fade-in overflow-hidden"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {/* Product Badge */}
                <div className="absolute top-3 right-3 z-10">
                  <span className="bg-primary/10 text-primary text-xs font-semibold px-2 py-1 rounded-full backdrop-blur-sm">
                    Recommandé
                  </span>
                </div>

                {/* Product Image */}
                <div className="relative h-20 bg-gradient-to-br from-muted/30 to-muted/50 overflow-hidden">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                  )}
                  
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                
                {/* Product Content */}
                <div className="p-3">
                  {/* Brand */}
                  {product.brand && (
                    <p className="text-xs font-medium text-primary/70 uppercase tracking-wide mb-1">
                      {product.brand}
                    </p>
                  )}
                  
                  {/* Product Name */}
                  <h3 className="font-semibold text-foreground text-sm mb-2 line-clamp-2 group-hover:text-primary transition-colors duration-300 leading-tight">
                    {product.name}
                  </h3>
                  
                  {/* Price */}
                  <div className="mb-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-primary">
                        {formatCurrency(product.monthly_price || 0)}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">
                        /mois
                      </span>
                    </div>
                  </div>
                  
                  {/* Action Button */}
                  <Button
                    onClick={() => addToCartHandler(product)}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground transition-colors duration-300 font-medium text-xs"
                    size="sm"
                  >
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    Ajouter
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          {/* Scroll indicators */}
          <div className="flex justify-center mt-6 gap-2">
            {upsellProducts.map((_, index) => (
              <div 
                key={index}
                className="w-2 h-2 rounded-full bg-primary/20 animate-fade-in"
                style={{ animationDelay: `${(index + 4) * 100}ms` }}
              ></div>
            ))}
          </div>
        </div>
      </div>

      <style>
        {`.scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }`}
      </style>
    </section>
  );
};

export default FrequentlyBoughtTogether;