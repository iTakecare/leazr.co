import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calculator, TrendingUp, AlertTriangle, RefreshCw } from "lucide-react";
import { PackItemFormData } from "@/hooks/packs/usePackCreator";
import { PackCalculation } from "@/types/pack";
import { calculateSalePriceWithLeaser, getCoefficientFromLeaser } from "@/utils/leaserCalculator";
import { useQuery } from "@tanstack/react-query";
import { getLeasers } from "@/services/leaserService";
import { toast } from "sonner";
interface PackPriceConfigurationProps {
  packItems: PackItemFormData[];
  calculations: PackCalculation;
  onUpdateItem: (index: number, updates: Partial<PackItemFormData>) => void;
  onUpdateCalculations: () => void;
  packData: any;
  onUpdatePackData: (updates: any) => void;
  selectedLeaserId?: string;
  selectedDuration?: number;
}

export const PackPriceConfiguration = ({
  packItems,
  calculations,
  onUpdateItem,
  onUpdateCalculations,
  packData,
  onUpdatePackData,
  selectedLeaserId,
  selectedDuration = 36,
}: PackPriceConfigurationProps) => {
  const getDisplayText = (value: any): string => {
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value?.name) return String(value.name);
    return 'Non disponible';
  };

  // Fetch leasers data
  const { data: leasers = [] } = useQuery({
    queryKey: ["leasers"],
    queryFn: getLeasers,
  });

  const selectedLeaser = selectedLeaserId 
    ? leasers.find(leaser => leaser.id === selectedLeaserId)
    : null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  // Get margin percentage - use stored value if available, otherwise calculate
  const getMarginPercentage = (item: PackItemFormData) => {
    // If margin_percentage is explicitly stored, use it to avoid calculation discrepancies
    if (item.margin_percentage !== undefined && item.margin_percentage !== null && !isNaN(item.margin_percentage)) {
      return item.margin_percentage;
    }
    
    // Fallback to calculation for legacy data
    if (item.unit_purchase_price <= 0) return 0;
    const salePrice = calculateSalePriceWithLeaser(item.unit_monthly_price, selectedLeaser, selectedDuration);
    return ((salePrice - item.unit_purchase_price) / item.unit_purchase_price) * 100;
  };

  const handlePriceChange = (index: number, field: 'unit_purchase_price' | 'unit_monthly_price', value: number) => {
    const item = packItems[index];
    const updates: Partial<PackItemFormData> = { [field]: value };
    
    // Recalculate margin when prices change
    if (field === 'unit_purchase_price' || field === 'unit_monthly_price') {
      const purchasePrice = field === 'unit_purchase_price' ? value : item.unit_purchase_price;
      const monthlyPrice = field === 'unit_monthly_price' ? value : item.unit_monthly_price;
      
      if (purchasePrice > 0) {
        // Calculate sale price using leaser coefficient, then calculate margin
        const salePrice = calculateSalePriceWithLeaser(monthlyPrice, selectedLeaser, selectedDuration);
        updates.margin_percentage = ((salePrice - purchasePrice) / purchasePrice) * 100;
      }
    }
    
    onUpdateItem(index, updates);
  };

  const handleMarginChange = (index: number, marginPercentage: number) => {
    const item = packItems[index];
    if (item.unit_purchase_price > 0) {
      // Calculate the required sale price for the target margin
      const targetSalePrice = item.unit_purchase_price * (1 + marginPercentage / 100);
      
      // Get coefficient based on the target sale price (not purchase price)
      const coefficient = getCoefficientFromLeaser(selectedLeaser, targetSalePrice, selectedDuration);
      
      // Calculate monthly price using the correct coefficient
      const newMonthlyPrice = (targetSalePrice * coefficient) / 100;
      
      onUpdateItem(index, {
        margin_percentage: marginPercentage,
        unit_monthly_price: newMonthlyPrice,
      });
    }
  };

  const applyGlobalMargin = (targetMargin: number) => {
    packItems.forEach((item, index) => {
      if (item.unit_purchase_price > 0) {
        // Calculate the required sale price for the target margin
        const targetSalePrice = item.unit_purchase_price * (1 + targetMargin / 100);
        
        // Get coefficient based on the target sale price (not purchase price)
        const coefficient = getCoefficientFromLeaser(selectedLeaser, targetSalePrice, selectedDuration);
        const newMonthlyPrice = (targetSalePrice * coefficient) / 100;
        
        onUpdateItem(index, {
          margin_percentage: targetMargin,
          unit_monthly_price: newMonthlyPrice,
        });
      }
    });
  };

  const lowMarginItems = packItems.filter(item => 
    getMarginPercentage(item) < 10
  );
  const highMarginItems = packItems.filter(item => 
    getMarginPercentage(item) > 100
  );

  const handlePackMonthlyPriceChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    onUpdatePackData({ pack_monthly_price: numValue });
  };

  const handlePackPromoPriceChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    onUpdatePackData({ pack_promo_price: numValue });
  };

  const handlePromoActiveChange = (checked: boolean) => {
    onUpdatePackData({ promo_active: checked });
  };

  const handlePromoDateChange = (field: 'promo_valid_from' | 'promo_valid_to', value: string) => {
    const dateValue = value ? new Date(value) : undefined;
    onUpdatePackData({ [field]: dateValue });
  };

  const calculatePackSavings = () => {
    if (!packData.pack_monthly_price || packData.pack_monthly_price === 0) return 0;
    return calculations.total_monthly_price - packData.pack_monthly_price;
  };

  const effectivePackPrice = packData.promo_active && packData.pack_promo_price 
    ? packData.pack_promo_price 
    : packData.pack_monthly_price;

  // Recalculer les totaux quand le prix du pack change
  useEffect(() => {
    onUpdateCalculations();
  }, [packData.pack_monthly_price, packData.pack_promo_price, packData.promo_active]);

  // Fonction pour redistribuer le prix pack sur les mensualités individuelles
  const distributePackPriceToItems = () => {
    const targetPackPrice = packData.pack_monthly_price;
    if (!targetPackPrice || targetPackPrice <= 0) return;
    
    const currentTotal = calculations.total_monthly_price;
    if (currentTotal <= 0) return;
    
    const ratio = targetPackPrice / currentTotal;
    
    packItems.forEach((item, index) => {
      const newMonthlyPrice = Math.round(item.unit_monthly_price * ratio * 100) / 100;
      // Recalculer la marge basée sur le nouveau prix mensuel
      const salePrice = calculateSalePriceWithLeaser(newMonthlyPrice, selectedLeaser, selectedDuration);
      const newMargin = item.unit_purchase_price > 0 
        ? ((salePrice - item.unit_purchase_price) / item.unit_purchase_price) * 100 
        : 0;
      
      onUpdateItem(index, { 
        unit_monthly_price: newMonthlyPrice,
        margin_percentage: newMargin
      });
    });
    
    toast.success("Mensualités redistribuées proportionnellement");
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Résumé des prix
          </CardTitle>
          <CardDescription>
            Vue d'ensemble des calculs du pack
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Prix d'achat total</p>
              <p className="text-lg font-semibold">{formatPrice(calculations.total_purchase_price)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Somme prix mensuels individuels</p>
              <p className="text-lg font-semibold">{formatPrice(calculations.total_monthly_price)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Marge totale</p>
              <p className="text-lg font-semibold text-green-600">{formatPrice(calculations.total_margin)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Marge moyenne</p>
              <p className="text-lg font-semibold">
                {calculations.average_margin_percentage.toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pack Monthly Pricing Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Configuration des mensualités du pack
          </CardTitle>
          <CardDescription>
            Définissez le prix mensuel final du pack et les promotions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Pack Monthly Price */}
          <div className="space-y-2">
            <Label htmlFor="pack-monthly-price">Mensualité du pack (€)</Label>
            <Input
              id="pack-monthly-price"
              type="number"
              step="0.01"
              value={packData.pack_monthly_price || ""}
              onChange={(e) => handlePackMonthlyPriceChange(e.target.value)}
              placeholder="Prix mensuel du pack"
            />
            {packData.pack_monthly_price && (
              <div className="text-sm space-y-1 bg-muted/50 p-3 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Somme des prix individuels:</span>
                  <span>{formatPrice(calculations.total_monthly_price)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Économie pour le client:</span>
                  <span className={calculatePackSavings() > 0 ? "text-green-600" : "text-red-600"}>
                    {formatPrice(calculatePackSavings())}
                    {calculatePackSavings() !== 0 && (
                      <span className="ml-1 text-xs">
                        ({((calculatePackSavings() / calculations.total_monthly_price) * 100).toFixed(1)}%)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}
            
            {/* Button to distribute pack price to individual items */}
            {packData.pack_monthly_price && packData.pack_monthly_price !== calculations.total_monthly_price && (
              <Button
                variant="outline"
                size="sm"
                onClick={distributePackPriceToItems}
                className="mt-2 gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Répartir sur les produits
              </Button>
            )}
          </div>

          {/* Promotional Pricing */}
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="promo-active" className="text-base font-medium">
                  Activer la promotion
                </Label>
                <p className="text-sm text-muted-foreground">
                  Proposez un prix promotionnel temporaire
                </p>
              </div>
              <Switch
                id="promo-active"
                checked={packData.promo_active || false}
                onCheckedChange={handlePromoActiveChange}
              />
            </div>

            {packData.promo_active && (
              <div className="space-y-4 pl-4 border-l-2 border-primary/20 bg-primary/5 p-4 rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="pack-promo-price">Mensualité promotionnelle (€)</Label>
                  <Input
                    id="pack-promo-price"
                    type="number"
                    step="0.01"
                    value={packData.pack_promo_price || ""}
                    onChange={(e) => handlePackPromoPriceChange(e.target.value)}
                    placeholder="Prix promotionnel"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="promo-valid-from">Date de début</Label>
                    <Input
                      id="promo-valid-from"
                      type="date"
                      value={packData.promo_valid_from ? 
                        (packData.promo_valid_from instanceof Date ? 
                          packData.promo_valid_from.toISOString().split('T')[0] : 
                          new Date(packData.promo_valid_from).toISOString().split('T')[0]
                        ) : ""
                      }
                      onChange={(e) => handlePromoDateChange('promo_valid_from', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="promo-valid-to">Date de fin</Label>
                    <Input
                      id="promo-valid-to"
                      type="date"
                      value={packData.promo_valid_to ? 
                        (packData.promo_valid_to instanceof Date ? 
                          packData.promo_valid_to.toISOString().split('T')[0] : 
                          new Date(packData.promo_valid_to).toISOString().split('T')[0]
                        ) : ""
                      }
                      onChange={(e) => handlePromoDateChange('promo_valid_to', e.target.value)}
                    />
                  </div>
                </div>

                {packData.pack_promo_price && packData.pack_monthly_price && (
                  <div className="bg-green-50 p-3 rounded-lg text-sm border border-green-200">
                    <div className="flex justify-between">
                      <span>Réduction promotionnelle:</span>
                      <span className="font-semibold text-green-600">
                        -{formatPrice(packData.pack_monthly_price - packData.pack_promo_price)}
                        ({(((packData.pack_monthly_price - packData.pack_promo_price) / packData.pack_monthly_price) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Final Pack Price Summary */}
          {packData.pack_monthly_price && (
            <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Résumé des prix du pack
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Prix mensuel standard:</span>
                  <span>{formatPrice(packData.pack_monthly_price)}</span>
                </div>
                {packData.promo_active && packData.pack_promo_price && (
                  <div className="flex justify-between">
                    <span>Prix promotionnel:</span>
                    <span className="text-green-600 font-semibold">
                      {formatPrice(packData.pack_promo_price)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 font-semibold">
                  <span>Prix effectif client:</span>
                  <span className="text-lg text-primary">
                    {formatPrice(effectivePackPrice || packData.pack_monthly_price)}
                  </span>
                </div>
                {effectivePackPrice && (
                  <div className="flex justify-between text-green-600">
                    <span>Économie vs prix individuels:</span>
                    <span className="font-semibold">
                      {formatPrice(calculations.total_monthly_price - effectivePackPrice)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alerts */}
      {(lowMarginItems.length > 0 || highMarginItems.length > 0) && (
        <div className="space-y-2">
          {lowMarginItems.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{lowMarginItems.length} produit(s)</strong> ont une marge inférieure à 10% : {lowMarginItems.map(item => getDisplayText(item.product?.name)).join(', ')}
              </AlertDescription>
            </Alert>
          )}
          {highMarginItems.length > 0 && (
            <Alert>
              <TrendingUp className="h-4 w-4" />
              <AlertDescription>
                <strong>{highMarginItems.length} produit(s)</strong> ont une marge supérieure à 100% : {highMarginItems.map(item => getDisplayText(item.product?.name)).join(', ')}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Global Margin Control */}
      <Card>
        <CardHeader>
          <CardTitle>Ajustement global des marges</CardTitle>
          <CardDescription>
            Appliquez une marge uniforme à tous les produits du pack
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => applyGlobalMargin(15)}
              size="sm"
            >
              15%
            </Button>
            <Button
              variant="outline"
              onClick={() => applyGlobalMargin(20)}
              size="sm"
            >
              20%
            </Button>
            <Button
              variant="outline"
              onClick={() => applyGlobalMargin(25)}
              size="sm"
            >
              25%
            </Button>
            <Button
              variant="outline"
              onClick={() => applyGlobalMargin(30)}
              size="sm"
            >
              30%
            </Button>
            <Button
              variant="outline"
              onClick={() => applyGlobalMargin(35)}
              size="sm"
            >
              35%
            </Button>
            <Button
              variant="outline"
              onClick={() => applyGlobalMargin(40)}
              size="sm"
            >
              40%
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Individual Product Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration des prix par produit</CardTitle>
          <CardDescription>
            Ajustez les prix et marges de chaque produit individuellement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {packItems.map((item, index) => (
              <div key={`${item.product_id}-${index}`} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{item.product?.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      Quantité: {item.quantity} • {item.product?.brand}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={getMarginPercentage(item) < 10 ? "destructive" : 
                              getMarginPercentage(item) > 100 ? "secondary" : "default"}
                    >
                      Marge: {getMarginPercentage(item).toFixed(1)}%
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`override-${index}`} className="text-sm">
                        Prix personnalisé
                      </Label>
                      <Switch
                        id={`override-${index}`}
                        checked={item.custom_price_override}
                        onCheckedChange={(checked) => onUpdateItem(index, { custom_price_override: checked })}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`purchase-${index}`}>Prix d'achat unitaire</Label>
                    <Input
                      id={`purchase-${index}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unit_purchase_price}
                      onChange={(e) => handlePriceChange(index, 'unit_purchase_price', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`monthly-${index}`}>Mensualité unitaire</Label>
                    <Input
                      id={`monthly-${index}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unit_monthly_price}
                      onChange={(e) => handlePriceChange(index, 'unit_monthly_price', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Prix de vente unitaire</Label>
                    <div className="text-lg font-semibold text-green-600">
                      {formatPrice(calculateSalePriceWithLeaser(item.unit_monthly_price, selectedLeaser, selectedDuration))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`margin-${index}`}>Marge (%)</Label>
                    <Input
                      id={`margin-${index}`}
                      type="number"
                      step="0.1"
                      min="0"
                      value={getMarginPercentage(item).toFixed(1)}
                      onChange={(e) => handleMarginChange(index, parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Total ligne</Label>
                    <div className="text-lg font-semibold">
                      {formatPrice(item.unit_monthly_price * item.quantity)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};