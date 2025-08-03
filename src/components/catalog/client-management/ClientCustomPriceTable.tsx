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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Search, 
  Filter, 
  Settings, 
  Trash2, 
  Plus,
  TrendingDown,
  TrendingUp,
  Minus,
  Package,
  ShoppingCart
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
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("assigned");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Récupérer les produits assignés (avec prix personnalisés)
  const { data: assignedProducts, isLoading: loadingAssigned } = useQuery({
    queryKey: ['client-assigned-products', clientId, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          *,
          brands (name, translation),
          categories (name, translation),
          client_custom_prices!inner (
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

        const savings = product.monthly_price - finalPrice;
        const savingsPercentage = product.monthly_price > 0 
          ? ((savings / product.monthly_price) * 100) 
          : 0;

        return {
          ...product,
          customPrice,
          finalPrice,
          savings,
          savingsPercentage,
          hasVariants: product.product_variant_prices?.length > 0,
        };
      }) || [];
    },
    enabled: !!clientId && activeTab === "assigned",
  });

  // Récupérer tous les produits pour l'onglet "Ajouter"
  const { data: allProducts, isLoading: loadingAll } = useQuery({
    queryKey: ['all-products-for-client', clientId, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          *,
          brands (name, translation),
          categories (name, translation),
          client_custom_prices!left (
            id,
            client_id
          )
        `)
        .eq('active', true);

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      const { data, error } = await query.order('name');
      if (error) throw error;

      return data?.map(product => ({
        ...product,
        isAssigned: product.client_custom_prices?.some(cp => cp.client_id === clientId) || false,
      })) || [];
    },
    enabled: !!clientId && activeTab === "add",
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
      queryClient.invalidateQueries({ queryKey: ['client-assigned-products'] });
      queryClient.invalidateQueries({ queryKey: ['all-products-for-client'] });
      toast({
        title: "Prix supprimé",
        description: "Le prix personnalisé a été supprimé.",
      });
    },
  });

  // Mutation pour ajouter des produits au catalogue personnalisé
  const addProductsMutation = useMutation({
    mutationFn: async (productIds: string[]) => {
      const inserts = productIds.map(productId => ({
        client_id: clientId,
        product_id: productId,
        margin_rate: 0, // Taux par défaut, sera modifiable ensuite
      }));

      const { error } = await supabase
        .from('client_custom_prices')
        .insert(inserts);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-assigned-products'] });
      queryClient.invalidateQueries({ queryKey: ['all-products-for-client'] });
      setSelectedProducts([]);
      toast({
        title: "Produits ajoutés",
        description: `${selectedProducts.length} produit(s) ajouté(s) au catalogue personnalisé.`,
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

  const handleSelectProduct = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts(prev => [...prev, productId]);
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const availableProducts = allProducts?.filter(p => !p.isAssigned).map(p => p.id) || [];
      setSelectedProducts(availableProducts);
    } else {
      setSelectedProducts([]);
    }
  };

  const availableProducts = allProducts?.filter(p => !p.isAssigned) || [];
  const isAllSelected = availableProducts.length > 0 && selectedProducts.length === availableProducts.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Catalogue personnalisé</CardTitle>
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
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="assigned" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Produits assignés ({assignedProducts?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="add" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Ajouter des produits
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assigned" className="mt-6">
            {loadingAssigned ? (
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
                  {assignedProducts?.map((product) => (
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
                          {formatPrice(product.finalPrice)}
                          <Badge variant="secondary" className="text-xs">
                            Personnalisé
                          </Badge>
                        </div>
                      </TableCell>
                      
                      <TableCell>
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
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {assignedProducts?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Aucun produit assigné au catalogue personnalisé
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="add" className="mt-6">
            {selectedProducts.length > 0 && (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg mb-4">
                <span className="text-sm font-medium">
                  {selectedProducts.length} produit(s) sélectionné(s)
                </span>
                <Button
                  onClick={() => addProductsMutation.mutate(selectedProducts)}
                  disabled={addProductsMutation.isPending}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter au catalogue
                </Button>
              </div>
            )}

            {loadingAll ? (
              <div className="text-center py-8">Chargement...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead>Prix d'achat</TableHead>
                    <TableHead>Prix mensuel</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allProducts?.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        {product.isAssigned ? (
                          <Badge variant="secondary" className="text-xs">
                            Assigné
                          </Badge>
                        ) : (
                          <Checkbox
                            checked={selectedProducts.includes(product.id)}
                            onCheckedChange={(checked) => handleSelectProduct(product.id, !!checked)}
                          />
                        )}
                      </TableCell>
                      
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
                        <Badge variant={product.active ? "default" : "secondary"}>
                          {product.active ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <span className={product.stock > 0 ? "text-green-600" : "text-red-600"}>
                          {product.stock} unités
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {allProducts?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Aucun produit trouvé
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Éditeur de prix */}
      {editingProduct && (
        <ProductCustomPriceEditor
          clientId={clientId}
          productId={editingProduct}
          open={!!editingProduct}
          onOpenChange={(open) => !open && setEditingProduct(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['client-assigned-products'] });
            queryClient.invalidateQueries({ queryKey: ['all-products-for-client'] });
            setEditingProduct(null);
          }}
        />
      )}
    </Card>
  );
};