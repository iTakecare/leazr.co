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
  AlertCircle,
  Copy,
  Link,
  Unlink,
  X,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Move,
  Bold,
  Italic,
  Underline,
  Type
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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

const FONT_SIZES = [
  { value: 6, label: "6pt" },
  { value: 8, label: "8pt" },
  { value: 9, label: "9pt" },
  { value: 10, label: "10pt" },
  { value: 11, label: "11pt" },
  { value: 12, label: "12pt" },
  { value: 14, label: "14pt" },
  { value: 16, label: "16pt" },
  { value: 18, label: "18pt" },
  { value: 20, label: "20pt" },
  { value: 24, label: "24pt" }
];

const CATEGORY_ICONS = {
  client: User,
  offer: FileText,
  equipment: Package,
  user: BookUser,
  general: Layout
};

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
  const [gridSize, setGridSize] = useState(1);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState(0.5);
  const [showAddFieldDialog, setShowAddFieldDialog] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [fieldToDuplicate, setFieldToDuplicate] = useState(null);
  const [duplicateTargetPage, setDuplicateTargetPage] = useState(0);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [fieldToRemove, setFieldToRemove] = useState(null);
  const [directPositionMode, setDirectPositionMode] = useState(false);
  const [stepSize, setStepSize] = useState(0.5);
  const [manualPosition, setManualPosition] = useState({ x: 0, y: 0 });
  const [showTextStyleDialog, setShowTextStyleDialog] = useState(false);
  const [fieldToStyle, setFieldToStyle] = useState(null);
  const [newField, setNewField] = useState({
    id: "",
    label: "",
    type: "text",
    category: "general",
    isVisible: true,
    value: "",
    position: { x: 20, y: 20 },
    page: 0,
    style: {
      fontSize: 10,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none'
    }
  });
  
  const canvasRef = useRef(null);
  const isDragging = useRef(false);
  const initialClickOffset = useRef({ x: 0, y: 0 });
  
  useEffect(() => {
    setPositionedField(null);
    setPageLoaded(false);
  }, [activePage]);
  
  useEffect(() => {
    const handleResize = () => {
      if (positionedField) {
        setPositionedField(null);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [positionedField]);
  
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
  
  const fieldsByCategory = fields.reduce((acc, field) => {
    if (!acc[field.category]) {
      acc[field.category] = [];
    }
    
    // Ensure field has isVisible property, defaulting to true if not present
    const fieldWithVisibility = {
      ...field,
      isVisible: field.isVisible !== undefined ? field.isVisible : true
    };
    
    acc[field.category].push(fieldWithVisibility);
    return acc;
  }, {});
  
  const toggleFieldVisibility = (fieldId) => {
    const newFields = fields.map(field => 
      field.id === fieldId ? { ...field, isVisible: !field.isVisible } : field
    );
    onChange(newFields);
    toast.success(`Visibilité du champ modifiée`);
  };
  
  const updateFieldPosition = (fieldId, newPosition, page = activePage) => {
    const precisePosition = {
      x: parseFloat(newPosition.x.toFixed(1)),
      y: parseFloat(newPosition.y.toFixed(1))
    };
    
    const newFields = fields.map(field => 
      field.id === fieldId ? { ...field, position: precisePosition, page } : field
    );
    onChange(newFields);
  };
  
  const updateFieldPage = (fieldId, page) => {
    const newFields = fields.map(field => 
      field.id === fieldId ? { ...field, page } : field
    );
    onChange(newFields);
    toast.success(`Champ déplacé sur la page ${page + 1}`);
  };

  const updateFieldStyle = (fieldId, styleUpdates) => {
    const newFields = fields.map(field => {
      if (field.id === fieldId) {
        // Ensure the field has a style property, create it if it doesn't exist
        const currentStyle = field.style || {
          fontSize: 10,
          fontWeight: 'normal',
          fontStyle: 'normal',
          textDecoration: 'none'
        };
        
        // Update with new style properties
        return { 
          ...field, 
          style: { ...currentStyle, ...styleUpdates }
        };
      }
      return field;
    });
    
    onChange(newFields);
    toast.success(`Style du champ modifié`);
  };
  
  const getCurrentPageBackground = () => {
    if (template?.templateImages && template.templateImages.length > 0) {
      const pageImage = template.templateImages.find(img => img.page === activePage);
      
      if (pageImage && pageImage.url) {
        return `${pageImage.url}?t=${new Date().getTime()}`;
      } else {
        return null;
      }
    }
    return null;
  };

  const snapToGrid = (position) => {
    if (!gridEnabled) return position;
    
    return {
      x: Math.round(position.x / gridSize) * gridSize,
      y: Math.round(position.y / gridSize) * gridSize
    };
  };
  
  const calculatePrecisePosition = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    
    const pageWidth = 210;
    const pageHeight = 297;
    
    const scaleRatio = {
      x: pageWidth / (rect.width * zoomLevel),
      y: pageHeight / (rect.height * zoomLevel)
    };
    
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;
    
    const mmX = cursorX * scaleRatio.x - initialClickOffset.current.x;
    const mmY = cursorY * scaleRatio.y - initialClickOffset.current.y;
    
    const x = Math.max(0, Math.min(pageWidth, mmX));
    const y = Math.max(0, Math.min(pageHeight, mmY));
    
    return { x, y };
  };
  
  const handleCanvasMouseMove = (e) => {
    if (positionedField && isDragging.current && dragEnabled) {
      const position = calculatePrecisePosition(e);
      
      const snappedPosition = gridEnabled 
        ? snapToGrid(position) 
        : { 
          x: parseFloat(position.x.toFixed(1)), 
          y: parseFloat(position.y.toFixed(1)) 
        };
      
      setCanvasPosition(snappedPosition);
      
      updateFieldPosition(positionedField, snappedPosition, activePage);
    }
  };

  const handleCanvasMouseDown = (e) => {
    if (positionedField && dragEnabled) {
      const field = fields.find(f => f.id === positionedField);
      if (!field) return;
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      
      const fieldPositionPx = {
        x: (field.position.x * rect.width * zoomLevel) / 210,
        y: (field.position.y * rect.height * zoomLevel) / 297
      };
      
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      
      initialClickOffset.current = {
        x: (clickX * 210) / (rect.width * zoomLevel) - field.position.x,
        y: (clickY * 297) / (rect.height * zoomLevel) - field.position.y
      };
      
      isDragging.current = true;
      e.preventDefault();
    }
  };
  
  const handleCanvasMouseUp = () => {
    if (positionedField && isDragging.current) {
      const precisePosition = {
        x: parseFloat(canvasPosition.x.toFixed(1)),
        y: parseFloat(canvasPosition.y.toFixed(1))
      };
      
      updateFieldPosition(positionedField, precisePosition, activePage);
      toast.success(`Position mise à jour: (${precisePosition.x.toFixed(1)}, ${precisePosition.y.toFixed(1)})`);
      
      isDragging.current = false;
    }
  };

  const handleCanvasMouseLeave = () => {
    if (isDragging.current) {
      isDragging.current = false;
    }
  };
  
  const getCurrentPageFields = () => {
    // Ensure each field has isVisible property, defaulting to true if not present
    return fields.filter(f => f.page === activePage || (activePage === 0 && (f.page === undefined || f.page === null)))
      .map(field => ({
        ...field,
        isVisible: field.isVisible !== undefined ? field.isVisible : true
      }));
  };
  
  const startPositioning = (fieldId, initialPosition) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;
    
    setPositionedField(fieldId);
    setCanvasPosition(initialPosition);
    setManualPosition(initialPosition);
    
    initialClickOffset.current = { x: 0, y: 0 };
    
    if (field.page !== activePage && field.page !== null) {
      updateFieldPage(fieldId, activePage);
    } else if (field.page === null) {
      updateFieldPage(fieldId, activePage);
    }
  };
  
  const applyPreciseMovement = (direction) => {
    if (!positionedField) return;
    
    let newPosition = { ...canvasPosition };
    
    switch (direction) {
      case 'up':
        newPosition.y = Math.max(0, newPosition.y - stepSize);
        break;
      case 'down':
        newPosition.y = Math.min(297, newPosition.y + stepSize);
        break;
      case 'left':
        newPosition.x = Math.max(0, newPosition.x - stepSize);
        break;
      case 'right':
        newPosition.x = Math.min(210, newPosition.x + stepSize);
        break;
    }
    
    newPosition = {
      x: parseFloat(newPosition.x.toFixed(1)),
      y: parseFloat(newPosition.y.toFixed(1))
    };
    
    setCanvasPosition(newPosition);
    updateFieldPosition(positionedField, newPosition, activePage);
  };
  
  const handleManualPositionChange = (axis, value) => {
    const parsedValue = parseFloat(value);
    
    if (!isNaN(parsedValue)) {
      const newPosition = { ...manualPosition };
      
      if (axis === 'x') {
        newPosition.x = Math.min(210, Math.max(0, parsedValue));
      } else {
        newPosition.y = Math.min(297, Math.max(0, parsedValue));
      }
      
      setManualPosition(newPosition);
    }
  };
  
  const applyManualPosition = () => {
    if (positionedField) {
      const precisePosition = {
        x: parseFloat(manualPosition.x.toFixed(1)),
        y: parseFloat(manualPosition.y.toFixed(1))
      };
      
      setCanvasPosition(precisePosition);
      updateFieldPosition(positionedField, precisePosition, activePage);
      toast.success(`Position définie manuellement: (${precisePosition.x.toFixed(1)}, ${precisePosition.y.toFixed(1)})`);
    }
  };
  
  const getCategoryIcon = (categoryId) => {
    const Icon = CATEGORY_ICONS[categoryId] || Layout;
    return <Icon className="h-4 w-4 mr-2" />;
  };
  
  const handleImageError = (e) => {
    console.error("Erreur de chargement de l'image:", e.target.src);
    e.target.src = "/placeholder.svg";
    
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
  
  const handleImageLoad = () => {
    console.log("Image chargée avec succès");
    setPageLoaded(true);
  };

  const quickRemoveField = (fieldId, page, e) => {
    e.stopPropagation();
    
    if (onRemoveFieldFromPage) {
      onRemoveFieldFromPage(fieldId, page);
      
      if (fieldId === positionedField) {
        setPositionedField(null);
      }
      
      toast.success(`Champ supprimé de la page ${page + 1}`);
    }
  };

  const handleOpenRemoveDialog = (field) => {
    setFieldToRemove(field);
    setShowRemoveDialog(true);
  };

  const handleRemoveFieldFromPage = () => {
    if (fieldToRemove && onRemoveFieldFromPage) {
      onRemoveFieldFromPage(fieldToRemove.id, fieldToRemove.page);
      setShowRemoveDialog(false);
      
      if (fieldToRemove.id === positionedField) {
        setPositionedField(null);
      }
    }
  };

  const handleDeleteField = (fieldId) => {
    if (fieldId === positionedField) {
      setPositionedField(null);
    }
    
    if (onDeleteField) {
      onDeleteField(fieldId);
    }
  };

  const handleOpenDuplicateDialog = (field) => {
    const existingPages = fields
      .filter(f => f.id === field.id || f.id.startsWith(`${field.id}_page`))
      .map(f => f.page);
    
    const availablePages = Array.from({ length: template?.templateImages?.length || 1 }, (_, i) => i)
      .filter(page => !existingPages.includes(page) && page !== field.page);
    
    setFieldToDuplicate(field);
    
    if (availablePages.length > 0) {
      setDuplicateTargetPage(availablePages[0]);
    } else {
      const nextPage = (field.page + 1) % (template?.templateImages?.length || 1);
      setDuplicateTargetPage(nextPage);
    }
    
    setShowDuplicateDialog(true);
  };

  const handleDuplicateField = () => {
    if (fieldToDuplicate && onDuplicateField) {
      onDuplicateField(fieldToDuplicate.id, duplicateTargetPage);
      setShowDuplicateDialog(false);
    }
  };

  const handleOpenTextStyleDialog = (field) => {
    setFieldToStyle(field);
    setShowTextStyleDialog(true);
  };

  const handleAddNewField = () => {
    const id = generateId(newField.category);
    
    const fieldToAdd = {
      ...newField,
      id,
      page: activePage,
      position: { x: 20, y: 20 },
      style: newField.style || {
        fontSize: 10,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none'
      }
    };
    
    if (onAddField) {
      onAddField(fieldToAdd);
      
      setNewField({
        id: "",
        label: "",
        type: "text",
        category: "general",
        isVisible: true,
        value: "",
        position: { x: 20, y: 20 },
        page: 0,
        style: {
          fontSize: 10,
          fontWeight: 'normal',
          fontStyle: 'normal',
          textDecoration: 'none'
        }
      });
      
      setShowAddFieldDialog(false);
    }
  };

  const handleKeyDown = (e) => {
    if (!positionedField) return;
    
    let handled = true;
    
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        applyPreciseMovement('up');
        break;
      case 'ArrowDown':
        e.preventDefault();
        applyPreciseMovement('down');
        break;
      case 'ArrowLeft':
        e.preventDefault();
        applyPreciseMovement('left');
        break;
      case 'ArrowRight':
        e.preventDefault();
        applyPreciseMovement('right');
        break;
      default:
        handled = false;
    }
    
    if (handled) {
      e.preventDefault();
    }
  };

  const handleRemoveFieldLabel = (e, field) => {
    e.stopPropagation();
    
    setFieldToRemove(field);
    setShowRemoveDialog(true);
  };

  const getFieldStyle = (field) => {
    // Default style if none exists
    const defaultStyle = {
      fontSize: 10,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none'
    };
    
    return field.style || defaultStyle;
  };

  const getTextStylePreview = (style) => {
    const fontWeight = style.fontWeight === 'bold' ? 'font-bold' : 'font-normal';
    const fontStyle = style.fontStyle === 'italic' ? 'italic' : 'not-italic';
    const textDecoration = style.textDecoration === 'underline' ? 'underline' : 'no-underline';
    
    return `${fontWeight} ${fontStyle} ${textDecoration}`;
  };

  const totalPages = template?.templateImages?.length || 1;

  return (
    <div className="grid md:grid-cols-3 gap-6">
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
                  
                  <div className="mb-6">
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">
                      Champs sur la page {activePage + 1}
                    </h4>
                    
                    {getCurrentPageFields().filter(field => field.category === category.id).length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center p-4 bg-gray-50 rounded-md">
                        Aucun champ {category.label} sur la page {activePage + 1}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {getCurrentPageFields()
                          .filter(field => field.category === category.id)
                          .map((field) => (
                            <div 
                              key={field.id} 
                              className={`border rounded-md p-2 ${field.id === positionedField ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'}`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center flex-grow overflow-hidden">
                                  {getCategoryIcon(field.category)}
                                  <span className="font-medium text-sm truncate" title={field.label}>
                                    {field.label}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-gray-400 hover:text-red-500"
                                    onClick={(e) => quickRemoveField(field.id, field.page, e)}
                                    title="Supprimer de cette page"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                  
                                  <Switch
                                    checked={field.isVisible !== undefined ? field.isVisible : true}
                                    onCheckedChange={() => toggleFieldVisibility(field.id)}
                                    className="scale-75"
                                  />
                                  
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-6 w-6 ${field.id === positionedField ? 'bg-blue-100' : ''}`}
                                    onClick={() => {
                                      if (field.id === positionedField) {
                                        setPositionedField(null);
                                      } else {
                                        startPositioning(field.id, field.position);
                                      }
                                    }}
                                    disabled={field.isVisible === false}
                                    title="Positionner"
                                  >
                                    <Grip className="h-3.5 w-3.5" />
                                  </Button>
                                  
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => handleOpenTextStyleDialog(field)}
                                    title="Mise en forme du texte"
                                  >
                                    <Type className="h-3.5 w-3.5" />
                                  </Button>
                                  
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                      >
                                        <AlertCircle className="h-3.5 w-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                      <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      
                                      <DropdownMenuItem 
                                        onClick={() => handleOpenDuplicateDialog(field)}
                                        className="cursor-pointer text-xs"
                                      >
                                        <Copy className="mr-2 h-3.5 w-3.5" />
                                        <span>Dupliquer sur une autre page</span>
                                      </DropdownMenuItem>
                                      
                                      <DropdownMenuItem 
                                        onClick={() => quickRemoveField(field.id, field.page, { stopPropagation: () => {} })}
                                        className="cursor-pointer text-red-500 hover:text-red-600 text-xs"
                                      >
                                        <Unlink className="mr-2 h-3.5 w-3.5" />
                                        <span>Retirer de cette page</span>
                                      </DropdownMenuItem>
                                      
                                      <DropdownMenuItem
                                        onClick={() => handleDeleteField(field.id)}
                                        className="cursor-pointer text-red-600 hover:text-red-700 text-xs"
                                      >
                                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                                        <span>Supprimer complètement</span>
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                              
                              <div className="mt-1 text-xs text-gray-500 flex justify-between">
                                <span>Type: {field.type}</span>
                                <span>Position: ({field.position.x.toFixed(1)}, {field.position.y.toFixed(1)})</span>
                              </div>
                              
                              <div className="mt-1 text-xs text-gray-500 flex items-center">
                                <span className="mr-2">Style:</span>
                                <span className={getTextStylePreview(getFieldStyle(field))}>
                                  {getFieldStyle(field).fontSize}pt
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2 flex justify-between items-center">
                      <span>Autres champs disponibles</span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          const fieldsToAdd = fieldsByCategory[category.id]
                            ?.filter(field => field.page !== activePage && !(activePage === 0 && field.page === undefined))
                            ?.filter(field => !getCurrentPageFields().some(f => f.id === field.id));
                          
                          if (fieldsToAdd && fieldsToAdd.length > 0) {
                            fieldsToAdd.forEach(field => {
                              onDuplicateField(field.id, activePage);
                            });
                            
                            toast.success(`${fieldsToAdd.length} champs ajoutés à la page ${activePage + 1}`);
                          } else {
                            toast.info("Aucun champ disponible à ajouter");
                          }
