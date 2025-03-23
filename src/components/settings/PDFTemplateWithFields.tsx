
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
  
  // Fonction pour supprimer un champ
  const handleDeleteField = (fieldId: string) => {
    const updatedFields = localTemplate.fields.filter(field => field.id !== fieldId);
    
    const updatedTemplate = {
      ...localTemplate,
      fields: updatedFields
    };
    
    setLocalTemplate(updatedTemplate);
    onSave(updatedTemplate);
  };
  
  // Fonction pour ajouter un champ
  const handleAddField = (field: any) => {
    const updatedFields = [...(localTemplate.fields || []), field];
    
    const updatedTemplate = {
      ...localTemplate,
      fields: updatedFields
    };
    
    setLocalTemplate(updatedTemplate);
    onSave(updatedTemplate);
  };
  
  // Fonction pour dupliquer un champ sur une autre page
  const handleDuplicateField = (fieldId: string, targetPage: number) => {
    const fieldToDuplicate = localTemplate.fields.find(field => field.id === fieldId);
    
    if (fieldToDuplicate) {
      const duplicatedField = {
        ...fieldToDuplicate,
        id: `${fieldId}_page${targetPage}`,
        page: targetPage
      };
      
      const updatedFields = [...localTemplate.fields, duplicatedField];
      
      const updatedTemplate = {
        ...localTemplate,
        fields: updatedFields
      };
      
      setLocalTemplate(updatedTemplate);
      onSave(updatedTemplate);
    }
  };
  
  // Fonction pour retirer un champ d'une page
  const handleRemoveFieldFromPage = (fieldId: string, page: number) => {
    const updatedFields = localTemplate.fields.filter(field => 
      !(field.id === fieldId && field.page === page)
    );
    
    const updatedTemplate = {
      ...localTemplate,
      fields: updatedFields
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
          activePage={selectedPage}
          onPageChange={setSelectedPage}
          template={localTemplate}
          onDeleteField={handleDeleteField}
          onAddField={handleAddField}
          onDuplicateField={handleDuplicateField}
          onRemoveFieldFromPage={handleRemoveFieldFromPage}
        />
      </TabsContent>
    </Tabs>
  );
};

export default PDFTemplateWithFields;
