
import React, { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PDFTemplate } from "@/utils/templateManager";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import PDFFieldsEditor from "./PDFFieldsEditor";

export interface PDFTemplateWithFieldsProps {
  template: PDFTemplate;
  onSave: (template: PDFTemplate) => void;
  selectedPage: number;
  onPageSelect: (page: number) => void;
}

// Interface pour les images du template
export interface TemplateImage {
  id: string;
  name: string;
  data: string; // URL de l'image ou base64
  page: number;
  fields?: PDFField[];
}

// Interface pour les champs de formulaire
export interface PDFField {
  id: string;
  type: "text" | "signature" | "date" | "checkbox";
  name: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  x: number; // Position X en pourcentage
  y: number; // Position Y en pourcentage
  width: number; // Largeur en pourcentage
  height: number; // Hauteur en pourcentage
  page: number; // Numéro de la page
  fontSize?: number;
  fontWeight?: string;
  saveToDatabase?: {
    enabled: boolean;
    fieldName: string;
    table: string;
  };
}

const PDFTemplateWithFields = ({ template, onSave, selectedPage, onPageSelect }: PDFTemplateWithFieldsProps) => {
  const [activeTab, setActiveTab] = useState("images");
  const [localTemplate, setLocalTemplate] = useState<PDFTemplate>({
    ...template,
    templateImages: template.templateImages || []
  });
  const [currentField, setCurrentField] = useState<PDFField | null>(null);
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [placingMode, setPlacingMode] = useState(false);
  const [newFieldType, setNewFieldType] = useState<"text" | "signature" | "date" | "checkbox">("text");
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  const canvasRef = React.useRef<HTMLDivElement>(null);

  // Charger les données locales du template
  useEffect(() => {
    setLocalTemplate({
      ...template,
      templateImages: template.templateImages || []
    });
  }, [template]);

  // Sauvegarder les modifications au template
  const saveChanges = useCallback(() => {
    onSave(localTemplate);
  }, [localTemplate, onSave]);

  // Ajuster la taille du canevas
  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current) {
        setCanvasSize({
          width: canvasRef.current.offsetWidth,
          height: canvasRef.current.offsetHeight
        });
      }
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, [selectedPage]);

  // Sélectionner une page
  const handlePageSelect = (pageIndex: number) => {
    onPageSelect(pageIndex);
    setCurrentField(null);
  };

  // Ajouter un champ
  const addField = (type: "text" | "signature" | "date" | "checkbox") => {
    setNewFieldType(type);
    setPlacingMode(true);
  };

  // Placer un nouveau champ sur le canevas
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!placingMode || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Créer un nouveau champ
    const newField: PDFField = {
      id: uuidv4(),
      type: newFieldType,
      name: `field_${Date.now()}`,
      label: getDefaultLabelForType(newFieldType),
      x,
      y,
      width: 20,
      height: 10,
      page: selectedPage,
      required: false
    };

    // Ajouter le champ à l'image courante
    const updatedTemplateImages = [...localTemplate.templateImages];
    const currentImage = updatedTemplateImages[selectedPage];
    
    if (currentImage) {
      if (!currentImage.fields) {
        currentImage.fields = [];
      }
      currentImage.fields.push(newField);
      
      setLocalTemplate({
        ...localTemplate,
        templateImages: updatedTemplateImages
      });
      
      // Sélectionner le nouveau champ pour édition
      setCurrentField(newField);
      setShowFieldEditor(true);
    }

    // Désactiver le mode placement
    setPlacingMode(false);
  };

  // Obtenir le libellé par défaut pour chaque type de champ
  const getDefaultLabelForType = (type: string): string => {
    switch (type) {
      case "text":
        return "Texte";
      case "signature":
        return "Signature";
      case "date":
        return "Date";
      case "checkbox":
        return "Case à cocher";
      default:
        return "Champ";
    }
  };

  // Gérer la sélection d'un champ existant
  const handleFieldClick = (e: React.MouseEvent, field: PDFField) => {
    e.stopPropagation();
    setCurrentField(field);
    setShowFieldEditor(true);
  };

  // Démarrer le déplacement d'un champ
  const handleFieldMouseDown = (e: React.MouseEvent, field: PDFField) => {
    e.stopPropagation();
    e.preventDefault();
    
    setIsDragging(true);
    setCurrentField(field);
    setStartPosition({
      x: e.clientX,
      y: e.clientY
    });
  };

  // Déplacer un champ
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !currentField || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const deltaX = e.clientX - startPosition.x;
    const deltaY = e.clientY - startPosition.y;
    
    // Convertir les déplacements en pourcentages
    const deltaXPercent = (deltaX / rect.width) * 100;
    const deltaYPercent = (deltaY / rect.height) * 100;
    
    // Mettre à jour les coordonnées du champ
    const newX = Math.max(0, Math.min(100 - currentField.width, currentField.x + deltaXPercent));
    const newY = Math.max(0, Math.min(100 - currentField.height, currentField.y + deltaYPercent));
    
    // Mettre à jour le template
    const updatedTemplateImages = [...localTemplate.templateImages];
    const currentImage = updatedTemplateImages[selectedPage];
    
    if (currentImage && currentImage.fields) {
      const fieldIndex = currentImage.fields.findIndex(f => f.id === currentField.id);
      if (fieldIndex !== -1) {
        const updatedField = {
          ...currentImage.fields[fieldIndex],
          x: newX,
          y: newY
        };
        
        currentImage.fields[fieldIndex] = updatedField;
        
        setLocalTemplate({
          ...localTemplate,
          templateImages: updatedTemplateImages
        });
        
        setCurrentField(updatedField);
      }
    }
    
    // Réinitialiser la position de départ
    setStartPosition({
      x: e.clientX,
      y: e.clientY
    });
  };

  // Terminer le déplacement d'un champ
  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      saveChanges();
    }
  };

  // Mettre à jour les propriétés d'un champ
  const updateFieldProperties = (updatedField: PDFField) => {
    const updatedTemplateImages = [...localTemplate.templateImages];
    const currentImage = updatedTemplateImages[selectedPage];
    
    if (currentImage && currentImage.fields) {
      const fieldIndex = currentImage.fields.findIndex(f => f.id === updatedField.id);
      if (fieldIndex !== -1) {
        currentImage.fields[fieldIndex] = updatedField;
        
        setLocalTemplate({
          ...localTemplate,
          templateImages: updatedTemplateImages
        });
        
        setCurrentField(updatedField);
        saveChanges();
      }
    }
  };

  // Supprimer un champ
  const deleteField = (fieldId: string) => {
    const updatedTemplateImages = [...localTemplate.templateImages];
    const currentImage = updatedTemplateImages[selectedPage];
    
    if (currentImage && currentImage.fields) {
      currentImage.fields = currentImage.fields.filter(f => f.id !== fieldId);
      
      setLocalTemplate({
        ...localTemplate,
        templateImages: updatedTemplateImages
      });
      
      setCurrentField(null);
      setShowFieldEditor(false);
      saveChanges();
    }
  };

  // Obtenir les champs de la page courante
  const getCurrentPageFields = (): PDFField[] => {
    const currentImage = localTemplate.templateImages[selectedPage];
    return currentImage && currentImage.fields ? currentImage.fields : [];
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <div
          ref={canvasRef}
          className={`relative border border-gray-300 rounded-md overflow-hidden ${
            placingMode ? "cursor-crosshair" : "cursor-default"
          }`}
          style={{ height: "700px", backgroundColor: "#f8f9fa" }}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Affichage de l'image de la page courante */}
          {localTemplate.templateImages[selectedPage] && (
            <img
              src={localTemplate.templateImages[selectedPage].data}
              alt={`Page ${selectedPage + 1}`}
              className="w-full h-full object-contain"
            />
          )}

          {/* Affichage des champs sur le canevas */}
          {getCurrentPageFields().map((field) => (
            <div
              key={field.id}
              className={`absolute border-2 rounded ${
                currentField && currentField.id === field.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-400 bg-white bg-opacity-70"
              }`}
              style={{
                left: `${field.x}%`,
                top: `${field.y}%`,
                width: `${field.width}%`,
                height: `${field.height}%`,
                cursor: "move"
              }}
              onClick={(e) => handleFieldClick(e, field)}
              onMouseDown={(e) => handleFieldMouseDown(e, field)}
            >
              <div className="text-xs p-1 truncate">
                {field.label || field.name}
              </div>
            </div>
          ))}

          {/* Instructions en mode placement */}
          {placingMode && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-10">
              <div className="bg-white p-4 rounded-md shadow-md">
                <p>Cliquez pour placer le champ {getDefaultLabelForType(newFieldType)}</p>
                <Button
                  variant="outline"
                  className="mt-2 w-full"
                  onClick={() => setPlacingMode(false)}
                >
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation entre les pages */}
        <div className="flex justify-between items-center mt-4">
          <Button
            variant="outline"
            disabled={selectedPage === 0}
            onClick={() => onPageSelect(selectedPage - 1)}
          >
            Page précédente
          </Button>
          <span>
            Page {selectedPage + 1} sur {localTemplate.templateImages.length}
          </span>
          <Button
            variant="outline"
            disabled={selectedPage === localTemplate.templateImages.length - 1}
            onClick={() => onPageSelect(selectedPage + 1)}
          >
            Page suivante
          </Button>
        </div>
      </div>

      <div>
        <Card>
          <CardContent className="p-4">
            <Tabs defaultValue="fields">
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="fields">Champs</TabsTrigger>
                <TabsTrigger value="properties">Propriétés</TabsTrigger>
              </TabsList>

              <TabsContent value="fields">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Ajouter un champ</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button onClick={() => addField("text")} variant="outline" className="justify-start">
                      <Plus className="h-4 w-4 mr-2" />
                      Texte
                    </Button>
                    <Button onClick={() => addField("signature")} variant="outline" className="justify-start">
                      <Plus className="h-4 w-4 mr-2" />
                      Signature
                    </Button>
                    <Button onClick={() => addField("date")} variant="outline" className="justify-start">
                      <Plus className="h-4 w-4 mr-2" />
                      Date
                    </Button>
                    <Button onClick={() => addField("checkbox")} variant="outline" className="justify-start">
                      <Plus className="h-4 w-4 mr-2" />
                      Case à cocher
                    </Button>
                  </div>

                  {getCurrentPageFields().length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-medium mb-2">Champs de la page actuelle</h3>
                      <div className="space-y-2">
                        {getCurrentPageFields().map((field) => (
                          <div
                            key={field.id}
                            className={`p-2 border rounded-md cursor-pointer ${
                              currentField && currentField.id === field.id
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200"
                            }`}
                            onClick={() => {
                              setCurrentField(field);
                              setShowFieldEditor(true);
                            }}
                          >
                            <div className="flex justify-between items-center">
                              <span>{field.label || field.name}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteField(field.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                            <div className="text-xs text-gray-500">
                              Type: {getDefaultLabelForType(field.type)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="properties">
                {currentField ? (
                  <PDFFieldsEditor
                    field={currentField}
                    onUpdate={updateFieldProperties}
                    onDelete={() => deleteField(currentField.id)}
                  />
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <p>Sélectionnez un champ pour modifier ses propriétés</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PDFTemplateWithFields;
