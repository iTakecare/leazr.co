
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, Eye, EyeOff, MoveHorizontal, User, Calendar, CreditCard, Layout, FileText, Package } from "lucide-react";

const FIELD_CATEGORIES = [
  { id: "client", label: "Client", icon: User },
  { id: "offer", label: "Offre", icon: FileText },
  { id: "equipment", label: "Équipement", icon: Package },
  { id: "general", label: "Général", icon: Layout },
];

const PDFFieldsEditor = ({ fields, onChange, activePage = 0, onPageChange, template }) => {
  const [activeCategory, setActiveCategory] = useState("client");
  const [positionedField, setPositionedField] = useState(null);
  const [canvasPosition, setCanvasPosition] = useState({ x: 0, y: 0 });
  const [dragEnabled, setDragEnabled] = useState(true);
  const [pageLoaded, setPageLoaded] = useState(false);
  
  useEffect(() => {
    // Reset positioned field when page changes
    setPositionedField(null);
    setPageLoaded(false);
  }, [activePage]);
  
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
  const updateFieldPosition = (fieldId, newPosition, page = activePage) => {
    const newFields = fields.map(field => 
      field.id === fieldId ? { ...field, position: newPosition, page } : field
    );
    onChange(newFields);
  };
  
  // Mettre à jour la page d'un champ
  const updateFieldPage = (fieldId, page) => {
    const newFields = fields.map(field => 
      field.id === fieldId ? { ...field, page } : field
    );
    onChange(newFields);
  };
  
  // Obtenir l'image de fond de la page actuelle
  const getCurrentPageBackground = () => {
    if (template?.templateImages && template.templateImages.length > 0) {
      // Recherche de l'image correspondant à la page actuelle
      const pageImage = template.templateImages.find(img => img.page === activePage);
      
      if (pageImage && pageImage.url) {
        console.log("Image trouvée pour la page", activePage, ":", pageImage.url);
        // Ajouter un timestamp pour éviter les problèmes de cache
        return `${pageImage.url}?t=${new Date().getTime()}`;
      } else {
        console.log("Aucune image trouvée pour la page", activePage);
        return null;
      }
    }
    console.log("Aucune image de template disponible");
    return null;
  };
  
  // Gérer le déplacement d'un champ sur le canvas
  const handleCanvasMouseMove = (e) => {
    if (positionedField) {
      const canvas = e.currentTarget;
      const rect = canvas.getBoundingClientRect();
      
      // Get the canvas dimensions
      const canvasWidth = rect.width;
      const canvasHeight = rect.height;
      
      // Calculate the ratio between the canvas and the actual page size (in mm)
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      
      // Scale down by 0.5 to account for the transform scale in the UI
      const scaleRatio = {
        x: (pageWidth * 0.5) / canvasWidth,
        y: (pageHeight * 0.5) / canvasHeight
      };
      
      // Calculate position in mm relative to the page
      const x = Math.max(0, Math.min(pageWidth, (e.clientX - rect.left) * scaleRatio.x));
      const y = Math.max(0, Math.min(pageHeight, (e.clientY - rect.top) * scaleRatio.y));
      
      setCanvasPosition({ x, y });
    }
  };
  
  const handleCanvasMouseUp = () => {
    if (positionedField) {
      updateFieldPosition(positionedField, { 
        x: canvasPosition.x, 
        y: canvasPosition.y 
      }, activePage);
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
  
  // Gérer les erreurs de chargement d'image
  const handleImageError = (e) => {
    console.error("Erreur de chargement de l'image:", e.target.src);
    e.target.src = "/placeholder.svg"; // Image de fallback
    
    // Tenter de recharger l'image après un délai
    setTimeout(() => {
      if (e.target.src === "/placeholder.svg") {
        const currentSrc = e.target.src;
        const timestamp = new Date().getTime();
        const newSrc = currentSrc.includes('?') 
          ? currentSrc.split('?')[0] + `?t=${timestamp}`
          : `${currentSrc}?t=${timestamp}`;
        
        console.log("Tentative de rechargement de l'image avec cache-busting:", newSrc);
        e.target.src = newSrc;
      }
    }, 2000);
  };
  
  // Marquer l'image comme chargée
  const handleImageLoad = () => {
    console.log("Image chargée avec succès");
    setPageLoaded(true);
  };

  // Déterminer le nombre total de pages
  const totalPages = template?.templateImages?.length || 1;
  
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
                              <span className="text-xs">(x: {field.position.x.toFixed(1)}, y: {field.position.y.toFixed(1)})</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <Label className="text-xs">Page:</Label>
                              <div className="flex items-center gap-2">
                                <span className="text-xs">{field.page !== undefined ? field.page + 1 : 1}</span>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => {
                                    updateFieldPage(field.id, activePage);
                                  }}
                                  disabled={field.page === activePage}
                                >
                                  Mettre sur page courante
                                </Button>
                              </div>
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
                <div className="flex items-center gap-4">
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
                  
                  <div className="flex gap-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onPageChange(Math.max(0, activePage - 1))}
                      disabled={activePage === 0}
                    >
                      Page précédente
                    </Button>
                    <span className="flex items-center px-2 text-sm">
                      Page {activePage + 1} / {totalPages}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onPageChange(activePage + 1)}
                      disabled={activePage === totalPages - 1}
                    >
                      Page suivante
                    </Button>
                  </div>
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
                  {/* Fond de page si un template a été uploadé */}
                  {getCurrentPageBackground() ? (
                    <div className="relative" style={{ minHeight: "297mm" }}>
                      <img 
                        src={getCurrentPageBackground()} 
                        alt={`Template page ${activePage + 1}`}
                        className="w-full h-auto"
                        onError={handleImageError}
                        onLoad={handleImageLoad}
                        style={{ 
                          display: "block",
                          width: "100%"
                        }}
                      />
                      
                      {/* En-tête simulé - au-dessus de l'image */}
                      <div 
                        className="w-full py-2 px-4 border-b border-gray-200 bg-white bg-opacity-80 text-center"
                        style={{ position: "absolute", top: "0", left: "0", right: "0", zIndex: 5 }}
                      >
                        <div className="text-sm font-bold">PAGE {activePage + 1} / {totalPages}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center p-4 bg-gray-50 rounded border">
                        <p className="text-lg font-medium mb-2">Aucune image pour la page {activePage + 1}</p>
                        <p className="text-sm text-muted-foreground">
                          Veuillez ajouter une image pour cette page dans l'onglet "Pages du modèle"
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Position des champs pour la page active */}
                  {fields
                    .filter(f => f.isVisible && (f.page === activePage || (activePage === 0 && f.page === undefined)))
                    .map((field) => (
                      <div
                        key={field.id}
                        className={`absolute p-1 border ${positionedField === field.id ? 'border-blue-500 bg-blue-100' : 'border-gray-300 hover:border-blue-300'}`}
                        style={{
                          left: `${field.position.x}mm`,
                          top: `${field.position.y}mm`,
                          cursor: dragEnabled ? "move" : "default",
                          padding: "2px 4px",
                          backgroundColor: positionedField === field.id ? "rgba(59, 130, 246, 0.2)" : "rgba(255, 255, 255, 0.8)",
                          fontSize: "10px",
                          whiteSpace: "nowrap",
                          zIndex: 10,
                          boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
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
                        boxShadow: "0 1px 5px rgba(0,0,0,0.2)"
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
                <p>Changez de page pour positionner des champs sur différentes pages du document.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PDFFieldsEditor;
