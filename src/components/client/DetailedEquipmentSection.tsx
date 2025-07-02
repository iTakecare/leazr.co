import React from "react";
import { motion } from "framer-motion";
import { Package } from "lucide-react";
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
                    {item.monthly_payment && (
                      <Badge variant="default" className="text-xs bg-primary">
                        Mensualité: {new Intl.NumberFormat('fr-FR', {
                          style: 'currency',
                          currency: 'EUR',
                          minimumFractionDigits: 0
                        }).format(item.monthly_payment)}
                      </Badge>
                    )}
                    {item.serial_number && (
                      <Badge variant="secondary" className="text-xs">
                        S/N: {item.serial_number}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Attributs */}
              {item.attributes && item.attributes.length > 0 && (
                <div className="border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Attributs:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
                    {item.attributes.map((attr, attrIndex) => (
                      <div key={attrIndex} className="flex justify-between">
                        <span className="text-muted-foreground">{attr.key}:</span>
                        <span className="font-medium">{attr.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};