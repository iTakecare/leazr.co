import React from "react";
import { Package, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Equipment {
  id?: string;
  title: string;
  quantity: number;
  purchase_price?: number;
  monthly_payment?: number;
}

interface MobileEquipmentListProps {
  equipment: Equipment[];
  onClick?: () => void;
}

const MobileEquipmentList: React.FC<MobileEquipmentListProps> = ({
  equipment,
  onClick,
}) => {
  const totalItems = equipment.reduce((sum, eq) => sum + (eq.quantity || 1), 0);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Package className="h-4 w-4 text-primary" />
            Équipements ({totalItems})
          </CardTitle>
          {onClick && (
            <Button variant="ghost" size="sm" onClick={onClick} className="text-xs h-8">
              Voir
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {equipment.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun équipement</p>
        ) : (
          <div className="space-y-2">
            {equipment.slice(0, 3).map((eq, index) => (
              <div
                key={eq.id || index}
                className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{eq.title}</p>
                </div>
                <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                  x{eq.quantity || 1}
                </span>
              </div>
            ))}
            {equipment.length > 3 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                +{equipment.length - 3} autre{equipment.length - 3 > 1 ? 's' : ''} équipement{equipment.length - 3 > 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MobileEquipmentList;
