import React from "react";
import { motion } from "framer-motion";
import { Package, TrendingUp, Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OfferEquipment } from "@/types/offerEquipment";

interface DetailedEquipmentSectionProps {
  equipment: OfferEquipment[];
  loading: boolean;
}

export const DetailedEquipmentSection: React.FC<DetailedEquipmentSectionProps> = ({
  equipment,
  loading
}) => {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const calculateTotals = () => {
    const totalValue = equipment.reduce((sum, item) => sum + (item.purchase_price * item.quantity), 0);
    const totalMonthly = equipment.reduce((sum, item) => sum + (item.monthly_payment || 0) * item.quantity, 0);
    return { totalValue, totalMonthly };
  };

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Détail des équipements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted/50 rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!equipment.length) {
    return (
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Détail des équipements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Aucun équipement détaillé disponible
          </p>
        </CardContent>
      </Card>
    );
  }

  const { totalValue, totalMonthly } = calculateTotals();

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Détail des équipements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Equipment List */}
        <div className="space-y-4">
          {equipment.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="border border-border rounded-lg p-4 bg-background/50 hover:bg-background/80 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      Quantité: {item.quantity}
                    </Badge>
                    {item.serial_number && (
                      <Badge variant="secondary" className="text-xs">
                        S/N: {item.serial_number}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Pricing Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Prix unitaire</p>
                  <p className="font-semibold text-sm">{formatAmount(item.purchase_price)}</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Total</p>
                  <p className="font-semibold text-sm">{formatAmount(item.purchase_price * item.quantity)}</p>
                </div>
                <div className="text-center p-3 bg-primary/10 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Mensualité unitaire</p>
                  <p className="font-semibold text-sm text-primary">{formatAmount(item.monthly_payment || 0)}</p>
                </div>
                <div className="text-center p-3 bg-primary/10 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Mensualité totale</p>
                  <p className="font-semibold text-sm text-primary">{formatAmount((item.monthly_payment || 0) * item.quantity)}</p>
                </div>
              </div>

              {/* Specifications */}
              {item.specifications && item.specifications.length > 0 && (
                <div className="border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Spécifications:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
                    {item.specifications.map((spec, specIndex) => (
                      <div key={specIndex} className="flex justify-between">
                        <span className="text-muted-foreground">{spec.key}:</span>
                        <span className="font-medium">{spec.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="border-t pt-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary/20 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valeur totale des équipements</p>
                <p className="text-xl font-bold">{formatAmount(totalValue)}</p>
              </div>
            </div>
            
            <div className="bg-primary/10 rounded-lg p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                <Calculator className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mensualité totale</p>
                <p className="text-xl font-bold text-primary">{formatAmount(totalMonthly)}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
};