
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Equipment } from "@/types/equipment";
import { Leaser } from "@/types/leaser";
import { getProducts, getCategories, getBrands } from "@/services/catalogService";
import { useQuery } from "@tanstack/react-query";
import MarginCalculator from "./MarginCalculator";
import EquipmentFormFields from "./EquipmentFormFields";
import PriceDetailsDisplay from "./PriceDetailsDisplay";
import FormActionButtons from "./FormActionButtons";
import CatalogDialog from "./CatalogDialog";

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
    }
    
    setIsQuickCatalogOpen(false);
  };

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
          <EquipmentFormFields
            equipment={equipment}
            handleChange={handleChange}
            errors={errors}
            onOpenCatalog={() => setIsQuickCatalogOpen(true)}
            calculatedMargin={calculatedMargin}
          />

          <PriceDetailsDisplay
            marginAmount={marginAmount}
            priceWithMargin={priceWithMargin}
            coefficient={coefficient}
            displayMonthlyPayment={displayMonthlyPayment}
          />

          <FormActionButtons
            editingId={editingId}
            handleSubmit={handleSubmit}
            cancelEditing={cancelEditing}
          />

          <div className="mt-4 pt-4 border-t">
            <MarginCalculator 
              targetMonthlyPayment={targetMonthlyPayment}
              setTargetMonthlyPayment={setTargetMonthlyPayment}
              calculatedMargin={calculatedMargin}
              applyCalculatedMargin={applyCalculatedMargin}
              selectedLeaser={selectedLeaser}
              coefficient={coefficient}
            />
          </div>
        </div>
      </CardContent>
      
      <CatalogDialog
        isOpen={isQuickCatalogOpen}
        onClose={() => setIsQuickCatalogOpen(false)}
        handleProductSelect={handleProductSelect}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedBrand={selectedBrand}
        setSelectedBrand={setSelectedBrand}
        categories={categories}
        brands={brands}
        filteredProducts={filteredProducts}
        isLoading={isLoading}
      />
    </Card>
  );
};

export default EquipmentForm;
