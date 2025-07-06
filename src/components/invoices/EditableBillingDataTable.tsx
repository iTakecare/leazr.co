import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit3, Save, X, Eye, EyeOff } from 'lucide-react';
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
      // Update the billing data
      onUpdate(editedData);
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

  const updateField = (path: string, value: string) => {
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

  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((o, key) => o?.[key], obj) || '';
  };

  const renderEditableField = (label: string, path: string, type: 'text' | 'number' | 'email' = 'text') => {
    const value = getNestedValue(editedData, path);
    
    return (
      <TableRow key={path}>
        <TableCell className="font-medium">{label}</TableCell>
        <TableCell>
          {editMode ? (
            <Input
              type={type}
              value={value}
              onChange={(e) => updateField(path, e.target.value)}
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
                {renderEditableField('Nom du bailleur', 'leaser.name')}
                {renderEditableField('Adresse', 'leaser.address')}
                {renderEditableField('Ville', 'leaser.city')}
                {renderEditableField('Code postal', 'leaser.postal_code')}
                {renderEditableField('Pays', 'leaser.country')}
                {renderEditableField('Email', 'leaser.email', 'email')}
                {renderEditableField('Téléphone', 'leaser.phone')}
                {renderEditableField('Numéro TVA', 'leaser.vat_number')}
              </TableBody>
            </Table>
          </div>

          {/* Informations du client */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Informations du client</h3>
            <Table>
              <TableBody>
                {renderEditableField('Nom du client', 'client.name')}
                {renderEditableField('Entreprise', 'client.company')}
                {renderEditableField('Adresse', 'client.address')}
                {renderEditableField('Ville', 'client.city')}
                {renderEditableField('Code postal', 'client.postal_code')}
                {renderEditableField('Pays', 'client.country')}
                {renderEditableField('Email', 'client.email', 'email')}
                {renderEditableField('Téléphone', 'client.phone')}
                {renderEditableField('Numéro TVA', 'client.vat_number')}
              </TableBody>
            </Table>
          </div>

          {/* Détails du contrat */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Détails du contrat</h3>
            <Table>
              <TableBody>
                {renderEditableField('Numéro de contrat', 'contract.number')}
                {renderEditableField('Date de début', 'contract.start_date')}
                {renderEditableField('Date de fin', 'contract.end_date')}
                {renderEditableField('Durée (mois)', 'contract.duration', 'number')}
                {renderEditableField('Mensualité', 'contract.monthly_payment', 'number')}
                {renderEditableField('Montant total', 'contract.total_amount', 'number')}
              </TableBody>
            </Table>
          </div>

          {/* Équipement */}
          {editedData.equipment && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Équipement</h3>
              <Table>
                <TableBody>
                  {renderEditableField('Description', 'equipment.description')}
                  {renderEditableField('Marque', 'equipment.brand')}
                  {renderEditableField('Modèle', 'equipment.model')}
                  {renderEditableField('Numéro de série', 'equipment.serial_number')}
                  {renderEditableField('Prix d\'achat', 'equipment.purchase_price', 'number')}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EditableBillingDataTable;