
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import PDFTemplateUploader from './PDFTemplateUploader';
import PDFFieldsEditor from './PDFFieldsEditor';
import PDFPreview from './PDFPreview';
import { toast } from "sonner";
import { OfferData, EquipmentItem } from '@/services/offers/types';

// Default fields for the PDF template if none exist yet
const DEFAULT_FIELDS = [
  // Client fields
  {
    id: 'client_name',
    label: 'Nom du client',
    type: 'text',
    category: 'client',
    isVisible: false,
    value: '{clients.name}',
    position: { x: 20, y: 40 },
    page: null
  },
  {
    id: 'client_company',
    label: 'Société',
    type: 'text',
    category: 'client',
    isVisible: false,
    value: '{clients.company}',
    position: { x: 20, y: 50 },
    page: null
  },
  {
    id: 'client_email',
    label: 'Email',
    type: 'email',
    category: 'client',
    isVisible: false,
    value: '{clients.email}',
    position: { x: 20, y: 60 },
    page: null
  },
  {
    id: 'client_address',
    label: 'Adresse',
    type: 'text',
    category: 'client',
    isVisible: false,
    value: '{clients.address}',
    position: { x: 20, y: 70 },
    page: null
  },
  {
    id: 'client_phone',
    label: 'Téléphone',
    type: 'text',
    category: 'client',
    isVisible: false,
    value: '{clients.phone}',
    position: { x: 20, y: 80 },
    page: null
  },
  
  // Offer fields
  {
    id: 'offer_id',
    label: 'Numéro d\'offre',
    type: 'text',
    category: 'offer',
    isVisible: false,
    value: '{id}',
    position: { x: 150, y: 40 },
    page: null
  },
  {
    id: 'offer_date',
    label: 'Date de l\'offre',
    type: 'date',
    category: 'offer',
    isVisible: false,
    value: '{created_at}',
    position: { x: 150, y: 50 },
    page: null
  },
  {
    id: 'offer_amount',
    label: 'Montant total',
    type: 'currency',
    category: 'offer',
    isVisible: false,
    value: '{amount}',
    position: { x: 150, y: 80 },
    page: null
  },
  {
    id: 'monthly_payment',
    label: 'Mensualité',
    type: 'currency',
    category: 'offer',
    isVisible: false,
    value: '{monthly_payment}',
    position: { x: 150, y: 90 },
    page: null
  },
  {
    id: 'coefficient',
    label: 'Coefficient',
    type: 'number',
    category: 'offer',
    isVisible: false,
    value: '{coefficient}',
    position: { x: 150, y: 100 },
    page: null
  },
  {
    id: 'offer_type',
    label: 'Type d\'offre',
    type: 'text',
    category: 'offer',
    isVisible: false,
    value: '{type}',
    position: { x: 150, y: 110 },
    page: null
  },
  {
    id: 'offer_remarks',
    label: 'Remarques',
    type: 'text',
    category: 'offer',
    isVisible: false,
    value: '{remarks}',
    position: { x: 20, y: 200 },
    page: null
  },
  {
    id: 'workflow_status',
    label: 'Statut',
    type: 'text',
    category: 'offer',
    isVisible: false,
    value: '{workflow_status}',
    position: { x: 150, y: 120 },
    page: null
  },
  {
    id: 'commission',
    label: 'Commission',
    type: 'currency',
    category: 'offer',
    isVisible: false,
    value: '{commission}',
    position: { x: 150, y: 130 },
    page: null
  },
  
  // Equipment field (special table type)
  {
    id: 'equipment_table',
    label: 'Tableau des équipements',
    type: 'table',
    category: 'equipment',
    isVisible: false,
    value: '{equipment_description}',
    position: { x: 20, y: 120 },
    page: null
  },
  {
    id: 'equipment_total',
    label: 'Total équipement',
    type: 'currency',
    category: 'equipment',
    isVisible: false,
    value: '{equipment_total}',
    position: { x: 150, y: 170 },
    page: null
  },
  
  // User/Vendor fields
  {
    id: 'user_name',
    label: 'Nom du vendeur',
    type: 'text',
    category: 'user',
    isVisible: false,
    value: '{user.name}',
    position: { x: 20, y: 230 },
    page: null
  },
  {
    id: 'user_email',
    label: 'Email du vendeur',
    type: 'email',
    category: 'user',
    isVisible: false,
    value: '{user.email}',
    position: { x: 20, y: 240 },
    page: null
  },
  {
    id: 'user_phone',
    label: 'Téléphone du vendeur',
    type: 'text',
    category: 'user',
    isVisible: false,
    value: '{user.phone}',
    position: { x: 20, y: 250 },
    page: null
  },
  
  // General fields
  {
    id: 'page_number',
    label: 'Numéro de page',
    type: 'text',
    category: 'general',
    isVisible: false,
    value: 'Page {page_number}',
    position: { x: 180, y: 280 },
    page: null
  },
  {
    id: 'total_pages',
    label: 'Nombre total de pages',
    type: 'text',
    category: 'general',
    isVisible: false,
    value: 'sur {total_pages}',
    position: { x: 200, y: 280 },
    page: null
  },
  {
    id: 'current_date',
    label: 'Date actuelle',
    type: 'date',
    category: 'general',
    isVisible: false,
    value: '{current_date}',
    position: { x: 20, y: 280 },
    page: null
  },
  {
    id: 'validity_period',
    label: 'Période de validité',
    type: 'text',
    category: 'general',
    isVisible: false,
    value: 'Offre valable 30 jours',
    position: { x: 20, y: 260 },
    page: null
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
    
    toast.success("Images du modèle enregistrées");
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

  // Add a new field to the template
  const handleAddField = (field) => {
    const newFields = [...currentTemplate.fields, field];
    handleFieldsChange(newFields);
    toast.success(`Champ "${field.label}" ajouté`);
  };

  // Delete a field from the template
  const handleDeleteField = (fieldId) => {
    const newFields = currentTemplate.fields.filter(field => field.id !== fieldId);
    handleFieldsChange(newFields);
    toast.success("Champ supprimé");
  };
  
  // Duplicate a field for a different page
  const handleDuplicateField = (fieldId, targetPage) => {
    const fieldToDuplicate = currentTemplate.fields.find(field => field.id === fieldId);
    
    if (!fieldToDuplicate) return;
    
    // Create a new ID for the duplicated field
    const newId = `${fieldToDuplicate.id}_page${targetPage}`;
    
    // Check if this field already exists on the target page to avoid duplicates
    const fieldExistsOnPage = currentTemplate.fields.some(
      field => field.id === newId || (field.id === fieldId && field.page === targetPage)
    );
    
    if (fieldExistsOnPage) {
      toast.error(`Ce champ existe déjà sur la page ${targetPage + 1}`);
      return;
    }
    
    // Create the duplicated field for the target page
    const duplicatedField = {
      ...fieldToDuplicate,
      id: newId,
      page: targetPage
    };
    
    const newFields = [...currentTemplate.fields, duplicatedField];
    handleFieldsChange(newFields);
    toast.success(`Champ "${fieldToDuplicate.label}" ajouté à la page ${targetPage + 1}`);
  };
  
  // Remove a field from a specific page only
  const handleRemoveFieldFromPage = (fieldId, page) => {
    // Find the field
    const fieldToRemove = currentTemplate.fields.find(field => field.id === fieldId && field.page === page);
    
    if (!fieldToRemove) return;
    
    // Remove the field from the array
    const newFields = currentTemplate.fields.filter(field => !(field.id === fieldId && field.page === page));
    handleFieldsChange(newFields);
    toast.success(`Champ supprimé de la page ${page + 1}`);
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
