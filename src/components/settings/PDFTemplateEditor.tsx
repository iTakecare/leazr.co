
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  ImagePlus, Save, Layout, PaintBucket, Type, Layers, Check,
  Trash, Plus, Move, AlignLeft, AlignCenter, AlignRight, Bold, Italic
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { savePDFTemplate } from "@/services/pdfTemplateService";
import { toast } from "sonner";
import FieldEditor from "./PDFFieldEditor";
import ColorPicker from "../ui/ColorPicker";
import { uploadImage } from "@/services/storageService";

interface PDFTemplateEditorProps {
  template: any;
  onClose: () => void;
}

interface TemplateImage {
  id: string;
  imageUrl: string;
  fields: any;
}

const PDFTemplateEditor = ({ template, onClose }: PDFTemplateEditorProps) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentTemplate, setCurrentTemplate] = useState(template);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedField, setSelectedField] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("general");

  // Mutations for saving template
  const saveMutation = useMutation({
    mutationFn: savePDFTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdfTemplates'] });
      toast.success("Le modèle a été enregistré avec succès");
      onClose();
    },
    onError: (error) => {
      toast.error("Erreur lors de l'enregistrement du modèle");
      console.error("Save error:", error);
    }
  });

  const handleSave = () => {
    saveMutation.mutate(currentTemplate);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      toast.info("Téléchargement de l'image en cours...");
      const imageUrl = await uploadImage(file);
      
      if (imageUrl) {
        const newTemplateImages = [...(currentTemplate.templateImages || [])];
        
        newTemplateImages.push({
          id: `page-${Date.now()}`,
          imageUrl,
          fields: {}
        });
        
        setCurrentTemplate({
          ...currentTemplate,
          templateImages: newTemplateImages
        });
        
        // Passer à la nouvelle page
        setCurrentPage(newTemplateImages.length - 1);
        toast.success("Image téléchargée avec succès");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erreur lors du téléchargement de l'image");
    }
  };

  const addField = () => {
    const newField = {
      id: `field-${Date.now()}`,
      type: "text",
      value: "Nouveau champ",
      x: 100,
      y: 100,
      width: 200,
      height: 30,
      fontSize: 14,
      fontFamily: "Arial",
      color: "#000000",
      bold: false,
      italic: false,
      alignment: "left",
      fieldType: "static" // static, dynamic, variable
    };

    if (!currentTemplate.templateImages[currentPage]) {
      toast.error("Veuillez d'abord ajouter une image de page");
      return;
    }

    const updatedTemplateImages = [...currentTemplate.templateImages];
    const currentPageData = { ...updatedTemplateImages[currentPage] };
    
    if (!currentPageData.fields) {
      currentPageData.fields = {};
    }
    
    currentPageData.fields[newField.id] = newField;
    updatedTemplateImages[currentPage] = currentPageData;

    setCurrentTemplate({
      ...currentTemplate,
      templateImages: updatedTemplateImages
    });
    
    setSelectedField(newField);
  };

  const updateField = (fieldId: string, updatedField: any) => {
    const updatedTemplateImages = [...currentTemplate.templateImages];
    const currentPageData = { ...updatedTemplateImages[currentPage] };
    
    currentPageData.fields[fieldId] = {
      ...currentPageData.fields[fieldId],
      ...updatedField
    };
    
    updatedTemplateImages[currentPage] = currentPageData;

    setCurrentTemplate({
      ...currentTemplate,
      templateImages: updatedTemplateImages
    });
    
    setSelectedField({
      ...selectedField,
      ...updatedField
    });
  };

  const deleteField = (fieldId: string) => {
    const updatedTemplateImages = [...currentTemplate.templateImages];
    const currentPageData = { ...updatedTemplateImages[currentPage] };
    
    delete currentPageData.fields[fieldId];
    updatedTemplateImages[currentPage] = currentPageData;

    setCurrentTemplate({
      ...currentTemplate,
      templateImages: updatedTemplateImages
    });
    
    setSelectedField(null);
  };

  const deletePage = () => {
    if (currentTemplate.templateImages.length <= 1) {
      toast.error("Vous devez garder au moins une page dans le modèle");
      return;
    }

    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette page ?")) {
      const updatedTemplateImages = [...currentTemplate.templateImages];
      updatedTemplateImages.splice(currentPage, 1);
      
      setCurrentTemplate({
        ...currentTemplate,
        templateImages: updatedTemplateImages
      });
      
      setCurrentPage(Math.max(0, currentPage - 1));
    }
  };

  return (
    <div className="flex h-[80vh] overflow-hidden">
      {/* Sidebar de configuration */}
      <div className="w-64 border-r p-4 flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="layout">Pages</TabsTrigger>
            <TabsTrigger value="fields">Champs</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="flex-1">
            <TabsContent value="general" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du modèle</Label>
                <Input 
                  id="name" 
                  value={currentTemplate.name} 
                  onChange={(e) => setCurrentTemplate({...currentTemplate, name: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="companyName">Nom de l'entreprise</Label>
                <Input 
                  id="companyName" 
                  value={currentTemplate.companyName} 
                  onChange={(e) => setCurrentTemplate({...currentTemplate, companyName: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="companyAddress">Adresse</Label>
                <Input 
                  id="companyAddress" 
                  value={currentTemplate.companyAddress} 
                  onChange={(e) => setCurrentTemplate({...currentTemplate, companyAddress: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="companySiret">SIRET</Label>
                <Input 
                  id="companySiret" 
                  value={currentTemplate.companySiret} 
                  onChange={(e) => setCurrentTemplate({...currentTemplate, companySiret: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="companyContact">Contact</Label>
                <Input 
                  id="companyContact" 
                  value={currentTemplate.companyContact} 
                  onChange={(e) => setCurrentTemplate({...currentTemplate, companyContact: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Couleur principale</Label>
                <ColorPicker
                  color={currentTemplate.primaryColor}
                  onChange={(color) => setCurrentTemplate({...currentTemplate, primaryColor: color})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Couleur secondaire</Label>
                <ColorPicker
                  color={currentTemplate.secondaryColor}
                  onChange={(color) => setCurrentTemplate({...currentTemplate, secondaryColor: color})}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="layout" className="space-y-4 mt-0">
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <Label>Pages du modèle</Label>
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </div>
                
                <div className="space-y-2 max-h-[300px] overflow-auto pr-2">
                  {currentTemplate.templateImages?.length > 0 ? (
                    currentTemplate.templateImages.map((image: TemplateImage, index: number) => (
                      <div 
                        key={image.id} 
                        className={`
                          flex items-center p-2 border rounded-md cursor-pointer
                          ${currentPage === index ? 'bg-muted border-primary' : ''}
                        `}
                        onClick={() => setCurrentPage(index)}
                      >
                        <div 
                          className="w-10 h-14 bg-gray-100 mr-2 flex-shrink-0"
                          style={{
                            backgroundImage: `url(${image.imageUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }}
                        ></div>
                        <span className="flex-1 truncate">Page {index + 1}</span>
                        {currentTemplate.templateImages.length > 1 && currentPage === index && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePage();
                            }}
                            className="h-7 w-7 p-0"
                          >
                            <Trash className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 border rounded-md">
                      <p className="text-sm text-muted-foreground mb-2">
                        Aucune page ajoutée
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <ImagePlus className="h-4 w-4 mr-1" />
                        Ajouter une page
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="fields" className="mt-0">
              {currentTemplate.templateImages?.length > 0 ? (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <Label>Champs sur la page</Label>
                    <Button variant="outline" size="sm" onClick={addField}>
                      <Plus className="h-4 w-4 mr-1" />
                      Ajouter
                    </Button>
                  </div>
                  
                  {selectedField ? (
                    <FieldEditor 
                      field={selectedField}
                      onChange={(updates) => updateField(selectedField.id, updates)}
                      onDelete={() => deleteField(selectedField.id)}
                    />
                  ) : (
                    <div className="text-center py-4 border rounded-md">
                      <p className="text-sm text-muted-foreground">
                        Sélectionnez un champ ou ajoutez-en un nouveau
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4 border rounded-md">
                  <p className="text-sm text-muted-foreground mb-2">
                    Ajoutez d'abord une page au modèle
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setActiveTab("layout");
                      setTimeout(() => fileInputRef.current?.click(), 100);
                    }}
                  >
                    <ImagePlus className="h-4 w-4 mr-1" />
                    Ajouter une page
                  </Button>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
          
          <div className="pt-4 space-x-2 border-t mt-4">
            <Button 
              variant="default" 
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <>Enregistrement...</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  Enregistrer
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
          </div>
        </Tabs>
      </div>
      
      {/* Éditeur visuel */}
      <div className="flex-1 relative overflow-auto p-8 bg-gray-100">
        {currentTemplate.templateImages?.length > 0 ? (
          <div className="relative mx-auto" style={{ 
            width: '595px', // A4 width at 72dpi
            minHeight: '842px', // A4 height at 72dpi
            backgroundColor: 'white',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            backgroundImage: `url(${currentTemplate.templateImages[currentPage]?.imageUrl})`,
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}>
            {currentTemplate.templateImages[currentPage]?.fields && Object.values(currentTemplate.templateImages[currentPage].fields).map((field: any) => (
              <div
                key={field.id}
                style={{
                  position: 'absolute',
                  left: `${field.x}px`,
                  top: `${field.y}px`,
                  width: `${field.width}px`,
                  height: `${field.height}px`,
                  border: selectedField?.id === field.id ? '2px solid #3B82F6' : '1px dashed #d1d5db',
                  padding: '4px',
                  cursor: 'move',
                  background: selectedField?.id === field.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  fontSize: `${field.fontSize}px`,
                  fontFamily: field.fontFamily || 'Arial',
                  color: field.color || '#000000',
                  fontWeight: field.bold ? 'bold' : 'normal',
                  fontStyle: field.italic ? 'italic' : 'normal',
                  textAlign: field.alignment || 'left',
                  overflow: 'hidden',
                  userSelect: 'none'
                }}
                onClick={() => setSelectedField(field)}
                // Ici on ajouterait la logique de drag-and-drop
              >
                {field.value}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center max-w-md mx-auto">
              <ImagePlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Commencez par ajouter une page</h3>
              <p className="text-muted-foreground mb-4">
                Uploadez une image qui servira de fond pour votre modèle PDF
              </p>
              <Button onClick={() => fileInputRef.current?.click()}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter une page
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFTemplateEditor;
