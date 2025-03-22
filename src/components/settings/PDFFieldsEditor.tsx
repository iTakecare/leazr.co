
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { PDFField } from '@/types/pdf';

interface PDFFieldsEditorProps {
  fields: PDFField[];
  onChange: (fields: PDFField[]) => void;
  activePage: number;
  onPageChange: (page: number) => void;
  onDeleteField: (fieldId: string) => void;
  onAddField: (field: PDFField) => void;
  selectedFieldId: string | null;
  onSelectField: (fieldId: string | null) => void;
}

const PDFFieldsEditor = ({
  fields,
  onChange,
  activePage,
  onPageChange,
  onDeleteField,
  onAddField,
  selectedFieldId,
  onSelectField
}: PDFFieldsEditorProps) => {
  const [currentTab, setCurrentTab] = useState('client');
  const [showAddFieldForm, setShowAddFieldForm] = useState(false);
  const [newField, setNewField] = useState<Partial<PDFField>>({
    id: '',
    label: '',
    type: 'text',
    category: 'client',
    isVisible: false,
    value: '',
    page: null,
    position: { x: 20, y: 20 },
    style: {
      fontSize: 10,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none'
    }
  });
  
  // Filters fields by category
  const getFieldsByCategory = (category: string) => {
    return fields.filter(field => field.category === category);
  };
  
  // Handle field visibility toggle
  const handleToggleVisibility = (fieldId: string) => {
    const updatedFields = fields.map(field => {
      if (field.id === fieldId) {
        return { ...field, isVisible: !field.isVisible };
      }
      return field;
    });
    onChange(updatedFields);
  };
  
  // Handle field value change
  const handleValueChange = (fieldId: string, value: string) => {
    const updatedFields = fields.map(field => {
      if (field.id === fieldId) {
        return { ...field, value };
      }
      return field;
    });
    onChange(updatedFields);
  };
  
  // Handle add new field
  const handleAddField = () => {
    if (!newField.id || !newField.label) return;
    
    // Generate a unique ID if needed
    const fieldId = newField.id || `field_${Date.now()}`;
    
    const fieldToAdd: PDFField = {
      id: fieldId,
      label: newField.label || 'Nouveau champ',
      type: newField.type || 'text',
      category: newField.category || 'client',
      isVisible: false,
      value: newField.value || '',
      page: null,
      position: newField.position || { x: 20, y: 20 },
      style: newField.style || {
        fontSize: 10,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none'
      }
    };
    
    onAddField(fieldToAdd);
    onSelectField(fieldId);
    
    setNewField({
      id: '',
      label: '',
      type: 'text',
      category: 'client',
      isVisible: false,
      value: '',
      page: null,
      position: { x: 20, y: 20 },
      style: {
        fontSize: 10,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none'
      }
    });
    setShowAddFieldForm(false);
  };
  
  // Render field list for the current category
  const renderFieldList = () => {
    const categoryFields = getFieldsByCategory(currentTab);
    
    if (categoryFields.length === 0) {
      return (
        <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-md">
          Aucun champ {currentTab} disponible
        </div>
      );
    }
    
    return (
      <div className="space-y-3">
        {categoryFields.map(field => (
          <div 
            key={field.id} 
            className={`flex flex-col p-3 border rounded-md ${selectedFieldId === field.id ? 'bg-blue-50 border-blue-300' : 'bg-white'}`}
            onClick={() => onSelectField(field.id)}
          >
            <div className="flex justify-between items-center mb-2">
              <div className="font-medium">
                {field.label}
                {field.page !== null && <span className="ml-2 text-xs text-gray-500">Page {field.page + 1}</span>}
                {!field.isVisible && <span className="ml-2 text-gray-400 text-xs">(masqué)</span>}
              </div>
              <div className="flex space-x-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleVisibility(field.id);
                  }}
                  className={field.isVisible ? "text-primary" : "text-gray-400"}
                >
                  {field.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteField(field.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="mt-2">
              <Label className="text-xs">Valeur</Label>
              <Input 
                value={field.value}
                onChange={(e) => handleValueChange(field.id, e.target.value)}
                className="w-full"
                onClick={(e) => e.stopPropagation()}
              />
              <p className="text-xs text-gray-500 mt-1">
                Utilisez {'{nom_variable}'} pour les variables dynamiques
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>Liste des champs</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddFieldForm(!showAddFieldForm)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Ajouter un champ
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {showAddFieldForm && (
          <div className="mb-6 p-4 border rounded-md">
            <h3 className="text-sm font-medium mb-3">Nouveau champ</h3>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <Label>ID</Label>
                <Input
                  value={newField.id || ''}
                  onChange={(e) => setNewField({ ...newField, id: e.target.value })}
                  placeholder="ID unique du champ"
                />
              </div>
              <div>
                <Label>Libellé</Label>
                <Input
                  value={newField.label || ''}
                  onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                  placeholder="Nom affiché"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <Label>Type</Label>
                <select
                  value={newField.type || 'text'}
                  onChange={(e) => setNewField({ ...newField, type: e.target.value })}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="text">Texte</option>
                  <option value="date">Date</option>
                  <option value="currency">Monétaire</option>
                  <option value="email">Email</option>
                  <option value="number">Nombre</option>
                  <option value="table">Tableau</option>
                </select>
              </div>
              <div>
                <Label>Catégorie</Label>
                <select
                  value={newField.category || 'client'}
                  onChange={(e) => setNewField({ ...newField, category: e.target.value as any })}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="client">Client</option>
                  <option value="offer">Offre</option>
                  <option value="equipment">Équipement</option>
                  <option value="user">Vendeur</option>
                  <option value="general">Général</option>
                </select>
              </div>
            </div>
            
            <div className="mb-3">
              <Label>Valeur</Label>
              <Input
                value={newField.value || ''}
                onChange={(e) => setNewField({ ...newField, value: e.target.value })}
                placeholder="{variable} ou texte statique"
              />
              <p className="text-xs text-gray-500 mt-1">
                Utilisez {'{nom_variable}'} pour les variables dynamiques
              </p>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAddFieldForm(false)}>
                Annuler
              </Button>
              <Button onClick={handleAddField}>Ajouter</Button>
            </div>
          </div>
        )}
        
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="mb-4 grid grid-cols-5 w-full">
            <TabsTrigger value="client">Client</TabsTrigger>
            <TabsTrigger value="offer">Offre</TabsTrigger>
            <TabsTrigger value="equipment">Équipement</TabsTrigger>
            <TabsTrigger value="user">Vendeur</TabsTrigger>
            <TabsTrigger value="general">Général</TabsTrigger>
          </TabsList>
          
          {['client', 'offer', 'equipment', 'user', 'general'].map(category => (
            <TabsContent key={category} value={category} className="space-y-4">
              {renderFieldList()}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default PDFFieldsEditor;
