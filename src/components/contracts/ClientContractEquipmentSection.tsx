import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package } from "lucide-react";
import { ContractEquipment } from "@/services/contractService";

interface ClientContractEquipmentSectionProps {
  equipment: ContractEquipment[];
}

const ClientContractEquipmentSection: React.FC<ClientContractEquipmentSectionProps> = ({ 
  equipment 
}) => {
  const getSerialNumbers = (item: ContractEquipment): string[] => {
    if (!item.serial_number) return Array(item.quantity).fill('');
    try {
      const parsed = JSON.parse(item.serial_number);
      if (Array.isArray(parsed)) {
        const result = [...parsed];
        while (result.length < item.quantity) {
          result.push('');
        }
        return result.slice(0, item.quantity);
      }
    } catch {
      const result = Array(item.quantity).fill('');
      result[0] = item.serial_number;
      return result;
    }
    return Array(item.quantity).fill('');
  };

  if (equipment.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Équipements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Aucun équipement trouvé pour ce contrat.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Équipements ({equipment.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {equipment.map((item, index) => (
          <div key={item.id} className="border rounded-lg p-4 space-y-4">
            <div>
              <h4 className="font-semibold text-lg">{item.title}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Quantité:</span>
                  <div className="font-medium">{item.quantity}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Statut:</span>
                  <div className="font-medium">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Actif
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Numéros de série */}
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">Numéros de série:</span>
              <div className="space-y-2">
                {getSerialNumbers(item).map((serial, serialIndex) => (
                  <div key={serialIndex} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground min-w-[60px]">
                      Unité {serialIndex + 1}:
                    </span>
                    <div className={`text-sm px-2 py-1 rounded-md flex-1 ${
                      serial 
                        ? 'bg-green-50 text-green-700 border border-green-200' 
                        : 'bg-orange-50 text-orange-700 border border-orange-200'
                    }`}>
                      {serial || "En attente de livraison"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Attributs */}
            {item.attributes && item.attributes.length > 0 && (
              <div>
                <h5 className="font-medium mb-2">Caractéristiques</h5>
                <div className="flex flex-wrap gap-2">
                  {item.attributes.map((attr, attrIndex) => (
                    <Badge key={attrIndex} variant="secondary">
                      {attr.key}: {attr.value}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Spécifications */}
            {item.specifications && item.specifications.length > 0 && (
              <div>
                <h5 className="font-medium mb-2">Spécifications techniques</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {item.specifications.map((spec, specIndex) => (
                    <div key={specIndex} className="flex justify-between">
                      <span className="text-muted-foreground">{spec.key}:</span>
                      <span className="font-medium">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {index < equipment.length - 1 && <Separator />}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default ClientContractEquipmentSection;