
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PDFTemplate, TemplateImage, TemplateField } from "@/utils/templateManager";
import { Upload, Trash2, Eye, ArrowUp, ArrowDown, Loader2, Plus, Move } from "lucide-react";
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

interface NewPDFTemplateEditorProps {
  template: PDFTemplate;
  onSave: (template: PDFTemplate) => void;
}

// Available field categories with their fields
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
    const fieldDefinition = AVAILABLE_FIELDS[selectedCategory as keyof typeof AVAILABLE_FIELDS]
      .find(field => field.key === selectedField);
    
    if (!fieldDefinition) {
      toast.error("Champ non trouvé");
      return;
    }
    
    // Create new field
    const newField: TemplateField = {
      id: uuidv4(),
      label: fieldDefinition.label,
      type: "text",
      category: selectedCategory,
      isVisible: true,
      value: `{${fieldDefinition.key}}`,
      position: { ...fieldPosition },
      page: selectedPage,
      style: {
        fontSize: 12,
        fontWeight: "normal",
        fontStyle: "normal",
        textDecoration: "none"
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
    
    toast.success("Champ supprimé avec succès");
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
    
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium">Champs du document (Page {selectedPage + 1})</h3>
        </div>
        
        {/* Page selector */}
        <div className="flex gap-2 mb-4">
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
        
        {/* Field selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4 border rounded-md p-4">
            <h4 className="text-sm font-medium">Ajouter un champ</h4>
            
            <div className="space-y-2">
              <Label htmlFor="field-category">Catégorie</Label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger id="field-category">
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="offer">Offre</SelectItem>
                  <SelectItem value="equipment">Équipement</SelectItem>
                  <SelectItem value="leaser">Leaser</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="field-name">Champ</Label>
              <Select
                value={selectedField}
                onValueChange={setSelectedField}
              >
                <SelectTrigger id="field-name">
                  <SelectValue placeholder="Sélectionner un champ" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_FIELDS[selectedCategory as keyof typeof AVAILABLE_FIELDS]?.map((field) => (
                    <SelectItem key={field.key} value={field.key}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="field-x">Position X</Label>
                <Input
                  id="field-x"
                  type="number"
                  min="0"
                  value={fieldPosition.x}
                  onChange={(e) => setFieldPosition({
                    ...fieldPosition, 
                    x: parseInt(e.target.value) || 0
                  })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="field-y">Position Y</Label>
                <Input
                  id="field-y"
                  type="number"
                  min="0"
                  value={fieldPosition.y}
                  onChange={(e) => setFieldPosition({
                    ...fieldPosition, 
                    y: parseInt(e.target.value) || 0
                  })}
                />
              </div>
            </div>
            
            <Button onClick={addField} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter le champ
            </Button>
          </div>
          
          {/* Field editor area */}
          <div className="border rounded-md overflow-hidden">
            <div className="relative bg-gray-50 min-h-[300px]">
              {/* Selected page image as background */}
              {images[selectedPage] && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <img 
                    src={images[selectedPage].data} 
                    alt={`Template page ${selectedPage + 1}`}
                    className="max-h-full max-w-full object-contain opacity-30"
                  />
                </div>
              )}
              
              {/* Fields */}
              {pageFields.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center p-8">
                    <p className="text-sm text-muted-foreground">
                      Aucun champ n'a encore été ajouté à cette page. 
                      Utilisez le formulaire à gauche pour ajouter des champs.
                    </p>
                  </div>
                </div>
              ) : (
                pageFields.map(field => (
                  <div 
                    key={field.id}
                    className="absolute bg-white border border-blue-500 p-2 rounded shadow-sm cursor-move"
                    style={{ 
                      left: `${field.position.x}px`, 
                      top: `${field.position.y}px`
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <Move className="h-3 w-3 text-gray-500" />
                      <div className="text-xs font-medium">{field.label}</div>
                    </div>
                    <div className="text-xs text-gray-500">{field.value}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        {/* Field list */}
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Champs sur cette page ({pageFields.length})</h4>
          {pageFields.length > 0 ? (
            <div className="space-y-2">
              {pageFields.map(field => (
                <div 
                  key={field.id}
                  className="flex justify-between items-center p-2 border rounded-md"
                >
                  <div>
                    <div className="font-medium">{field.label}</div>
                    <div className="text-xs text-gray-500">
                      Type: {field.type}, Position: ({field.position.x}, {field.position.y})
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500"
                    onClick={() => deleteField(field.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              Aucun champ sur cette page
            </div>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="images">Pages du modèle</TabsTrigger>
        <TabsTrigger value="fields">Champs du document</TabsTrigger>
      </TabsList>
      
      <TabsContent value="images" className="mt-6">
        {renderImagesTab()}
      </TabsContent>
      
      <TabsContent value="fields" className="mt-6">
        {renderFieldsTab()}
      </TabsContent>
    </Tabs>
  );
};

export default NewPDFTemplateEditor;
