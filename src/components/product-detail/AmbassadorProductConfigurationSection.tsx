import React from "react";
import { Button } from "@/components/ui/button";
import { MinusIcon, PlusIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters";
import CO2SavingsCalculator from "./CO2SavingsCalculator";
import { Product } from "@/types/catalog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AmbassadorProductConfigurationSectionProps {
  product: Product | null;
  productCategory: string;
  productName: string;
  productBrand: string;
  currentPrice: number;
  minMonthlyPrice: number;
  totalPrice: number;
  quantity: number;
  duration: number;
  handleQuantityChange: (newQuantity: number) => void;
  selectedOptions: Record<string, string>;
  handleOptionChange: (optionName: string, value: string) => void;
  isOptionAvailable: (optionName: string, value: string) => boolean;
  variationAttributes: Record<string, string[]>;
  specifications: Record<string, string | number>;
  hasAttributeOptions: (attributeName: string) => boolean;
  getOptionsForAttribute: (attributeName: string) => string[];
  configAttributes: string[];
  getCurrentValue: (attributeName: string) => string;
  getDisplayName: (key: string) => string;
}

const AmbassadorProductConfigurationSection: React.FC<AmbassadorProductConfigurationSectionProps> = ({
  product,
  productCategory,
  productName,
  productBrand,
  currentPrice,
  minMonthlyPrice,
  totalPrice,
  quantity,
  duration,
  handleQuantityChange,
  selectedOptions,
  handleOptionChange,
  isOptionAvailable,
  variationAttributes,
  specifications,
  hasAttributeOptions,
  getOptionsForAttribute,
  configAttributes,
  getCurrentValue,
  getDisplayName,
}) => {
  // Check if the current variant is available (has a valid price)
  const isVariantAvailable = currentPrice > 0 && !isNaN(currentPrice) && isFinite(currentPrice);
  
  const renderAttributeField = (attributeName: string, displayName: string, currentValue: string) => {
    const hasOptions = hasAttributeOptions(attributeName);
    const options = hasOptions ? getOptionsForAttribute(attributeName) : [];
    
    return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-700">{displayName}</label>
        {hasOptions && options.length > 0 ? (
          <Select
            value={currentValue}
            onValueChange={(value) => handleOptionChange(attributeName, value)}
          >
            <SelectTrigger className="w-full h-7 text-xs py-0">
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem 
                  key={option} 
                  value={option}
                  disabled={!isOptionAvailable(attributeName, option)}
                  className="text-xs"
                >
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="bg-gray-50 rounded border border-gray-200 px-2 py-1 text-xs">
            {currentValue || "Non spécifié"}
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      id="product-config" 
      className="sticky top-32 lg:top-24"
      style={{
        position: "sticky",
        zIndex: 10
      }}
    >
      <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        <div className="bg-gradient-to-br from-[#2d618f] via-[#347599] to-[#4ab6c4] text-white p-4">
          <div className="flex items-center justify-between mb-1">
            <Badge variant="outline" className="bg-white/20 text-white border-white/30 text-xs py-0">
              {productCategory === "laptop" ? "Ordinateur" : productCategory}
            </Badge>
            <span className="text-indigo-100 text-xs">{productBrand}</span>
          </div>
          
          <h1 className="text-xl font-bold text-white mb-2">
            Leasing {productName}
          </h1>
          
          <div className="text-sm text-indigo-100 mb-2">
            à partir de <span className="font-bold text-white">{formatCurrency(minMonthlyPrice)}/mois</span>
          </div>
          
          <Separator className="mb-3 bg-white/20" />
        </div>
        
        <div className="bg-white p-4">
          <h3 className="text-sm font-medium mb-2 text-gray-700">Configuration</h3>
          
          <div className="grid grid-cols-2 gap-2">
            {configAttributes.map(attribute => {
              const displayName = getDisplayName(attribute);
              const currentValue = getCurrentValue(attribute);
              
              return (
                <React.Fragment key={attribute}>
                  {renderAttributeField(attribute, displayName, currentValue)}
                </React.Fragment>
              );
            })}
            
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Durée</label>
              <div className="bg-gray-50 rounded border border-gray-200 px-2 py-1 text-xs text-gray-700">
                36 mois
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Quantité</label>
              <div className="flex items-center">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6 rounded-r-none border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100"
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={quantity <= 1}
                >
                  <MinusIcon className="h-3 w-3" />
                </Button>
                <div className="h-6 px-2 flex items-center justify-center border-y border-gray-300 text-xs text-gray-700 bg-gray-50">
                  {quantity}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6 rounded-l-none border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100"
                  onClick={() => handleQuantityChange(quantity + 1)}
                >
                  <PlusIcon className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {productCategory && (
          <div className="bg-white px-4 pb-3">
            <CO2SavingsCalculator 
              category={productCategory} 
              quantity={quantity}
            />
          </div>
        )}
        
        <div className="p-4 bg-gray-50 mx-4 mb-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">Pour 36 mois</span>
            {isVariantAvailable ? (
              <span className="text-lg font-bold text-gray-800">{formatCurrency(totalPrice)} HT / mois</span>
            ) : (
              <span className="text-lg font-bold text-gray-500">Non disponible</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AmbassadorProductConfigurationSection;