import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calculator, TrendingUp, AlertTriangle } from "lucide-react";
import { PackItemFormData } from "@/hooks/packs/usePackCreator";
import { PackCalculation } from "@/types/pack";

interface PackPriceConfigurationProps {
  packItems: PackItemFormData[];
  calculations: PackCalculation;
  onUpdateItem: (index: number, updates: Partial<PackItemFormData>) => void;
  onUpdateCalculations: () => void;
}

export const PackPriceConfiguration = ({
  packItems,
  calculations,
  onUpdateItem,
  onUpdateCalculations,
}: PackPriceConfigurationProps) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  const handlePriceChange = (index: number, field: 'unit_purchase_price' | 'unit_monthly_price', value: number) => {
    const item = packItems[index];
    const updates: Partial<PackItemFormData> = { [field]: value };
    
    // Recalculate margin when prices change
    if (field === 'unit_purchase_price' || field === 'unit_monthly_price') {
      const purchasePrice = field === 'unit_purchase_price' ? value : item.unit_purchase_price;
      const monthlyPrice = field === 'unit_monthly_price' ? value : item.unit_monthly_price;
      
      if (purchasePrice > 0) {
        updates.margin_percentage = ((monthlyPrice - purchasePrice) / purchasePrice) * 100;
      }
    }
    
    onUpdateItem(index, updates);
  };

  const handleMarginChange = (index: number, marginPercentage: number) => {
    const item = packItems[index];
    if (item.unit_purchase_price > 0) {
      const newMonthlyPrice = item.unit_purchase_price * (1 + marginPercentage / 100);
      onUpdateItem(index, {
        margin_percentage: marginPercentage,
        unit_monthly_price: newMonthlyPrice,
      });
    }
  };

  const applyGlobalMargin = (targetMargin: number) => {
    packItems.forEach((item, index) => {
      if (item.unit_purchase_price > 0) {
        const newMonthlyPrice = item.unit_purchase_price * (1 + targetMargin / 100);
        onUpdateItem(index, {
          margin_percentage: targetMargin,
          unit_monthly_price: newMonthlyPrice,
        });
      }
    });
  };

  const lowMarginItems = packItems.filter(item => item.margin_percentage < 10);
  const highMarginItems = packItems.filter(item => item.margin_percentage > 100);

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
              <p className="text-sm text-muted-foreground">Prix de vente total</p>
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

      {/* Alerts */}
      {(lowMarginItems.length > 0 || highMarginItems.length > 0) && (
        <div className="space-y-2">
          {lowMarginItems.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{lowMarginItems.length} produit(s)</strong> ont une marge inférieure à 10% : {lowMarginItems.map(item => item.product?.name).join(', ')}
              </AlertDescription>
            </Alert>
          )}
          {highMarginItems.length > 0 && (
            <Alert>
              <TrendingUp className="h-4 w-4" />
              <AlertDescription>
                <strong>{highMarginItems.length} produit(s)</strong> ont une marge supérieure à 100% : {highMarginItems.map(item => item.product?.name).join(', ')}
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
                      variant={item.margin_percentage < 10 ? "destructive" : 
                              item.margin_percentage > 100 ? "secondary" : "default"}
                    >
                      Marge: {item.margin_percentage.toFixed(1)}%
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

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                    <Label htmlFor={`monthly-${index}`}>Prix de vente unitaire</Label>
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
                    <Label htmlFor={`margin-${index}`}>Marge (%)</Label>
                    <Input
                      id={`margin-${index}`}
                      type="number"
                      step="0.1"
                      min="0"
                      value={item.margin_percentage.toFixed(1)}
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