
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Edit, Save, X, Package } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ContractEquipment, updateEquipmentSerialNumber } from "@/services/contractService";
import { toast } from "sonner";

interface ContractEquipmentSectionProps {
  equipment: ContractEquipment[];
  onRefresh: () => void;
}

const ContractEquipmentSection: React.FC<ContractEquipmentSectionProps> = ({ 
  equipment, 
  onRefresh 
}) => {
  const [editingSerials, setEditingSerials] = useState<{ [key: string]: string[] }>({});
  const [savingSerials, setSavingSerials] = useState<{ [key: string]: boolean }>({});

  const getSerialNumbers = (item: ContractEquipment): string[] => {
    if (!item.serial_number) return Array(item.quantity).fill('');
    try {
      const parsed = JSON.parse(item.serial_number);
      if (Array.isArray(parsed)) {
        // S'assurer qu'on a le bon nombre d'éléments
        const result = [...parsed];
        while (result.length < item.quantity) {
          result.push('');
        }
        return result.slice(0, item.quantity);
      }
    } catch {
      // Si ce n'est pas du JSON valide, traiter comme un seul numéro
      const result = Array(item.quantity).fill('');
      result[0] = item.serial_number;
      return result;
    }
    return Array(item.quantity).fill('');
  };

  const handleEditSerial = (equipmentId: string, item: ContractEquipment) => {
    setEditingSerials(prev => ({
      ...prev,
      [equipmentId]: getSerialNumbers(item)
    }));
  };

  const handleSerialChange = (equipmentId: string, index: number, value: string) => {
    setEditingSerials(prev => {
      const current = prev[equipmentId] || [];
      const updated = [...current];
      updated[index] = value;
      return {
        ...prev,
        [equipmentId]: updated
      };
    });
  };

  const handleSaveSerial = async (equipmentId: string) => {
    const newSerials = editingSerials[equipmentId];
    if (!newSerials) return;

    setSavingSerials(prev => ({ ...prev, [equipmentId]: true }));

    try {
      // Stocker les numéros de série comme JSON
      const serialsToSave = JSON.stringify(newSerials.filter(s => s.trim() !== ''));
      const success = await updateEquipmentSerialNumber(equipmentId, serialsToSave);
      
      if (success) {
        setEditingSerials(prev => {
          const { [equipmentId]: _, ...rest } = prev;
          return rest;
        });
        onRefresh();
        toast.success("Numéros de série mis à jour");
      } else {
        toast.error("Erreur lors de la mise à jour des numéros de série");
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de la mise à jour des numéros de série");
    } finally {
      setSavingSerials(prev => ({ ...prev, [equipmentId]: false }));
    }
  };

  const handleCancelEdit = (equipmentId: string) => {
    setEditingSerials(prev => {
      const { [equipmentId]: _, ...rest } = prev;
      return rest;
    });
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
          {equipment.some(item => {
            const serials = getSerialNumbers(item);
            return serials.some(s => !s);
          }) && (
            <Badge variant="outline" className="ml-2 text-orange-600 border-orange-200">
              ⚠️ Numéros de série manquants
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {equipment.map((item, index) => (
          <div key={item.id} className="border rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold text-lg">{item.title}</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Prix d'achat:</span>
                    <div className="font-medium">{formatCurrency(item.purchase_price)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Quantité:</span>
                    <div className="font-medium">{item.quantity}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Marge:</span>
                    <div className="font-medium">{item.margin}%</div>
                  </div>
                  {item.monthly_payment && (
                    <div>
                      <span className="text-muted-foreground">Mensualité:</span>
                      <div className="font-medium">{formatCurrency(item.monthly_payment)}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Numéros de série */}
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">Numéros de série:</span>
              {editingSerials[item.id] !== undefined ? (
                <div className="space-y-2">
                  {editingSerials[item.id].map((serial, serialIndex) => (
                    <div key={serialIndex} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground min-w-[60px]">
                        Unité {serialIndex + 1}:
                      </span>
                      <Input
                        value={serial}
                        onChange={(e) => handleSerialChange(item.id, serialIndex, e.target.value)}
                        placeholder={`Numéro de série unité ${serialIndex + 1}`}
                        className="flex-1"
                      />
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => handleSaveSerial(item.id)}
                      disabled={savingSerials[item.id]}
                    >
                      <Save className="h-4 w-4" />
                      Sauvegarder
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCancelEdit(item.id)}
                      disabled={savingSerials[item.id]}
                    >
                      <X className="h-4 w-4" />
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
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
                        {serial || "⚠️ Non défini"}
                      </div>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant={getSerialNumbers(item).some(s => s) ? "ghost" : "outline"}
                    onClick={() => handleEditSerial(item.id, item)}
                    className={!getSerialNumbers(item).some(s => s) ? "border-orange-300 text-orange-700 hover:bg-orange-50" : ""}
                  >
                    <Edit className="h-4 w-4" />
                    <span className="ml-1 text-xs">
                      {getSerialNumbers(item).some(s => s) ? "Modifier" : "Ajouter"}
                    </span>
                  </Button>
                </div>
              )}
            </div>

            {/* Attributs */}
            {item.attributes && item.attributes.length > 0 && (
              <div>
                <h5 className="font-medium mb-2">Attributs</h5>
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
                <h5 className="font-medium mb-2">Spécifications</h5>
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

export default ContractEquipmentSection;
