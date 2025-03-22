
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, Eye, EyeOff, MoveHorizontal, User, Calendar, CreditCard, Layout, FileText, Package } from "lucide-react";

const FIELD_CATEGORIES = [
  { id: "client", label: "Client", icon: User },
  { id: "offer", label: "Offre", icon: FileText },
  { id: "equipment", label: "Équipement", icon: Package },
  { id: "general", label: "Général", icon: Layout },
];

const PDFFieldsEditor = ({ fields, onChange }) => {
  const [activeCategory, setActiveCategory] = useState("client");
  const [positionedField, setPositionedField] = useState(null);
  const [canvasPosition, setCanvasPosition] = useState({ x: 0, y: 0 });
  const [dragEnabled, setDragEnabled] = useState(true);
  
  // Grouper les champs par catégorie
  const fieldsByCategory = fields.reduce((acc, field) => {
    if (!acc[field.category]) {
      acc[field.category] = [];
    }
    acc[field.category].push(field);
    return acc;
  }, {});
  
  // Mettre à jour la visibilité d'un champ
  const toggleFieldVisibility = (fieldId) => {
    const newFields = fields.map(field => 
      field.id === fieldId ? { ...field, isVisible: !field.isVisible } : field
    );
    onChange(newFields);
  };
  
  // Mettre à jour la position d'un champ
  const updateFieldPosition = (fieldId, newPosition) => {
    const newFields = fields.map(field => 
      field.id === fieldId ? { ...field, position: newPosition } : field
    );
    onChange(newFields);
  };
  
  // Gérer le déplacement d'un champ sur le canvas
  const handleCanvasMouseMove = (e) => {
    if (positionedField) {
      const canvas = e.currentTarget;
      const rect = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(210, e.clientX - rect.left));
      const y = Math.max(0, Math.min(297, e.clientY - rect.top));
      
      setCanvasPosition({ x, y });
    }
  };
  
  const handleCanvasMouseUp = () => {
    if (positionedField) {
      updateFieldPosition(positionedField, { 
        x: canvasPosition.x, 
        y: canvasPosition.y 
      });
      setPositionedField(null);
    }
  };
  
  // Gérer le début du positionnement d'un champ
  const startPositioning = (fieldId, initialPosition) => {
    setPositionedField(fieldId);
    setCanvasPosition(initialPosition);
  };
  
  const getCategoryIcon = (categoryId) => {
    const category = FIELD_CATEGORIES.find(cat => cat.id === categoryId);
    const Icon = category ? category.icon : Layout;
    return <Icon className="h-4 w-4 mr-2" />;
  };
  
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {/* Panneau de gauche : Liste des champs disponibles */}
      <div className="md:col-span-1">
        <Card>
          <CardContent className="p-4">
            <Tabs defaultValue={activeCategory} onValueChange={setActiveCategory}>
              <TabsList className="grid grid-cols-2 md:grid-cols-4 mb-4">
                {FIELD_CATEGORIES.map(category => (
                  <TabsTrigger key={category.id} value={category.id} className="flex items-center">
                    {React.createElement(category.icon, { className: "h-4 w-4 mr-2" })}
                    <span className="hidden sm:inline">{category.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {FIELD_CATEGORIES.map(category => (
                <TabsContent key={category.id} value={category.id} className="space-y-4">
                  <h3 className="text-sm font-medium flex items-center">
                    {React.createElement(category.icon, { className: "h-4 w-4 mr-2" })}
                    Champs {category.label}
                  </h3>
                  
                  <Accordion type="multiple" className="space-y-2">
                    {fieldsByCategory[category.id]?.map((field, index) => (
                      <AccordionItem key={field.id} value={field.id} className="border rounded-md">
                        <AccordionTrigger className="px-3 py-2 text-sm">
                          <div className="flex items-center justify-between w-full">
                            <span className="font-medium">{field.label}</span>
                            <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                              <Switch
                                checked={field.isVisible}
                                onCheckedChange={() => toggleFieldVisibility(field.id)}
                                size="sm"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startPositioning(field.id, field.position);
                                }}
                                disabled={!field.isVisible}
                              >
                                <MoveHorizontal className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 py-2">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs">Type:</Label>
                              <span className="text-xs">{field.type}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <Label className="text-xs">Position:</Label>
                              <span className="text-xs">(x: {field.position.x}, y: {field.position.y})</span>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      {/* Panneau de droite : Aperçu du positionnement */}
      <div className="md:col-span-2">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium">Positionnement des champs</h3>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={dragEnabled}
                    onCheckedChange={setDragEnabled}
                    id="drag-mode"
                  />
                  <Label htmlFor="drag-mode" className="text-xs">
                    Mode glisser-déposer
                  </Label>
                </div>
              </div>
              
              {/* Canvas pour positionner les champs */}
              <div
                className="border rounded-md bg-white p-4 relative h-[420px] overflow-auto"
                style={{ 
                  minHeight: "420px", 
                  cursor: positionedField ? "move" : "default",
                }}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
              >
                {/* Document A4 simulé (échelle réduite) */}
                <div 
                  className="bg-white border border-gray-200 shadow"
                  style={{
                    width: "210mm", 
                    height: "297mm",
                    transform: "scale(0.5)",
                    transformOrigin: "top left",
                    position: "relative",
                  }}
                >
                  {/* En-tête simulé */}
                  <div 
                    className="w-full py-4 px-6 border-b border-gray-200 bg-gray-50"
                    style={{ position: "absolute", top: "0", left: "0", right: "0" }}
                  >
                    <div className="text-lg font-bold text-center">APERÇU DU DOCUMENT PDF</div>
                  </div>
                  
                  {/* Position des champs */}
                  {fields.filter(f => f.isVisible).map((field) => (
                    <div
                      key={field.id}
                      className={`absolute p-1 border ${positionedField === field.id ? 'border-blue-500 bg-blue-100' : 'border-gray-300 hover:border-blue-300'}`}
                      style={{
                        left: `${field.position.x}mm`,
                        top: `${field.position.y}mm`,
                        cursor: dragEnabled ? "move" : "default",
                        padding: "2px 4px",
                        backgroundColor: positionedField === field.id ? "rgba(59, 130, 246, 0.1)" : "rgba(255, 255, 255, 0.8)",
                        fontSize: "10px",
                        whiteSpace: "nowrap",
                      }}
                      onMouseDown={(e) => {
                        if (dragEnabled) {
                          e.stopPropagation();
                          startPositioning(field.id, field.position);
                        }
                      }}
                    >
                      <div className="flex items-center gap-1">
                        {getCategoryIcon(field.category)}
                        <span>{field.label}</span>
                      </div>
                    </div>
                  ))}
                  
                  {/* Champ en cours de positionnement */}
                  {positionedField && (
                    <div
                      className="absolute border-2 border-blue-500 bg-blue-100 p-1 z-50"
                      style={{
                        left: `${canvasPosition.x}mm`,
                        top: `${canvasPosition.y}mm`,
                        padding: "2px 4px",
                        fontSize: "10px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <div className="flex items-center gap-1">
                        {getCategoryIcon(fields.find(f => f.id === positionedField)?.category || "general")}
                        <span>{fields.find(f => f.id === positionedField)?.label}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-4 text-sm text-muted-foreground">
                <p>Cliquez sur l'icône <MoveHorizontal className="inline h-4 w-4" /> d'un champ pour le positionner, puis déplacez-le sur le document.</p>
                <p>Utilisez l'interrupteur à côté de chaque champ pour l'afficher ou le masquer dans le PDF final.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PDFFieldsEditor;
