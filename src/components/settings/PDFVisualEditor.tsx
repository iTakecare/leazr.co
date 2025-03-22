
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PDFTemplate, PDFField } from '@/types/pdf';
import PDFPreview from './PDFPreview';
import { Plus } from 'lucide-react';
import FieldProperties from './FieldProperties';

interface PDFVisualEditorProps {
  template: PDFTemplate;
  selectedPage: number;
  onPageChange: (page: number) => void;
  selectedFieldId: string | null;
  onSelectField: (fieldId: string | null) => void;
  onFieldMove: (fieldId: string, x: number, y: number) => void;
  onFieldStyleUpdate: (fieldId: string, newStyle: any) => void;
  onAddFieldToPage: (fieldId: string) => void;
  allFields: PDFField[];
  onSave: () => void;
}

const PDFVisualEditor: React.FC<PDFVisualEditorProps> = ({
  template,
  selectedPage,
  onPageChange,
  selectedFieldId,
  onSelectField,
  onFieldMove,
  onFieldStyleUpdate,
  onAddFieldToPage,
  allFields,
  onSave
}) => {
  const [showAvailableFields, setShowAvailableFields] = useState(false);
  
  // Get selected field
  const selectedField = selectedFieldId 
    ? allFields.find(field => field.id === selectedFieldId) 
    : null;

  // Get fields that can be added to the current page
  const getAvailableFields = () => {
    if (!allFields) return [];
    
    // Get fields that are not already visible on the current page
    const fieldsOnPage = allFields.filter(field => 
      field.isVisible && field.page === selectedPage
    ).map(field => field.id);
    
    return allFields.filter(field => !fieldsOnPage.includes(field.id));
  };
  
  // Handle field movement
  const handleFieldMove = (fieldId: string, x: number, y: number) => {
    const updatedFields = allFields.map(field => {
      if (field.id === fieldId) {
        return {
          ...field,
          position: { x, y },
          isVisible: true,
          page: selectedPage
        };
      }
      return field;
    });
    
    onFieldMove(fieldId, x, y);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <Card>
          <CardHeader className="pb-2 border-b">
            <CardTitle>Placement visuel des champs</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <PDFPreview
              template={template}
              editMode={true}
              selectedFieldId={selectedFieldId}
              onFieldSelect={onSelectField}
              onFieldMove={handleFieldMove}
              onFieldStyleUpdate={onFieldStyleUpdate}
              availableFields={getAvailableFields()}
              activeTab={`page${selectedPage + 1}`} 
              onTabChange={(tab) => {
                // Extract page number from tab string (e.g., "page1" -> 0)
                const pageNumber = parseInt(tab.replace('page', '')) - 1;
                onPageChange(pageNumber);
              }}
              showAvailableFields={true}
            />
          </CardContent>
        </Card>
      </div>
      
      <div>
        <Card>
          <CardHeader className="pb-2 border-b">
            <CardTitle>Propriétés</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {selectedField ? (
              <FieldProperties 
                field={selectedField} 
                onFieldStyleUpdate={onFieldStyleUpdate} 
              />
            ) : (
              <div className="text-center py-8 px-4">
                <p className="text-gray-500 mb-4">
                  Sélectionnez un champ sur le modèle pour modifier ses propriétés,
                  ou ajoutez un nouveau champ à la page.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAvailableFields(!showAvailableFields)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter un champ
                </Button>
                {showAvailableFields && (
                  <div className="mt-4 border rounded-md p-2 max-h-80 overflow-y-auto">
                    <p className="text-xs font-medium mb-2">Champs disponibles:</p>
                    {getAvailableFields().map(field => (
                      <div 
                        key={field.id}
                        className="flex items-center justify-between p-2 hover:bg-gray-100 rounded cursor-pointer text-sm"
                        onClick={() => onAddFieldToPage(field.id)}
                      >
                        <span>{field.label}</span>
                        <Plus className="h-3.5 w-3.5" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            <div className="mt-6 pt-4 border-t">
              <Button onClick={onSave} className="w-full">Enregistrer les changements</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PDFVisualEditor;
