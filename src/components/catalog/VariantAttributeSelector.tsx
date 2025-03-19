
import React, { useState, useEffect } from "react";
import { 
  ProductVariationAttributes, 
  ProductAttributes
} from "@/types/catalog";
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
  initialSelectedAttributes?: ProductAttributes;
  onAttributesChange: (attributes: ProductAttributes) => void;
  disabled?: boolean;
}

const VariantAttributeSelector: React.FC<VariantAttributeSelectorProps> = ({
  variationAttributes,
  initialSelectedAttributes = {},
  onAttributesChange,
  disabled = false
}) => {
  const [selectedAttributes, setSelectedAttributes] = useState<ProductAttributes>(initialSelectedAttributes);

  useEffect(() => {
    setSelectedAttributes(initialSelectedAttributes);
  }, [initialSelectedAttributes]);

  const handleAttributeChange = (attributeName: string, value: string) => {
    console.log(`Changing attribute ${attributeName} to ${value}`);
    const updatedAttributes = {
      ...selectedAttributes,
      [attributeName]: value
    };
    
    setSelectedAttributes(updatedAttributes);
    onAttributesChange(updatedAttributes);
  };

  return (
    <div className="space-y-4">
      {Object.entries(variationAttributes).map(([attrName, values]) => (
        <div key={attrName} className="space-y-2">
          <Label htmlFor={`attr-${attrName}`}>{attrName}</Label>
          <Select
            defaultValue={selectedAttributes[attrName]?.toString() || ""}
            onValueChange={(value) => handleAttributeChange(attrName, value)}
            disabled={disabled}
          >
            <SelectTrigger id={`attr-${attrName}`} className="w-full bg-background">
              <SelectValue placeholder={`Sélectionner ${attrName.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent className="bg-background min-w-[200px] z-50">
              {values.map((value) => (
                <SelectItem key={`${attrName}-${value}`} value={value.toString()}>
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
