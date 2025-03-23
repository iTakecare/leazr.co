
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PDFTemplate, TemplateImage, TemplateField } from "@/utils/templateManager";
import { Upload, Trash2, Eye, ArrowUp, ArrowDown, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

interface NewPDFTemplateEditorProps {
  template: PDFTemplate;
  onSave: (template: PDFTemplate) => void;
}

const NewPDFTemplateEditor = ({ template, onSave }: NewPDFTemplateEditorProps) => {
  const [activeTab, setActiveTab] = useState("images");
  const [selectedPage, setSelectedPage] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [localTemplate, setLocalTemplate] = useState<PDFTemplate>({
    ...template,
    templateImages: Array.isArray(template.templateImages) ? [...template.templateImages] : [],
    fields: Array.isArray(template.fields) ? [...template.fields] : []
  });
  
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
  
  // Add debug field
  const addDebugField = () => {
    // Get existing fields
    const existingFields: TemplateField[] = Array.isArray(localTemplate.fields) 
      ? [...localTemplate.fields] 
      : [];
    
    // Create new field
    const newField: TemplateField = {
      id: uuidv4(),
      label: "Champ de test",
      type: "text",
      category: "client",
      isVisible: true,
      value: "Valeur de test",
      position: { x: 100, y: 100 },
      page: selectedPage
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
    
    toast.success("Champ de test ajouté avec succès");
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
            <Button variant="outline" size="sm" onClick={() => console.log("Images:", images)}>
              Debug Images
            </Button>
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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addDebugField}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un champ test
            </Button>
            <Button variant="outline" size="sm" onClick={() => console.log("Champs:", fields)}>
              Debug Champs
            </Button>
          </div>
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
        
        {/* Field editor area */}
        <div className="relative border rounded-md bg-gray-50 min-h-[400px]">
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
                  Utilisez le bouton "Ajouter un champ test" pour ajouter des champs.
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
                <div className="text-xs font-medium">{field.label}</div>
                <div className="text-xs text-gray-500">{field.type}</div>
              </div>
            ))
          )}
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
                    onClick={() => {
                      // Remove field
                      const updatedFields = fields.filter(f => f.id !== field.id);
                      const updatedTemplate = {
                        ...localTemplate,
                        fields: updatedFields
                      };
                      setLocalTemplate(updatedTemplate);
                      onSave(updatedTemplate);
                      toast.success("Champ supprimé");
                    }}
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
