import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, Calendar, TrendingUp, ShoppingCart, Star, Eye, EyeOff } from "lucide-react";
import { PackItemFormData } from "@/hooks/packs/usePackCreator";
import { PackCalculation } from "@/types/pack";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PackPreviewProps {
  packData: {
    name: string;
    description?: string;
    image_url?: string;
    is_active: boolean;
    is_featured: boolean;
    admin_only: boolean;
    valid_from?: Date;
    valid_to?: Date;
  };
  packItems: PackItemFormData[];
  calculations: PackCalculation;
}

export const PackPreview = ({ packData, packItems, calculations }: PackPreviewProps) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  const formatDate = (date: Date) => {
    return format(date, "PPP", { locale: fr });
  };

  const individualTotal = packItems.reduce((sum, item) => {
    // Simulate individual pricing (would come from actual product prices)
    const individualPrice = item.unit_monthly_price * 1.1; // 10% markup for individual purchase
    return sum + (individualPrice * item.quantity);
  }, 0);

  const savings = individualTotal - calculations.total_monthly_price;
  const savingsPercentage = individualTotal > 0 ? (savings / individualTotal) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Pack Preview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{packData.name}</CardTitle>
              {packData.description && (
                <CardDescription className="text-base">
                  {packData.description}
                </CardDescription>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {packData.is_featured && (
                <Badge variant="secondary" className="gap-1">
                  <Star className="h-3 w-3" />
                  En vedette
                </Badge>
              )}
              {packData.admin_only && (
                <Badge variant="outline">Réservé admin</Badge>
              )}
              <Badge variant={packData.is_active ? "default" : "secondary"} className="gap-1">
                {packData.is_active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                {packData.is_active ? "Actif" : "Inactif"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Validity Period */}
          {(packData.valid_from || packData.valid_to) && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Valide {packData.valid_from && `du ${formatDate(packData.valid_from)}`}
                {packData.valid_from && packData.valid_to && " "}
                {packData.valid_to && `jusqu'au ${formatDate(packData.valid_to)}`}
              </span>
            </div>
          )}

          {/* Price Summary */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div>
                <p className="text-2xl font-bold text-primary">{formatPrice(calculations.total_monthly_price)}</p>
                <p className="text-sm text-muted-foreground">Prix du pack</p>
              </div>
              {savings > 0 && (
                <div className="text-right">
                  <p className="text-lg font-semibold text-green-600">
                    -{formatPrice(savings)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Économie de {savingsPercentage.toFixed(0)}%
                  </p>
                </div>
              )}
            </div>

            {savings > 0 && (
              <div className="text-sm text-muted-foreground text-center">
                <span className="line-through">{formatPrice(individualTotal)}</span>
                <span className="ml-2">au lieu de</span>
              </div>
            )}
          </div>

          {/* Pack Contents */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Contenu du pack</h3>
            </div>
            
            <div className="space-y-3">
              {packItems.map((item, index) => (
                <div key={`${item.product_id}-${index}`} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <div>
                        <p className="font-medium">{item.product?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.product?.brand} • {item.product?.category}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">
                      Qté: {item.quantity}
                    </Badge>
                    <div className="text-right">
                      <p className="font-medium">{formatPrice(item.unit_monthly_price)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatPrice(item.unit_monthly_price * item.quantity)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Pack Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <ShoppingCart className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-lg font-semibold">{calculations.items_count}</p>
              <p className="text-sm text-muted-foreground">Produits</p>
            </div>
            
            <div className="text-center p-3 bg-muted rounded-lg">
              <Package className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-lg font-semibold">{calculations.total_quantity}</p>
              <p className="text-sm text-muted-foreground">Articles</p>
            </div>
            
            <div className="text-center p-3 bg-muted rounded-lg">
              <TrendingUp className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-lg font-semibold">{calculations.average_margin_percentage.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground">Marge moy.</p>
            </div>
            
            <div className="text-center p-3 bg-muted rounded-lg">
              <TrendingUp className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-lg font-semibold">{formatPrice(calculations.total_margin)}</p>
              <p className="text-sm text-muted-foreground">Marge totale</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Note */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            🎯 <strong>Aperçu :</strong> Ceci est un aperçu de votre pack tel qu'il apparaîtra dans le catalogue client.
            Vérifiez toutes les informations avant de valider la création.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};