import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PDFTemplate } from "@/utils/templateManager";
import PDFTemplateImageUploader from "./PDFTemplateImageUploader";
import PDFFieldsEditor from "./PDFFieldsEditor";

interface PDFTemplateWithFieldsProps {
  template: PDFTemplate;
  onSave: (template: PDFTemplate) => void;
}

const PDFTemplateWithFields: React.FC<PDFTemplateWithFieldsProps> = ({ template, onSave }) => {
  const [activeTab, setActiveTab] = useState("images");
  
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="images">Images</TabsTrigger>
        <TabsTrigger value="fields">Fields</TabsTrigger>
      </TabsList>
      
      <TabsContent value="images" className="mt-6">
        <PDFTemplateImageUploader 
          template={template}
          onImagesUpdate={(images) => {
            onSave({ ...template, templateImages: images });
          }}
        />
      </TabsContent>
      
      <TabsContent value="fields" className="mt-6">
        <PDFFieldsEditor
          template={template}
          onFieldsUpdate={(fields) => {
            onSave({ ...template, fields: fields });
          }}
        />
      </TabsContent>
    </Tabs>
  );
};

export default PDFTemplateWithFields;
