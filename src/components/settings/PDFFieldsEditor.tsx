
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ArrowRight, ArrowLeft, Edit, Trash2, Copy, X, MoveHorizontal, Eye, EyeOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { ColorPicker } from 'react-color-palette';
import 'react-color-palette/lib/css/styles.css';

// Le composant est similaire mais ajoute le support de readOnly
const PDFFieldsEditor = ({ 
  fields, 
  onChange, 
  activePage = 0, 
  onPageChange, 
  template,
  onDeleteField,
  onAddField,
  onDuplicateField,
  onRemoveFieldFromPage,
  readOnly = false 
}) => {
  const [templateFields, setTemplateFields] = useState(fields || []);
  const [selectedFieldIndex, setSelectedFieldIndex] = useState(-1);
  const [fieldCategory, setFieldCategory] = useState('all');
  const [activePageInternal, setActivePage] = useState(activePage);
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const [customField, setCustomField] = useState({
    id: '',
    label: '',
    type: 'text',
    category: 'general',
    value: ''
  });

  useEffect(() => {
    setTemplateFields(fields);
    setSelectedFieldIndex(-1);
  }, [fields]);

  useEffect(() => {
    setActivePage(activePage);
  }, [activePage]);

  const availableFields = fields.filter(field => {
    return fieldCategory === 'all' || field.category === fieldCategory;
  });

  const selectedField = selectedFieldIndex !== -1 ? templateFields[selectedFieldIndex] : null;

  const handleDragStart = (e, index) => {
    setIsDragging(true);
    setSelectedFieldIndex(index);
    const offsetX = e.clientX - e.target.getBoundingClientRect().left;
    const offsetY = e.clientY - e.target.getBoundingClientRect().top;
    setDragOffset({ x: offsetX, y: offsetY });
  };

  const handleDrag = (e) => {
    if (!isDragging || readOnly) return;

    e.preventDefault();

    const containerRect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - containerRect.left - dragOffset.x;
    const y = e.clientY - containerRect.top - dragOffset.y;

    handlePositionUpdate('x', x);
    handlePositionUpdate('y', y);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
  };

  const handlePositionUpdate = (axis, value) => {
    if (selectedFieldIndex === -1 || readOnly) return;
    
    const newFields = [...templateFields];
    newFields[selectedFieldIndex] = {
      ...newFields[selectedFieldIndex],
      position: {
        ...newFields[selectedFieldIndex].position,
        [axis]: value
      }
    };
    
    setTemplateFields(newFields);
    onChange(newFields);
  };
  
  const handleStyleUpdate = (styleKey, value) => {
    if (selectedFieldIndex === -1 || readOnly) return;
    
    const newFields = [...templateFields];
    
    newFields[selectedFieldIndex] = {
      ...newFields[selectedFieldIndex],
      style: {
        ...newFields[selectedFieldIndex].style,
        [styleKey]: value
      }
    };
    
    setTemplateFields(newFields);
    onChange(newFields);
  };
  
  const handleFieldUpdate = (key, value) => {
    if (selectedFieldIndex === -1 || readOnly) return;
    
    const newFields = [...templateFields];
    newFields[selectedFieldIndex] = {
      ...newFields[selectedFieldIndex],
      [key]: value
    };
    
    setTemplateFields(newFields);
    onChange(newFields);
  };
  
  const toggleFieldVisibility = (index) => {
    if (readOnly) return;
    
    const newFields = [...templateFields];
    newFields[index] = {
      ...newFields[index],
      isVisible: !newFields[index].isVisible
    };
    
    setTemplateFields(newFields);
    onChange(newFields);
  };
  
  const handleDuplicateFieldToPage = (fieldId) => {
    if (readOnly) return;
    
    onDuplicateField(fieldId, activePageInternal);
  };
  
  const handleRemoveFieldFromCurrentPage = (fieldId) => {
    if (readOnly) return;
    
    onRemoveFieldFromPage(fieldId, activePageInternal);
  };

  const handleAddFieldToCurrentPage = (field) => {
    if (readOnly) return;
    
    onAddField({
      ...field,
      position: { x: 20, y: 20 },
      page: activePageInternal
    });
  };

  const handleDeleteField = (fieldId) => {
    if (readOnly) return;
    
    onDeleteField(fieldId);
  };
  
  const handleAddCustomField = () => {
    if (readOnly) return;
    
    handleAddFieldToCurrentPage(customField);
    resetCustomField();
  };
  
  const resetCustomField = () => {
    setCustomField({
      id: '',
      label: '',
      type: 'text',
      category: 'general',
      value: ''
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Positionnement des champs</h3>
        <div className="flex space-x-2">
          <Button 
            onClick={() => {
              setActivePage(Math.max(0, activePageInternal - 1));
              if (onPageChange) onPageChange(Math.max(0, activePageInternal - 1));
            }}
            disabled={activePageInternal === 0 || !template?.templateImages || template.templateImages.length === 0}
            variant="outline"
            size="icon"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="py-2 px-3 bg-muted rounded-md text-sm font-medium">
            Page {activePageInternal + 1} / {template?.templateImages?.length || 1}
          </span>
          <Button 
            onClick={() => {
              setActivePage(Math.min((template?.templateImages?.length || 1) - 1, activePageInternal + 1));
              if (onPageChange) onPageChange(Math.min((template?.templateImages?.length || 1) - 1, activePageInternal + 1));
            }}
            disabled={
              !template?.templateImages || 
              template.templateImages.length === 0 || 
              activePageInternal >= template.templateImages.length - 1
            }
            variant="outline"
            size="icon"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Rest of the component with conditional rendering based on readOnly */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardContent 
              className="p-4 relative"
              onMouseMove={handleDrag}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
            >
              <div className="relative w-full min-h-[500px] bg-gray-50 border rounded-md overflow-hidden">
                {/* Background Image */}
                {template?.templateImages && template.templateImages[activePageInternal] && (
                  <img 
                    src={template.templateImages[activePageInternal].url} 
                    alt={`Template page ${activePageInternal + 1}`}
                    className="absolute top-0 left-0 w-full h-auto object-contain z-0"
                    onError={(e) => {
                      console.error("Error loading image:", e.currentTarget.src);
                      e.currentTarget.src = "/placeholder.svg";
                    }}
                  />
                )}
                
                {/* Fields */}
                {templateFields.map((field, index) => (
                  <div 
                    key={`${field.id}_${activePageInternal}`}
                    style={{
                      position: 'absolute',
                      left: `${field.position.x}mm`,
                      top: `${field.position.y}mm`,
                      zIndex: selectedFieldIndex === index ? 20 : 10,
                      cursor: !readOnly ? 'move' : 'default',
                      backgroundColor: selectedFieldIndex === index ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                      padding: '2px 4px',
                      border: selectedFieldIndex === index ? '1px solid #3b82f6' : '1px dashed #9ca3af',
                      borderRadius: '2px',
                      fontSize: `${field.style?.fontSize || 10}px`,
                      fontWeight: field.style?.fontWeight || 'normal',
                      fontStyle: field.style?.fontStyle || 'normal',
                      textDecoration: field.style?.textDecoration || 'none'
                    }}
                    className={`field-item ${!field.isVisible ? 'opacity-50' : ''}`}
                    onClick={() => !readOnly && setSelectedFieldIndex(index)}
                    onMouseDown={(e) => !readOnly && handleDragStart(e, index)}
                  >
                    {field.label || field.id}
                    {selectedFieldIndex === index && !readOnly && (
                      <div className="absolute top-0 right-0 transform translate-x-full -translate-y-1/2 flex space-x-1">
                        <Button size="icon" variant="outline" className="h-6 w-6 bg-white" onClick={() => toggleFieldVisibility(index)}>
                          {field.isVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                        <Button size="icon" variant="outline" className="h-6 w-6 bg-white" onClick={() => handleDuplicateFieldToPage(field.id)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="destructive" className="h-6 w-6" onClick={() => handleDeleteField(field.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* No template warning */}
                {(!template?.templateImages || !template.templateImages[activePageInternal]) && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center p-6">
                      <p className="text-lg font-medium text-gray-500 mb-2">Aucune image de modèle</p>
                      <p className="text-sm text-gray-400 mb-4">
                        Veuillez d'abord télécharger une image de modèle pour la page {activePageInternal + 1}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardContent className="p-4">
              <Tabs defaultValue="fields">
                <TabsList className="w-full mb-4">
                  <TabsTrigger value="fields">Champs disponibles</TabsTrigger>
                  <TabsTrigger value="edit" disabled={selectedFieldIndex === -1}>Éditer</TabsTrigger>
                </TabsList>
                
                <TabsContent value="fields">
                  <div className="space-y-4">
                    <div className="mb-2">
                      <Label htmlFor="field-category">Catégorie de champs</Label>
                      <Select defaultValue="all" onValueChange={setFieldCategory}>
                        <SelectTrigger id="field-category">
                          <SelectValue placeholder="Toutes les catégories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes les catégories</SelectItem>
                          <SelectItem value="client">Client</SelectItem>
                          <SelectItem value="offer">Offre</SelectItem>
                          <SelectItem value="equipment">Équipement</SelectItem>
                          <SelectItem value="user">Utilisateur</SelectItem>
                          <SelectItem value="general">Général</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                      {availableFields.map((field) => (
                        <div 
                          key={field.id} 
                          className="flex items-center justify-between p-2 border rounded-md hover:bg-gray-50"
                        >
                          <div>
                            <p className="text-sm font-medium">{field.label}</p>
                            <p className="text-xs text-gray-500">{field.value}</p>
                          </div>
                          {!readOnly && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleAddFieldToCurrentPage({
                                ...field,
                                position: { x: 20, y: 20 },
                                page: activePageInternal
                              })}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {!readOnly && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button className="w-full">
                            <Plus className="h-4 w-4 mr-2" />
                            Créer un champ personnalisé
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Ajouter un champ personnalisé</DialogTitle>
                            <DialogDescription>
                              Définissez les propriétés de votre champ personnalisé
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="custom-field-id">Identifiant</Label>
                                <Input 
                                  id="custom-field-id" 
                                  value={customField.id}
                                  onChange={(e) => setCustomField({...customField, id: e.target.value})}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="custom-field-label">Libellé</Label>
                                <Input 
                                  id="custom-field-label" 
                                  value={customField.label}
                                  onChange={(e) => setCustomField({...customField, label: e.target.value})}
                                />
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="custom-field-type">Type</Label>
                                <Select 
                                  value={customField.type}
                                  onValueChange={(value) => setCustomField({...customField, type: value})}
                                >
                                  <SelectTrigger id="custom-field-type">
                                    <SelectValue placeholder="Type de champ" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="text">Texte</SelectItem>
                                    <SelectItem value="date">Date</SelectItem>
                                    <SelectItem value="number">Nombre</SelectItem>
                                    <SelectItem value="currency">Monétaire</SelectItem>
                                    <SelectItem value="email">Email</SelectItem>
                                    <SelectItem value="table">Tableau</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="custom-field-category">Catégorie</Label>
                                <Select 
                                  value={customField.category}
                                  onValueChange={(value) => setCustomField({...customField, category: value})}
                                >
                                  <SelectTrigger id="custom-field-category">
                                    <SelectValue placeholder="Catégorie" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="client">Client</SelectItem>
                                    <SelectItem value="offer">Offre</SelectItem>
                                    <SelectItem value="equipment">Équipement</SelectItem>
                                    <SelectItem value="user">Utilisateur</SelectItem>
                                    <SelectItem value="general">Général</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="custom-field-value">Valeur</Label>
                              <Input 
                                id="custom-field-value" 
                                value={customField.value}
                                onChange={(e) => setCustomField({...customField, value: e.target.value})}
                                placeholder="ex: {client.name} ou Valeur fixe"
                              />
                              <p className="text-xs text-muted-foreground">
                                Utilisez des accolades pour des variables dynamiques, comme {"{client.name}"}
                              </p>
                            </div>
                          </div>
                          
                          <DialogFooter>
                            <Button variant="outline" onClick={() => resetCustomField()}>
                              Annuler
                            </Button>
                            <Button onClick={handleAddCustomField}>
                              Ajouter le champ
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="edit">
                  {selectedFieldIndex !== -1 && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-medium">
                          {selectedField?.label || selectedField?.id}
                        </h4>
                        {!readOnly && (
                          <Button 
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteField(selectedField?.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Supprimer
                          </Button>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="field-visible"
                            checked={selectedField?.isVisible}
                            onCheckedChange={(checked) => handleFieldUpdate('isVisible', checked)}
                            disabled={readOnly}
                          />
                          <Label htmlFor="field-visible">
                            Visible dans le PDF
                          </Label>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Position X (mm)</Label>
                        <div className="flex items-center space-x-2">
                          <Slider
                            value={[selectedField?.position.x || 0]}
                            min={0}
                            max={210}
                            step={1}
                            onValueChange={(values) => handlePositionUpdate('x', values[0])}
                            disabled={readOnly}
                          />
                          <Input
                            type="number"
                            value={selectedField?.position.x || 0}
                            onChange={(e) => handlePositionUpdate('x', Number(e.target.value))}
                            className="w-16"
                            disabled={readOnly}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Position Y (mm)</Label>
                        <div className="flex items-center space-x-2">
                          <Slider
                            value={[selectedField?.position.y || 0]}
                            min={0}
                            max={297}
                            step={1}
                            onValueChange={(values) => handlePositionUpdate('y', values[0])}
                            disabled={readOnly}
                          />
                          <Input
                            type="number"
                            value={selectedField?.position.y || 0}
                            onChange={(e) => handlePositionUpdate('y', Number(e.target.value))}
                            className="w-16"
                            disabled={readOnly}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Taille de police (pt)</Label>
                        <div className="flex items-center space-x-2">
                          <Slider
                            value={[selectedField?.style?.fontSize || 10]}
                            min={6}
                            max={24}
                            step={1}
                            onValueChange={(values) => handleStyleUpdate('fontSize', values[0])}
                            disabled={readOnly}
                          />
                          <Input
                            type="number"
                            value={selectedField?.style?.fontSize || 10}
                            onChange={(e) => handleStyleUpdate('fontSize', Number(e.target.value))}
                            className="w-16"
                            disabled={readOnly}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Style de police</Label>
                          <Select 
                            value={selectedField?.style?.fontWeight || 'normal'}
                            onValueChange={(value) => handleStyleUpdate('fontWeight', value)}
                            disabled={readOnly}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Poids" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="bold">Gras</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Style d'italique</Label>
                          <Select 
                            value={selectedField?.style?.fontStyle || 'normal'}
                            onValueChange={(value) => handleStyleUpdate('fontStyle', value)}
                            disabled={readOnly}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Style" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="italic">Italique</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Décoration</Label>
                        <Select 
                          value={selectedField?.style?.textDecoration || 'none'}
                          onValueChange={(value) => handleStyleUpdate('textDecoration', value)}
                          disabled={readOnly}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Décoration" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Aucune</SelectItem>
                            <SelectItem value="underline">Souligné</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {!readOnly && (
                        <div className="pt-4 border-t">
                          <h4 className="text-sm font-medium mb-2">Actions avancées</h4>
                          <div className="space-y-2">
                            <Button 
                              variant="outline" 
                              className="w-full"
                              onClick={() => handleDuplicateFieldToPage(selectedField?.id)}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Dupliquer vers une autre page
                            </Button>
                            
                            {selectedField?.page !== null && (
                              <Button 
                                variant="outline" 
                                className="w-full text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleRemoveFieldFromCurrentPage(selectedField?.id)}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Retirer de cette page
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PDFFieldsEditor;
