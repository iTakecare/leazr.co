
import React, { useState, useEffect } from "react";
import { ProductAttributes, ProductVariationAttributes } from "@/types/catalog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface VariantAttributeSelectorProps {
  variationAttributes: ProductVariationAttributes;
  initialSelectedAttributes: ProductAttributes;
  onAttributesChange: (attributes: ProductAttributes) => void;
}

const VariantAttributeSelector: React.FC<VariantAttributeSelectorProps> = ({
  variationAttributes,
  initialSelectedAttributes,
  onAttributesChange,
}) => {
  const [selectedAttributes, setSelectedAttributes] = useState<ProductAttributes>(initialSelectedAttributes || {});
  
  useEffect(() => {
    // When initial attributes change (especially when editing), update the state
    console.log("Initial attributes received:", initialSelectedAttributes);
    setSelectedAttributes(initialSelectedAttributes || {});
  }, [initialSelectedAttributes]);

  useEffect(() => {
    // Report changes to parent component whenever selectedAttributes change
    console.log("Selected attributes in selector:", selectedAttributes);
    onAttributesChange(selectedAttributes);
  }, [selectedAttributes, onAttributesChange]);

  const handleAttributeChange = (attributeName: string, value: string) => {
    const updatedAttributes = {
      ...selectedAttributes,
      [attributeName]: value,
    };
    
    console.log(`Changed attribute ${attributeName} to ${value}`);
    console.log("New attributes:", updatedAttributes);
    
    setSelectedAttributes(updatedAttributes);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Object.entries(variationAttributes).map(([attributeName, attributeValues]) => (
        <div key={attributeName} className="space-y-2">
          <Label htmlFor={`attribute-${attributeName}`}>{attributeName}</Label>
          <Select
            value={selectedAttributes[attributeName] ? String(selectedAttributes[attributeName]) : ""}
            onValueChange={(value) => handleAttributeChange(attributeName, value)}
          >
            <SelectTrigger id={`attribute-${attributeName}`}>
              <SelectValue placeholder={`Choisir ${attributeName}`} />
            </SelectTrigger>
            <SelectContent>
              {attributeValues.map((value) => (
                <SelectItem key={`${attributeName}-${value}`} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
};

export default VariantAttributeSelector;
