import React from "react";
import { ProductPack } from "@/types/pack";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Minus, Plus, MessageSquare, Package } from "lucide-react";
import PackCO2SavingsCalculator from "./PackCO2SavingsCalculator";

interface PackConfigurationSectionProps {
  pack: ProductPack;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  currentPrice: number;
  totalPrice: number;
  hasActivePromo: boolean;
  promoSavingsPercentage: number;
  onRequestQuote: () => void;
}

const PackConfigurationSection: React.FC<PackConfigurationSectionProps> = ({
  pack,
  quantity,
  onQuantityChange,
  currentPrice,
  totalPrice,
  hasActivePromo,
  promoSavingsPercentage,
  onRequestQuote
}) => {
  const regularPrice = pack.pack_monthly_price || pack.total_monthly_price;

  return (
    <div className="space-y-6">
      {/* Pack Info Card */}
      <Card className="p-6">
        <div className="space-y-4">
          {/* Pack Name and Badge */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-5 h-5 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">{pack.name}</h1>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {pack.is_featured && (
                <Badge variant="default">Pack vedette</Badge>
              )}
              {hasActivePromo && (
                <Badge variant="destructive">
                  Promotion -{promoSavingsPercentage}%
                </Badge>
              )}
              <Badge variant="secondary">
                {pack.items?.length || 0} produit{(pack.items?.length || 0) > 1 ? 's' : ''}
              </Badge>
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">
                {currentPrice.toFixed(2)}€
              </span>
              <span className="text-sm text-muted-foreground">/mois</span>
              
              {hasActivePromo && regularPrice > currentPrice && (
                <span className="text-lg text-muted-foreground line-through">
                  {regularPrice.toFixed(2)}€
                </span>
              )}
            </div>
            
            {hasActivePromo && pack.promo_valid_to && (
              <p className="text-sm text-destructive">
                Offre valable jusqu'au {new Date(pack.promo_valid_to).toLocaleDateString('fr-FR')}
              </p>
            )}
            
            <p className="text-xs text-muted-foreground">
              Prix pour une durée de contrat de {pack.selected_duration || 36} mois
            </p>
          </div>

          {/* Quantity Selector */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantité</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="w-4 h-4" />
              </Button>
              
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => onQuantityChange(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 text-center"
              />
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => onQuantityChange(quantity + 1)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Total Price */}
          {quantity > 1 && (
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="font-medium text-foreground">
                  Total ({quantity} packs):
                </span>
                <span className="text-xl font-bold text-foreground">
                  {totalPrice.toFixed(2)}€/mois
                </span>
              </div>
            </div>
          )}

          {/* Request Quote Button */}
          <Button 
            onClick={onRequestQuote}
            className="w-full"
            size="lg"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Demander un devis
          </Button>
        </div>
      </Card>

      {/* CO2 Savings */}
      {pack.items && pack.items.length > 0 && (
        <PackCO2SavingsCalculator 
          items={pack.items} 
          packQuantity={quantity}
        />
      )}

      {/* Pack Features */}
      <Card className="p-4">
        <h3 className="font-medium text-foreground mb-3">Avantages du pack</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-primary rounded-full" />
            Économie garantie par rapport à l'achat séparé
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-primary rounded-full" />
            Produits reconditionnés avec garantie
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-primary rounded-full" />
            Leasing sur {pack.selected_duration || 36} mois
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-primary rounded-full" />
            Support technique inclus
          </li>
        </ul>
      </Card>
    </div>
  );
};

export default PackConfigurationSection;