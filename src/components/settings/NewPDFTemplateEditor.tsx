import React, { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PDFTemplate, TemplateImage, TemplateField } from "@/utils/templateManager";
import { Upload, Trash2, Eye, ArrowUp, ArrowDown, Loader2, Plus, Move, ZoomIn, ZoomOut, Type, Bold, Italic, Underline } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface NewPDFTemplateEditorProps {
  template: PDFTemplate;
  onSave: (template: PDFTemplate) => void;
}

// Available field categories with their fields - We'll use these as a reference for real field definitions
const AVAILABLE_FIELDS = {
  client: [
    { label: "Nom du client", key: "client_name" },
    { label: "Prénom du client", key: "client_first_name" },
    { label: "Email", key: "client_email" },
    { label: "Téléphone", key: "client_phone" },
    { label: "Société", key: "client_company" },
    { label: "TVA", key: "client_vat_number" },
    { label: "Adresse", key: "client_address" },
    { label: "Code postal", key: "client_postal_code" },
    { label: "Ville", key: "client_city" },
    { label: "Pays", key: "client_country" },
  ],
  offer: [
    { label: "Numéro d'offre", key: "offer_id" },
    { label: "Date de création", key: "offer_created_at" },
    { label: "Montant total HT", key: "offer_total_price_excl" },
    { label: "Montant total TTC", key: "offer_total_price_incl" },
    { label: "Mensualité", key: "offer_monthly_payment" },
  ],
  equipment: [
    { label: "Titre du matériel", key: "equipment_title" },
    { label: "Description", key: "equipment_description" },
    { label: "Prix", key: "equipment_price" },
    { label: "Quantité", key: "equipment_quantity" },
  ],
  leaser: [
    { label: "Nom du leaser", key: "leaser_name" },
    { label: "Durée du contrat", key: "lease_duration" },
    { label: "Taux d'intérêt", key: "lease_interest_rate" },
  ],
};

// Fonction pour filtrer les champs en fonction des données réelles disponibles dans la base de données
const getFilteredFields = (category: string) => {
  // Catégorie client - Utiliser les champs de la table clients
  if (category === 'client') {
    return [
      { label: "Nom du client", key: "client_name" },
      { label: "Email", key: "client_email" },
      { label: "Téléphone", key: "client_phone" },
      { label: "Société", key: "client_company" },
      { label: "TVA", key: "client_vat_number" },
      { label: "Adresse", key: "client_address" },
      { label: "Code postal", key: "client_postal_code" },
      { label: "Ville", key: "client_city" },
      { label: "Pays", key: "client_country" },
    ];
  }
  
  // Catégorie offre - Utiliser les champs de la table offers
  else if (category === 'offer') {
    return [
      { label: "Numéro d'offre", key: "offer_id" },
      { label: "Date de création", key: "offer_created_at" },
      { label: "Montant total", key: "offer_amount" },
      { label: "Coefficient", key: "offer_coefficient" },
      { label: "Mensualité", key: "offer_monthly_payment" },
      { label: "Commission", key: "offer_commission" },
      { label: "Statut", key: "offer_status" },
    ];
  }
  
  // Catégorie équipement - Utiliser le champ equipment_description
  else if (category === 'equipment') {
    return [
      { label: "Description de l'équipement", key: "equipment_description" },
    ];
  }
  
  // Catégorie leaser - Pour les champs de leaser
  else if (category === 'leaser') {
    return [
      { label: "Nom du leaser", key: "leaser_name" },
    ];
  }
  
  // Fallback pour les autres catégories
  return AVAILABLE_FIELDS[category as keyof typeof AVAILABLE_FIELDS] || [];
};

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 42, 48, 56, 64, 72];
const FONT_FAMILIES = ["Arial", "Helvetica", "Times New Roman", "Courier New", "Georgia", "Verdana"];
const TEXT_COLORS = ["#000000", "#FF0000", "#0000FF", "#008000", "#FFA500", "#800080", "#A52A2A", "#808080"];

