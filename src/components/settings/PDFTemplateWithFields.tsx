
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
  selectedPage?: number;
  onPageSelect?: (page: number) => void;
}

// Interface for PDF fields
export interface PDFField {
  id: string;
  type: "text" | "signature" | "date" | "checkbox";
  name: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  x: number; // Position X percentage
  y: number; // Position Y percentage
  width: number; // Width percentage
  height: number; // Height percentage
  page: number; // Page number
  fontSize?: number;
  fontWeight?: string;
  saveToDatabase?: {
    enabled: boolean;
    fieldName: string;
    table: string;
  };
}

const PDFTemplateWithFields = ({ 
  template, 
  onSave, 
  selectedPage = 0, 
  onPageSelect = () => {} 
}: PDFTemplateWithFieldsProps) => {
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

  // Load local template data
  useEffect(() => {
    setLocalTemplate({
      ...template,
      templateImages: template.templateImages || []
    });
  }, [template]);

  // Save template changes
  const saveChanges = useCallback(() => {
    onSave(localTemplate);
  }, [localTemplate, onSave]);

  // Adjust canvas size
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

  // Handle page selection
  const handlePageSelect = (pageIndex: number) => {
    onPageSelect(pageIndex);
    setCurrentField(null);
  };

  // Add field
  const addField = (type: "text" | "signature" | "date" | "checkbox") => {
    setNewFieldType(type);
    setPlacingMode(true);
  };

  // Place a new field on canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!placingMode || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Create new field
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

    // Store all fields at the template level
    if (!localTemplate.fields) {
      localTemplate.fields = [];
    }
    
    const updatedFields = [...localTemplate.fields, newField];
    
    setLocalTemplate({
      ...localTemplate,
      fields: updatedFields
    });
    
    // Select the new field for editing
    setCurrentField(newField);
    setShowFieldEditor(true);
    
    // Disable placing mode
    setPlacingMode(false);
    
    // Save changes
    saveChanges();
  };

  // Get default label for each field type
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

  // Handle existing field selection
  const handleFieldClick = (e: React.MouseEvent, field: PDFField) => {
    e.stopPropagation();
    setCurrentField(field);
    setShowFieldEditor(true);
  };

  // Start field drag
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

  // Move field
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !currentField || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const deltaX = e.clientX - startPosition.x;
    const deltaY = e.clientY - startPosition.y;
    
    // Convert movements to percentages
    const deltaXPercent = (deltaX / rect.width) * 100;
    const deltaYPercent = (deltaY / rect.height) * 100;
    
    // Update field coordinates
    const newX = Math.max(0, Math.min(100 - currentField.width, currentField.x + deltaXPercent));
    const newY = Math.max(0, Math.min(100 - currentField.height, currentField.y + deltaYPercent));
    
    // Update the template
    if (localTemplate.fields) {
      const updatedFields = [...localTemplate.fields];
      const fieldIndex = updatedFields.findIndex(f => f.id === currentField.id);
      
      if (fieldIndex !== -1) {
        const updatedField = {
          ...updatedFields[fieldIndex],
          x: newX,
          y: newY
        };
        
        updatedFields[fieldIndex] = updatedField;
        
        setLocalTemplate({
          ...localTemplate,
          fields: updatedFields
        });
        
        setCurrentField(updatedField);
      }
    }
    
    // Reset start position
    setStartPosition({
      x: e.clientX,
      y: e.clientY
    });
  };

  // End field drag
  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      saveChanges();
    }
  };

  // Update field properties
  const updateFieldProperties = (updatedField: PDFField) => {
    if (localTemplate.fields) {
      const updatedFields = [...localTemplate.fields];
      const fieldIndex = updatedFields.findIndex(f => f.id === updatedField.id);
      
      if (fieldIndex !== -1) {
        updatedFields[fieldIndex] = updatedField;
        
        setLocalTemplate({
          ...localTemplate,
          fields: updatedFields
        });
        
        setCurrentField(updatedField);
        saveChanges();
      }
    }
  };

  // Delete field
  const deleteField = (fieldId: string) => {
    if (localTemplate.fields) {
      const updatedFields = localTemplate.fields.filter(f => f.id !== fieldId);
      
      setLocalTemplate({
        ...localTemplate,
        fields: updatedFields
      });
      
      setCurrentField(null);
      setShowFieldEditor(false);
      saveChanges();
    }
  };

  // Get fields for current page
  const getCurrentPageFields = (): PDFField[] => {
    if (!localTemplate.fields) return [];
    return localTemplate.fields.filter(field => field.page === selectedPage);
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
          {/* Display page image */}
          {localTemplate.templateImages[selectedPage] && (
            <img
              src={localTemplate.templateImages[selectedPage].data}
              alt={`Page ${selectedPage + 1}`}
              className="w-full h-full object-contain"
            />
          )}

          {/* Display fields on canvas */}
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

          {/* Placing mode instructions */}
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

        {/* Page navigation */}
        <div className="flex justify-between items-center mt-4">
          <Button
            variant="outline"
            disabled={selectedPage === 0}
            onClick={() => handlePageSelect(selectedPage - 1)}
          >
            Page précédente
          </Button>
          <span>
            Page {selectedPage + 1} sur {localTemplate.templateImages.length}
          </span>
          <Button
            variant="outline"
            disabled={selectedPage === localTemplate.templateImages.length - 1}
            onClick={() => handlePageSelect(selectedPage + 1)}
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
