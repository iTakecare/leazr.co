import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Trash2, GripVertical, Package, Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/services/catalogService";
import { getProductVariantPrices } from "@/services/variantPriceService";
import { Product } from "@/types/catalog";
import { PackItemFormData } from "@/hooks/packs/usePackCreator";
import { ProductVariantSelector, ProductVariantSelectorRef } from "./ProductVariantSelector";

interface PackProductSelectionProps {
  packItems: PackItemFormData[];
  onAddItem: (item: PackItemFormData) => void;
  onUpdateItem: (index: number, updates: Partial<PackItemFormData>) => void;
  onRemoveItem: (index: number) => void;
  onReorderItems: (startIndex: number, endIndex: number) => void;
}

export const PackProductSelection = ({
  packItems,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onReorderItems,
}: PackProductSelectionProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [variantOptions, setVariantOptions] = useState<Record<string, string>>({});
  const [showVariantSelector, setShowVariantSelector] = useState(false);
  const variantSelectorRef = useRef<ProductVariantSelectorRef>(null);

  // Fetch all products (including inactive ones for packs)
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", "admin"],
    queryFn: () => getProducts({ includeAdminOnly: true }),
  });

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.brand?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  const handleAddProduct = async (product: Product) => {
    // Check if product is already in the pack
    const existingItem = packItems.find(item => item.product_id === product.id);
    if (existingItem) {
      // Just increase quantity
      const index = packItems.findIndex(item => item.product_id === product.id);
      onUpdateItem(index, { quantity: existingItem.quantity + 1 });
      return;
    }

    // Get product variants if available
    let variants = [];
    try {
      variants = await getProductVariantPrices(product.id);
    } catch (error) {
      console.log("No variants for product:", product.id);
    }

    // If product has variants, show variant selector
    if (variants.length > 0) {
      setSelectedProduct(product);
      setVariantOptions({});
      setShowVariantSelector(true);
      return;
    }

    // No variants, add product directly
    addProductToPackDirect(product, undefined, product.price, product.monthly_price);
  };

  const addProductToPackDirect = (
    product: Product, 
    variantId?: string, 
    price?: number, 
    monthlyPrice?: number
  ) => {
    const basePrice = price || product.price || 0;
    const baseMonthlyPrice = monthlyPrice || product.monthly_price || basePrice * 1.2;

    const newItem: PackItemFormData = {
      product_id: product.id,
      variant_price_id: variantId,
      quantity: 1,
      unit_purchase_price: basePrice,
      unit_monthly_price: baseMonthlyPrice,
      margin_percentage: basePrice > 0 ? ((baseMonthlyPrice - basePrice) / basePrice) * 100 : 20,
      custom_price_override: false,
      position: packItems.length,
      product: product,
      isNew: true,
    };

    onAddItem(newItem);
    setShowAddProduct(false);
    setShowVariantSelector(false);
    setSelectedProduct(null);
    setVariantOptions({});
  };

  const handleVariantSelect = (variantId?: string, price?: number, monthlyPrice?: number) => {
    if (selectedProduct) {
      addProductToPackDirect(selectedProduct, variantId, price, monthlyPrice);
    }
  };

  const handleVariantOptionChange = (optionName: string, value: string) => {
    setVariantOptions(prev => ({ ...prev, [optionName]: value }));
  };

  const openVariantSelector = (item: PackItemFormData, index: number) => {
    if (item.product) {
      setSelectedProduct(item.product);
      setVariantOptions({});
      setShowVariantSelector(true);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Chargement des produits...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Pack Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Produits du pack ({packItems.length})
          </CardTitle>
          <CardDescription>
            Gérez les produits inclus dans ce pack
          </CardDescription>
        </CardHeader>
        <CardContent>
          {packItems.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun produit sélectionné</h3>
              <p className="text-muted-foreground mb-4">
                Ajoutez des produits à votre pack en utilisant le bouton ci-dessous
              </p>
              <Button onClick={() => setShowAddProduct(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Ajouter un produit
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {packItems.map((item, index) => (
                <div
                  key={`${item.product_id}-${index}`}
                  className="flex items-center gap-4 p-4 border rounded-lg"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                  
                  <div className="flex-1 grid grid-cols-4 gap-4 items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{item.product?.name}</p>
                        {item.variant_price_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openVariantSelector(item, index)}
                            className="h-6 px-2 text-xs"
                          >
                            <Settings className="h-3 w-3 mr-1" />
                            Variante
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.product?.brand} • {item.product?.category}
                      </p>
                      {item.variant_price_id && (
                        <div className="flex gap-1 mt-1">
                          <Badge variant="outline" className="text-xs">
                            Variante sélectionnée
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-muted-foreground">Qté:</label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => onUpdateItem(index, { 
                          quantity: parseInt(e.target.value) || 1 
                        })}
                        className="w-20"
                      />
                    </div>
                    
                    <div className="text-sm">
                      <p className="text-muted-foreground">Prix unitaire</p>
                      <p className="font-medium">{formatPrice(item.unit_monthly_price)}</p>
                    </div>
                    
                    <div className="text-sm">
                      <p className="text-muted-foreground">Total</p>
                      <p className="font-medium">{formatPrice(item.unit_monthly_price * item.quantity)}</p>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveItem(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              <Button
                onClick={() => setShowAddProduct(true)}
                variant="outline"
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" />
                Ajouter un produit
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Product Section */}
      {showAddProduct && (
        <Card>
          <CardHeader>
            <CardTitle>Ajouter un produit</CardTitle>
            <CardDescription>
              Sélectionnez un produit à ajouter au pack
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Filters */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un produit..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les catégories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => setShowAddProduct(false)}
              >
                Annuler
              </Button>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {filteredProducts.map((product) => {
                const isAlreadyAdded = packItems.some(item => item.product_id === product.id);
                
                return (
                  <Card
                    key={product.id}
                    className={`cursor-pointer transition-colors ${
                      isAlreadyAdded ? "bg-muted" : "hover:bg-accent"
                    }`}
                    onClick={() => !isAlreadyAdded && handleAddProduct(product)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium text-sm line-clamp-2">{product.name}</h4>
                          {isAlreadyAdded && (
                            <Badge variant="secondary" className="ml-2">
                              Ajouté
                            </Badge>
                          )}
                        </div>
                        
                        <div className="text-xs text-muted-foreground">
                          {product.brand} • {product.category}
                        </div>
                        
                        <div className="text-sm font-medium">
                          {formatPrice(product.monthly_price || product.price || 0)}
                        </div>
                        
                        {!product.active && (
                          <Badge variant="outline" className="text-xs">
                            Inactif
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Aucun produit trouvé</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Variant Selector Dialog */}
      <Dialog open={showVariantSelector} onOpenChange={setShowVariantSelector}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Choisir une variante</DialogTitle>
            <DialogDescription>
              Sélectionnez les options pour {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedProduct && (
            <ProductVariantSelector
              ref={variantSelectorRef}
              product={selectedProduct}
              selectedOptions={variantOptions}
              onOptionChange={handleVariantOptionChange}
              onVariantSelect={handleVariantSelect}
            />
          )}

          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowVariantSelector(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={() => {
                if (selectedProduct) {
                  const variantData = variantSelectorRef.current?.getSelectedVariant();
                  if (variantData) {
                    handleVariantSelect(variantData.variantId, variantData.price, variantData.monthlyPrice);
                  } else {
                    // No variant selected, use base product
                    handleVariantSelect(undefined, selectedProduct.price, selectedProduct.monthly_price);
                  }
                }
              }}
              className="flex-1"
              disabled={!selectedProduct}
            >
              Ajouter au pack
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};