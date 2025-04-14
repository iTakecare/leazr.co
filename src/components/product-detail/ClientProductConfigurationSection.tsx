
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatters";
import QuantitySelector from "./QuantitySelector";
import VariantSelector from "./VariantSelector";
import AddToClientCartButton from "./AddToClientCartButton";
import ProductSpecificationsTable from "./ProductSpecificationsTable";
import { Product } from "@/types/catalog";

interface ClientProductConfigurationSectionProps {
  product: Product;
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
  handleOptionChange: (attributeName: string, value: string) => void;
  isOptionAvailable: (attributeName: string, value: string) => boolean;
  variationAttributes: Record<string, string[]>;
  specifications: Record<string, string>;
  hasAttributeOptions: boolean;
  getOptionsForAttribute: (attributeName: string) => string[];
  configAttributes: { name: string; values: string[] }[];
  getCurrentValue: (attributeName: string) => string;
  getDisplayName: (attributeName: string) => string;
}

const ClientProductConfigurationSection: React.FC<ClientProductConfigurationSectionProps> = ({
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
  getDisplayName
}) => {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-2xl font-bold">{productName}</h2>
              <div className="text-sm text-muted-foreground">
                {productBrand} · {productCategory}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-primary">
                  {formatCurrency(currentPrice)}
                </span>
                <span className="text-sm text-muted-foreground">prix HT</span>
              </div>
              <div className="text-sm text-muted-foreground">
                À partir de{" "}
                <span className="font-medium text-foreground">
                  {formatCurrency(minMonthlyPrice)}
                </span>{" "}
                /mois sur {duration} mois
              </div>
            </div>

            {/* Variant Selectors */}
            {hasAttributeOptions && (
              <div className="space-y-4">
                {configAttributes.map((attribute) => (
                  <div key={attribute.name}>
                    <VariantSelector
                      label={getDisplayName(attribute.name)}
                      options={attribute.values}
                      value={getCurrentValue(attribute.name)}
                      onChange={(value) => handleOptionChange(attribute.name, value)}
                      isOptionAvailable={(value) =>
                        isOptionAvailable(attribute.name, value)
                      }
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Quantity Selector */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Quantité
              </label>
              <QuantitySelector
                quantity={quantity}
                onChange={handleQuantityChange}
                min={1}
                max={100}
              />
            </div>

            {/* Duration Selector */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Durée de location
              </label>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-4">
                {[12, 24, 36, 48, 60].map((months) => (
                  <button
                    key={months}
                    className={`py-2 px-1 border rounded-md text-sm ${
                      duration === months
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted/50"
                    }`}
                    onClick={() => handleOptionChange("duration", months.toString())}
                  >
                    {months} mois
                  </button>
                ))}
              </div>
            </div>

            {/* Total Price Display */}
            <div className="border-t border-b py-4 my-2">
              <div className="flex justify-between text-sm mb-2">
                <span>Prix unitaire:</span>
                <span>{formatCurrency(currentPrice)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span>Quantité:</span>
                <span>x{quantity}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Total:</span>
                <span>{formatCurrency(totalPrice)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground mt-2">
                <span>Mensualité estimée:</span>
                <span>
                  {formatCurrency(totalPrice / duration)}/mois sur {duration} mois
                </span>
              </div>
            </div>

            {/* Add to Cart Button */}
            <AddToClientCartButton
              product={product}
              quantity={quantity}
              duration={duration}
              selectedOptions={selectedOptions}
            />
          </div>
        </CardContent>
      </Card>

      {/* Specifications Table */}
      <ProductSpecificationsTable specifications={specifications} />
    </div>
  );
};

export default ClientProductConfigurationSection;
