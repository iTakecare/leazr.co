import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Search, 
  Filter, 
  Settings, 
  Trash2, 
  Plus,
  TrendingDown,
  TrendingUp,
  Minus
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProductCustomPriceEditor } from "./ProductCustomPriceEditor";

interface ClientCustomPriceTableProps {
  clientId: string;
}

export const ClientCustomPriceTable: React.FC<ClientCustomPriceTableProps> = ({
  clientId,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Récupérer les produits avec leurs prix personnalisés
  const { data: products, isLoading } = useQuery({
    queryKey: ['client-custom-prices', clientId, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          *,
          brands (name, translation),
          categories (name, translation),
          client_custom_prices!left (
            id,
            margin_rate,
            negotiated_monthly_price,
            custom_purchase_price
          ),
          product_variant_prices (
            id,
            attributes,
            price,
            monthly_price,
            client_custom_variant_prices!left (
              id,
              margin_rate,
              negotiated_monthly_price,
              custom_purchase_price
            )
          )
        `)
        .eq('active', true)
        .eq('client_custom_prices.client_id', clientId);

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      const { data, error } = await query.order('name');
      if (error) throw error;

      return data?.map(product => {
        const customPrice = product.client_custom_prices?.[0];
        let finalPrice = product.monthly_price;
        
        if (customPrice) {
          if (customPrice.negotiated_monthly_price) {
            finalPrice = customPrice.negotiated_monthly_price;
          } else if (customPrice.margin_rate && product.price) {
            finalPrice = product.price * (1 + (customPrice.margin_rate / 100));
          }
        }

        const hasCustomPrice = !!customPrice;
        const savings = hasCustomPrice ? product.monthly_price - finalPrice : 0;
        const savingsPercentage = hasCustomPrice && product.monthly_price > 0 
          ? ((savings / product.monthly_price) * 100) 
          : 0;

        return {
          ...product,
          customPrice,
          finalPrice,
          hasCustomPrice,
          savings,
          savingsPercentage,
          hasVariants: product.product_variant_prices?.length > 0,
        };
      }) || [];
    },
    enabled: !!clientId,
  });

  // Mutation pour supprimer un prix personnalisé
  const deletePriceMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('client_custom_prices')
        .delete()
        .eq('client_id', clientId)
        .eq('product_id', productId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-custom-prices'] });
      toast({
        title: "Prix supprimé",
        description: "Le prix personnalisé a été supprimé.",
      });
    },
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  const getSavingsIcon = (savings: number) => {
    if (savings > 0) return <TrendingDown className="h-4 w-4 text-green-600" />;
    if (savings < 0) return <TrendingUp className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Prix personnalisés</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un produit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filtres
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Chargement...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead>Prix d'achat</TableHead>
                <TableHead>Prix standard</TableHead>
                <TableHead>Prix personnalisé</TableHead>
                <TableHead>Économie</TableHead>
                <TableHead>Variants</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products?.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {product.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-10 h-10 object-cover rounded"
                        />
                      )}
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {product.brands?.translation || product.brands?.name}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {product.price ? formatPrice(product.price) : "-"}
                  </TableCell>
                  
                  <TableCell>
                    {product.monthly_price ? formatPrice(product.monthly_price) : "-"}
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {product.hasCustomPrice ? (
                        <>
                          {formatPrice(product.finalPrice)}
                          <Badge variant="secondary" className="text-xs">
                            Personnalisé
                          </Badge>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingProduct(product.id)}
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          Ajouter
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {product.hasCustomPrice && (
                      <div className="flex items-center gap-2">
                        {getSavingsIcon(product.savings)}
                        <span className={product.savings > 0 ? "text-green-600" : product.savings < 0 ? "text-red-600" : ""}>
                          {formatPrice(Math.abs(product.savings))}
                          {product.savingsPercentage !== 0 && (
                            <span className="text-xs ml-1">
                              ({product.savingsPercentage > 0 ? "-" : "+"}{Math.abs(product.savingsPercentage).toFixed(1)}%)
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {product.hasVariants && (
                      <Button variant="outline" size="sm">
                        <Settings className="mr-1 h-3 w-3" />
                        Gérer ({product.product_variant_prices?.length})
                      </Button>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {product.hasCustomPrice && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingProduct(product.id)}
                          >
                            Modifier
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deletePriceMutation.mutate(product.id)}
                            disabled={deletePriceMutation.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              
              {products?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Aucun produit trouvé
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Éditeur de prix */}
      {editingProduct && (
        <ProductCustomPriceEditor
          clientId={clientId}
          productId={editingProduct}
          open={!!editingProduct}
          onOpenChange={(open) => !open && setEditingProduct(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['client-custom-prices'] });
            setEditingProduct(null);
          }}
        />
      )}
    </Card>
  );
};