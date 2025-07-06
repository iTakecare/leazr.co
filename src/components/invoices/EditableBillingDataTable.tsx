import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit3, Save, X, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface EditableBillingDataTableProps {
  billingData: any;
  invoiceId: string;
  onUpdate: (updatedData: any) => void;
}

const EditableBillingDataTable: React.FC<EditableBillingDataTableProps> = ({
  billingData,
  invoiceId,  
  onUpdate
}) => {
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState(billingData);
  const [showRawJson, setShowRawJson] = useState(false);

  const handleSave = async () => {
    try {
      // Recalculate totals before saving
      const updatedData = { ...editedData };
      if (updatedData.equipment_data && Array.isArray(updatedData.equipment_data)) {
        const totalExclVat = updatedData.equipment_data.reduce((sum: number, item: any) => {
          return sum + (item.selling_price_excl_vat * item.quantity);
        }, 0);
        
        updatedData.invoice_totals = {
          total_excl_vat: totalExclVat,
          vat_amount: totalExclVat * 0.21,
          total_incl_vat: totalExclVat * 1.21
        };
      }
      
      onUpdate(updatedData);
      setEditMode(false);
      toast.success('Données de facturation mises à jour');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleCancel = () => {
    setEditedData(billingData);
    setEditMode(false);
  };

  const updateField = (path: string, value: string | number) => {
    const pathArray = path.split('.');
    const newData = { ...editedData };
    let current = newData;
    
    for (let i = 0; i < pathArray.length - 1; i++) {
      if (!current[pathArray[i]]) {
        current[pathArray[i]] = {};
      }
      current = current[pathArray[i]];
    }
    
    current[pathArray[pathArray.length - 1]] = value;
    setEditedData(newData);
  };

  const updateEquipmentField = (index: number, field: string, value: string | number) => {
    const newData = { ...editedData };
    if (!newData.equipment_data) newData.equipment_data = [];
    if (!newData.equipment_data[index]) newData.equipment_data[index] = {};
    
    // Special handling for serial numbers to maintain JSON array format
    if (field === 'serial_number') {
      newData.equipment_data[index][field] = setSerialNumberValue(value as string);
    } else {
      newData.equipment_data[index][field] = value;
    }
    
    setEditedData(newData);
  };

  const addEquipmentLine = () => {
    const newData = { ...editedData };
    if (!newData.equipment_data) newData.equipment_data = [];
    
    newData.equipment_data.push({
      title: '',
      selling_price_excl_vat: 0,
      quantity: 1,
      margin: 0,
      purchase_price: 0
    });
    
    setEditedData(newData);
  };

  const removeEquipmentLine = (index: number) => {
    const newData = { ...editedData };
    if (newData.equipment_data && newData.equipment_data.length > 1) {
      newData.equipment_data.splice(index, 1);
      setEditedData(newData);
    }
  };

  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((o, key) => o?.[key], obj) || '';
  };

  // Utility functions for serial number formatting
  const getSerialNumberDisplay = (serialNumber: any) => {
    console.log('🔍 getSerialNumberDisplay input:', serialNumber, 'type:', typeof serialNumber);
    
    if (!serialNumber) return '';
    
    // Handle stringified JSON array
    if (typeof serialNumber === 'string' && serialNumber.startsWith('[')) {
      try {
        const parsed = JSON.parse(serialNumber);
        console.log('📋 Parsed serial number:', parsed);
        if (Array.isArray(parsed)) {
          return parsed.length > 0 ? parsed.join(', ') : '';
        }
      } catch (e) {
        console.log('❌ Failed to parse serial number JSON:', e);
      }
    }
    
    if (Array.isArray(serialNumber)) {
      console.log('📋 Array serial number:', serialNumber);
      return serialNumber.length > 0 ? serialNumber.join(', ') : '';
    }
    
    const result = serialNumber.toString();
    console.log('📋 Final display result:', result);
    return result;
  };

  const setSerialNumberValue = (value: string) => {
    if (!value || value.trim() === '') return [];
    return [value.trim()];
  };

  const renderEditableField = (label: string, path: string, type: 'text' | 'number' | 'email' = 'text') => {
    const value = getNestedValue(editedData, path);
    
    return (
      <TableRow key={path}>
        <TableCell className="font-medium w-1/3">{label}</TableCell>
        <TableCell>
          {editMode ? (
            <Input
              type={type}
              value={value}
              onChange={(e) => updateField(path, type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
              className="w-full"
            />
          ) : (
            <span>{value || 'Non renseigné'}</span>
          )}
        </TableCell>
      </TableRow>
    );
  };

  if (showRawJson) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Données de facturation (JSON brut)</CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowRawJson(false)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Vue tableau
          </Button>
        </CardHeader>
        <CardContent>
          <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto">
            {JSON.stringify(billingData, null, 2)}
          </pre>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Données de facturation</CardTitle>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowRawJson(true)}
          >
            <EyeOff className="h-4 w-4 mr-2" />
            Voir JSON
          </Button>
          
          {!editMode ? (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setEditMode(true)}
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleCancel}
              >
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
              <Button 
                size="sm"
                onClick={handleSave}
              >
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Informations du bailleur */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Informations du bailleur</h3>
            <Table>
              <TableBody>
                {renderEditableField('Nom du bailleur', 'leaser_data.name')}
                {renderEditableField('Adresse', 'leaser_data.address')}
                {renderEditableField('Ville', 'leaser_data.city')}
                {renderEditableField('Code postal', 'leaser_data.postal_code')}
                {renderEditableField('Pays', 'leaser_data.country')}
                {renderEditableField('Email', 'leaser_data.email', 'email')}
                {renderEditableField('Téléphone', 'leaser_data.phone')}
                {renderEditableField('Numéro TVA', 'leaser_data.vat_number')}
              </TableBody>
            </Table>
          </div>

          {/* Informations du contrat et de l'offre */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Informations du contrat et de l'offre</h3>
            <Table>
              <TableBody>
                {renderEditableField('Numéro de contrat', 'contract_data.id')}
                {renderEditableField('Numéro d\'offre', 'contract_data.offer_id')}
                {renderEditableField('Date de création', 'contract_data.created_at')}
                {renderEditableField('Statut du contrat', 'contract_data.status')}
                {renderEditableField('Nom du client', 'contract_data.client_name')}
                {renderEditableField('Email du client', 'contract_data.client_email', 'email')}
              </TableBody>
            </Table>
          </div>

          {/* Équipements - Lignes de commande */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Lignes de commande</h3>
              {editMode && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={addEquipmentLine}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une ligne
                </Button>
              )}
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Numéro de série</TableHead>
                  <TableHead className="text-right">Prix unitaire HT</TableHead>
                  <TableHead className="text-center">Quantité</TableHead>
                  <TableHead className="text-right">Total HT</TableHead>
                  {editMode && <TableHead className="w-[50px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {editedData.equipment_data && Array.isArray(editedData.equipment_data) ? 
                  editedData.equipment_data.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>
                        {editMode ? (
                          <Input
                            value={item.title || ''}
                            onChange={(e) => updateEquipmentField(index, 'title', e.target.value)}
                            className="w-full"
                          />
                        ) : (
                          item.title || 'Non renseigné'
                        )}
                      </TableCell>
                      <TableCell>
                        {editMode ? (
                          <Input
                            value={getSerialNumberDisplay(item.serial_number)}
                            onChange={(e) => updateEquipmentField(index, 'serial_number', e.target.value)}
                            className="w-full"
                            placeholder="Numéro de série"
                          />
                        ) : (
                          getSerialNumberDisplay(item.serial_number) || 'Non renseigné'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editMode ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={item.selling_price_excl_vat || 0}
                            onChange={(e) => updateEquipmentField(index, 'selling_price_excl_vat', parseFloat(e.target.value) || 0)}
                            className="w-24 text-right"
                          />
                        ) : (
                          `${(item.selling_price_excl_vat || 0).toFixed(2)} €`
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {editMode ? (
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity || 1}
                            onChange={(e) => updateEquipmentField(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-20 text-center"
                          />
                        ) : (
                          item.quantity || 1
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {((item.selling_price_excl_vat || 0) * (item.quantity || 1)).toFixed(2)} €
                      </TableCell>
                      {editMode && (
                        <TableCell>
                          {editedData.equipment_data.length > 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeEquipmentLine(index)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={editMode ? 6 : 5} className="text-center text-muted-foreground">
                        Aucun équipement trouvé
                      </TableCell>
                    </TableRow>
                  )
                }
                
                {/* Totaux */}
                {editedData.equipment_data && Array.isArray(editedData.equipment_data) && editedData.equipment_data.length > 0 && (
                  <>
                    <TableRow>
                      <TableCell colSpan={editMode ? 5 : 4} className="text-right font-medium">
                        Total HT:
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {editedData.equipment_data.reduce((sum: number, item: any) => 
                          sum + ((item.selling_price_excl_vat || 0) * (item.quantity || 1)), 0
                        ).toFixed(2)} €
                      </TableCell>
                      {editMode && <TableCell></TableCell>}
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={editMode ? 5 : 4} className="text-right font-medium">
                        TVA (21%):
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {(editedData.equipment_data.reduce((sum: number, item: any) => 
                          sum + ((item.selling_price_excl_vat || 0) * (item.quantity || 1)), 0
                        ) * 0.21).toFixed(2)} €
                      </TableCell>
                      {editMode && <TableCell></TableCell>}
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={editMode ? 5 : 4} className="text-right font-bold">
                        Total TTC:
                      </TableCell>
                      <TableCell className="text-right font-bold text-lg">
                        {(editedData.equipment_data.reduce((sum: number, item: any) => 
                          sum + ((item.selling_price_excl_vat || 0) * (item.quantity || 1)), 0
                        ) * 1.21).toFixed(2)} €
                      </TableCell>
                      {editMode && <TableCell></TableCell>}
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EditableBillingDataTable;