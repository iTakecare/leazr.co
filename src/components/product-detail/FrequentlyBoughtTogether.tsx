import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ShoppingCart, Tag, Package } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { getUpsellProducts } from "@/services/catalogServiceOptimized";
import { Product } from "@/types/catalog";

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
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchUpsellProducts = async () => {
      try {
        setLoading(true);
        const products = await getUpsellProducts(companyId, productId, category, brand);
        setUpsellProducts(products.slice(0, 3)); // Limit to 3 products for compactness
      } catch (error) {
        console.error('Error fetching upsell products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUpsellProducts();
  }, [companyId, productId, category, brand]);

  const toggleProductSelection = (id: string) => {
    setSelectedProducts(prev => 
      prev.includes(id) 
        ? prev.filter(p => p !== id)
        : [...prev, id]
    );
  };

  const addSelectedToCart = (product: Product) => {
    addToCart({
      product: product,
      quantity: 1,
      duration: 36, // Fixed duration
      selectedOptions: {}
    });
    
    toast.success(`${product.name} ajouté au panier`);
  };

  const addAllSelectedToCart = () => {
    let addedCount = 0;
    selectedProducts.forEach(productId => {
      const product = upsellProducts.find(p => p.id === productId);
      if (product) {
        addSelectedToCart(product);
        addedCount++;
      }
    });
    
    if (addedCount > 0) {
      setSelectedProducts([]);
      toast.success(`${addedCount} produit${addedCount > 1 ? 's' : ''} ajouté${addedCount > 1 ? 's' : ''} au panier`);
    }
  };

  const getTotalSelectedPrice = () => {
    return selectedProducts.reduce((total, productId) => {
      const product = upsellProducts.find(p => p.id === productId);
      return total + (product?.monthly_price || 0);
    }, 0);
  };

  if (loading || upsellProducts.length === 0) {
    return null;
  }

  const currentProductPrice = currentProduct.monthly_price || 0;
  const bundleTotal = currentProductPrice + getTotalSelectedPrice();
  const suggestedTotal = currentProductPrice + upsellProducts.reduce((sum, p) => sum + (p.monthly_price || 0), 0);
  const potentialSavings = Math.max(0, suggestedTotal * 0.05); // 5% bundle discount

  return (
    <div className="mt-8 animate-fade-in">
      {/* Header Section */}
      <div className="bg-gradient-blue-subtle rounded-t-xl p-6 border-l-4 border-primary">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Produits complémentaires recommandés
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Complétez votre équipement avec ces accessoires sélectionnés
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-primary">
              <Tag className="h-4 w-4" />
              <span className="text-sm font-medium">Économies bundle</span>
            </div>
            <div className="text-lg font-bold text-primary">
              -{formatCurrency(potentialSavings)}
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="bg-card border-x border-border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {upsellProducts.map((product, index) => (
            <div
              key={product.id}
              className="group bg-background rounded-lg border border-border shadow-soft hover:shadow-card transition-all duration-300 hover:-translate-y-1 animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="p-4">
                {/* Product Image */}
                <div className="relative mb-4">
                  <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden mx-auto flex-shrink-0">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Package className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  
                  {/* Selection Checkbox */}
                  <div
                    onClick={() => toggleProductSelection(product.id)}
                    className={`absolute -top-2 -right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all duration-200 ${
                      selectedProducts.includes(product.id)
                        ? 'bg-primary border-primary shadow-glow scale-110'
                        : 'bg-background border-border hover:border-primary hover:scale-105'
                    }`}
                  >
                    {selectedProducts.includes(product.id) && (
                      <svg className="w-3 h-3 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                
                {/* Product Info */}
                <div className="text-center mb-4">
                  <h4 className="font-semibold text-foreground text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                    {product.name}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    {product.brand}
                  </p>
                  <div className="text-lg font-bold text-primary">
                    {formatCurrency(product.monthly_price || 0)}/mois
                  </div>
                </div>
                
                {/* Action Button */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addSelectedToCart(product)}
                  className="w-full hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter seul
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bundle Summary Section */}
      <div className="bg-primary/5 rounded-b-xl p-6 border-x border-b border-border">
        {selectedProducts.length > 0 ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingCart className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  Bundle sélectionné ({selectedProducts.length + 1} produits)
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>Total: {formatCurrency(bundleTotal)}/mois</span>
                {potentialSavings > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-primary font-medium">
                      Économie: -{formatCurrency(potentialSavings * (selectedProducts.length / upsellProducts.length))}
                    </span>
                  </>
                )}
              </div>
            </div>
            
            <Button
              onClick={addAllSelectedToCart}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-button hover:shadow-glow transition-all duration-200"
            >
              <Plus className="h-5 w-5 mr-2" />
              Tout ajouter au panier
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Tag className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                Offre bundle complète
              </span>
            </div>
            <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground mb-4">
              <span>Prix complet: {formatCurrency(suggestedTotal)}/mois</span>
              <span>•</span>
              <span className="text-primary font-medium">
                Avec bundle: {formatCurrency(suggestedTotal - potentialSavings)}/mois
              </span>
            </div>
            <Button
              onClick={() => {
                // Select all products and add to cart
                const allIds = upsellProducts.map(p => p.id);
                setSelectedProducts(allIds);
                setTimeout(() => addAllSelectedToCart(), 100);
              }}
              variant="outline"
              size="lg"
              className="hover:bg-primary hover:text-primary-foreground transition-all duration-200"
            >
              <Package className="h-4 w-4 mr-2" />
              Sélectionner le bundle complet
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FrequentlyBoughtTogether;