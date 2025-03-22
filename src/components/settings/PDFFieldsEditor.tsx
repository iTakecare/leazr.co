
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Eye, EyeOff, List, Bold, Italic, Search } from 'lucide-react';
import { PDFField } from '@/types/pdf';
import { Badge } from '@/components/ui/badge';

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
  const [searchTerm, setSearchTerm] = useState('');
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
  
  // Filters fields by category and search term
  const getFilteredFields = (category: string) => {
    let filtered = fields.filter(field => field.category === category);
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(field => 
        field.label.toLowerCase().includes(term) || 
        field.id.toLowerCase().includes(term) ||
        field.value.toLowerCase().includes(term)
      );
    }
    
    return filtered;
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

  // Handle field style change
  const handleStyleChange = (fieldId: string, styleProperty: string, value: any) => {
    const updatedFields = fields.map(field => {
      if (field.id === fieldId) {
        const currentStyle = field.style || {
          fontSize: 10,
          fontWeight: 'normal',
          fontStyle: 'normal',
          textDecoration: 'none'
        };
        
        return {
          ...field,
          style: {
            ...currentStyle,
            [styleProperty]: value
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
    
    // Reset form
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
  
  // Get category label in French
  const getCategoryLabel = (category: string) => {
    switch(category) {
      case 'client': return 'Client';
      case 'offer': return 'Offre';
      case 'equipment': return 'Équipement';
      case 'user': return 'Vendeur';
      case 'general': return 'Général';
      default: return category;
    }
  };
  
  // Render field list for the current category
  const renderFieldList = () => {
    const categoryFields = getFilteredFields(currentTab);
    
    if (categoryFields.length === 0) {
      return (
        <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-md">
          {searchTerm 
            ? `Aucun champ ne correspond à "${searchTerm}"` 
            : `Aucun champ ${getCategoryLabel(currentTab).toLowerCase()} disponible`}
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
              <div className="font-medium flex items-center">
                {field.label}
                {field.page !== null && 
                  <Badge variant="outline" className="ml-2 text-xs">
                    Page {field.page + 1}
                  </Badge>
                }
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
            
            {selectedFieldId === field.id && (
              <div className="mt-3 border-t pt-3">
                <Label className="text-xs mb-2 block">Style de texte</Label>
                <div className="flex flex-wrap gap-2">
                  <div className="flex-1 min-w-[120px]">
                    <Label className="text-xs">Taille</Label>
                    <div className="flex items-center">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          const fontSize = Math.max(6, ((field.style?.fontSize || 10) - 1));
                          handleStyleChange(field.id, 'fontSize', fontSize);
                        }}
                      >
                        -
                      </Button>
                      <Input 
                        type="number" 
                        value={field.style?.fontSize || 10}
                        className="h-7 mx-1 text-center"
                        min={6}
                        max={36}
                        onChange={(e) => {
                          const fontSize = Math.max(6, Math.min(36, Number(e.target.value)));
                          handleStyleChange(field.id, 'fontSize', fontSize);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStyleChange(field.id, 'fontSize', (field.style?.fontSize || 10) + 1);
                        }}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex-1 flex justify-end items-end space-x-1">
                    <Button
                      size="sm"
                      variant={(field.style?.fontWeight === 'bold') ? "default" : "outline"}
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStyleChange(
                          field.id, 
                          'fontWeight', 
                          field.style?.fontWeight === 'bold' ? 'normal' : 'bold'
                        );
                      }}
                    >
                      <Bold className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant={(field.style?.fontStyle === 'italic') ? "default" : "outline"}
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStyleChange(
                          field.id, 
                          'fontStyle', 
                          field.style?.fontStyle === 'italic' ? 'normal' : 'italic'
                        );
                      }}
                    >
                      <Italic className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant={(field.style?.textDecoration === 'underline') ? "default" : "outline"}
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStyleChange(
                          field.id, 
                          'textDecoration', 
                          field.style?.textDecoration === 'underline' ? 'none' : 'underline'
                        );
                      }}
                    >
                      <u>U</u>
                    </Button>
                  </div>
                </div>
              </div>
            )}
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
          <div className="flex space-x-2">
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
        
        <div className="mb-4 relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Rechercher un champ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="mb-4 grid grid-cols-5 w-full">
            <TabsTrigger value="client">Client</TabsTrigger>
            <TabsTrigger value="offer">Offre</TabsTrigger>
            <TabsTrigger value="equipment">Équip.</TabsTrigger>
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
