import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import PDFTemplateUploader from './PDFTemplateUploader';
import PDFFieldsEditor from './PDFFieldsEditor';
import PDFPreview from './PDFPreview';

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
    page: null,
    style: {
      fontSize: 10,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none'
    }
  },
  {
    id: 'client_company',
    label: 'Société',
    type: 'text',
    category: 'client',
    isVisible: true,
    value: '{clients.company}',
    position: { x: 20, y: 50 },
    page: null,
    style: {
      fontSize: 10,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none'
    }
  },
  {
    id: 'client_email',
    label: 'Email',
    type: 'email',
    category: 'client',
    isVisible: true,
    value: '{clients.email}',
    position: { x: 20, y: 60 },
    page: null,
    style: {
      fontSize: 10,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none'
    }
  },
  {
    id: 'client_address',
    label: 'Adresse',
    type: 'text',
    category: 'client',
    isVisible: true,
    value: '{clients.address}',
    position: { x: 20, y: 70 },
    page: null,
    style: {
      fontSize: 10,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none'
    }
  },
  {
    id: 'client_phone',
    label: 'Téléphone',
    type: 'text',
    category: 'client',
    isVisible: true,
    value: '{clients.phone}',
    position: { x: 20, y: 80 },
    page: null,
    style: {
      fontSize: 10,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none'
    }
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
    page: null,
    style: {
      fontSize: 10,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none'
    }
  },
  {
    id: 'offer_date',
    label: 'Date de l\'offre',
    type: 'date',
    category: 'offer',
    isVisible: true,
    value: '{created_at}',
    position: { x: 150, y: 50 },
    page: null,
    style: {
      fontSize: 10,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none'
    }
  },
  {
    id: 'offer_amount',
    label: 'Montant total',
    type: 'currency',
    category: 'offer',
    isVisible: true,
    value: '{amount}',
    position: { x: 150, y: 80 },
    page: null,
    style: {
      fontSize: 10,
      fontWeight: 'bold',
      fontStyle: 'normal',
      textDecoration: 'none'
    }
  },
  {
    id: 'monthly_payment',
    label: 'Mensualité',
    type: 'currency',
    category: 'offer',
    isVisible: true,
    value: '{monthly_payment}',
    position: { x: 150, y: 90 },
    page: null,
    style: {
      fontSize: 10,
      fontWeight: 'bold',
      fontStyle: 'normal',
      textDecoration: 'none'
    }
  },
  {
    id: 'coefficient',
    label: 'Coefficient',
    type: 'number',
    category: 'offer',
    isVisible: true,
    value: '{coefficient}',
    position: { x: 150, y: 100 },
    page: null,
    style: {
      fontSize: 10,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none'
    }
  },
  {
    id: 'offer_type',
    label: 'Type d\'offre',
    type: 'text',
    category: 'offer',
    isVisible: true,
    value: '{type}',
    position: { x: 150, y: 110 },
    page: null,
    style: {
      fontSize: 10,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none'
    }
  },
  {
    id: 'offer_remarks',
    label: 'Remarques',
    type: 'text',
    category: 'offer',
    isVisible: true,
    value: '{remarks}',
    position: { x: 20, y: 200 },
    page: null,
    style: {
      fontSize: 10,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none'
    }
  },
  {
    id: 'workflow_status',
    label: 'Statut',
    type: 'text',
    category: 'offer',
    isVisible: true,
    value: '{workflow_status}',
    position: { x: 150, y: 120 },
    page: null,
    style: {
      fontSize: 10,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none'
    }
  },
  {
    id: 'commission',
    label: 'Commission',
    type: 'currency',
    category: 'offer',
    isVisible: true,
    value: '{commission}',
    position: { x: 150, y: 130 },
    page: null,
    style: {
      fontSize: 10,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none'
    }
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
    page: null,
    style: {
      fontSize: 9,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none'
    }
  },
  {
    id: 'equipment_total',
    label: 'Total équipement',
    type: 'currency',
    category: 'equipment',
    isVisible: true,
    value: '{equipment_total}',
    position: { x: 150, y: 170 },
    page: null,
    style: {
      fontSize: 10,
      fontWeight: 'bold',
      fontStyle: 'normal',
      textDecoration: 'none'
    }
  },
  
  // User/Vendor fields
  {
    id: 'user_name',
    label: 'Nom du vendeur',
    type: 'text',
    category: 'user',
    isVisible: true,
    value: '{user.name}',
    position: { x: 20, y: 230 },
    page: null,
    style: {
      fontSize: 10,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none'
    }
  },
  {
    id: 'user_email',
    label: 'Email du vendeur',
    type: 'email',
    category: 'user',
    isVisible: true,
    value: '{user.email}',
    position: { x: 20, y: 240 },
    page: null,
    style: {
      fontSize: 10,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none'
    }
  },
  {
    id: 'user_phone',
    label: 'Téléphone du vendeur',
    type: 'text',
    category: 'user',
    isVisible: true,
    value: '{user.phone}',
    position: { x: 20, y: 250 },
    page: null,
    style: {
      fontSize: 10,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none'
    }
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
    page: null,
    style: {
      fontSize: 8,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none'
    }
  },
  {
    id: 'total_pages',
    label: 'Nombre total de pages',
    type: 'text',
    category: 'general',
    isVisible: true,
    value: 'sur {total_pages}',
    position: { x: 200, y: 280 },
    page: null,
    style: {
      fontSize: 8,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none'
    }
  },
  {
    id: 'current_date',
    label: 'Date actuelle',
    type: 'date',
    category: 'general',
    isVisible: true,
    value: '{current_date}',
    position: { x: 20, y: 280 },
    page: null,
    style: {
      fontSize: 8,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none'
    }
  },
  {
    id: 'validity_period',
    label: 'Période de validité',
    type: 'text',
    category: 'general',
    isVisible: true,
    value: 'Offre valable 30 jours',
    position: { x: 20, y: 260 },
    page: null,
    style: {
      fontSize: 8,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none'
    }
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

  const handleImagesChange = (newImages) => {
    const updatedTemplate = {
      ...currentTemplate,
      templateImages: newImages
    };
    
    setCurrentTemplate(updatedTemplate);
    
    if (onSave) {
      onSave(updatedTemplate);
    }
  };

  const handleFieldsChange = (newFields) => {
    const updatedTemplate = {
      ...currentTemplate,
      fields: newFields.map(field => ({
        ...field,
        isVisible: field.isVisible !== undefined ? field.isVisible : true
      }))
    };
    
    setCurrentTemplate(updatedTemplate);
    
    if (onSave) {
      onSave(updatedTemplate);
    }
  };

  const handleAddField = (field) => {
    const newFields = [
      ...currentTemplate.fields, 
      {
        ...field,
        isVisible: true
      }
    ];
    
    handleFieldsChange(newFields);
  };

  const handleDeleteField = (fieldId) => {
    const newFields = currentTemplate.fields.filter(field => field.id !== fieldId);
    handleFieldsChange(newFields);
  };

  const handleDuplicateField = (fieldId, targetPage) => {
    const fieldToDuplicate = currentTemplate.fields.find(field => field.id === fieldId);
    
    if (!fieldToDuplicate) return;
    
    const newId = `${fieldToDuplicate.id}_page${targetPage}`;
    
    const fieldExistsOnPage = currentTemplate.fields.some(
      field => field.id === newId || (field.id === fieldId && field.page === targetPage)
    );
    
    if (fieldExistsOnPage) {
      return;
    }
    
    const duplicatedField = {
      ...fieldToDuplicate,
      id: newId,
      page: targetPage,
      isVisible: true
    };
    
    const newFields = [...currentTemplate.fields, duplicatedField];
    handleFieldsChange(newFields);
  };

  const handleRemoveFieldFromPage = (fieldId, page) => {
    const fieldToRemove = currentTemplate.fields.find(field => field.id === fieldId && field.page === page);
    
    if (!fieldToRemove) return;
    
    const newFields = currentTemplate.fields.filter(field => !(field.id === fieldId && field.page === page));
    handleFieldsChange(newFields);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Conception du modèle PDF</h3>
      </div>

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
            fields={currentTemplate.fields.map(field => ({
              ...field,
              isVisible: field.isVisible !== undefined ? field.isVisible : true
            }))} 
            onChange={handleFieldsChange}
            activePage={selectedPage}
            onPageChange={setSelectedPage}
            template={currentTemplate}
            onDeleteField={handleDeleteField}
            onAddField={handleAddField}
            onDuplicateField={handleDuplicateField}
            onRemoveFieldFromPage={handleRemoveFieldFromPage}
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
