import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, Loader2 } from "lucide-react";
import { useCompanyDetection } from "@/hooks/useCompanyDetection";
import { useAddProductUpsell } from "@/hooks/products/useProductUpsells";
import { supabase } from "@/integrations/supabase/client";

interface UpsellProductPickerProps {
  productId: string;
  currentProductId: string;
  alreadySelected: Set<string>;
}

export const UpsellProductPicker = ({ 
  productId, 
  currentProductId, 
  alreadySelected 
}: UpsellProductPickerProps) => {
  const [search, setSearch] = useState("");
  const { companyId } = useCompanyDetection();
  const addUpsell = useAddProductUpsell();

  // Requête directe pour récupérer les produits du catalogue
  const { data: products, isLoading } = useQuery({
    queryKey: ["catalog-products", companyId, search],
    queryFn: async () => {
      if (!companyId) return [];
      
      let query = supabase
        .from("products")
        .select("*")
        .eq("company_id", companyId)
        .eq("active", true)
        .order("name");

      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  // Filtrer les produits (exclure le produit actuel et ceux déjà sélectionnés)
  const availableProducts = useMemo(() => {
    if (!products) return [];
    
    return products.filter(
      p => p.id !== currentProductId && !alreadySelected.has(p.id)
    );
  }, [products, currentProductId, alreadySelected]);

  const handleAdd = (upsellProductId: string) => {
    addUpsell.mutate({
      productId,
      upsellProductId,
      priority: 0,
    });
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un produit..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <ScrollArea className="h-[500px] pr-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : availableProducts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {search ? "Aucun produit trouvé" : "Aucun produit disponible"}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {availableProducts.map((product) => (
              <Card key={product.id} className="hover:bg-accent/50 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-12 w-12 object-cover rounded"
                      />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.monthly_price 
                          ? `${product.monthly_price.toFixed(2)} €/mois` 
                          : 'Prix non défini'}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAdd(product.id)}
                      disabled={addUpsell.isPending}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Ajouter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
