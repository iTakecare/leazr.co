
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import PDFTemplateUploader from './PDFTemplateUploader';
import PDFFieldsEditor from './PDFFieldsEditor';
import PDFPreview from './PDFPreview';

// Default fields for the PDF template if none exist yet
const DEFAULT_FIELDS = [
  // Client fields
  {
    id: 'client_name',
    label: 'Nom du client',
    type: 'text',
    category: 'client',
    isVisible: true,
    value: '{clients.name}',
    position: { x: 20, y: 40 },
    page: 0
  },
  {
    id: 'client_company',
    label: 'Société',
    type: 'text',
    category: 'client',
    isVisible: true,
    value: '{clients.company}',
    position: { x: 20, y: 50 },
    page: 0
  },
  {
    id: 'client_email',
    label: 'Email',
    type: 'email',
    category: 'client',
    isVisible: true,
    value: '{clients.email}',
    position: { x: 20, y: 60 },
    page: 0
  },
  
  // Offer fields
  {
    id: 'offer_id',
    label: 'Numéro d\'offre',
    type: 'text',
    category: 'offer',
    isVisible: true,
    value: '{id}',
    position: { x: 150, y: 40 },
    page: 0
  },
  {
    id: 'offer_date',
    label: 'Date de l\'offre',
    type: 'date',
    category: 'offer',
    isVisible: true,
    value: '{created_at}',
    position: { x: 150, y: 50 },
    page: 0
  },
  {
    id: 'offer_amount',
    label: 'Montant total',
    type: 'currency',
    category: 'offer',
    isVisible: true,
    value: '{amount}',
    position: { x: 150, y: 80 },
    page: 0
  },
  {
    id: 'monthly_payment',
    label: 'Mensualité',
    type: 'currency',
    category: 'offer',
    isVisible: true,
    value: '{monthly_payment}',
    position: { x: 150, y: 90 },
    page: 0
  },
  {
    id: 'coefficient',
    label: 'Coefficient',
    type: 'number',
    category: 'offer',
    isVisible: true,
    value: '{coefficient}',
    position: { x: 150, y: 100 },
    page: 0
  },
  
  // Equipment field (special table type)
  {
    id: 'equipment_table',
    label: 'Tableau des équipements',
    type: 'table',
    category: 'equipment',
    isVisible: true,
    value: '{equipment_description}',
    position: { x: 20, y: 120 },
    page: 0
  },
  
  // General fields
  {
    id: 'page_number',
    label: 'Numéro de page',
    type: 'text',
    category: 'general',
    isVisible: true,
    value: 'Page {page_number}',
    position: { x: 180, y: 280 },
    page: 0
  }
];

const PDFTemplateWithFields = ({ template, onSave }) => {
  const [currentTemplate, setCurrentTemplate] = useState(template || {
    id: 'default',
    name: 'Modèle par défaut',
    companyName: 'iTakeCare',
    companyAddress: 'Avenue du Général Michel 1E, 6000 Charleroi, Belgique',
    companyContact: 'Tel: +32 471 511 121 - Email: hello@itakecare.be',
    companySiret: 'TVA: BE 0795.642.894',
    logoURL: '',
    primaryColor: '#2C3E50',
    secondaryColor: '#3498DB',
    headerText: 'OFFRE N° {offer_id}',
    footerText: 'Cette offre est valable 30 jours à compter de sa date d\'émission.',
    templateImages: [],
    fields: DEFAULT_FIELDS
  });
  
  const [selectedPage, setSelectedPage] = useState(0);
  const [activeTab, setActiveTab] = useState("template");
  
  // Update template images when they change
  const handleImagesChange = (newImages) => {
    setCurrentTemplate({
      ...currentTemplate,
      templateImages: newImages
    });
    
    // Auto-save the template
    if (onSave) {
      onSave({
        ...currentTemplate,
        templateImages: newImages
      });
    }
  };
  
  // Update fields when they change
  const handleFieldsChange = (newFields) => {
    setCurrentTemplate({
      ...currentTemplate,
      fields: newFields
    });
    
    // Auto-save the template
    if (onSave) {
      onSave({
        ...currentTemplate,
        fields: newFields
      });
    }
  };
  
  return (
    <div className="space-y-8">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="template">Pages du modèle</TabsTrigger>
          <TabsTrigger value="fields">Champs et positionnement</TabsTrigger>
          <TabsTrigger value="preview">Aperçu</TabsTrigger>
        </TabsList>
        
        <TabsContent value="template" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <PDFTemplateUploader 
                templateImages={currentTemplate.templateImages} 
                onChange={handleImagesChange}
                selectedPage={selectedPage}
                onPageSelect={setSelectedPage}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="fields" className="mt-6">
          <PDFFieldsEditor 
            fields={currentTemplate.fields} 
            onChange={handleFieldsChange}
            activePage={selectedPage}
            onPageChange={setSelectedPage}
            template={currentTemplate}
          />
        </TabsContent>
        
        <TabsContent value="preview" className="mt-6">
          <PDFPreview template={currentTemplate} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PDFTemplateWithFields;
