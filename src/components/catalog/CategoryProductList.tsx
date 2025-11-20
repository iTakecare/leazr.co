import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Edit, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getCategoryProducts } from "@/services/simplifiedCategoryService";

interface CategoryProductListProps {
  categoryId: string;
  onEditProduct?: (productId: string) => void;
  onViewAllInCatalog?: () => void;
}

export const CategoryProductList: React.FC<CategoryProductListProps> = ({
  categoryId,
  onEditProduct,
  onViewAllInCatalog,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [displayedProducts, setDisplayedProducts] = useState<any[]>([]);
  const [offset, setOffset] = useState(0);
  const BATCH_SIZE = 50;

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["category-products", categoryId, searchTerm],
    queryFn: () =>
      getCategoryProducts(categoryId, {
        searchTerm: searchTerm || undefined,
        includeInactive: true,
      }),
  });

  useEffect(() => {
    setDisplayedProducts(products.slice(0, BATCH_SIZE));
    setOffset(BATCH_SIZE);
  }, [products]);

  const loadMore = () => {
    if (offset < products.length) {
      const nextBatch = products.slice(offset, offset + BATCH_SIZE);
      setDisplayedProducts((prev) => [...prev, ...nextBatch]);
      setOffset(offset + BATCH_SIZE);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 100) {
      loadMore();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un produit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        {onViewAllInCatalog && (
          <Button variant="outline" size="sm" onClick={onViewAllInCatalog}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Voir dans le catalogue
          </Button>
        )}
      </div>

      <ScrollArea className="h-[500px]" onScroll={handleScroll}>
        <div className="space-y-2 pr-4">
          {isLoading ? (
            <div className="text-sm text-muted-foreground text-center py-8">Chargement...</div>
          ) : displayedProducts.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">Aucun produit trouvé</div>
          ) : (
            displayedProducts.map((product) => (
              <div key={product.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="w-10 h-10 bg-muted rounded flex-shrink-0 overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">N/A</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{product.name}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{product.brand_name || "Sans marque"}</span>
                    <span>•</span>
                    <Badge variant={product.active ? "default" : "secondary"} className="text-xs">
                      {product.active ? "Actif" : "Inactif"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {product.purchase_price ? `${Number(product.purchase_price).toFixed(2)}€ achat` : "Prix non défini"} • {product.monthly_price ? `${Number(product.monthly_price).toFixed(2)}€/mois` : "0€/mois"}
                  </div>
                </div>
                {onEditProduct && (
                  <Button variant="ghost" size="sm" onClick={() => onEditProduct(product.id)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))
          )}
          {offset < products.length && (
            <div className="text-xs text-muted-foreground text-center py-4">
              Scroll pour charger plus... ({displayedProducts.length} / {products.length})
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
