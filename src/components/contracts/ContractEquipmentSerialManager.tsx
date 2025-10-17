import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { getContractEquipment, updateEquipmentSerialNumber, ContractEquipment } from "@/services/contractService";

interface ContractEquipmentSerialManagerProps {
  contractId: string;
  onUpdate?: () => void;
}

const ContractEquipmentSerialManager: React.FC<ContractEquipmentSerialManagerProps> = ({ 
  contractId,
  onUpdate 
}) => {
  const [equipment, setEquipment] = useState<ContractEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [editedSerials, setEditedSerials] = useState<Map<string, string[]>>(new Map());

  useEffect(() => {
    fetchEquipment();
  }, [contractId]);

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      const data = await getContractEquipment(contractId);
      setEquipment(data);
      
      // Initialiser les numéros de série édités
      const initialSerials = new Map<string, string[]>();
      data.forEach(item => {
        const serials = parseSerialNumbers(item.serial_number || '', item.quantity);
        initialSerials.set(item.id, serials);
      });
      setEditedSerials(initialSerials);
    } catch (error) {
      console.error('Erreur lors de la récupération des équipements:', error);
      toast.error('Erreur lors du chargement des équipements');
    } finally {
      setLoading(false);
    }
  };

  const parseSerialNumbers = (serialNumber: string, quantity: number): string[] => {
    if (!serialNumber || serialNumber.trim() === '') {
      return Array(quantity).fill('');
    }

    try {
      // Essayer de parser comme JSON array
      const parsed = JSON.parse(serialNumber);
      if (Array.isArray(parsed)) {
        // S'assurer d'avoir le bon nombre d'entrées
        const result = [...parsed];
        while (result.length < quantity) {
          result.push('');
        }
        return result.slice(0, quantity);
      }
    } catch (e) {
      // Pas du JSON, traiter comme string simple
    }

    // Si quantity = 1, retourner comme array d'un élément
    if (quantity === 1) {
      return [serialNumber];
    }

    // Sinon, essayer de split par virgule ou newline
    const split = serialNumber.split(/[,\n]/).map(s => s.trim());
    const result = [...split];
    while (result.length < quantity) {
      result.push('');
    }
    return result.slice(0, quantity);
  };

  const formatSerialNumbers = (serials: string[]): string => {
    // Filtrer les chaînes vides
    const filtered = serials.filter(s => s.trim() !== '');
    
    if (filtered.length === 0) return '';
    if (filtered.length === 1) return filtered[0];
    
    // Pour plusieurs numéros, stocker en JSON array
    return JSON.stringify(filtered);
  };

  const handleSerialChange = (equipmentId: string, index: number, value: string) => {
    const currentSerials = editedSerials.get(equipmentId) || [];
    const newSerials = [...currentSerials];
    newSerials[index] = value;
    
    const newMap = new Map(editedSerials);
    newMap.set(equipmentId, newSerials);
    setEditedSerials(newMap);
  };

  const handleSave = async (equipmentId: string) => {
    const serials = editedSerials.get(equipmentId) || [];
    const serialNumber = formatSerialNumbers(serials);

    try {
      setSavingIds(prev => new Set(prev).add(equipmentId));
      
      const success = await updateEquipmentSerialNumber(equipmentId, serialNumber);
      
      if (success) {
        toast.success('Numéros de série enregistrés');
        await fetchEquipment();
        onUpdate?.();
      } else {
        toast.error('Erreur lors de l\'enregistrement');
      }
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSavingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(equipmentId);
        return newSet;
      });
    }
  };

  const isSerialComplete = (equipmentId: string): boolean => {
    const serials = editedSerials.get(equipmentId) || [];
    return serials.every(s => s.trim() !== '');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Numéros de série des équipements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (equipment.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Numéros de série des équipements</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucun équipement trouvé pour ce contrat.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>📦 Numéros de série des équipements</CardTitle>
        <CardDescription>
          Les numéros de série sont requis pour générer la facture du contrat
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {equipment.map((item) => {
          const serials = editedSerials.get(item.id) || [];
          const isComplete = isSerialComplete(item.id);
          const isSaving = savingIds.has(item.id);

          return (
            <div key={item.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{item.title}</h4>
                    {isComplete ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Complet
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Incomplet
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">Quantité : {item.quantity}</p>
                </div>
              </div>

              <div className="space-y-2">
                {item.quantity === 1 ? (
                  <div>
                    <label className="text-sm font-medium">Numéro de série</label>
                    <Input
                      value={serials[0] || ''}
                      onChange={(e) => handleSerialChange(item.id, 0, e.target.value)}
                      placeholder="Entrez le numéro de série"
                      className="mt-1"
                    />
                  </div>
                ) : (
                  serials.map((serial, index) => (
                    <div key={index}>
                      <label className="text-sm font-medium">Unité {index + 1}</label>
                      <Input
                        value={serial}
                        onChange={(e) => handleSerialChange(item.id, index, e.target.value)}
                        placeholder={`Numéro de série de l'unité ${index + 1}`}
                        className="mt-1"
                      />
                    </div>
                  ))
                )}
              </div>

              <Button
                onClick={() => handleSave(item.id)}
                disabled={isSaving}
                size="sm"
                className="w-full sm:w-auto"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Enregistrer
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default ContractEquipmentSerialManager;
