
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package } from "lucide-react";
import { ContractEquipment } from "@/services/contractService";
import ContractEquipmentDragDropManager from "./ContractEquipmentDragDropManager";

interface ContractEquipmentSectionProps {
  equipment: ContractEquipment[];
  contractId: string;
  clientId: string;
  onRefresh: () => void;
}

const ContractEquipmentSection: React.FC<ContractEquipmentSectionProps> = ({ 
  equipment, 
  contractId,
  clientId,
  onRefresh 
}) => {

  const getSerialNumbers = (serialNumbers: string | null, quantity: number): string[] => {
    if (!serialNumbers) return [];
    
    // Si c'est une chaîne JSON, la parser
    try {
      if (serialNumbers.startsWith('[')) {
        return JSON.parse(serialNumbers);
      }
    } catch (e) {
      // Si ça ne parse pas, traiter comme une chaîne simple
    }
    
    // Sinon, diviser par des virgules et nettoyer
    return serialNumbers
      .split(',')
      .map(sn => sn.trim())
      .filter(sn => sn.length > 0)
      .slice(0, quantity);
  };


  return (
    <div className="space-y-6">
      {/* Section informations équipements */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Détails des équipements
          </CardTitle>
          <CardDescription>
            Informations détaillées sur chaque équipement inclus dans ce contrat
          </CardDescription>
        </CardHeader>
        <CardContent>
          {equipment && equipment.length > 0 ? (
            <div className="space-y-6">
              {equipment.map((item, index) => {
                const serialNumbers = getSerialNumbers(item.serial_number, item.quantity);
                
                return (
                  <div key={item.id || index} className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">{item.title}</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Quantité</p>
                            <p className="text-lg">{item.quantity}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Prix d'achat</p>
                            <p className="text-lg">{item.purchase_price}€</p>
                          </div>
                        </div>

                        {serialNumbers.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm font-medium text-muted-foreground mb-2">Numéros de série</p>
                            <div className="flex flex-wrap gap-2">
                              {serialNumbers.map((sn, idx) => (
                                <Badge key={idx} variant="outline" className="font-mono">
                                  {sn}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {item.attributes && Array.isArray(item.attributes) && item.attributes.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm font-medium text-muted-foreground mb-2">Attributs</p>
                            <div className="grid grid-cols-2 gap-4">
                              {item.attributes.map((attr, idx) => (
                                <div key={idx}>
                                  <p className="text-sm font-medium">{attr.key}</p>
                                  <p className="text-sm text-muted-foreground">{attr.value}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {item.specifications && Array.isArray(item.specifications) && item.specifications.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm font-medium text-muted-foreground mb-2">Spécifications techniques</p>
                            <div className="grid grid-cols-2 gap-4">
                              {item.specifications.map((spec, idx) => (
                                <div key={idx}>
                                  <p className="text-sm font-medium">{spec.key}</p>
                                  <p className="text-sm text-muted-foreground">{spec.value}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {index < equipment.length - 1 && <Separator className="my-6" />}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground">Aucun équipement trouvé pour ce contrat.</p>
          )}
        </CardContent>
      </Card>

      {/* Section drag-and-drop pour l'attribution */}
      <ContractEquipmentDragDropManager contractId={contractId} />
    </div>
  );
};

export default ContractEquipmentSection;
