import React from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { formatCurrency } from "@/utils/formatters";
import { Package } from "lucide-react";

interface Equipment {
  id?: string;
  title: string;
  quantity: number;
  purchase_price?: number;
  monthly_payment?: number;
  margin?: number;
  selling_price?: number;
  serial_number?: string;
}

interface MobileEquipmentDrawerProps {
  open: boolean;
  onClose: () => void;
  equipment: Equipment[];
}

const MobileEquipmentDrawer: React.FC<MobileEquipmentDrawerProps> = ({
  open,
  onClose,
  equipment,
}) => {
  const totalItems = equipment.reduce((sum, eq) => sum + (eq.quantity || 1), 0);

  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Équipements ({totalItems})
          </DrawerTitle>
          <DrawerDescription>
            Détail des équipements de l'offre
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-6 overflow-y-auto">
          {equipment.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucun équipement dans cette offre
            </p>
          ) : (
            <div className="space-y-3">
              {equipment.map((eq, index) => (
                <div
                  key={eq.id || index}
                  className="p-4 bg-muted/50 rounded-lg border border-border/50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm flex-1">{eq.title}</h4>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-2">
                      x{eq.quantity || 1}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {eq.purchase_price !== undefined && eq.purchase_price > 0 && (
                      <div>
                        <span className="text-muted-foreground">Prix d'achat:</span>
                        <span className="ml-1 font-medium">
                          {formatCurrency(eq.purchase_price)}
                        </span>
                      </div>
                    )}

                    {eq.monthly_payment !== undefined && eq.monthly_payment > 0 && (
                      <div>
                        <span className="text-muted-foreground">Mensualité:</span>
                        <span className="ml-1 font-medium">
                          {formatCurrency(eq.monthly_payment)}/mois
                        </span>
                      </div>
                    )}

                    {eq.margin !== undefined && eq.margin > 0 && (
                      <div>
                        <span className="text-muted-foreground">Marge:</span>
                        <span className="ml-1 font-medium text-primary">
                          {eq.margin}%
                        </span>
                      </div>
                    )}

                    {eq.serial_number && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">N° série:</span>
                        <span className="ml-1 font-mono text-xs">
                          {eq.serial_number}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default MobileEquipmentDrawer;
