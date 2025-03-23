
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PDFTemplateImageUploader from "./PDFTemplateImageUploader";
import PDFFieldsEditor from "./PDFFieldsEditor";
import { PDFTemplate } from "./PDFTemplateManager";

interface PDFTemplateWithFieldsProps {
  template: PDFTemplate;
  onSave: (template: PDFTemplate) => void;
}

const PDFTemplateWithFields = ({ template, onSave }: PDFTemplateWithFieldsProps) => {
  const [selectedPage, setSelectedPage] = useState(0);
  const [localTemplate, setLocalTemplate] = useState<PDFTemplate>(template);
  
  // Gestionnaire pour les images
  const handleImagesChange = (images: any[]) => {
    console.log("Images mises à jour:", images);
    
    const updatedTemplate = {
      ...localTemplate,
      templateImages: images
    };
    
    setLocalTemplate(updatedTemplate);
    onSave(updatedTemplate);
  };
  
  // Gestionnaire pour les champs
  const handleFieldsChange = (fields: any[]) => {
    console.log("Champs mis à jour:", fields);
    
    const updatedTemplate = {
      ...localTemplate,
      fields: fields
    };
    
    setLocalTemplate(updatedTemplate);
    onSave(updatedTemplate);
  };
  
  return (
    <Tabs defaultValue="images" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="images">Pages du modèle</TabsTrigger>
        <TabsTrigger value="fields">Champs du document</TabsTrigger>
      </TabsList>
      
      <TabsContent value="images" className="mt-6">
        <PDFTemplateImageUploader 
          templateImages={localTemplate.templateImages} 
          onChange={handleImagesChange}
          selectedPage={selectedPage}
          onPageSelect={setSelectedPage}
        />
      </TabsContent>
      
      <TabsContent value="fields" className="mt-6">
        <PDFFieldsEditor 
          fields={localTemplate.fields || []} 
          onChange={handleFieldsChange}
          currentPage={selectedPage}
          templateImages={localTemplate.templateImages || []}
        />
      </TabsContent>
    </Tabs>
  );
};

export default PDFTemplateWithFields;
