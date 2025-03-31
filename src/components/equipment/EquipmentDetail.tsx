
import React, { useState } from 'react';
import { Equipment } from '@/types/equipment';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { CircleCheck, Pencil, Save, X } from 'lucide-react';

interface EquipmentDetailProps {
  equipment: Equipment | null;
  onSave: (equipment: Equipment) => void;
}

const EquipmentDetail: React.FC<EquipmentDetailProps> = ({ equipment, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const form = useForm({
    defaultValues: equipment || {},
  });

  if (!equipment) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Laptop className="h-16 w-16 text-muted-foreground/40 mb-4" />
        <h3 className="font-medium text-lg mb-2">Aucun équipement sélectionné</h3>
        <p className="text-muted-foreground">
          Sélectionnez un équipement pour voir ses détails
        </p>
      </div>
    );
  }

  const handleSave = (data: any) => {
    onSave({
      ...equipment,
      ...data,
    });
    setIsEditing(false);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'En service':
        return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">En service</Badge>;
      case 'En réserve':
        return <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200">En réserve</Badge>;
      case 'Remplacement':
        return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-200 border-red-200">Remplacement</Badge>;
      default:
        return <Badge variant="outline">{status || 'Non défini'}</Badge>;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b p-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{equipment.title}</h2>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{equipment.type || 'Non catégorisé'}</span>
            {equipment.status && (
              <>
                <span className="text-gray-300">•</span>
                {getStatusBadge(equipment.status)}
              </>
            )}
          </div>
        </div>
        <Button 
          variant={isEditing ? "outline" : "default"}
          size="sm"
          className="gap-1"
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? (
            <>
              <X className="h-4 w-4" /> Annuler
            </>
          ) : (
            <>
              <Pencil className="h-4 w-4" /> Modifier
            </>
          )}
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {isEditing ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de l'équipement</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="serial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numéro de série</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Statut</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez un statut" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="En service">En service</SelectItem>
                          <SelectItem value="En réserve">En réserve</SelectItem>
                          <SelectItem value="Remplacement">Remplacement</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigné à</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emplacement</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="supplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fournisseur</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end pt-4">
                <Button type="submit" className="gap-1">
                  <Save className="h-4 w-4" /> Enregistrer les modifications
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
            <div>
              <Label className="text-xs text-muted-foreground">Numéro de série</Label>
              <p className="font-medium">{equipment.serial || 'Non renseigné'}</p>
            </div>
            
            <div>
              <Label className="text-xs text-muted-foreground">Type d'équipement</Label>
              <p className="font-medium">{equipment.type || 'Non renseigné'}</p>
            </div>
            
            <div>
              <Label className="text-xs text-muted-foreground">Assigné à</Label>
              <p className="font-medium">{equipment.assignedTo || 'Non assigné'}</p>
            </div>
            
            <div>
              <Label className="text-xs text-muted-foreground">Date d'assignation</Label>
              <p className="font-medium">{equipment.assignedDate || 'Non renseigné'}</p>
            </div>
            
            <div>
              <Label className="text-xs text-muted-foreground">Emplacement</Label>
              <p className="font-medium">{equipment.location || 'Non renseigné'}</p>
            </div>
            
            <div>
              <Label className="text-xs text-muted-foreground">Fournisseur</Label>
              <p className="font-medium">{equipment.supplier || 'Non renseigné'}</p>
            </div>
            
            <div>
              <Label className="text-xs text-muted-foreground">Début du contrat</Label>
              <p className="font-medium">{equipment.contractStart || 'Non renseigné'}</p>
            </div>
            
            <div>
              <Label className="text-xs text-muted-foreground">Fin du contrat</Label>
              <p className="font-medium">{equipment.contractEnd || 'Non renseigné'}</p>
            </div>
            
            <div>
              <Label className="text-xs text-muted-foreground">Prix d'achat</Label>
              <p className="font-medium">
                {equipment.purchasePrice 
                  ? `${equipment.purchasePrice.toLocaleString('fr-FR')} €` 
                  : 'Non renseigné'}
              </p>
            </div>
            
            <div>
              <Label className="text-xs text-muted-foreground">Loyer mensuel</Label>
              <p className="font-medium">
                {equipment.monthlyRent 
                  ? `${equipment.monthlyRent.toLocaleString('fr-FR')} €` 
                  : 'Non renseigné'}
              </p>
            </div>
          </div>
        )}
      </div>
      
      {!isEditing && (
        <div className="bg-gray-50 p-3 border-t">
          <div className="text-xs text-gray-500">
            <p>Dernière mise à jour: 23/05/2023</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentDetail;
