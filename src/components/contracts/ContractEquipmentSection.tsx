
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Edit, Save, X, Package, Truck, Settings } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ContractEquipment, updateEquipmentSerialNumber } from "@/services/contractService";
import { toast } from "sonner";
import DeliveryWizardModal from "@/components/delivery/DeliveryWizardModal";
import IndividualDeliveryWizardModal from "@/components/delivery/IndividualDeliveryWizardModal";
import { useIndividualDeliveries } from "@/hooks/useIndividualDeliveries";

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
  const [editingSerials, setEditingSerials] = useState<{ [key: string]: string[] }>({});
  const [savingSerials, setSavingSerials] = useState<{ [key: string]: boolean }>({});
  const [showDeliveryWizard, setShowDeliveryWizard] = useState(false);
  const [showIndividualDeliveryWizard, setShowIndividualDeliveryWizard] = useState(false);
  
  const { 
    hasIndividualDeliveries, 
    getDeliveryCount, 
    getTotalQuantityDelivered 
  } = useIndividualDeliveries(contractId);

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

  // Vérifier si tous les numéros de série sont renseignés
  const allSerialsComplete = equipment.every(item => {
    const serials = getSerialNumbers(item);
    return serials.every(s => s.trim() !== '');
  });

  // Vérifier si des livraisons sont configurées
  const hasDeliveryConfig = equipment.some(item => item.delivery_type);
  
  // Vérifier si des livraisons individuelles existent
  const hasIndividualConfig = equipment.some(item => hasIndividualDeliveries(item.id));
  
  // Fonction pour déterminer si le bouton de livraison individuelle doit être affiché
  const shouldShowIndividualButton = (item: ContractEquipment): boolean => {
    const serials = getSerialNumbers(item);
    const hasSerials = serials.some(s => s.trim() !== '');
    return item.quantity > 1 || hasSerials;
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
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
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
            {hasDeliveryConfig && (
              <Badge variant="outline" className="ml-2 text-green-600 border-green-200">
                ✅ Livraisons configurées
              </Badge>
            )}
            {hasIndividualConfig && (
              <Badge variant="outline" className="ml-2 text-blue-600 border-blue-200">
                📦 Livraisons individuelles
              </Badge>
            )}
          </div>
          
          {allSerialsComplete && (
            <Button 
              variant={hasDeliveryConfig ? "outline" : "default"}
              size="sm"
              onClick={() => setShowDeliveryWizard(true)}
              className="flex items-center gap-2"
            >
              <Truck className="h-4 w-4" />
              {hasDeliveryConfig ? "Modifier les livraisons" : "Configurer les livraisons"}
            </Button>
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

            {/* Informations de livraison */}
            {item.delivery_type && (
              <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                <h5 className="font-medium mb-2 flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Informations de livraison
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium ml-2">
                      {item.delivery_type === 'main_client' && 'Client principal'}
                      {item.delivery_type === 'collaborator' && 'Collaborateur'}
                      {item.delivery_type === 'predefined_site' && 'Site prédéfini'}
                      {item.delivery_type === 'specific_address' && 'Adresse spécifique'}
                    </span>
                  </div>
                  {item.delivery_address && (
                    <div>
                      <span className="text-muted-foreground">Adresse:</span>
                      <span className="font-medium ml-2">{item.delivery_address}</span>
                    </div>
                  )}
                  {item.delivery_city && (
                    <div>
                      <span className="text-muted-foreground">Ville:</span>
                      <span className="font-medium ml-2">{item.delivery_city}</span>
                    </div>
                  )}
                  {item.delivery_contact_name && (
                    <div>
                      <span className="text-muted-foreground">Contact:</span>
                      <span className="font-medium ml-2">{item.delivery_contact_name}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bouton de configuration individuelle */}
            {shouldShowIndividualButton(item) && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h5 className="font-medium text-sm">Configuration individuelle</h5>
                    {hasIndividualDeliveries(item.id) && (
                      <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
                        {getDeliveryCount(item.id)} livraison(s) - {getTotalQuantityDelivered(item.id)}/{item.quantity} unités
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={hasIndividualDeliveries(item.id) ? "outline" : "default"}
                    onClick={() => setShowIndividualDeliveryWizard(true)}
                    className="flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    {hasIndividualDeliveries(item.id) ? "Modifier" : "Configurer"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Définir des livraisons spécifiques par quantité ou numéro de série
                </p>
              </div>
            )}

            {index < equipment.length - 1 && <Separator />}
          </div>
        ))}
      </CardContent>

      {/* Wizard de configuration des livraisons */}
      <DeliveryWizardModal
        open={showDeliveryWizard}
        onOpenChange={setShowDeliveryWizard}
        equipment={equipment}
        clientId={clientId}
        contractId={contractId}
        onComplete={onRefresh}
      />

      {/* Wizard de configuration individuelle */}
      <IndividualDeliveryWizardModal
        open={showIndividualDeliveryWizard}
        onOpenChange={setShowIndividualDeliveryWizard}
        equipment={equipment}
        clientId={clientId}
        contractId={contractId}
        onComplete={() => {
          onRefresh();
          setShowIndividualDeliveryWizard(false);
        }}
      />
    </Card>
  );
};

export default ContractEquipmentSection;
