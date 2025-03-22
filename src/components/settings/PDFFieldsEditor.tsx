
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Copy, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { PDFField, PDFTemplate } from '@/types/pdf';

interface PDFFieldsEditorProps {
  fields: PDFField[];
  onChange: (fields: PDFField[]) => void;
  activePage: number;
  onPageChange: (page: number) => void;
  template: PDFTemplate;
  onDeleteField: (fieldId: string) => void;
  onAddField: (field: PDFField) => void;
  onDuplicateField: (fieldId: string, targetPage: number) => void;
  onRemoveFieldFromPage: (fieldId: string, page: number) => void;
}

const PDFFieldsEditor = ({
  fields,
  onChange,
  activePage,
  onPageChange,
  template,
  onDeleteField,
  onAddField,
  onDuplicateField,
  onRemoveFieldFromPage
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
  
  // Get all available pages from template images
  const getAvailablePages = () => {
    if (!template.templateImages || template.templateImages.length === 0) return [0];
    const pageNumbers = template.templateImages.map(img => img.page);
    return [...new Set(pageNumbers)].sort((a, b) => a - b);
  };
  
  const pages = getAvailablePages();
  
  // Filters fields by category and page
  const getFieldsByCategory = (category: string, page: number | null = null) => {
    return fields.filter(field => 
      field.category === category && 
      (page === null || field.page === page || field.page === null)
    );
  };
  
  // Gets fields visible on the current page
  const getFieldsOnPage = (page: number) => {
    return fields.filter(field => field.page === page || field.page === null);
  };
  
  // Gets fields for the current page by category
  const getCurrentPageFieldsByCategory = (category: string) => {
    return fields.filter(field => 
      field.category === category && 
      (field.page === activePage || field.page === null)
    );
  };
  
  // Get fields not assigned to the current page
  const getAvailableFieldsForCurrentPage = (category: string) => {
    return fields.filter(field => 
      field.category === category && 
      field.page !== activePage && 
      !fields.some(f => f.id === field.id && f.page === activePage)
    );
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
  
  // Handle field position change
  const handlePositionChange = (fieldId: string, axis: 'x' | 'y', value: number) => {
    const updatedFields = fields.map(field => {
      if (field.id === fieldId) {
        return { 
          ...field, 
          position: { 
            ...field.position, 
            [axis]: value 
          } 
        };
      }
      return field;
    });
    onChange(updatedFields);
  };
  
  // Handle field style change
  const handleStyleChange = (fieldId: string, property: string, value: any) => {
    const updatedFields = fields.map(field => {
      if (field.id === fieldId) {
        return { 
          ...field, 
          style: { 
            ...field.style, 
            [property]: value 
          } 
        };
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
      page: activePage,
      position: newField.position || { x: 20, y: 20 },
      style: newField.style || {
        fontSize: 10,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none'
      }
    };
    
    onAddField(fieldToAdd);
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
  
  // Add all fields of current category to the page
  const handleAddAllToPage = () => {
    const availableFields = getAvailableFieldsForCurrentPage(currentTab);
    
    if (availableFields.length === 0) return;
    
    const newFields = [];
    
    for (const field of availableFields) {
      // Create a copy of the field for the current page
      const newField = {
        ...field,
        id: `${field.id}_page${activePage}`,
        page: activePage
      };
      
      newFields.push(newField);
    }
    
    onChange([...fields, ...newFields]);
  };
  
  // Render field list for the current page and category
  const renderCurrentPageFields = () => {
    const fieldsOnPage = getCurrentPageFieldsByCategory(currentTab);
    
    if (fieldsOnPage.length === 0) {
      return (
        <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-md">
          Aucun champ {currentTab} sur la page {activePage + 1}
        </div>
      );
    }
    
    return (
      <div className="space-y-3">
        {fieldsOnPage.map(field => (
          <div key={field.id} className="flex flex-col p-3 border rounded-md bg-white">
            <div className="flex justify-between items-center mb-2">
              <div className="font-medium">{field.label}</div>
              <div className="flex space-x-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleToggleVisibility(field.id)}
                  className={field.isVisible ? "text-primary" : "text-gray-400"}
                >
                  {field.isVisible ? "Visible" : "Masqué"}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onRemoveFieldFromPage(field.id, activePage)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <Label className="text-xs">Position X</Label>
                <div className="flex items-center">
                  <Input 
                    type="number"
                    value={field.position?.x || 0}
                    onChange={(e) => handlePositionChange(field.id, 'x', Number(e.target.value))}
                    className="w-full"
                  />
                  <span className="ml-1 text-xs">px</span>
                </div>
              </div>
              <div>
                <Label className="text-xs">Position Y</Label>
                <div className="flex items-center">
                  <Input 
                    type="number"
                    value={field.position?.y || 0}
                    onChange={(e) => handlePositionChange(field.id, 'y', Number(e.target.value))}
                    className="w-full"
                  />
                  <span className="ml-1 text-xs">px</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <Label className="text-xs">Taille de police</Label>
                <div className="flex items-center">
                  <Input 
                    type="number"
                    value={field.style?.fontSize || 10}
                    onChange={(e) => handleStyleChange(field.id, 'fontSize', Number(e.target.value))}
                    className="w-full"
                  />
                  <span className="ml-1 text-xs">px</span>
                </div>
              </div>
              <div>
                <Label className="text-xs">Style</Label>
                <select 
                  value={field.style?.fontWeight || 'normal'}
                  onChange={(e) => handleStyleChange(field.id, 'fontWeight', e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="normal">Normal</option>
                  <option value="bold">Gras</option>
                </select>
              </div>
            </div>
            
            <div className="mt-2">
              <Label className="text-xs">Valeur</Label>
              <Input 
                value={field.value}
                onChange={(e) => {
                  const updatedFields = fields.map(f => {
                    if (f.id === field.id) {
                      return { ...f, value: e.target.value };
                    }
                    return f;
                  });
                  onChange(updatedFields);
                }}
                className="w-full"
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
  
  // Render other available fields
  const renderAvailableFields = () => {
    const availableFields = getAvailableFieldsForCurrentPage(currentTab);
    
    if (availableFields.length === 0) {
      return (
        <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-md">
          Aucun autre champ disponible
        </div>
      );
    }
    
    return (
      <div className="space-y-2">
        {availableFields.map(field => (
          <div key={field.id} className="flex justify-between items-center p-2 border rounded-md bg-white">
            <div>
              <span className="font-medium">{field.label}</span>
              <span className="text-xs text-gray-500 ml-2">
                {field.page !== null ? `Page ${field.page + 1}` : 'Global'}
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onDuplicateField(field.id, activePage)}
            >
              <Copy className="h-4 w-4 mr-1" />
              Ajouter à la page
            </Button>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>Configuration des champs</CardTitle>
          <div className="flex space-x-2">
            <select
              value={activePage}
              onChange={(e) => onPageChange(Number(e.target.value))}
              className="px-2 py-1 border rounded-md text-sm"
            >
              {pages.map((page) => (
                <option key={page} value={page}>
                  Page {page + 1}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddFieldForm(!showAddFieldForm)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Ajouter un champ
            </Button>
          </div>
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
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">
                  Champs sur la page {activePage + 1}
                </h3>
                {renderCurrentPageFields()}
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-medium text-gray-500">
                    Autres champs disponibles
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddAllToPage}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter tous à la page
                  </Button>
                </div>
                {renderAvailableFields()}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default PDFFieldsEditor;
