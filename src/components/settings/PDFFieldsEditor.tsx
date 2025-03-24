
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PDFTemplate } from "@/utils/templateManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Trash2, ChevronsUpDown, Copy, Save, List, Tag, FileText } from "lucide-react";

// Définition des catégories de champs disponibles avec leurs champs respectifs
const AVAILABLE_FIELDS = {
  client: [
    { id: 'client_name', label: 'Nom du client', value: '{client_name}' },
    { id: 'client_email', label: 'Email du client', value: '{client_email}' },
    { id: 'client_company', label: 'Société du client', value: '{client_company}' },
    { id: 'client_phone', label: 'Téléphone du client', value: '{client_phone}' },
    { id: 'client_address', label: 'Adresse du client', value: '{client_address}' },
    { id: 'client_postal_code', label: 'Code postal du client', value: '{client_postal_code}' },
    { id: 'client_city', label: 'Ville du client', value: '{client_city}' },
    { id: 'client_vat_number', label: 'Numéro TVA du client', value: '{client_vat_number}' }
  ],
  offer: [
    { id: 'offer_id', label: 'Numéro de l\'offre', value: '{offer_id}' },
    { id: 'amount', label: 'Montant total', value: '{amount}' },
    { id: 'monthly_payment', label: 'Mensualité', value: '{monthly_payment}' },
    { id: 'created_at', label: 'Date de création', value: '{created_at}' }
  ],
  equipment: [
    { id: 'equipment_list', label: 'Liste des équipements', value: '{equipment_list}' }
  ]
};

// Interface pour représenter un champ du PDF
interface PDFField {
  id: string;
  label: string;
  type: string;
  category: string;
  isVisible: boolean;
  value: string;
  position: { x: number; y: number };
  page: number;
  style?: {
    fontSize: number;
    fontWeight: string;
    fontStyle: string;
    textDecoration: string;
    color?: string;
  };
}

interface PDFFieldsEditorProps {
  fields: PDFField[];
  onChange: (fields: PDFField[]) => void;
  activePage: number;
  onPageChange: (page: number) => void;
  template: PDFTemplate;
  onDeleteField: (fieldId: string) => void;
  onAddField: (field: PDFField) => void;
  onDuplicateField?: (fieldId: string, targetPage: number) => void;
  onRemoveFieldFromPage?: (fieldId: string, page: number) => void;
}

