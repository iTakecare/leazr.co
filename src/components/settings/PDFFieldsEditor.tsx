
import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { 
  ChevronUp, 
  ChevronDown, 
  Eye, 
  EyeOff, 
  MoveHorizontal, 
  User, 
  Calendar, 
  CreditCard, 
  Layout, 
  FileText, 
  Package, 
  Grid, 
  Grip, 
  Trash2, 
  Plus, 
  BookUser,
  Mail,
  Phone,
  Building,
  DollarSign,
  TagIcon,
  ClipboardList,
  AlertCircle,
  Copy,
  Link,
  Unlink
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const FIELD_CATEGORIES = [
  { id: "client", label: "Client", icon: User },
  { id: "offer", label: "Offre", icon: FileText },
  { id: "equipment", label: "Équipement", icon: Package },
  { id: "user", label: "Vendeur", icon: BookUser },
  { id: "general", label: "Général", icon: Layout },
];

const FIELD_TYPES = [
  { value: "text", label: "Texte" },
  { value: "date", label: "Date" },
  { value: "email", label: "Email" },
  { value: "currency", label: "Montant" },
  { value: "number", label: "Nombre" },
  { value: "table", label: "Tableau" }
];

// Categories icons mapping
const CATEGORY_ICONS = {
  client: User,
  offer: FileText,
  equipment: Package,
  user: BookUser,
  general: Layout
};

// Generate a unique ID
const generateId = (prefix) => {
  return `${prefix}_${Math.random().toString(36).substr(2, 9)}`;
};

const PDFFieldsEditor = ({ 
  fields, 
  onChange, 
  activePage = 0, 
  onPageChange, 
  template,
  onDeleteField,
  onAddField,
  onDuplicateField,
  onRemoveFieldFromPage
}) => {
  const [activeCategory, setActiveCategory] = useState("client");
  const [positionedField, setPositionedField] = useState(null);
  const [canvasPosition, setCanvasPosition] = useState({ x: 0, y: 0 });
  const [dragEnabled, setDragEnabled] = useState(true);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [gridEnabled, setGridEnabled] = useState(false);
  const [gridSize, setGridSize] = useState(5); // Grid size in mm
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState(0.5);
  const [showAddFieldDialog, setShowAddFieldDialog] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [fieldToDuplicate, setFieldToDuplicate] = useState(null);
  const [duplicateTargetPage, setDuplicateTargetPage] = useState(0);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [fieldToRemove, setFieldToRemove] = useState(null);
  const [newField, setNewField] = useState({
    id: "",
    label: "",
    type: "text",
    category: "general",
    isVisible: true,
    value: "",
    position: { x: 20, y: 20 },
    page: 0
  });
  
  const canvasRef = useRef(null);
  const isDragging = useRef(false);
  
  useEffect(() => {
    // Reset positioned field when page changes
    setPositionedField(null);
    setPageLoaded(false);
  }, [activePage]);
  
  // Fonction pour gérer le redimensionnement de la fenêtre
  useEffect(() => {
    const handleResize = () => {
      // Réinitialiser le champ positionné si on est en train de faire glisser
      if (positionedField) {
        setPositionedField(null);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [positionedField]);
  
  // Gérer la touche Escape pour annuler le positionnement
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && positionedField) {
        setPositionedField(null);
        isDragging.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [positionedField]);
  
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
    toast.success(`Visibilité du champ modifiée`);
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
    toast.success(`Champ déplacé sur la page ${page + 1}`);
  };
  
  // Obtenir l'image de fond de la page actuelle
  const getCurrentPageBackground = () => {
    if (template?.templateImages && template.templateImages.length > 0) {
      // Recherche de l'image correspondant à la page actuelle
      const pageImage = template.templateImages.find(img => img.page === activePage);
      
      if (pageImage && pageImage.url) {
        // Ajouter un timestamp pour éviter les problèmes de cache
        return `${pageImage.url}?t=${new Date().getTime()}`;
      } else {
        return null;
      }
    }
    return null;
  };

  // Calculer la position sur la grille
  const snapToGrid = (position) => {
    if (!gridEnabled) return position;
    
    return {
      x: Math.round(position.x / gridSize) * gridSize,
      y: Math.round(position.y / gridSize) * gridSize
    };
  };
  
  // Gérer le déplacement d'un champ sur le canvas
  const handleCanvasMouseMove = (e) => {
    if (positionedField && isDragging.current) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      
      // Get the canvas dimensions
      const canvasWidth = rect.width;
      const canvasHeight = rect.height;
      
      // Calculate the ratio between the canvas and the actual page size (in mm)
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      
      // Scale down to account for the transform scale in the UI
      const scaleRatio = {
        x: (pageWidth / zoomLevel) / canvasWidth,
        y: (pageHeight / zoomLevel) / canvasHeight
      };
      
      // Calculate position in mm relative to the page, accounting for the drag offset
      const rawX = (e.clientX - rect.left) * scaleRatio.x - dragOffset.x;
      const rawY = (e.clientY - rect.top) * scaleRatio.y - dragOffset.y;
      
      // Constrain to page boundaries
      const x = Math.max(0, Math.min(pageWidth, rawX));
      const y = Math.max(0, Math.min(pageHeight, rawY));
      
      // Snap to grid if enabled
      const snappedPosition = snapToGrid({ x, y });
      
      setCanvasPosition(snappedPosition);
    }
  };

  const handleCanvasMouseDown = (e) => {
    if (positionedField) {
      isDragging.current = true;
      
      // Prevent default browser behavior
      e.preventDefault();
    }
  };
  
  const handleCanvasMouseUp = () => {
    if (positionedField && isDragging.current) {
      updateFieldPosition(positionedField, canvasPosition, activePage);
      toast.success(`Position mise à jour`);
      
      // Keep the field selected for further adjustments but stop the drag operation
      isDragging.current = false;
    }
  };

  const handleCanvasMouseLeave = () => {
    if (isDragging.current) {
      isDragging.current = false;
    }
  };
  
  // Gérer le début du positionnement d'un champ
  const startPositioning = (fieldId, initialPosition) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;
    
    setPositionedField(fieldId);
    setCanvasPosition(initialPosition);
    
    // Calculate drag offset to prevent the field from jumping
    setDragOffset({ x: 0, y: 0 });
    
    // Si le champ est sur une autre page, le déplacer sur la page actuelle
    if (field.page !== activePage) {
      updateFieldPage(fieldId, activePage);
    }
  };
  
  const getCategoryIcon = (categoryId) => {
    const Icon = CATEGORY_ICONS[categoryId] || Layout;
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

  // Delete a field
  const handleDeleteField = (fieldId) => {
    // If the field is currently positioned, clear the positioning
    if (fieldId === positionedField) {
      setPositionedField(null);
    }
    
    // Call the delete function passed from the parent
    if (onDeleteField) {
      onDeleteField(fieldId);
    }
  };

  // Handle opening the remove field dialog
  const handleOpenRemoveDialog = (field) => {
    setFieldToRemove(field);
    setShowRemoveDialog(true);
  };

  // Handle removing a field from current page
  const handleRemoveFieldFromPage = () => {
    if (fieldToRemove && onRemoveFieldFromPage) {
      onRemoveFieldFromPage(fieldToRemove.id, fieldToRemove.page);
      setShowRemoveDialog(false);
      
      // If the field is currently positioned, clear the positioning
      if (fieldToRemove.id === positionedField) {
        setPositionedField(null);
      }
    }
  };

  // Handle opening the duplicate field dialog
  const handleOpenDuplicateDialog = (field) => {
    // Find pages that don't already have this field
    const existingPages = fields
      .filter(f => f.id === field.id || f.id.startsWith(`${field.id}_page`))
      .map(f => f.page);
    
    // Set the first available page as default target
    const availablePages = Array.from({ length: template?.templateImages?.length || 1 }, (_, i) => i)
      .filter(page => !existingPages.includes(page) && page !== field.page);
    
    setFieldToDuplicate(field);
    
    if (availablePages.length > 0) {
      setDuplicateTargetPage(availablePages[0]);
    } else {
      // If no available pages, just use the next page
      const nextPage = (field.page + 1) % (template?.templateImages?.length || 1);
      setDuplicateTargetPage(nextPage);
    }
    
    setShowDuplicateDialog(true);
  };

  // Handle duplicating a field to another page
  const handleDuplicateField = () => {
    if (fieldToDuplicate && onDuplicateField) {
      onDuplicateField(fieldToDuplicate.id, duplicateTargetPage);
      setShowDuplicateDialog(false);
    }
  };

  // Handle new field creation
  const handleAddNewField = () => {
    // Generate a unique ID based on the category
    const id = generateId(newField.category);
    
    // Create the new field
    const fieldToAdd = {
      ...newField,
      id,
      page: activePage,
      position: { x: 20, y: 20 } // Default position
    };
    
    // Add the field
    if (onAddField) {
      onAddField(fieldToAdd);
      
      // Reset the form
      setNewField({
        id: "",
        label: "",
        type: "text",
        category: "general",
        isVisible: true,
        value: "",
        position: { x: 20, y: 20 },
        page: 0
      });
      
      // Close the dialog
      setShowAddFieldDialog(false);
    }
  };

  // Déterminer le nombre total de pages
  const totalPages = template?.templateImages?.length || 1;

  // Fonction pour dessiner la grille
  const renderGrid = () => {
    if (!gridEnabled) return null;
    
    const gridLines = [];
    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    
    // Lignes horizontales
    for (let y = 0; y <= pageHeight; y += gridSize) {
      gridLines.push(
        <line 
          key={`h-${y}`} 
          x1="0" 
          y1={`${y}mm`} 
          x2={`${pageWidth}mm`} 
          y2={`${y}mm`} 
          stroke="#ccc" 
          strokeWidth="0.2"
          strokeDasharray="1,1"
        />
      );
    }
    
    // Lignes verticales
    for (let x = 0; x <= pageWidth; x += gridSize) {
      gridLines.push(
        <line 
          key={`v-${x}`} 
          x1={`${x}mm`} 
          y1="0" 
          x2={`${x}mm`} 
          y2={`${pageHeight}mm`} 
          stroke="#ccc" 
          strokeWidth="0.2"
          strokeDasharray="1,1"
        />
      );
    }
    
    return (
      <svg 
        className="absolute top-0 left-0 w-full h-full pointer-events-none" 
        style={{ zIndex: 1 }}
      >
        {gridLines}
      </svg>
    );
  };
  
  // Gérer les touches fléchées pour ajuster la position avec précision
  const handleKeyDown = (e) => {
    if (!positionedField) return;
    
    const step = gridEnabled ? gridSize : 1;
    let newPosition = { ...canvasPosition };
    
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        newPosition.y = Math.max(0, newPosition.y - step);
        break;
      case 'ArrowDown':
        e.preventDefault();
        newPosition.y = Math.min(297, newPosition.y + step);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        newPosition.x = Math.max(0, newPosition.x - step);
        break;
      case 'ArrowRight':
        e.preventDefault();
        newPosition.x = Math.min(210, newPosition.x + step);
        break;
      default:
        return;
    }
    
    setCanvasPosition(newPosition);
    updateFieldPosition(positionedField, newPosition, activePage);
  };

  // Filtrer les champs pour afficher uniquement ceux de la page courante
  const getCurrentPageFields = () => {
    return fields.filter(f => f.page === activePage || (activePage === 0 && f.page === undefined));
  };
  
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {/* Panneau de gauche : Liste des champs disponibles */}
      <div className="md:col-span-1">
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium">Champs disponibles</h3>
              <Dialog open={showAddFieldDialog} onOpenChange={setShowAddFieldDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center">
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter un champ
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Ajouter un nouveau champ</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="field-label">Nom du champ</Label>
                      <Input 
                        id="field-label" 
                        value={newField.label} 
                        onChange={(e) => setNewField({...newField, label: e.target.value})}
                        placeholder="Ex: Numéro de téléphone client"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="field-value">Valeur du champ</Label>
                      <Input 
                        id="field-value" 
                        value={newField.value} 
                        onChange={(e) => setNewField({...newField, value: e.target.value})}
                        placeholder="Ex: {clients.phone} ou texte statique"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="field-category">Catégorie</Label>
                        <Select 
                          value={newField.category} 
                          onValueChange={(value) => setNewField({...newField, category: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Catégorie" />
                          </SelectTrigger>
                          <SelectContent>
                            {FIELD_CATEGORIES.map(category => (
                              <SelectItem key={category.id} value={category.id}>
                                <div className="flex items-center">
                                  {React.createElement(category.icon, { className: "h-4 w-4 mr-2" })}
                                  {category.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="field-type">Type</Label>
                        <Select 
                          value={newField.type} 
                          onValueChange={(value) => setNewField({...newField, type: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            {FIELD_TYPES.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleAddNewField} disabled={!newField.label || !newField.value}>
                      Ajouter le champ
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <Tabs defaultValue={activeCategory} onValueChange={setActiveCategory}>
              <TabsList className="grid grid-cols-2 md:grid-cols-5 mb-4">
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
                  
                  {/* Section pour les champs sur la page actuelle */}
                  <div className="mb-6">
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">
                      Champs sur la page {activePage + 1}
                    </h4>
                    
                    {getCurrentPageFields().filter(field => field.category === category.id).length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center p-4 bg-gray-50 rounded-md">
                        Aucun champ {category.label} sur la page {activePage + 1}
                      </div>
                    ) : (
                      <Accordion type="multiple" className="space-y-2">
                        {getCurrentPageFields()
                          .filter(field => field.category === category.id)
                          .map((field) => (
                            <AccordionItem 
                              key={field.id} 
                              value={field.id} 
                              className={`border rounded-md ${field.id === positionedField ? 'bg-blue-50 border-blue-500' : ''}`}
                            >
                              <AccordionTrigger className="px-3 py-2 text-sm">
                                <div className="flex items-center justify-between w-full">
                                  <span className="font-medium">{field.label}</span>
                                  <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                        >
                                          <AlertCircle className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        
                                        <DropdownMenuItem 
                                          onClick={() => handleOpenDuplicateDialog(field)}
                                          className="cursor-pointer"
                                        >
                                          <Copy className="mr-2 h-4 w-4" />
                                          <span>Dupliquer sur une autre page</span>
                                        </DropdownMenuItem>
                                        
                                        <DropdownMenuItem 
                                          onClick={() => handleOpenRemoveDialog(field)}
                                          className="cursor-pointer text-red-500 hover:text-red-700"
                                        >
                                          <Unlink className="mr-2 h-4 w-4" />
                                          <span>Retirer de cette page</span>
                                        </DropdownMenuItem>
                                        
                                        <DropdownMenuItem
                                          onClick={() => handleDeleteField(field.id)}
                                          className="cursor-pointer text-red-600 hover:text-red-700"
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          <span>Supprimer complètement</span>
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                    
                                    <Switch
                                      checked={field.isVisible}
                                      onCheckedChange={() => toggleFieldVisibility(field.id)}
                                    />
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className={`h-7 w-7 ${field.id === positionedField ? 'bg-blue-100' : ''}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        
                                        // Si le champ est déjà sélectionné, le désélectionner
                                        if (field.id === positionedField) {
                                          setPositionedField(null);
                                        } else {
                                          startPositioning(field.id, field.position);
                                        }
                                      }}
                                      disabled={!field.isVisible}
                                    >
                                      <Grip className="h-4 w-4" />
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
                                    <span className="text-xs">{field.page !== undefined ? field.page + 1 : 1}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs">Valeur:</Label>
                                    <span className="text-xs truncate max-w-[150px]" title={field.value}>{field.value}</span>
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))
                        }
                      </Accordion>
                    )}
                  </div>
                  
                  {/* Section pour tous les autres champs disponibles */}
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">
                      Tous les champs disponibles
                    </h4>
                    
                    {fieldsByCategory[category.id]?.length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center p-4 bg-gray-50 rounded-md">
                        Aucun champ dans cette catégorie
                      </div>
                    ) : (
                      <Accordion type="multiple" className="space-y-2">
                        {fieldsByCategory[category.id]
                          ?.filter(field => field.page !== activePage && !(activePage === 0 && field.page === undefined))
                          .map((field) => (
                            <AccordionItem 
                              key={field.id} 
                              value={`all_${field.id}`} 
                              className="border rounded-md bg-gray-50"
                            >
                              <AccordionTrigger className="px-3 py-2 text-sm">
                                <div className="flex items-center justify-between w-full">
                                  <span className="font-medium text-muted-foreground">{field.label}</span>
                                  <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => handleOpenDuplicateDialog(field)}
                                    >
                                      <Copy className="h-3 w-3 mr-1" />
                                      Ajouter à cette page
                                    </Button>
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-3 py-2">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs">Page:</Label>
                                    <span className="text-xs">{field.page !== undefined ? field.page + 1 : 1}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs">Valeur:</Label>
                                    <span className="text-xs truncate max-w-[150px]" title={field.value}>{field.value}</span>
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))
                        }
                      </Accordion>
                    )}
                  </div>
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
                      Glisser-déposer
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 mr-2">
                    <Switch
                      checked={gridEnabled}
                      onCheckedChange={setGridEnabled}
                      id="grid-mode"
                    />
                    <Label htmlFor="grid-mode" className="text-xs">
                      Grille
                    </Label>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4 w-1/3">
                  <Label className="text-xs whitespace-nowrap">Taille grille:</Label>
                  <Slider
                    value={[gridSize]}
                    min={1}
                    max={20}
                    step={1}
                    onValueChange={(values) => setGridSize(values[0])}
                    disabled={!gridEnabled}
                    className="w-full"
                  />
                  <span className="text-xs whitespace-nowrap">{gridSize}mm</span>
                </div>
                
                <div className="flex items-center space-x-4 w-1/3">
                  <Label className="text-xs whitespace-nowrap">Zoom:</Label>
                  <Slider
                    value={[zoomLevel * 100]}
                    min={30}
                    max={100}
                    step={5}
                    onValueChange={(values) => setZoomLevel(values[0] / 100)}
                    className="w-full"
                  />
                  <span className="text-xs whitespace-nowrap">{Math.round(zoomLevel * 100)}%</span>
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
                    onClick={() => onPageChange(Math.min(totalPages - 1, activePage + 1))}
                    disabled={activePage === totalPages - 1}
                  >
                    Page suivante
                  </Button>
                </div>
              </div>
              
              {/* Canvas pour positionner les champs */}
              <div
                ref={canvasRef}
                className="border rounded-md bg-white p-4 relative h-[450px] overflow-auto"
                style={{ 
                  minHeight: "450px", 
                  cursor: positionedField && isDragging.current ? "grabbing" : positionedField ? "grab" : "default",
                }}
                onMouseMove={handleCanvasMouseMove}
                onMouseDown={handleCanvasMouseDown}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseLeave}
                onKeyDown={handleKeyDown}
                tabIndex={0} // Nécessaire pour recevoir les événements de clavier
              >
                {/* Document A4 simulé (échelle réduite) */}
                <div 
                  className="bg-white border border-gray-200 shadow"
                  style={{
                    width: "210mm", 
                    height: "297mm",
                    transform: `scale(${zoomLevel})`,
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
                      
                      {/* Grille si activée */}
                      {renderGrid()}
                      
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
                      
                      {/* Grille si activée */}
                      {renderGrid()}
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
                          cursor: dragEnabled ? "grab" : "default",
                          padding: "4px 6px",
                          backgroundColor: positionedField === field.id ? "rgba(59, 130, 246, 0.2)" : "rgba(255, 255, 255, 0.8)",
                          fontSize: "10px",
                          fontWeight: positionedField === field.id ? "bold" : "normal",
                          whiteSpace: "nowrap",
                          zIndex: positionedField === field.id ? 20 : 10,
                          boxShadow: positionedField === field.id ? "0 2px 8px rgba(0,0,0,0.2)" : "0 1px 3px rgba(0,0,0,0.1)"
                        }}
                        onMouseDown={(e) => {
                          if (dragEnabled) {
                            e.stopPropagation();
                            e.preventDefault();
                            
                            // Si le champ est déjà sélectionné, commencer le glisser-déposer
                            if (field.id === positionedField) {
                              isDragging.current = true;
                              
                              // Calculer l'offset pour que le champ ne saute pas
                              const rect = e.currentTarget.getBoundingClientRect();
                              const canvasRect = canvasRef.current.getBoundingClientRect();
                              
                              // Convertir les positions de pixel en mm
                              const pageWidth = 210; // A4 width in mm
                              const pageHeight = 297; // A4 height in mm
                              
                              const scaleRatio = {
                                x: (pageWidth / zoomLevel) / canvasRect.width,
                                y: (pageHeight / zoomLevel) / canvasRect.height
                              };
                              
                              // Calculer l'offset en mm
                              const clickOffsetX = (e.clientX - rect.left) * scaleRatio.x;
                              const clickOffsetY = (e.clientY - rect.top) * scaleRatio.y;
                              
                              setDragOffset({ x: clickOffsetX, y: clickOffsetY });
                            } else {
                              // Sinon, sélectionner ce champ
                              startPositioning(field.id, field.position);
                            }
                          }
                        }}
                      >
                        <div className="flex items-center gap-1">
                          {getCategoryIcon(field.category)}
                          <span>{field.label}</span>
                        </div>
                      </div>
                    ))}
                  
                  {/* Champ en cours de positionnement si différent de la position actuelle */}
                  {positionedField && isDragging.current && (
                    <div
                      className="absolute border-2 border-blue-500 bg-blue-100 p-1 z-50"
                      style={{
                        left: `${canvasPosition.x}mm`,
                        top: `${canvasPosition.y}mm`,
                        padding: "4px 6px",
                        fontSize: "10px",
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                        opacity: 0.8,
                        pointerEvents: "none"
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
              
              <div className="mt-4 text-sm text-muted-foreground space-y-1">
                <p>
                  <span className="font-semibold">Glisser-déposer:</span> Cliquez sur l'icône <Grip className="inline h-4 w-4" /> d'un champ pour le sélectionner, puis cliquez et glissez sur le document.
                </p>
                <p>
                  <span className="font-semibold">Ajustement précis:</span> Utilisez les touches fléchées ↑↓←→ pour ajuster finement la position du champ sélectionné.
                </p>
                <p>
                  <span className="font-semibold">Gestion des pages:</span> Utilisez le menu d'actions <AlertCircle className="inline h-4 w-4" /> pour dupliquer un champ sur une autre page ou le retirer d'une page spécifique.
                </p>
                <p>
                  <span className="font-semibold">Suppression:</span> Pour supprimer définitivement un champ, utilisez l'option "Supprimer complètement" dans le menu d'actions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Dialog de duplication sur une autre page */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dupliquer le champ sur une autre page</DialogTitle>
            <DialogDescription>
              Sélectionnez la page sur laquelle vous souhaitez dupliquer le champ "{fieldToDuplicate?.label}".
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Label htmlFor="duplicate-page">Page cible</Label>
            <Select 
              value={duplicateTargetPage.toString()} 
              onValueChange={(value) => setDuplicateTargetPage(parseInt(value))}
            >
              <SelectTrigger id="duplicate-page">
                <SelectValue placeholder="Sélectionner une page" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: totalPages }, (_, i) => (
                  <SelectItem key={i} value={i.toString()} disabled={i === fieldToDuplicate?.page}>
                    Page {i + 1} {i === fieldToDuplicate?.page ? "(page actuelle)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDuplicateDialog(false)}>Annuler</Button>
            <Button onClick={handleDuplicateField}>Dupliquer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog de suppression d'une page */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retirer le champ de cette page</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir retirer le champ "{fieldToRemove?.label}" de la page {fieldToRemove?.page + 1} ?
              <br /><br />
              <strong>Note:</strong> Cette action ne supprime pas complètement le champ. Pour supprimer définitivement le champ, utilisez l'option "Supprimer complètement".
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRemoveDialog(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleRemoveFieldFromPage}>Retirer de cette page</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PDFFieldsEditor;