// Constante pour la conversion mm en pixels (standard: 1 mm = 3.7795275591 px à 96 DPI)
const MM_TO_PX = 3.7795275591;

const NewPDFTemplateEditor = ({ template, onSave }: NewPDFTemplateEditorProps) => {
  
  const [activeTab, setActiveTab] = useState("images");
  const [selectedPage, setSelectedPage] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [localTemplate, setLocalTemplate] = useState<PDFTemplate>({
    ...template,
    templateImages: Array.isArray(template.templateImages) ? [...template.templateImages] : [],
    fields: Array.isArray(template.fields) ? [...template.fields] : []
  });
  const [selectedCategory, setSelectedCategory] = useState<string>("client");
  const [selectedField, setSelectedField] = useState<string>("");
  const [fieldPosition, setFieldPosition] = useState({ x: 100, y: 100 });
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [textStyle, setTextStyle] = useState({
    fontSize: 12,
    fontFamily: "Arial",
    fontWeight: "normal",
    fontStyle: "normal",
    textDecoration: "none",
    color: "#000000"
  });
  
  // Etat pour stocker les champs filtrés par catégorie
  const [availableFieldsByCategory, setAvailableFieldsByCategory] = useState<Record<string, {label: string, key: string}[]>>({
    client: [],
    offer: [],
    equipment: [],
    leaser: []
  });
  
  const editorAreaRef = useRef<HTMLDivElement>(null);
  
  // Initialiser les champs disponibles pour chaque catégorie
  useEffect(() => {
    const filteredFields = {
      client: getFilteredFields('client'),
      offer: getFilteredFields('offer'),
      equipment: getFilteredFields('equipment'),
      leaser: getFilteredFields('leaser')
    };
    
    setAvailableFieldsByCategory(filteredFields);
    console.log("Fields initialized:", filteredFields);
  }, []);
  
  // Debug logs on mount
  useEffect(() => {
    console.log("NewPDFTemplateEditor - Montage initial");
    console.log("Template reçu:", template.name);
    console.log("Images:", template.templateImages?.length || 0);
    console.log("Champs:", template.fields?.length || 0);
  }, []);
  
  // Update local template when parent template changes
  useEffect(() => {
    console.log("NewPDFTemplateEditor - Template parent mis à jour");
    console.log("Images:", template.templateImages?.length || 0);
    console.log("Champs:", template.fields?.length || 0);
    
    setLocalTemplate({
      ...template,
      templateImages: Array.isArray(template.templateImages) ? [...template.templateImages] : [],
      fields: Array.isArray(template.fields) ? [...template.fields] : []
    });
  }, [template]);

  // When selectedFieldId changes, update textStyle
  useEffect(() => {
    if (selectedFieldId) {
      const field = getSelectedField();
      if (field && field.style) {
        setTextStyle({
          fontSize: field.style.fontSize || 12,
          fontFamily: field.style.fontFamily || "Arial",
          fontWeight: field.style.fontWeight || "normal",
          fontStyle: field.style.fontStyle || "normal",
          textDecoration: field.style.textDecoration || "none",
          color: field.style.color || "#000000"
        });
      }
    }
  }, [selectedFieldId]);
  
  // Get selected field
  const getSelectedField = (): TemplateField | undefined => {
    if (!selectedFieldId) return undefined;
    
    const fields = Array.isArray(localTemplate.fields) ? localTemplate.fields : [];
    return fields.find(field => field.id === selectedFieldId);
  };
  
  
  
  // Convert file to base64
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };
  
  // File upload handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error("Veuillez sélectionner une image");
      return;
    }
    
    try {
      setIsUploading(true);
      
      // Convert to base64
      const base64Data = await convertFileToBase64(file);
      
      // Get existing images
      const existingImages: TemplateImage[] = Array.isArray(localTemplate.templateImages) 
        ? [...localTemplate.templateImages] 
        : [];
      
      // Create new image entry
      const newImage: TemplateImage = {
        id: uuidv4(),
        name: file.name,
        data: base64Data,
        page: existingImages.length
      };
      
      // Update images array
      const updatedImages = [...existingImages, newImage];
      
      // Create updated template
      const updatedTemplate = {
        ...localTemplate,
        templateImages: updatedImages
      };
      
      console.log("Images avant:", existingImages.length);
      console.log("Images après:", updatedImages.length);
      
      // Update local state
      setLocalTemplate(updatedTemplate);
      
      // Save changes
      onSave(updatedTemplate);
      
      toast.success("Image ajoutée avec succès");
      
      // Auto-select first page if this is the first image
      if (updatedImages.length === 1) {
        setSelectedPage(0);
      }
    } catch (error) {
      console.error("Erreur lors de l'upload:", error);
      toast.error("Erreur lors de l'ajout de l'image");
    } finally {
      setIsUploading(false);
      
      // Reset file input
      if (e.target) {
        e.target.value = "";
      }
    }
  };
  
  // Delete image
  const handleDeleteImage = (imageId: string) => {
    // Get existing images
    const existingImages: TemplateImage[] = Array.isArray(localTemplate.templateImages) 
      ? [...localTemplate.templateImages] 
      : [];
    
    // Filter out deleted image
    const updatedImages = existingImages.filter(img => img.id !== imageId);
    
    // Update page numbers
    updatedImages.forEach((img, idx) => {
      img.page = idx;
    });
    
    // Create updated template
    const updatedTemplate = {
      ...localTemplate,
      templateImages: updatedImages
    };
    
    // Update local state
    setLocalTemplate(updatedTemplate);
    
    // Save changes
    onSave(updatedTemplate);
    
    // Update selected page if necessary
    if (selectedPage >= updatedImages.length) {
      setSelectedPage(Math.max(0, updatedImages.length - 1));
    }
    
    toast.success("Image supprimée avec succès");
  };
  
  // Move image up
  const moveImageUp = (index: number) => {
    if (index <= 0) return;
    
    // Get existing images
    const existingImages: TemplateImage[] = Array.isArray(localTemplate.templateImages) 
      ? [...localTemplate.templateImages] 
      : [];
    
    // Swap images
    const newImages = [...existingImages];
    [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
    
    // Update page numbers
    newImages.forEach((img, idx) => {
      img.page = idx;
    });
    
    // Create updated template
    const updatedTemplate = {
      ...localTemplate,
      templateImages: newImages
    };
    
    // Update local state
    setLocalTemplate(updatedTemplate);
    
    // Save changes
    onSave(updatedTemplate);
    
    // Update selected page if necessary
    if (selectedPage === index) {
      setSelectedPage(index - 1);
    } else if (selectedPage === index - 1) {
      setSelectedPage(index);
    }
  };
  
  // Move image down
  const moveImageDown = (index: number) => {
    // Get existing images
    const existingImages: TemplateImage[] = Array.isArray(localTemplate.templateImages) 
      ? [...localTemplate.templateImages] 
      : [];
    
    if (index >= existingImages.length - 1) return;
    
    // Swap images
    const newImages = [...existingImages];
    [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
    
    // Update page numbers
    newImages.forEach((img, idx) => {
      img.page = idx;
    });
    
    // Create updated template
    const updatedTemplate = {
      ...localTemplate,
      templateImages: newImages
    };
    
    // Update local state
    setLocalTemplate(updatedTemplate);
    
    // Save changes
    onSave(updatedTemplate);
    
    // Update selected page if necessary
    if (selectedPage === index) {
      setSelectedPage(index + 1);
    } else if (selectedPage === index + 1) {
      setSelectedPage(index);
    }
  };
  
  // Preview image
  const previewImage = (imageData: string) => {
    window.open(imageData, '_blank');
  };
  
  // Add field to template
  const addField = () => {
    if (!selectedField) {
      toast.error("Veuillez sélectionner un champ");
      return;
    }
    
    // Get existing fields
    const existingFields: TemplateField[] = Array.isArray(localTemplate.fields) 
      ? [...localTemplate.fields] 
      : [];
    
    // Find the selected field definition
    const fieldDefinition = availableFieldsByCategory[selectedCategory]
      .find(field => field.key === selectedField);
    
    if (!fieldDefinition) {
      toast.error("Champ non trouvé");
      return;
    }
    
    const fieldId = uuidv4();
    
    // Create new field
    const newField: TemplateField = {
      id: fieldId,
      label: fieldDefinition.label,
      type: "text",
      category: selectedCategory,
      isVisible: true,
      value: `{${fieldDefinition.key}}`,
      position: { x: fieldPosition.x, y: fieldPosition.y },
      page: selectedPage,
      style: {
        fontSize: textStyle.fontSize,
        fontFamily: textStyle.fontFamily,
        fontWeight: textStyle.fontWeight,
        fontStyle: textStyle.fontStyle,
        textDecoration: textStyle.textDecoration,
        color: textStyle.color
      }
    };
    
    // Update fields array
    const updatedFields = [...existingFields, newField];
    
    // Create updated template
    const updatedTemplate = {
      ...localTemplate,
      fields: updatedFields
    };
    
    // Update local state
    setLocalTemplate(updatedTemplate);
    
    // Save changes
    onSave(updatedTemplate);
    
    // Select the new field
    setSelectedFieldId(fieldId);
    
    toast.success(`Champ "${fieldDefinition.label}" ajouté avec succès`);
    
    // Update position for next field
    setFieldPosition({
      x: fieldPosition.x + 20,
      y: fieldPosition.y + 20
    });
  };
  
  // Delete field
  const deleteField = (fieldId: string) => {
    // Get existing fields
    const existingFields: TemplateField[] = Array.isArray(localTemplate.fields) 
      ? [...localTemplate.fields] 
      : [];
    
    // Filter out deleted field
    const updatedFields = existingFields.filter(field => field.id !== fieldId);
    
    // Create updated template
    const updatedTemplate = {
      ...localTemplate,
      fields: updatedFields
    };
    
    // Update local state
    setLocalTemplate(updatedTemplate);
    
    // Save changes
    onSave(updatedTemplate);
    
    // Clear selected field if it was deleted
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
    
    toast.success("Champ supprimé avec succès");
  };
  
  // Start dragging a field
  const startDragging = (e: React.MouseEvent, fieldId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    setDraggedFieldId(fieldId);
    setSelectedFieldId(fieldId);
    
    setDragStartPos({
      x: e.clientX,
      y: e.clientY
    });
  };
  
  // Handle mouse move during drag
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !draggedFieldId || !editorAreaRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const fields = Array.isArray(localTemplate.fields) ? [...localTemplate.fields] : [];
    const fieldIndex = fields.findIndex(f => f.id === draggedFieldId);
    
    if (fieldIndex === -1) return;
    
    // Calculate the drag delta
    const deltaX = (e.clientX - dragStartPos.x) / (zoomLevel / 100);
    const deltaY = (e.clientY - dragStartPos.y) / (zoomLevel / 100);
    
    // Create a copy of the fields array
    const updatedFields = [...fields];
    
    // Update the position
    updatedFields[fieldIndex] = {
      ...updatedFields[fieldIndex],
      position: {
        x: updatedFields[fieldIndex].position.x + deltaX / MM_TO_PX,
        y: updatedFields[fieldIndex].position.y + deltaY / MM_TO_PX
      }
    };
    
    // Update local template
    setLocalTemplate({
      ...localTemplate,
      fields: updatedFields
    });
    
    // Update drag start position
    setDragStartPos({
      x: e.clientX,
      y: e.clientY
    });
  };
  
  // Stop dragging
  const stopDragging = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // Save changes
    onSave(localTemplate);
  };
  
  // Handle zoom in
  const handleZoomIn = () => {
    setZoomLevel(Math.min(zoomLevel + 10, 200));
  };
  
  // Handle zoom out
  const handleZoomOut = () => {
    setZoomLevel(Math.max(zoomLevel - 10, 50));
  };
  
  // Handle field selection
  const handleFieldClick = (e: React.MouseEvent, fieldId: string) => {
    e.stopPropagation();
    setSelectedFieldId(fieldId);
  };
  
  // Handle editor area click (deselect field)
  const handleEditorClick = () => {
    setSelectedFieldId(null);
  };
  
  // Update field style
  const updateFieldStyle = (style: Partial<typeof textStyle>) => {
    if (!selectedFieldId) return;
    
    const fields = Array.isArray(localTemplate.fields) ? [...localTemplate.fields] : [];
    const fieldIndex = fields.findIndex(f => f.id === selectedFieldId);
    
    if (fieldIndex === -1) return;
    
    // Update text style
    const updatedTextStyle = {
      ...textStyle,
      ...style
    };
    setTextStyle(updatedTextStyle);
    
    // Create a copy of the fields array
    const updatedFields = [...fields];
    
    // Update the style
    updatedFields[fieldIndex] = {
      ...updatedFields[fieldIndex],
      style: {
        fontSize: updatedTextStyle.fontSize,
        fontFamily: updatedTextStyle.fontFamily,
        fontWeight: updatedTextStyle.fontWeight,
        fontStyle: updatedTextStyle.fontStyle,
        textDecoration: updatedTextStyle.textDecoration,
        color: updatedTextStyle.color
      }
    };
    
    // Update local template
    const updatedTemplate = {
      ...localTemplate,
      fields: updatedFields
    };
    
    setLocalTemplate(updatedTemplate);
    
    // Save changes
    onSave(updatedTemplate);
  };
  
  // Toggle text style
  const toggleTextStyle = (property: 'fontWeight' | 'fontStyle' | 'textDecoration') => {
    const newValue = 
      property === 'fontWeight' ? (textStyle.fontWeight === 'bold' ? 'normal' : 'bold') :
      property === 'fontStyle' ? (textStyle.fontStyle === 'italic' ? 'normal' : 'italic') :
      property === 'textDecoration' ? (textStyle.textDecoration === 'underline' ? 'none' : 'underline') :
      textStyle[property];
    
    updateFieldStyle({ [property]: newValue });
  };
  
  // Handle position input changes
  const handlePositionChange = (axis: 'x' | 'y', value: number) => {
    if (!selectedFieldId) return;
    
    const fields = Array.isArray(localTemplate.fields) ? [...localTemplate.fields] : [];
    const fieldIndex = fields.findIndex(f => f.id === selectedFieldId);
    
    if (fieldIndex === -1) return;
    
    // Create a copy of the fields array
    const updatedFields = [...fields];
    
    // Update the position (value is already in mm)
    updatedFields[fieldIndex] = {
      ...updatedFields[fieldIndex],
      position: {
        ...updatedFields[fieldIndex].position,
        [axis]: value
      }
    };
    
    // Update local template
    const updatedTemplate = {
      ...localTemplate,
      fields: updatedFields
    };
    
    setLocalTemplate(updatedTemplate);
    
    // Save changes
    onSave(updatedTemplate);
  };
  
  // Render images tab
  const renderImagesTab = () => {
    // Get images array safely
    const images: TemplateImage[] = Array.isArray(localTemplate.templateImages) 
      ? localTemplate.templateImages 
      : [];
    
    console.log("renderImagesTab - Nombre d'images:", images.length);
    
    return (
      <div className="space-y-6">
        <div className="border rounded-md p-4">
          <Label htmlFor="template-upload" className="text-sm font-medium">Ajouter un modèle de page</Label>
          <div className="flex gap-2 mt-2">
            <Input
              id="template-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isUploading}
              className="flex-1"
            />
            <Button disabled={isUploading} className="min-w-20">
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  <span>Upload</span>
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Formats acceptés: PNG, JPG, WEBP. L'ordre des pages correspond à l'ordre dans lequel elles apparaîtront dans le document.
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">Pages du modèle ({images.length})</h3>
          </div>
          
          {images.length === 0 ? (
            <div className="text-center p-8 border border-dashed rounded-md">
              <p className="text-sm text-muted-foreground">
                Aucune page n'a encore été ajoutée. Utilisez le formulaire ci-dessus pour ajouter des pages à votre modèle.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {images.map((image, index) => (
                <Card 
                  key={`${image.id}-${index}`} 
                  className={`overflow-hidden ${selectedPage === index ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setSelectedPage(index)}
                >
                  <div className="relative bg-gray-100 h-40 flex items-center justify-center">
                    <img 
                      src={image.data} 
                      alt={`Template page ${index + 1}`}
                      className="max-h-full max-w-full object-contain"
                    />
                    <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                      Page {index + 1}
                    </div>
                    {selectedPage === index && (
                      <div className="absolute top-2 right-2 bg-primary text-white px-2 py-1 rounded text-xs">
                        Sélectionnée
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <div className="flex justify-between items-center">
                      <div className="truncate text-sm">{image.name || `Page ${index + 1}`}</div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7" 
                          onClick={(e) => {
                            e.stopPropagation();
                            moveImageUp(index);
                          }}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7" 
                          onClick={(e) => {
                            e.stopPropagation();
                            moveImageDown(index);
                          }}
                          disabled={index === images.length - 1}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7" 
                          onClick={(e) => {
                            e.stopPropagation();
                            previewImage(image.data);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteImage(image.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Render fields tab
  const renderFieldsTab = () => {
    // Get fields array safely
    const fields: TemplateField[] = Array.isArray(localTemplate.fields) 
      ? localTemplate.fields 
      : [];
    
    // Get images array safely
    const images: TemplateImage[] = Array.isArray(localTemplate.templateImages) 
      ? localTemplate.templateImages 
      : [];
    
    console.log("renderFieldsTab - Nombre de champs:", fields.length);
    console.log("renderFieldsTab - Nombre d'images:", images.length);
    
    // Check if we have images
    if (images.length === 0) {
      return (
        <div className="text-center p-8 border border-dashed rounded-md">
          <p className="text-sm text-muted-foreground">
            Veuillez d'abord ajouter au moins une page de modèle dans l'onglet "Pages du modèle" avant de pouvoir ajouter des champs.
          </p>
        </div>
      );
    }
    
    // Get fields for the selected page
    const pageFields = fields.filter(field => field.page === selectedPage);
    
    // Get the selected field as TemplateField or undefined, not as string
    const selectedFieldObj = selectedFieldId ? fields.find(f => f.id === selectedFieldId) : undefined;
    
    // Obtenir les champs disponibles pour la catégorie sélectionnée
    const categoryFields = availableFieldsByCategory[selectedCategory] || [];
    
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium">Champs du document (Page {selectedPage + 1})</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 50}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm">{zoomLevel}%</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 200}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Page selector */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {images.map((_, index) => (
            <Button
              key={index}
              variant={selectedPage === index ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPage(index)}
            >
              Page {index + 1}
            </Button>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Sidebar with field selector */}
          <div className="space-y-4 order-2 lg:order-1">
            <Card className="p-4">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Ajouter un champ</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="field-category">Catégorie</Label>
                  <Select
                    value={selectedCategory}
                    onValueChange={(value) => {
                      setSelectedCategory(value);
                      setSelectedField("");
                    }}
                  >
                    <SelectTrigger id="field-category">
                      <SelectValue placeholder="Sélectionner une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="offer">Offre</SelectItem>
                      <SelectItem value="equipment">Équipement</SelectItem>
                      <SelectItem value="leaser">Leaser</SelectItem>
