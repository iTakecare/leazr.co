
import React, { useState } from 'react';
import { Equipment } from '@/types/equipment';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

interface EquipmentDetailProps {
  equipment: Equipment | null;
  onSave: (equipment: Equipment) => void;
}

const EquipmentDetail: React.FC<EquipmentDetailProps> = ({
  equipment,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState("details");
  const [formData, setFormData] = useState<Equipment | null>(equipment);

  if (!equipment || !formData) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Sélectionnez un équipement pour voir les détails</p>
      </div>
    );
  }

  const handleInputChange = (field: keyof Equipment, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleStatusChange = (status: string) => {
    setFormData({ ...formData, status });
  };

  const handleSave = () => {
    if (formData) {
      onSave(formData);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-background p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <h2 className="text-2xl font-semibold">{equipment.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={equipment.status === 'En service' ? 'success' : equipment.status === 'En réserve' ? 'warning' : 'destructive'}>
                  {equipment.status}
                </Badge>
                {equipment.location && (
                  <Badge variant="outline">{equipment.location}</Badge>
                )}
              </div>
            </div>
          </div>
          <Button onClick={handleSave}>Enregistrer</Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
            <TabsTrigger value="details">Détails</TabsTrigger>
            <TabsTrigger value="specs">Caractéristiques</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-grow overflow-auto p-4">
        <TabsContent value="details" className="mt-0">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Nom de l'appareil</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Type</label>
                    <Select 
                      value={formData.type || ''} 
                      onValueChange={(value) => handleInputChange('type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="laptop">Ordinateur portable</SelectItem>
                        <SelectItem value="smartphone">Smartphone</SelectItem>
                        <SelectItem value="tablet">Tablette</SelectItem>
                        <SelectItem value="monitor">Écran</SelectItem>
                        <SelectItem value="accessory">Accessoire</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">Fournisseur</label>
                    <Input
                      value={formData.supplier || ''}
                      onChange={(e) => handleInputChange('supplier', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Début du contrat</label>
                    <Input
                      type="date"
                      value={formData.contractStart || ''}
                      onChange={(e) => handleInputChange('contractStart', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">Fin du contrat</label>
                    <Input
                      type="date"
                      value={formData.contractEnd || ''}
                      onChange={(e) => handleInputChange('contractEnd', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Durée</label>
                    <Input
                      value={formData.contractDuration || ''}
                      onChange={(e) => handleInputChange('contractDuration', e.target.value)}
                      placeholder="ex: 36 mois"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">Loyer</label>
                    <Input
                      type="number"
                      value={formData.monthlyRent?.toString() || ''}
                      onChange={(e) => handleInputChange('monthlyRent', parseFloat(e.target.value))}
                      placeholder="ex: 49.90€"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">N° de contrat</label>
                  <Input
                    value={formData.contractNumber || ''}
                    onChange={(e) => handleInputChange('contractNumber', e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">Statut</label>
                  <Select 
                    value={formData.status || ''} 
                    onValueChange={handleStatusChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="En service">En service</SelectItem>
                      <SelectItem value="En réserve">En réserve</SelectItem>
                      <SelectItem value="Remplacement">Remplacement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Assigné à</label>
                  <Input
                    value={formData.assignedTo || ''}
                    onChange={(e) => handleInputChange('assignedTo', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="specs" className="mt-0">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Numéro de série</label>
                  <Input
                    value={formData.serial || ''}
                    onChange={(e) => handleInputChange('serial', e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Emplacement</label>
                    <Select 
                      value={formData.location || ''} 
                      onValueChange={(value) => handleInputChange('location', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un emplacement" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Marseille">Marseille</SelectItem>
                        <SelectItem value="Paris">Paris</SelectItem>
                        <SelectItem value="Lyon">Lyon</SelectItem>
                        <SelectItem value="Bordeaux">Bordeaux</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </div>
    </div>
  );
};

export default EquipmentDetail;
