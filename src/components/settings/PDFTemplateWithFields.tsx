
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import PDFTemplateUploader from './PDFTemplateUploader';
import PDFFieldsEditor from './PDFFieldsEditor';
import PDFVisualEditor from './PDFVisualEditor';
import PDFPreview from './PDFPreview';
import { toast } from "sonner";
import { PDFField } from '@/types/pdf';

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
    isVisible: false,
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
    isVisible: false,
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
    isVisible: false,
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
    isVisible: false,
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
    isVisible: false,
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
    isVisible: false,
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
    isVisible: false,
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
    isVisible: false,
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
    isVisible: false,
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
    isVisible: false,
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
    isVisible: false,
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
    isVisible: false,
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
    isVisible: false,
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
    isVisible: false,
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
    isVisible: false,
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
    isVisible: false,
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
    isVisible: false,
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
    isVisible: false,
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
    isVisible: false,
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
    isVisible: false,
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
    isVisible: false,
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
    isVisible: false,
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
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  
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
  };

  // Save the template with updated fields
  const handleSaveTemplate = () => {
    if (onSave) {
      onSave({
        ...currentTemplate
      });
      toast.success("Modèle enregistré avec succès");
    }
  };

  // Add a new field to the template
  const handleAddField = (field) => {
    const newFields = [...currentTemplate.fields, field];
    handleFieldsChange(newFields);
    setSelectedFieldId(field.id);
    toast.success(`Champ "${field.label}" ajouté`);
  };

  // Delete a field from the template
  const handleDeleteField = (fieldId) => {
    const newFields = currentTemplate.fields.filter(field => field.id !== fieldId);
    handleFieldsChange(newFields);
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
    toast.success("Champ supprimé");
  };
  
  // Handle field position update via drag and drop or direct input
  const handleFieldMove = (fieldId: string, x: number, y: number) => {
    const updatedFields = currentTemplate.fields.map(field => {
      if (field.id === fieldId) {
        // Ensure values are valid numbers
        const newX = isNaN(x) ? 0 : Math.max(0, x);
        const newY = isNaN(y) ? 0 : Math.max(0, y);
        
        return {
          ...field,
          position: { x: newX, y: newY },
          isVisible: true,  // Make sure it's visible when positioned
          page: selectedPage  // Assign to current page
        };
      }
      return field;
    });
    
    handleFieldsChange(updatedFields);
  };
  
  // Handle field style update
  const handleFieldStyleUpdate = (fieldId: string, newStyle: any) => {
    const updatedFields = currentTemplate.fields.map(field => {
      if (field.id === fieldId) {
        return {
          ...field,
          style: {
            ...field.style,
            ...newStyle
          }
        };
      }
      return field;
    });
    
    handleFieldsChange(updatedFields);
  };
  
  // Handle field selection
  const handleFieldSelect = (fieldId: string | null) => {
    setSelectedFieldId(fieldId);
  };

  // Set a field to be visible on the current page
  const handleAddFieldToPage = (fieldId: string) => {
    const updatedFields = currentTemplate.fields.map(field => {
      if (field.id === fieldId) {
        return {
          ...field,
          isVisible: true,
          page: selectedPage,
          position: field.position || { x: 50, y: 50 } // Default position if none exists
        };
      }
      return field;
    });
    
    handleFieldsChange(updatedFields);
    setSelectedFieldId(fieldId);
    toast.success("Champ ajouté à la page courante");
  };
  
  return (
    <div className="space-y-8">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="template">Pages du modèle</TabsTrigger>
          <TabsTrigger value="fields">Liste des champs</TabsTrigger>
          <TabsTrigger value="visual">Positionnement visuel</TabsTrigger>
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
            onDeleteField={handleDeleteField}
            onAddField={handleAddField}
            selectedFieldId={selectedFieldId}
            onSelectField={handleFieldSelect}
          />
        </TabsContent>
        
        <TabsContent value="visual" className="mt-6">
          <PDFVisualEditor
            template={currentTemplate}
            selectedPage={selectedPage}
            onPageChange={setSelectedPage}
            selectedFieldId={selectedFieldId}
            onSelectField={handleFieldSelect}
            onFieldMove={handleFieldMove}
            onFieldStyleUpdate={handleFieldStyleUpdate}
            onAddFieldToPage={handleAddFieldToPage}
            allFields={currentTemplate.fields}
            onSave={handleSaveTemplate}
          />
        </TabsContent>

        <TabsContent value="preview" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <PDFPreview 
                template={currentTemplate}
                onDownload={() => {}} 
                editMode={false}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PDFTemplateWithFields;
