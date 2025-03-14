
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatPercentage } from "@/utils/formatters";
import { Plus, Package, X, Edit, Search, Calculator } from "lucide-react";
import { Equipment, Leaser } from "@/types/equipment";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getProducts, getCategories, getBrands } from "@/services/catalogService";
import { useQuery } from "@tanstack/react-query";
import ProductCard from "@/components/ui/ProductCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MarginCalculator from "./MarginCalculator";

interface EquipmentFormProps {
  equipment: Equipment;
  setEquipment: (equipment: Equipment) => void;
  selectedLeaser: Leaser | null;
  addToList: () => void;
  editingId: string | null;
  cancelEditing: () => void;
  onOpenCatalog: () => void;
  coefficient: number;
  monthlyPayment: number;
  targetMonthlyPayment: number;
  setTargetMonthlyPayment: (value: number) => void;
  calculatedMargin: { percentage: number; amount: number };
  applyCalculatedMargin: () => void;
}

const EquipmentForm: React.FC<EquipmentFormProps> = ({
  equipment,
  setEquipment,
  selectedLeaser,
  addToList,
  editingId,
  cancelEditing,
  onOpenCatalog,
  coefficient,
  monthlyPayment,
  targetMonthlyPayment,
  setTargetMonthlyPayment,
  calculatedMargin,
  applyCalculatedMargin
}) => {
  const [errors, setErrors] = useState({
    title: false,
    purchasePrice: false,
    margin: false
  });
  
  const [isQuickCatalogOpen, setIsQuickCatalogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [productMonthlyPrice, setProductMonthlyPrice] = useState<number | null>(null);
  
  const marginAmount = equipment.purchasePrice * (equipment.margin / 100);
  const priceWithMargin = equipment.purchasePrice + marginAmount;

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", isQuickCatalogOpen],
    queryFn: getProducts,
    enabled: isQuickCatalogOpen,
  });

  const { data: categoriesData = [] } = useQuery({
    queryKey: ["categories", isQuickCatalogOpen],
    queryFn: getCategories,
    enabled: isQuickCatalogOpen,
  });

  const { data: brandsData = [] } = useQuery({
    queryKey: ["brands", isQuickCatalogOpen],
    queryFn: getBrands,
    enabled: isQuickCatalogOpen,
  });

  const categories = React.useMemo(() => {
    return [
      { name: "all", translation: "Toutes les catégories" }, 
      ...categoriesData
    ];
  }, [categoriesData]);

  const brands = React.useMemo(() => {
    return [
      { name: "all", translation: "Toutes les marques" }, 
      ...brandsData
    ];
  }, [brandsData]);

  const filteredProducts = products.filter((product: any) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    const matchesBrand = selectedBrand === "all" || product.brand === selectedBrand;
    return matchesSearch && matchesCategory && matchesBrand;
  });

  const handleChange = (field: keyof Equipment, value: string | number) => {
    setEquipment({ ...equipment, [field]: value });
    
    if (errors[field as keyof typeof errors]) {
      setErrors({ ...errors, [field]: false });
    }
  };

  const validateForm = () => {
    const newErrors = {
      title: !equipment.title,
      purchasePrice: equipment.purchasePrice <= 0,
      margin: equipment.margin < 0
    };
    
    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  };

  const handleSubmit = () => {
    if (validateForm()) {
      console.log("Submitting with monthly payment:", displayMonthlyPayment);
      addToList();
      setProductMonthlyPrice(null);
    }
  };

  const handleProductSelect = (product: any) => {
    console.log("Product selected:", product);
    
    const equipmentUpdate = {
      ...equipment,
      title: product.name,
      purchasePrice: product.price || 0
    };
    
    setEquipment(equipmentUpdate);
    
    if (product.monthly_price) {
      setProductMonthlyPrice(product.monthly_price);
      setTargetMonthlyPayment(product.monthly_price);
      
      // When we set the target monthly payment, the calculated margin will be applied
      // automatically by the effect in useEquipmentCalculator
    }
    
    setIsQuickCatalogOpen(false);
  };

  // Determine which monthly payment to display
  // Give priority to targetMonthlyPayment if it exists, otherwise use the equipment's monthlyPayment or the calculated monthlyPayment
  const displayMonthlyPayment = targetMonthlyPayment > 0 
    ? targetMonthlyPayment 
    : (equipment.monthlyPayment || monthlyPayment);

  return (
    <Card className="shadow-sm border-gray-200 rounded-lg">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-lg font-medium">Calculateur de mensualité</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          <div>
            <Label htmlFor="equipment-title" className="font-medium text-gray-700">Intitulé du matériel</Label>
            <div className="mt-1 flex gap-2">
              <div className="relative flex-1">
                <Package className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="equipment-title"
                  value={equipment.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  className={`pl-10 ${errors?.title ? "border-destructive" : ""}`}
                  placeholder="Ex: ThinkPad T480"
                />
              </div>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsQuickCatalogOpen(true)}
                title="Sélectionner depuis le catalogue"
                className="border-gray-300"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
            {errors?.title && (
              <p className="text-destructive text-xs mt-1">La désignation est requise</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="purchase-price" className={`font-medium text-gray-700 ${errors?.purchasePrice ? "text-destructive" : ""}`}>
                Prix d'achat (€)
              </Label>
              <div className="mt-1 relative">
                <span className="absolute left-3 top-3 text-gray-500">€</span>
                <Input
                  id="purchase-price"
                  type="number"
                  min="0"
                  step="1"
                  value={equipment.purchasePrice || ''}
                  onChange={(e) => handleChange('purchasePrice', parseFloat(e.target.value) || 0)}
                  className={`pl-8 ${errors?.purchasePrice ? "border-destructive" : ""}`}
                  placeholder="0.00"
                />
                {errors?.purchasePrice && (
                  <p className="text-destructive text-xs mt-1">Prix invalide</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="margin" className={`font-medium text-gray-700 ${errors?.margin ? "text-destructive" : ""}`}>
                Marge (%)
              </Label>
              <div className="mt-1 relative">
                <span className="absolute left-3 top-3 text-gray-500">%</span>
                <Input
                  id="margin"
                  type="number"
                  min="0"
                  step="0.1"
                  value={equipment.margin || ''}
                  onChange={(e) => handleChange('margin', parseFloat(e.target.value) || 0)}
                  className={`pl-8 ${errors?.margin ? "border-destructive" : ""}`}
                  placeholder="20.00"
                />
                {errors?.margin && (
                  <p className="text-destructive text-xs mt-1">Marge invalide</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-gray-600">Marge en euros :</span>
              <span className="font-medium">{formatCurrency(marginAmount)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-600">Prix avec marge :</span>
              <span className="font-medium">{formatCurrency(priceWithMargin)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-600">Coefficient appliqué :</span>
              <span className="font-medium">{formatPercentage(coefficient)}</span>
            </div>
            <div className="flex justify-between py-1 text-blue-600">
              <span className="font-medium">Mensualité unitaire :</span>
              <span className="font-bold">{formatCurrency(displayMonthlyPayment)}</span>
            </div>
          </div>

          {editingId ? (
            <div className="flex gap-2">
              <Button 
                variant="default" 
                onClick={handleSubmit} 
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Edit className="h-4 w-4 mr-2" /> Mettre à jour
              </Button>
              <Button 
                variant="outline" 
                onClick={cancelEditing}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" /> Annuler
              </Button>
            </div>
          ) : (
            <Button 
              variant="default" 
              onClick={handleSubmit}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" /> Ajouter à la liste
            </Button>
          )}

          {/* Add MarginCalculator component */}
          <div className="mt-4 pt-4 border-t">
            <MarginCalculator 
              targetMonthlyPayment={targetMonthlyPayment}
              setTargetMonthlyPayment={setTargetMonthlyPayment}
              calculatedMargin={calculatedMargin}
              applyCalculatedMargin={applyCalculatedMargin}
              selectedLeaser={selectedLeaser}
            />
          </div>
        </div>
      </CardContent>
      
      <Dialog open={isQuickCatalogOpen} onOpenChange={setIsQuickCatalogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Sélectionner un équipement</DialogTitle>
            <DialogDescription>Choisissez un produit du catalogue à ajouter à votre offre</DialogDescription>
          </DialogHeader>
          
          <div className="relative my-4">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un produit..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 my-4">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.name} value={category.name}>
                    {category.translation}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
              <SelectTrigger>
                <SelectValue placeholder="Marque" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((brand) => (
                  <SelectItem key={brand.name} value={brand.name}>
                    {brand.translation}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {isLoading ? (
            <div className="flex flex-col gap-4 my-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 rounded-lg bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="flex flex-col gap-4 my-4">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <div key={product.id} onClick={() => handleProductSelect(product)}>
                      <ProductCard product={product} />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    Aucun produit trouvé
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default EquipmentForm;
