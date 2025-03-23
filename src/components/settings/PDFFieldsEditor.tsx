
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
                        }}
                      >
                        Tout ajouter
                      </Button>
                    </h4>
                    
                    {/* List of other available fields not on current page */}
                    <div className="space-y-1">
                      {Object.values(fieldsByCategory[category.id] || [])
                        .filter(field => field.page !== activePage && !(activePage === 0 && field.page === undefined))
                        .filter(field => !getCurrentPageFields().some(f => f.id === field.id))
                        .map(field => (
                          <div 
                            key={field.id} 
                            className="border border-dashed rounded-md p-2 hover:bg-gray-50 cursor-pointer"
                            onClick={() => onDuplicateField(field.id, activePage)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 flex-grow overflow-hidden">
                                {getCategoryIcon(field.category)}
                                <span className="text-sm truncate" title={field.label}>
                                  {field.label}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDuplicateField(field.id, activePage);
                                }}
                                title="Ajouter à cette page"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            {field.page !== undefined && field.page !== null && (
                              <div className="mt-1 text-xs text-gray-500">
                                Page: {field.page + 1}
                              </div>
                            )}
                          </div>
                        ))}
                        
                      {Object.values(fieldsByCategory[category.id] || [])
                        .filter(field => field.page !== activePage && !(activePage === 0 && field.page === undefined))
                        .filter(field => !getCurrentPageFields().some(f => f.id === field.id))
                        .length === 0 && (
                        <div className="text-sm text-muted-foreground text-center p-4 bg-gray-50 rounded-md">
                          Tous les champs de cette catégorie sont déjà ajoutés
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
            
            {showTextStyleDialog && fieldToStyle && (
              <Dialog open={showTextStyleDialog} onOpenChange={setShowTextStyleDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Style du texte</DialogTitle>
                    <DialogDescription>
                      Modifier l&apos;apparence du champ &quot;{fieldToStyle.label}&quot;
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Taille de police</Label>
                      <Select 
                        value={getFieldStyle(fieldToStyle).fontSize.toString()} 
                        onValueChange={(value) => {
                          updateFieldStyle(fieldToStyle.id, { fontSize: parseInt(value) });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Taille" />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_SIZES.map(size => (
                            <SelectItem key={size.value} value={size.value.toString()}>
                              {size.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Style de texte</Label>
                      <div className="flex space-x-2">
                        <ToggleGroup type="multiple">
                          <ToggleGroupItem 
                            value="bold"
                            aria-label="Gras"
                            className={getFieldStyle(fieldToStyle).fontWeight === 'bold' ? 'bg-blue-100' : ''}
                            onClick={() => {
                              const currentWeight = getFieldStyle(fieldToStyle).fontWeight;
                              updateFieldStyle(fieldToStyle.id, { 
                                fontWeight: currentWeight === 'bold' ? 'normal' : 'bold' 
                              });
                            }}
                          >
                            <Bold className="h-4 w-4" />
                          </ToggleGroupItem>
                          
                          <ToggleGroupItem 
                            value="italic"
                            aria-label="Italique"
                            className={getFieldStyle(fieldToStyle).fontStyle === 'italic' ? 'bg-blue-100' : ''}
                            onClick={() => {
                              const currentStyle = getFieldStyle(fieldToStyle).fontStyle;
                              updateFieldStyle(fieldToStyle.id, { 
                                fontStyle: currentStyle === 'italic' ? 'normal' : 'italic'
                              });
                            }}
                          >
                            <Italic className="h-4 w-4" />
                          </ToggleGroupItem>
                          
                          <ToggleGroupItem 
                            value="underline"
                            aria-label="Souligné"
                            className={getFieldStyle(fieldToStyle).textDecoration === 'underline' ? 'bg-blue-100' : ''}
                            onClick={() => {
                              const currentDecoration = getFieldStyle(fieldToStyle).textDecoration;
                              updateFieldStyle(fieldToStyle.id, { 
                                textDecoration: currentDecoration === 'underline' ? 'none' : 'underline'
                              });
                            }}
                          >
                            <Underline className="h-4 w-4" />
                          </ToggleGroupItem>
                        </ToggleGroup>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <h4 className="font-medium text-sm mb-2">Aperçu</h4>
                      <div 
                        className={`p-4 border rounded-md ${getTextStylePreview(getFieldStyle(fieldToStyle))}`}
                        style={{ fontSize: `${getFieldStyle(fieldToStyle).fontSize}pt` }}
                      >
                        {fieldToStyle.label}
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            
            <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Dupliquer le champ</DialogTitle>
                  <DialogDescription>
                    Ajouter une copie du champ &quot;{fieldToDuplicate?.label}&quot; sur une autre page
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Sélectionner une page</Label>
                    <Select 
                      value={duplicateTargetPage.toString()} 
                      onValueChange={(value) => setDuplicateTargetPage(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Page" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: totalPages }, (_, i) => i)
                          .filter(page => page !== fieldToDuplicate?.page)
                          .map(page => (
                            <SelectItem key={page} value={page.toString()}>
                              Page {page + 1}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowDuplicateDialog(false)}>Annuler</Button>
                  <Button onClick={handleDuplicateField}>Dupliquer</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Supprimer le champ</DialogTitle>
                  <DialogDescription>
                    Êtes-vous sûr de vouloir supprimer ce champ de la page {fieldToRemove?.page !== undefined ? fieldToRemove.page + 1 : 1} ?
                  </DialogDescription>
                </DialogHeader>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowRemoveDialog(false)}>Annuler</Button>
                  <Button variant="destructive" onClick={handleRemoveFieldFromPage}>Supprimer</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
      
      <div className="md:col-span-2">
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-medium">Position des champs</h3>
                <span className="text-xs text-muted-foreground">Page {activePage + 1} / {totalPages}</span>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setActivePage(Math.max(0, activePage - 1))}
                  disabled={activePage === 0}
                >
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Page précédente
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setActivePage(Math.min(totalPages - 1, activePage + 1))}
                  disabled={activePage === totalPages - 1}
                >
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Page suivante
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex items-center space-x-1">
                  <Switch
                    id="show-grid"
                    checked={gridEnabled}
                    onCheckedChange={setGridEnabled}
                    className="scale-75"
                  />
                  <Label htmlFor="show-grid" className="text-xs">Grille</Label>
                </div>
                
                {gridEnabled && (
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-muted-foreground">Taille:</span>
                    <Select
                      value={gridSize.toString()}
                      onValueChange={(value) => setGridSize(parseFloat(value))}
                    >
                      <SelectTrigger className="h-7 w-20">
                        <SelectValue placeholder="Taille" />
                      </SelectTrigger>
                      <SelectContent>
                        {[0.5, 1, 2, 5, 10].map(size => (
                          <SelectItem key={size} value={size.toString()}>
                            {size} mm
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
            
            <div 
              className={`relative border rounded-md overflow-hidden ${!positionedField ? 'cursor-default' : 'cursor-move'}`}
              style={{
                width: '100%',
                height: '400px',
                position: 'relative'
              }}
              ref={canvasRef}
              onMouseMove={handleCanvasMouseMove}
              onMouseDown={handleCanvasMouseDown}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseLeave}
              onKeyDown={handleKeyDown}
              tabIndex={0}
            >
              {/* Background page image */}
              {getCurrentPageBackground() ? (
                <img
                  src={getCurrentPageBackground()}
                  alt={`Template page ${activePage + 1}`}
                  className="absolute top-0 left-0 w-full h-full object-contain"
                  onError={handleImageError}
                  onLoad={handleImageLoad}
                />
              ) : (
                <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-gray-50">
                  <p className="text-gray-400">Aucune image de modèle pour la page {activePage + 1}</p>
                </div>
              )}
              
              {/* Grid overlay if enabled */}
              {gridEnabled && (
                <div 
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)
                    `,
                    backgroundSize: `${gridSize * 3}px ${gridSize * 3}px`
                  }}
                />
              )}
              
              {/* Visible fields on this page */}
              {getCurrentPageFields()
                .filter(field => field.isVisible)
                .map(field => {
                  const htmlContent = field.value;
                  
                  const style = getFieldStyle(field);
                  const fontWeight = style.fontWeight;
                  const fontStyle = style.fontStyle;
                  const textDecoration = style.textDecoration;
                  
                  return (
                    <div 
                      key={field.id}
                      className={`absolute p-1 ${field.id === positionedField ? 'outline outline-2 outline-blue-500' : ''}`}
                      style={{
                        left: `${(field.position.x / 210) * 100}%`,
                        top: `${(field.position.y / 297) * 100}%`,
                        fontSize: `${style.fontSize / 10}rem`,
                        fontWeight,
                        fontStyle,
                        textDecoration,
                        transform: 'translate(0, 0)',
                        maxWidth: '80%',
                        zIndex: field.id === positionedField ? 10 : 1,
                        backgroundColor: field.id === positionedField ? 'rgba(200, 230, 255, 0.3)' : 'transparent',
                        cursor: positionedField === field.id ? 'move' : 'pointer',
                        userSelect: 'none'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (field.id === positionedField) {
                          setPositionedField(null);
                        } else {
                          startPositioning(field.id, field.position);
                        }
                      }}
                    >
                      {field.label}
                    </div>
                  );
                })}
                
              {/* Visual position control when positioning a field */}
              {positionedField && directPositionMode && (
                <div className="absolute bottom-4 right-4 bg-white border rounded-md p-2 space-y-2 z-20">
                  <div className="text-xs font-medium">Position précise</div>
                  
                  <div className="flex items-center space-x-2">
                    <Label className="w-6">X:</Label>
                    <Input 
                      type="number" 
                      className="h-7 w-16" 
                      value={manualPosition.x.toFixed(1)} 
                      onChange={(e) => handleManualPositionChange('x', e.target.value)}
                      min={0}
                      max={210}
                      step={0.1}
                    />
                    <span className="text-xs">mm</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Label className="w-6">Y:</Label>
                    <Input 
                      type="number" 
                      className="h-7 w-16" 
                      value={manualPosition.y.toFixed(1)} 
                      onChange={(e) => handleManualPositionChange('y', e.target.value)}
                      min={0}
                      max={297}
                      step={0.1}
                    />
                    <span className="text-xs">mm</span>
                  </div>
                  
                  <Button 
                    size="sm" 
                    className="w-full text-xs mt-1" 
                    onClick={applyManualPosition}
                  >
                    Appliquer
                  </Button>
                </div>
              )}
              
              {/* Position controls when a field is being positioned */}
              {positionedField && (
                <div className="absolute bottom-4 left-4 bg-white border rounded-md p-2 space-y-2 z-20">
                  <div className="text-xs font-medium mb-1">
                    {getCurrentPageFields().find(f => f.id === positionedField)?.label}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-1">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-7 w-7" 
                      onClick={() => applyPreciseMovement('left')}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex flex-col gap-1">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-7 w-7" 
                        onClick={() => applyPreciseMovement('up')}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-7 w-7" 
                        onClick={() => applyPreciseMovement('down')}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-7 w-7" 
                      onClick={() => applyPreciseMovement('right')}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Pas:</span>
                    <Select
                      value={stepSize.toString()}
                      onValueChange={(value) => setStepSize(parseFloat(value))}
                    >
                      <SelectTrigger className="h-7 w-16">
                        <SelectValue placeholder="Pas" />
                      </SelectTrigger>
                      <SelectContent>
                        {[0.1, 0.5, 1, 2, 5].map(size => (
                          <SelectItem key={size} value={size.toString()}>
                            {size} mm
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="pt-1 flex justify-between gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs"
                      onClick={() => setDirectPositionMode(!directPositionMode)}
                    >
                      {directPositionMode ? 'Masquer' : 'Coordonnées'}
                    </Button>
                    
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="text-xs"
                      onClick={() => setPositionedField(null)}
                    >
                      Terminer
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-between mt-4">
              <div className="text-xs text-muted-foreground">
                {positionedField ? (
                  <span>
                    Position actuelle: ({canvasPosition.x.toFixed(1)}, {canvasPosition.y.toFixed(1)}) mm
                  </span>
                ) : (
                  <span>
                    Cliquez sur un champ pour le positionner
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-xs text-muted-foreground">Zoom:</span>
                <Slider
                  value={[zoomLevel]}
                  min={0.2}
                  max={1}
                  step={0.1}
                  className="w-32"
                  onValueChange={([value]) => setZoomLevel(value)}
                />
                <span className="text-xs">{Math.round(zoomLevel * 100)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PDFFieldsEditor;
