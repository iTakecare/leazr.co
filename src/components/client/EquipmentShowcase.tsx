import React from "react";
import { motion } from "framer-motion";
import { Package, Monitor, Cpu, HardDrive, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EquipmentShowcaseProps {
  equipmentList: string[] | string;
  showLegacyNotice?: boolean;
}

export const EquipmentShowcase: React.FC<EquipmentShowcaseProps> = ({
  equipmentList,
  showLegacyNotice = false
}) => {
  const getEquipmentIcon = (equipment: string) => {
    const lower = equipment.toLowerCase();
    if (lower.includes('ordinateur') || lower.includes('laptop') || lower.includes('pc')) {
      return Monitor;
    }
    if (lower.includes('serveur') || lower.includes('server')) {
      return Cpu;
    }
    if (lower.includes('stockage') || lower.includes('storage') || lower.includes('disque')) {
      return HardDrive;
    }
    return Package;
  };

  const equipments = Array.isArray(equipmentList) ? equipmentList : [equipmentList];

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Équipements demandés
        </CardTitle>
      </CardHeader>
      <CardContent>
        {showLegacyNotice && (
          <Alert className="mb-4 border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Affichage simplifié. Pour plus de détails (quantités, prix unitaires, spécifications), 
              consultez la section "Détail des équipements" ci-dessous.
            </AlertDescription>
          </Alert>
        )}
        <div className="grid gap-4">
          {equipments.map((equipment, index) => {
            const IconComponent = getEquipmentIcon(equipment);
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-r from-background to-background/80 hover:from-background/90 hover:to-background/95 transition-all duration-300 hover:shadow-md"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="relative p-4 flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
                    <IconComponent className="w-6 h-6 text-primary" />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
                      {equipment}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Équipement professionnel sélectionné
                    </p>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-primary/40 group-hover:bg-primary group-hover:animate-pulse transition-all duration-300" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        
        {equipments.length > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-4 p-3 rounded-lg bg-muted/50 border border-border/30"
          >
            <p className="text-sm text-muted-foreground text-center">
              <strong>{equipments.length} équipements</strong> sélectionnés pour votre financement
            </p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};