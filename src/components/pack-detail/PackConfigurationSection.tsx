import React from "react";
import { ProductPack } from "@/types/pack";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Minus, Plus, MessageSquare, HelpCircle } from "lucide-react";
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
  const minMonthlyPrice = currentPrice;

  return (
    <div className="lg:sticky lg:top-6 lg:self-start">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-[#33638e] to-[#4ab6c4] text-white p-6 rounded-t-xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">Leasing {pack.name}</h2>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                Pack
              </Badge>
              <span className="text-sm opacity-90">{pack.items?.length || 0} produits inclus</span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm opacity-80 mb-1">À partir de</div>
          <div className="flex items-baseline justify-end gap-1">
            <span className="text-3xl font-bold">{minMonthlyPrice.toFixed(2)}€</span>
            <span className="text-sm opacity-90">/mois</span>
          </div>
        </div>
      </div>

      {/* Configuration Section */}
      <div className="bg-white border-l border-r border-gray-200 p-6 space-y-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Configuration</h3>
          
          {/* Pack Items Count */}
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">Produits inclus</span>
            <span className="font-medium">{pack.items?.length || 0}</span>
          </div>
          
          {/* Duration */}
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">Durée</span>
            <span className="font-medium">{pack.selected_duration || 36} mois</span>
          </div>
          
          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity" className="text-sm text-gray-600">Quantité</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="h-8 w-8"
              >
                <Minus className="w-3 h-3" />
              </Button>
              
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => onQuantityChange(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 h-8 text-center text-sm"
              />
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => onQuantityChange(quantity + 1)}
                className="h-8 w-8"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* CO2 Savings */}
        {pack.items && pack.items.length > 0 && (
          <PackCO2SavingsCalculator 
            items={pack.items} 
            packQuantity={quantity}
          />
        )}
      </div>

      {/* Price Section */}
      <div className="bg-gray-50 border-l border-r border-gray-200 p-6">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Prix mensuel unitaire</span>
            <div className="text-right">
              {hasActivePromo && regularPrice > currentPrice ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400 line-through">
                    {regularPrice.toFixed(2)}€
                  </span>
                  <span className="font-medium text-[#da2959]">
                    {currentPrice.toFixed(2)}€
                  </span>
                </div>
              ) : (
                <span className="font-medium">{currentPrice.toFixed(2)}€</span>
              )}
            </div>
          </div>
          
          {quantity > 1 && (
            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
              <span className="font-medium text-gray-900">Total mensuel</span>
              <span className="font-bold text-lg text-[#33638e]">
                {totalPrice.toFixed(2)}€
              </span>
            </div>
          )}
          
          {hasActivePromo && pack.promo_valid_to && (
            <p className="text-xs text-[#da2959]">
              Promotion valable jusqu'au {new Date(pack.promo_valid_to).toLocaleDateString('fr-FR')}
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white border border-gray-200 rounded-b-xl p-6 space-y-3">
        <Button 
          onClick={onRequestQuote}
          className="w-full bg-[#da2959] hover:bg-[#da2959]/90 text-white"
          size="lg"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Demander un devis
        </Button>
        
        <Button variant="outline" className="w-full" size="lg">
          <HelpCircle className="w-4 h-4 mr-2" />
          Conseiller
        </Button>
        
        <div className="pt-4 border-t border-gray-100 space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Livraison gratuite en Europe</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Pas d'augmentation de loyer</span>
          </div>
        </div>
        
        <div className="pt-2">
          <button className="text-sm text-[#33638e] hover:text-[#da2959] font-medium">
            Besoin d'aide ?
          </button>
        </div>
      </div>
    </div>
  );
};

export default PackConfigurationSection;