const PDFFieldsEditor: React.FC<PDFFieldsEditorProps> = ({
  fields,
  onChange,
  activePage,
  onPageChange,
  template,
  onDeleteField,
  onAddField,
  onDuplicateField,
  onRemoveFieldFromPage
}) => {
  const [activeTab, setActiveTab] = useState<string>("client");
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [newFieldType, setNewFieldType] = useState<string>("text");
  const [newFieldCategory, setNewFieldCategory] = useState<string>("client");
  const [newFieldValue, setNewFieldValue] = useState<string>("");
  const [newFieldLabel, setNewFieldLabel] = useState<string>("");
  const { toast } = useToast();

  // Filtrer les champs pour la page active
  const fieldsOnActivePage = fields.filter(field => field.page === activePage);

  // Récupérer les champs disponibles pour la page active
  const getAvailableFields = () => {
    // Récupérer les champs déjà ajoutés à la page active
    const existingFieldIds = fieldsOnActivePage.map(field => field.id);

    // Filtrer les champs par catégorie et exclure ceux déjà ajoutés
    return AVAILABLE_FIELDS[activeTab as keyof typeof AVAILABLE_FIELDS]?.filter(
      field => !existingFieldIds.includes(field.id)
    ) || [];
  };

  // Ajouter un champ prédéfini
  const handleAddPredefinedField = (fieldTemplate: { id: string; label: string; value: string }) => {
    const newField: PDFField = {
      id: fieldTemplate.id,
      label: fieldTemplate.label,
      type: "text",
      category: activeTab,
      isVisible: true,
      value: fieldTemplate.value,
      position: { x: 50, y: 50 },
      page: activePage,
      style: {
        fontSize: 12,
        fontWeight: "normal",
        fontStyle: "normal",
        textDecoration: "none",
        color: "#000000"
      }
    };
    
    onAddField(newField);
    toast({
      title: "Champ ajouté",
      description: `"${fieldTemplate.label}" a été ajouté à la page ${activePage + 1}.`,
    });
  };

  // Ajouter un champ personnalisé
  const handleAddCustomField = () => {
    if (!newFieldLabel || !newFieldValue) {
      toast({
        title: "Impossible d'ajouter le champ",
        description: "Veuillez remplir toutes les informations nécessaires.",
        variant: "destructive"
      });
      return;
    }

    const customId = `custom_${Date.now()}`;
    const newField: PDFField = {
      id: customId,
      label: newFieldLabel,
      type: newFieldType,
      category: newFieldCategory,
      isVisible: true,
      value: newFieldValue,
      position: { x: 50, y: 50 },
      page: activePage,
      style: {
        fontSize: 12,
        fontWeight: "normal",
        fontStyle: "normal",
        textDecoration: "none",
        color: "#000000"
      }
    };
    
    onAddField(newField);
    setNewFieldLabel("");
    setNewFieldValue("");
    toast({
      title: "Champ personnalisé ajouté",
      description: `"${newFieldLabel}" a été ajouté à la page ${activePage + 1}.`,
    });
  };

  // Mettre à jour un champ
  const updateField = (fieldId: string, updates: Partial<PDFField>) => {
    const updatedFields = fields.map(field => 
      field.id === fieldId ? { ...field, ...updates } : field
    );
    onChange(updatedFields);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Panneau de gauche: Liste des champs et ajout */}
        <div className="w-full lg:w-1/3 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="client">
                <FileText className="h-4 w-4 mr-2" />
                Client
              </TabsTrigger>
              <TabsTrigger value="offer">
                <Tag className="h-4 w-4 mr-2" />
                Offre
              </TabsTrigger>
              <TabsTrigger value="equipment">
                <List className="h-4 w-4 mr-2" />
                Matériel
              </TabsTrigger>
            </TabsList>

            <TabsContent value="client" className="space-y-4 mt-4">
              <h3 className="text-sm font-medium">Champs client disponibles</h3>
              <div className="grid gap-2">
                {getAvailableFields().map(field => (
                  <Button 
                    key={field.id} 
                    variant="outline" 
                    className="justify-start text-left h-auto py-2"
                    onClick={() => handleAddPredefinedField(field)}
                  >
                    <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                    <div className="flex flex-col items-start">
                      <span>{field.label}</span>
                      <span className="text-xs text-muted-foreground">{field.value}</span>
                    </div>
                  </Button>
                ))}
                {getAvailableFields().length === 0 && (
                  <p className="text-sm text-muted-foreground py-2">
                    Tous les champs client ont été ajoutés à cette page.
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="offer" className="space-y-4 mt-4">
              <h3 className="text-sm font-medium">Champs offre disponibles</h3>
              <div className="grid gap-2">
                {getAvailableFields().map(field => (
                  <Button 
                    key={field.id} 
                    variant="outline" 
                    className="justify-start text-left h-auto py-2"
                    onClick={() => handleAddPredefinedField(field)}
                  >
                    <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                    <div className="flex flex-col items-start">
                      <span>{field.label}</span>
                      <span className="text-xs text-muted-foreground">{field.value}</span>
                    </div>
                  </Button>
                ))}
                {getAvailableFields().length === 0 && (
                  <p className="text-sm text-muted-foreground py-2">
                    Tous les champs offre ont été ajoutés à cette page.
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="equipment" className="space-y-4 mt-4">
              <h3 className="text-sm font-medium">Champs matériel disponibles</h3>
              <div className="grid gap-2">
                {getAvailableFields().map(field => (
                  <Button 
                    key={field.id} 
                    variant="outline" 
                    className="justify-start text-left h-auto py-2"
                    onClick={() => handleAddPredefinedField(field)}
                  >
                    <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                    <div className="flex flex-col items-start">
                      <span>{field.label}</span>
                      <span className="text-xs text-muted-foreground">{field.value}</span>
                    </div>
                  </Button>
                ))}
                {getAvailableFields().length === 0 && (
                  <p className="text-sm text-muted-foreground py-2">
                    Tous les champs matériel ont été ajoutés à cette page.
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-medium">Ajouter un champ personnalisé</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="field-label">Libellé du champ</Label>
                <Input 
                  id="field-label" 
                  value={newFieldLabel} 
                  onChange={e => setNewFieldLabel(e.target.value)}
                  placeholder="Ex: Numéro d'adhérent"
                />
              </div>
              <div>
                <Label htmlFor="field-value">Valeur du champ</Label>
                <Input 
                  id="field-value" 
                  value={newFieldValue} 
                  onChange={e => setNewFieldValue(e.target.value)}
                  placeholder="Ex: 12345 ou {valeur_variable}"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Utilisez {'{variable}'} pour insérer des valeurs dynamiques
                </p>
              </div>
              <div>
                <Label htmlFor="field-category">Catégorie</Label>
                <Select value={newFieldCategory} onValueChange={setNewFieldCategory}>
                  <SelectTrigger id="field-category">
                    <SelectValue placeholder="Choisir une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="offer">Offre</SelectItem>
                    <SelectItem value="equipment">Matériel</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="field-type">Type</Label>
                <Select value={newFieldType} onValueChange={setNewFieldType}>
                  <SelectTrigger id="field-type">
                    <SelectValue placeholder="Choisir un type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Texte</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="number">Nombre</SelectItem>
                    <SelectItem value="currency">Devise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleAddCustomField} 
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter ce champ
              </Button>
            </div>
          </div>
        </div>

        {/* Panneau de droite: Champs ajoutés sur la page active */}
        <div className="w-full lg:w-2/3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Champs sur la page {activePage + 1}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {fieldsOnActivePage.length > 0 ? (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {fieldsOnActivePage.map(field => (
                      <Card key={field.id} className={`overflow-hidden ${selectedFieldId === field.id ? 'ring-2 ring-primary' : ''}`}>
                        <CardContent className="p-3">
                          <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                              <span className="font-medium">{field.label}</span>
                              <span className="text-xs text-muted-foreground">{field.value}</span>
                              <div className="flex items-center mt-1">
                                <span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">
                                  {field.category}
                                </span>
                                <span className="text-xs ml-2">
                                  Position: {field.position.x}, {field.position.y}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              {onDuplicateField && template.templateImages.length > 1 && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => {
                                    const targetPage = (activePage + 1) % template.templateImages.length;
                                    onDuplicateField(field.id, targetPage);
                                  }}
                                  title="Dupliquer sur la page suivante"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => setSelectedFieldId(selectedFieldId === field.id ? null : field.id)}
                                title="Modifier la position"
                              >
                                <ChevronsUpDown className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => onDeleteField(field.id)}
                                className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                                title="Supprimer le champ"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          {selectedFieldId === field.id && (
                            <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-3">
                              <div>
                                <Label htmlFor={`pos-x-${field.id}`} className="text-xs">Position X</Label>
                                <Input
                                  id={`pos-x-${field.id}`}
                                  type="number"
                                  min="0"
                                  max="595" 
                                  value={field.position.x}
                                  onChange={(e) => updateField(field.id, { 
                                    position: { 
                                      ...field.position, 
                                      x: parseInt(e.target.value) || 0 
                                    } 
                                  })}
                                  className="h-8"
                                />
                              </div>
                              <div>
                                <Label htmlFor={`pos-y-${field.id}`} className="text-xs">Position Y</Label>
                                <Input
                                  id={`pos-y-${field.id}`}
                                  type="number"
                                  min="0"
                                  max="842" 
                                  value={field.position.y}
                                  onChange={(e) => updateField(field.id, { 
                                    position: { 
                                      ...field.position, 
                                      y: parseInt(e.target.value) || 0 
                                    } 
                                  })}
                                  className="h-8"
                                />
                              </div>
                              <div className="col-span-2">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="w-full mt-1"
                                  onClick={() => setSelectedFieldId(null)}
                                >
                                  <Save className="h-3 w-3 mr-1" />
                                  Appliquer
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-12 border border-dashed rounded-md">
                  <h3 className="text-muted-foreground mb-2">Aucun champ sur cette page</h3>
                  <p className="text-sm text-muted-foreground">
                    Utilisez les options à gauche pour ajouter des champs à cette page.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PDFFieldsEditor;
