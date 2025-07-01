
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
  const [editingSerials, setEditingSerials] = useState<{ [key: string]: string }>({});
  const [savingSerials, setSavingSerials] = useState<{ [key: string]: boolean }>({});

  const handleEditSerial = (equipmentId: string, currentSerial: string) => {
    setEditingSerials(prev => ({
      ...prev,
      [equipmentId]: currentSerial || ""
    }));
  };

  const handleSaveSerial = async (equipmentId: string) => {
    const newSerial = editingSerials[equipmentId];
    if (newSerial === undefined) return;

    setSavingSerials(prev => ({ ...prev, [equipmentId]: true }));

    try {
      const success = await updateEquipmentSerialNumber(equipmentId, newSerial);
      
      if (success) {
        setEditingSerials(prev => {
          const { [equipmentId]: _, ...rest } = prev;
          return rest;
        });
        onRefresh();
        toast.success("Numéro de série mis à jour");
      } else {
        toast.error("Erreur lors de la mise à jour du numéro de série");
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de la mise à jour du numéro de série");
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
          {equipment.some(item => !item.serial_number) && (
            <Badge variant="outline" className="ml-2 text-orange-600 border-orange-200">
              ⚠️ {equipment.filter(item => !item.serial_number).length} sans N° série
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

            {/* Numéro de série */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground min-w-[100px]">N° de série:</span>
              {editingSerials[item.id] !== undefined ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={editingSerials[item.id]}
                    onChange={(e) => setEditingSerials(prev => ({
                      ...prev,
                      [item.id]: e.target.value
                    }))}
                    placeholder="Entrez le numéro de série"
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleSaveSerial(item.id)}
                    disabled={savingSerials[item.id]}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCancelEdit(item.id)}
                    disabled={savingSerials[item.id]}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1">
                  <div className={`text-sm px-2 py-1 rounded-md ${
                    item.serial_number 
                      ? 'bg-green-50 text-green-700 border border-green-200' 
                      : 'bg-orange-50 text-orange-700 border border-orange-200'
                  }`}>
                    {item.serial_number || "⚠️ Non défini"}
                  </div>
                  <Button
                    size="sm"
                    variant={item.serial_number ? "ghost" : "outline"}
                    onClick={() => handleEditSerial(item.id, item.serial_number || "")}
                    className={!item.serial_number ? "border-orange-300 text-orange-700 hover:bg-orange-50" : ""}
                  >
                    <Edit className="h-4 w-4" />
                    {!item.serial_number && <span className="ml-1 text-xs">Ajouter</span>}
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
