
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Equipment, Leaser } from "@/types/equipment";
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
  hideFinancialDetails?: boolean;
  targetSalePrice?: number;
  setTargetSalePrice?: (value: number) => void;
  calculatedFromSalePrice?: { margin: number; monthlyPayment: number };
  applyCalculatedFromSalePrice?: () => void;
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
  applyCalculatedMargin,
  hideFinancialDetails = false,
  targetSalePrice = 0,
  setTargetSalePrice = () => {},
  calculatedFromSalePrice = { margin: 0, monthlyPayment: 0 },
  applyCalculatedFromSalePrice = () => {}
}) => {
  const [errors, setErrors] = useState({
    title: false,
    purchasePrice: false,
    margin: false
  });
  
  const [isQuickCatalogOpen, setIsQuickCatalogOpen] = useState(false);
  const [productMonthlyPrice, setProductMonthlyPrice] = useState<number | null>(null);
  
  // Utiliser la marge calculée si elle est disponible, sinon utiliser la marge de l'équipement
  const displayMargin = calculatedMargin.percentage > 0 ? calculatedMargin.percentage : equipment.margin;
  const marginAmount = calculatedMargin.percentage > 0 
    ? calculatedMargin.amount 
    : equipment.purchasePrice * (equipment.margin / 100);
  
  // Calcul correct du prix avec marge
  const priceWithMargin = equipment.purchasePrice + marginAmount;

  useEffect(() => {
    if (isQuickCatalogOpen) {
      console.log("Quick catalog opened");
    }
  }, [isQuickCatalogOpen]);

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
      console.log("Equipment with attributes and specifications:", {
        ...equipment,
        attributes: equipment.attributes || {},
        specifications: equipment.specifications || {}
      });
      
      // Si nous avons une marge calculée et qu'elle n'a pas été appliquée,
      // l'appliquer automatiquement avant d'ajouter à la liste
      if (calculatedMargin.percentage > 0 && equipment.margin !== calculatedMargin.percentage) {
        console.log("Auto-applying calculated margin before adding to list:", calculatedMargin.percentage);
        applyCalculatedMargin();
      }
      
      addToList();
      setProductMonthlyPrice(null);
    }
  };

  const handleProductSelect = (product: any) => {
    console.log("Product selected with full data:", product);
    
    // Collecter les attributs ET les spécifications du produit
    const productAttributes = product.selected_attributes || product.attributes || {};
    const productSpecifications = product.specifications || {};
    
    console.log("Product attributes:", productAttributes);
    console.log("Product specifications:", productSpecifications);
    
    const equipmentUpdate = {
      ...equipment,
      title: product.name,
      purchasePrice: product.price || 0,
      // Stocker les attributs sélectionnés
      attributes: productAttributes,
      // Stocker les spécifications du produit
      specifications: productSpecifications
    };
    
    console.log("Equipment updated with attributes and specifications:", equipmentUpdate);
    setEquipment(equipmentUpdate);
    
    if (product.monthly_price) {
      setProductMonthlyPrice(product.monthly_price);
      setTargetMonthlyPayment(product.monthly_price);
    }
    
    setIsQuickCatalogOpen(false);
  };

  // Calcul de la mensualité à afficher (priorité à targetMonthlyPayment, puis equipment.monthlyPayment, puis monthlyPayment)
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
            hideFinancialDetails={hideFinancialDetails}
          />

          <PriceDetailsDisplay
            marginAmount={marginAmount}
            priceWithMargin={priceWithMargin}
            coefficient={coefficient}
            displayMonthlyPayment={displayMonthlyPayment}
            hideFinancialDetails={hideFinancialDetails}
            calculatedMargin={calculatedMargin.percentage > 0 ? calculatedMargin : undefined}
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
              hideFinancialDetails={hideFinancialDetails}
              equipmentPurchasePrice={equipment.purchasePrice}
              targetSalePrice={targetSalePrice}
              setTargetSalePrice={setTargetSalePrice}
              calculatedFromSalePrice={calculatedFromSalePrice}
              applyCalculatedFromSalePrice={applyCalculatedFromSalePrice}
            />
          </div>
        </div>
      </CardContent>
      
      <CatalogDialog
        isOpen={isQuickCatalogOpen}
        onClose={() => setIsQuickCatalogOpen(false)}
        handleProductSelect={handleProductSelect}
      />
    </Card>
  );
};

export default EquipmentForm;
