
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import PDFTemplateFieldsEditor from "./PDFTemplateFieldsEditor";
import PDFTemplateImagesEditor from "./PDFTemplateImagesEditor";

interface PDFTemplateEditorProps {
  template: any;
  onChange: (updatedTemplate: any) => void;
}

const PDFTemplateEditor: React.FC<PDFTemplateEditorProps> = ({ template, onChange }) => {
  const [activeTab, setActiveTab] = useState("company");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onChange({
      ...template,
      [name]: value
    });
  };

  const handleColorChange = (field: string, value: string) => {
    onChange({
      ...template,
      [field]: value
    });
  };

  const handleLogoUpload = async (imageData: string) => {
    onChange({
      ...template,
      logoURL: imageData
    });
    toast.success("Logo mis à jour");
  };

  const handleFieldsUpdate = (updatedFields: any[]) => {
    onChange({
      ...template,
      fields: updatedFields
    });
  };

  const handleImagesUpdate = (updatedImages: any[]) => {
    onChange({
      ...template,
      templateImages: updatedImages
    });
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="company">Informations société</TabsTrigger>
          <TabsTrigger value="images">Pages du modèle</TabsTrigger>
          <TabsTrigger value="fields">Champs et positionnement</TabsTrigger>
        </TabsList>
        
        <TabsContent value="company" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom du modèle</Label>
                  <Input
                    id="name"
                    name="name"
                    value={template.name || ""}
                    onChange={handleInputChange}
                    placeholder="Nom du modèle"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nom de l'entreprise</Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    value={template.companyName || ""}
                    onChange={handleInputChange}
                    placeholder="Nom de votre entreprise"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="companyAddress">Adresse de l'entreprise</Label>
                  <Textarea
                    id="companyAddress"
                    name="companyAddress"
                    value={template.companyAddress || ""}
                    onChange={handleInputChange}
                    rows={2}
                    placeholder="Adresse complète"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="companyContact">Informations de contact</Label>
                  <Input
                    id="companyContact"
                    name="companyContact"
                    value={template.companyContact || ""}
                    onChange={handleInputChange}
                    placeholder="Téléphone, email, etc."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="companySiret">Numéro TVA / SIRET</Label>
                  <Input
                    id="companySiret"
                    name="companySiret"
                    value={template.companySiret || ""}
                    onChange={handleInputChange}
                    placeholder="Numéro d'identification"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Couleur principale</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      name="primaryColor"
                      type="text"
                      value={template.primaryColor || "#2C3E50"}
                      onChange={handleInputChange}
                      placeholder="#000000"
                    />
                    <input
                      type="color"
                      value={template.primaryColor || "#2C3E50"}
                      onChange={(e) => handleColorChange("primaryColor", e.target.value)}
                      className="w-10 h-10 p-1 border rounded"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Couleur secondaire</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondaryColor"
                      name="secondaryColor"
                      type="text"
                      value={template.secondaryColor || "#3498DB"}
                      onChange={handleInputChange}
                      placeholder="#000000"
                    />
                    <input
                      type="color"
                      value={template.secondaryColor || "#3498DB"}
                      onChange={(e) => handleColorChange("secondaryColor", e.target.value)}
                      className="w-10 h-10 p-1 border rounded"
                    />
                  </div>
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="headerText">Texte d'en-tête</Label>
                  <Input
                    id="headerText"
                    name="headerText"
                    value={template.headerText || ""}
                    onChange={handleInputChange}
                    placeholder="Ex: OFFRE N° {offer_id}"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="footerText">Texte de pied de page</Label>
                  <Textarea
                    id="footerText"
                    name="footerText"
                    value={template.footerText || ""}
                    onChange={handleInputChange}
                    rows={2}
                    placeholder="Ex: Cette offre est valable 30 jours..."
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label>Logo de l'entreprise</Label>
                  <div className="flex items-center gap-4">
                    {template.logoURL && (
                      <div className="border p-2 rounded bg-gray-50">
                        <img 
                          src={template.logoURL} 
                          alt="Logo" 
                          className="h-16 object-contain"
                          onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                        />
                      </div>
                    )}
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        id="logo-upload"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                handleLogoUpload(event.target.result as string);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        onClick={() => document.getElementById('logo-upload')?.click()}
                      >
                        {template.logoURL ? "Changer le logo" : "Ajouter un logo"}
                      </Button>
                      {template.logoURL && (
                        <Button
                          variant="ghost"
                          onClick={() => handleLogoUpload("")}
                          className="ml-2"
                        >
                          Supprimer
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="images" className="mt-4">
          <PDFTemplateImagesEditor 
            images={template.templateImages || []} 
            onUpdate={handleImagesUpdate}
          />
        </TabsContent>
        
        <TabsContent value="fields" className="mt-4">
          <PDFTemplateFieldsEditor 
            fields={template.fields || []} 
            onUpdate={handleFieldsUpdate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PDFTemplateEditor;
