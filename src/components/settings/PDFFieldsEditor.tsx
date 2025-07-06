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
    acc[field.category].push(field);
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
      
      if (pageImage) {
        if (pageImage.url) {
          return `${pageImage.url}?t=${new Date().getTime()}`;
        }
        else if (pageImage.data) {
          return pageImage.data;
        }
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
    return fields.filter(f => f.page === activePage || (activePage === 0 && (f.page === undefined || f.page === null)));
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
                                    checked={field.isVisible}
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
                                    disabled={!field.isVisible}
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
                        <Plus className="h-3 w-3 mr-1" />
                        Ajouter tous à la page
                      </Button>
                    </h4>
                    
                    {!fieldsByCategory[category.id] || 
                     !fieldsByCategory[category.id].filter(field => 
                        field.page !== activePage && 
                        !(activePage === 0 && field.page === undefined)
                      ).length ? (
                      <div className="text-sm text-muted-foreground text-center p-4 bg-gray-50 rounded-md">
                        Aucun autre champ disponible
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {fieldsByCategory[category.id]
                          .filter(field => field.page !== activePage && !(activePage === 0 && field.page === undefined))
                          .map((field) => (
                            <div 
                              key={`all_${field.id}`} 
                              className="border rounded-md p-2 bg-gray-50 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2 overflow-hidden">
                                {getCategoryIcon(field.category)}
                                <span className="text-sm text-gray-600 truncate" title={field.label}>
                                  {field.label}
                                </span>
                                <span className="text-xs text-gray-400">
                                  (page {field.page + 1})
                                </span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => handleOpenDuplicateDialog(field)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Ajouter
                              </Button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
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
                    min={0.5}
                    max={10}
                    step={0.5}
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
              </div>
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Label className="text-xs whitespace-nowrap">Pas de déplacement:</Label>
                  <Select 
                    value={stepSize.toString()} 
                    onValueChange={(value) => setStepSize(parseFloat(value))}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue placeholder="Pas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.1">0.1mm</SelectItem>
                      <SelectItem value="0.5">0.5mm</SelectItem>
                      <SelectItem value="1">1mm</SelectItem>
                      <SelectItem value="2">2mm</SelectItem>
                      <SelectItem value="5">5mm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {positionedField && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-medium">Positionnement du champ</Label>
                    
                    <div className="flex items-center gap-1">
                      <Label className="text-xs whitespace-nowrap">X:</Label>
                      <Input
                        className="w-16 h-7 text-xs"
                        type="number"
                        min="0"
                        max="210"
                        step="0.1"
                        value={manualPosition.x}
                        onChange={(e) => handleManualPositionChange('x', e.target.value)}
                      />
                      <Label className="text-xs whitespace-nowrap">Y:</Label>
                      <Input
                        className="w-16 h-7 text-xs"
                        type="number"
                        min="0"
                        max="297"
                        step="0.1"
                        value={manualPosition.y}
                        onChange={(e) => handleManualPositionChange('y', e.target.value)}
                      />
                      <Button 
                        size="sm" 
                        className="h-7 text-xs px-2" 
                        onClick={applyManualPosition}
                      >
                        Appliquer
                      </Button>
                    </div>
                    
                    <div className="flex items-center border rounded-md p-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => applyPreciseMovement('up')}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <div className="flex flex-col">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => applyPreciseMovement('left')}>
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => applyPreciseMovement('right')}>
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => applyPreciseMovement('down')}>
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onPageChange(activePage > 0 ? activePage - 1 : 0)} 
                    disabled={activePage === 0}
                    className="text-xs"
                  >
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Page précédente
                  </Button>
                  <div className="text-sm">
                    Page {activePage + 1} / {totalPages}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onPageChange(activePage < totalPages - 1 ? activePage + 1 : activePage)} 
                    disabled={activePage >= totalPages - 1}
                    className="text-xs"
                  >
                    Page suivante
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
              
              <div 
                className="relative border rounded-lg overflow-hidden bg-white"
                style={{ height: 'calc(100vh - 380px)', minHeight: '400px' }}
              >
                {positionedField && (
                  <div 
                    className="absolute top-2 left-2 z-10 bg-white border rounded-md p-2 shadow-md text-xs"
                  >
                    <div className="font-medium mb-1">Positionnement</div>
                    <div>X: {canvasPosition.x.toFixed(1)}mm</div>
                    <div>Y: {canvasPosition.y.toFixed(1)}mm</div>
                    <div className="flex items-center mt-1 text-gray-500 text-xs">
                      <Move className="h-3 w-3 mr-1" />
                      <span>
                        {dragEnabled 
                          ? "Glisser-déposer activé" 
                          : "Utiliser les flèches ou positions manuelles"
                        }
                      </span>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full mt-2 h-6 text-xs" 
                      onClick={() => setPositionedField(null)}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Terminer le positionnement
                    </Button>
                  </div>
                )}
                
                <div 
                  ref={canvasRef}
                  className="relative w-full h-full overflow-auto"
                  onMouseMove={handleCanvasMouseMove}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseLeave}
                  onKeyDown={handleKeyDown}
                  tabIndex={0}
                  style={{ 
                    cursor: positionedField && dragEnabled ? 'move' : 'default',
                  }}
                >
                  <div className="relative" style={{ 
                    width: `${210 * zoomLevel}mm`, 
                    height: `${297 * zoomLevel}mm`,
                    margin: '0 auto'
                  }}>
                    {gridEnabled && zoomLevel > 0.4 && (
                      <div className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ 
                        backgroundSize: `${gridSize * zoomLevel}mm ${gridSize * zoomLevel}mm`,
                        backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
                      }} />
                    )}
                    
                    {getCurrentPageBackground() ? (
                      <img 
                        src={getCurrentPageBackground()}
                        className="w-full h-full object-contain border border-gray-200 bg-white"
                        onError={handleImageError}
                        onLoad={handleImageLoad}
                        alt={`Template page ${activePage + 1}`}
                      />
                    ) : (
                      <div className="w-full h-full border border-gray-200 bg-white flex items-center justify-center">
                        <p className="text-muted-foreground">Aucune image de template pour cette page</p>
                      </div>
                    )}
                    
                    {fields.map(field => {
                      if ((field.page !== activePage && !(activePage === 0 && field.page === undefined)) || !field.isVisible) {
                        return null;
                      }
                      
                      const isBeingPositioned = field.id === positionedField;
                      const position = isBeingPositioned 
                        ? canvasPosition 
                        : field.position;
                      
                      // Get field style
                      const style = getFieldStyle(field);
                      const fontWeight = style.fontWeight === 'bold' ? 'font-bold' : 'font-normal';
                      const fontStyle = style.fontStyle === 'italic' ? 'italic' : '';
                      const textDecoration = style.textDecoration === 'underline' ? 'underline' : '';
                      
                      return (
                        <div
                          key={field.id}
                          className={`absolute text-black p-1 rounded-sm border group ${isBeingPositioned ? 'bg-blue-100 border-blue-400 shadow-sm' : 'border-transparent hover:border-blue-300 hover:bg-blue-50'} ${fontWeight} ${fontStyle} ${textDecoration}`}
                          style={{
                            left: `${position.x * zoomLevel}mm`,
                            top: `${position.y * zoomLevel}mm`,
                            fontSize: `${style.fontSize * zoomLevel}px`,
                            lineHeight: 1.2,
                            zIndex: isBeingPositioned ? 20 : 10,
                            cursor: dragEnabled ? 'move' : 'default',
                            maxWidth: field.type === 'table' ? '100mm' : '60mm',
                            fontFamily: 'Arial, sans-serif',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            
                            if (!dragEnabled) {
                              if (field.id === positionedField) {
                                setPositionedField(null);
                              } else {
                                startPositioning(field.id, field.position);
                              }
                            }
                          }}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute -top-2 -right-2 h-5 w-5 bg-red-100 border border-red-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => quickRemoveField(field.id, field.page, e)}
                            title="Supprimer de cette page"
                          >
                            <X className="h-2.5 w-2.5 text-red-600" />
                          </Button>
                          
                          <div className="whitespace-nowrap">
                            {field.type === 'table' ? (
                              <div className="border border-dashed border-gray-400 p-1 bg-white" style={{ fontSize: `${10 * zoomLevel}px` }}>
                                <span className="text-gray-500">[Tableau] {field.label}</span>
                              </div>
                            ) : (
                              <span className="text-gray-800" title={field.value}>{field.value}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dupliquer sur une autre page</DialogTitle>
            <DialogDescription>
              Choisissez la page sur laquelle vous souhaitez dupliquer le champ <strong>{fieldToDuplicate?.label}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="target-page">Page cible</Label>
            <Select 
              value={duplicateTargetPage.toString()} 
              onValueChange={(value) => setDuplicateTargetPage(parseInt(value))}
            >
              <SelectTrigger id="target-page">
                <SelectValue placeholder="Sélectionner une page" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: totalPages }, (_, i) => (
                  <SelectItem 
                    key={i} 
                    value={i.toString()}
                    disabled={i === fieldToDuplicate?.page}
                  >
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

      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retirer de la page</DialogTitle>
            <DialogDescription>
              Voulez-vous retirer le champ <strong>{fieldToRemove?.label}</strong> de la page {fieldToRemove?.page !== undefined ? fieldToRemove.page + 1 : 1} ?
              <br />
              <span className="text-destructive">Cette action ne supprime pas complètement le champ, il reste disponible pour d'autres pages.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRemoveDialog(false)}>Annuler</Button>
            <Button 
              variant="default" 
              className="bg-red-600 hover:bg-red-700 text-white" 
              onClick={handleRemoveFieldFromPage}
            >
              Retirer de la page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showTextStyleDialog} onOpenChange={setShowTextStyleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mise en forme du texte</DialogTitle>
            <DialogDescription>
              Personnalisez l'apparence du texte pour le champ <strong>{fieldToStyle?.label}</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Taille de police</Label>
              <Select 
                value={fieldToStyle?.style?.fontSize.toString() || "10"} 
                onValueChange={(value) => {
                  if (fieldToStyle) {
                    updateFieldStyle(fieldToStyle.id, { fontSize: parseInt(value) });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Taille de police" />
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
              <div className="flex flex-wrap gap-2">
                <ToggleGroup type="multiple" variant="outline" className="justify-start">
                  <ToggleGroupItem 
                    value="bold" 
                    aria-label="Gras"
                    className={`${fieldToStyle?.style?.fontWeight === 'bold' ? 'bg-gray-100' : ''}`}
                    onClick={() => {
                      if (fieldToStyle) {
                        const newWeight = fieldToStyle.style?.fontWeight === 'bold' ? 'normal' : 'bold';
                        updateFieldStyle(fieldToStyle.id, { fontWeight: newWeight });
                      }
                    }}
                  >
                    <Bold className="h-4 w-4" />
                    <span className="ml-1">Gras</span>
                  </ToggleGroupItem>
                  
                  <ToggleGroupItem 
                    value="italic" 
                    aria-label="Italique"
                    className={`${fieldToStyle?.style?.fontStyle === 'italic' ? 'bg-gray-100' : ''}`}
                    onClick={() => {
                      if (fieldToStyle) {
                        const newStyle = fieldToStyle.style?.fontStyle === 'italic' ? 'normal' : 'italic';
                        updateFieldStyle(fieldToStyle.id, { fontStyle: newStyle });
                      }
                    }}
                  >
                    <Italic className="h-4 w-4" />
                    <span className="ml-1">Italique</span>
                  </ToggleGroupItem>
                  
                  <ToggleGroupItem 
                    value="underline" 
                    aria-label="Souligné"
                    className={`${fieldToStyle?.style?.textDecoration === 'underline' ? 'bg-gray-100' : ''}`}
                    onClick={() => {
                      if (fieldToStyle) {
                        const newDecoration = fieldToStyle.style?.textDecoration === 'underline' ? 'none' : 'underline';
                        updateFieldStyle(fieldToStyle.id, { textDecoration: newDecoration });
                      }
                    }}
                  >
                    <Underline className="h-4 w-4" />
                    <span className="ml-1">Souligné</span>
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-medium mb-1">Aperçu :</p>
              <div className={`
                mt-2 p-2 border rounded bg-white
                ${fieldToStyle?.style?.fontWeight === 'bold' ? 'font-bold' : 'font-normal'}
                ${fieldToStyle?.style?.fontStyle === 'italic' ? 'italic' : ''}
                ${fieldToStyle?.style?.textDecoration === 'underline' ? 'underline' : ''}
              `}
              style={{ fontSize: `${fieldToStyle?.style?.fontSize || 10}px` }}>
                {fieldToStyle?.value || "Texte d'exemple"}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTextStyleDialog(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PDFFieldsEditor;
