
import React, { useState } from 'react';
import { Equipment } from '@/types/equipment';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Laptop as LaptopIcon, FileText, Calendar, User, Tag, MapPin, BadgeEuro, Truck } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

interface EquipmentDetailProps {
  equipment: Equipment | null;
  onSave: (equipment: Equipment) => Promise<boolean>;
}

const EquipmentDetail: React.FC<EquipmentDetailProps> = ({ equipment, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedEquipment, setEditedEquipment] = useState<Equipment | null>(equipment);

  if (!equipment) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-center text-gray-500">
          Sélectionnez un équipement pour voir les détails
        </p>
      </div>
    );
  }

  const handleEdit = () => {
    setIsEditing(true);
    setEditedEquipment({...equipment});
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedEquipment(equipment);
  };

  const handleSave = async () => {
    if (!editedEquipment) return;
    
    const success = await onSave(editedEquipment);
    if (success) {
      setIsEditing(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!editedEquipment) return;
    
    const { name, value } = e.target;
    setEditedEquipment(prev => prev ? ({...prev, [name]: value}) : null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">{equipment.title}</h2>
        {!isEditing ? (
          <Button onClick={handleEdit}>Modifier</Button>
        ) : (
          <div className="space-x-2">
            <Button variant="outline" onClick={handleCancel}>Annuler</Button>
            <Button onClick={handleSave}>Enregistrer</Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="details" className="flex-1">
        <TabsList>
          <TabsTrigger value="details">Détails</TabsTrigger>
          <TabsTrigger value="financial">Financier</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Informations générales</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <select 
                      name="type"
                      value={editedEquipment?.type || ""}
                      onChange={handleChange}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="Ordinateur portable">Ordinateur portable</option>
                      <option value="Ordinateur fixe">Ordinateur fixe</option>
                      <option value="Smartphone">Smartphone</option>
                      <option value="Tablette">Tablette</option>
                      <option value="Accessoire">Accessoire</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Statut</label>
                    <select 
                      name="status"
                      value={editedEquipment?.status || ""}
                      onChange={handleChange}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="En service">En service</option>
                      <option value="En réserve">En réserve</option>
                      <option value="Remplacement">Remplacement</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">N° de série</label>
                    <input 
                      type="text" 
                      name="serial"
                      value={editedEquipment?.serial || ""}
                      onChange={handleChange}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fournisseur</label>
                    <input 
                      type="text" 
                      name="supplier"
                      value={editedEquipment?.supplier || ""}
                      onChange={handleChange}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Emplacement</label>
                    <select 
                      name="location"
                      value={editedEquipment?.location || ""}
                      onChange={handleChange}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="Bureau">Bureau</option>
                      <option value="Télétravail">Télétravail</option>
                      <option value="Client">Client</option>
                      <option value="Stock">Stock</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4">
                  <div className="flex items-center">
                    <LaptopIcon className="mr-3 h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Type</p>
                      <p className="font-medium">{equipment.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Tag className="mr-3 h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Statut</p>
                      <p className="font-medium">{equipment.status}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <FileText className="mr-3 h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">N° de série</p>
                      <p className="font-medium">{equipment.serial}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Truck className="mr-3 h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Fournisseur</p>
                      <p className="font-medium">{equipment.supplier}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="mr-3 h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Emplacement</p>
                      <p className="font-medium">{equipment.location}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Attribution</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Attribué à</label>
                    <input 
                      type="text" 
                      name="assignedTo"
                      value={editedEquipment?.assignedTo || ""}
                      onChange={handleChange}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date d'attribution</label>
                    <input 
                      type="text" 
                      name="assignedDate"
                      value={editedEquipment?.assignedDate || ""}
                      onChange={handleChange}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4">
                  {equipment.assignedTo ? (
                    <>
                      <div className="flex items-center">
                        <User className="mr-3 h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Attribué à</p>
                          <p className="font-medium">{equipment.assignedTo}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="mr-3 h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Date d'attribution</p>
                          <p className="font-medium">{equipment.assignedDate}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-500">Non attribué</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Informations financières</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Prix d'achat</label>
                    <input 
                      type="number" 
                      name="purchasePrice"
                      value={editedEquipment?.purchasePrice || 0}
                      onChange={handleChange}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Loyer mensuel</label>
                    <input 
                      type="number" 
                      name="monthlyRent"
                      value={editedEquipment?.monthlyRent || 0}
                      onChange={handleChange}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Quantité</label>
                    <input 
                      type="number" 
                      name="quantity"
                      value={editedEquipment?.quantity || 1}
                      onChange={handleChange}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Marge</label>
                    <input 
                      type="number" 
                      name="margin"
                      value={editedEquipment?.margin || 0}
                      onChange={handleChange}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4">
                  <div className="flex items-center">
                    <BadgeEuro className="mr-3 h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Prix d'achat</p>
                      <p className="font-medium">{formatCurrency(equipment.purchasePrice)}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="mr-3 h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Loyer mensuel</p>
                      <p className="font-medium">{formatCurrency(equipment.monthlyRent)}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Contrat</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Début de contrat</label>
                    <input 
                      type="text" 
                      name="contractStart"
                      value={editedEquipment?.contractStart || ""}
                      onChange={handleChange}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fin de contrat</label>
                    <input 
                      type="text" 
                      name="contractEnd"
                      value={editedEquipment?.contractEnd || ""}
                      onChange={handleChange}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4">
                  {equipment.contractStart ? (
                    <>
                      <div className="flex items-center">
                        <Calendar className="mr-3 h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Début de contrat</p>
                          <p className="font-medium">{equipment.contractStart}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="mr-3 h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Fin de contrat</p>
                          <p className="font-medium">{equipment.contractEnd}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-500">Information de contrat non disponible</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Historique des modifications</CardTitle>
              <CardDescription>Liste des actions effectuées sur cet équipement</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Aucun historique disponible</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EquipmentDetail;
