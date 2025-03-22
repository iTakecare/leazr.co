
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Bold, Italic, Underline, Move, Plus } from 'lucide-react';
import { PDFTemplate, PDFField } from '@/types/pdf';
import PDFPreview from './PDFPreview';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';

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

const PDFVisualEditor = ({
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
}: PDFVisualEditorProps) => {
  const [showProperties, setShowProperties] = useState(true);
  
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
  
  // Handle font size change
  const handleFontSizeChange = (size: number) => {
    if (!selectedFieldId) return;
    onFieldStyleUpdate(selectedFieldId, { fontSize: size });
  };
  
  // Toggle font weight (bold)
  const toggleFontWeight = () => {
    if (!selectedFieldId || !selectedField?.style) return;
    const newWeight = selectedField.style.fontWeight === 'bold' ? 'normal' : 'bold';
    onFieldStyleUpdate(selectedFieldId, { fontWeight: newWeight });
  };
  
  // Toggle font style (italic)
  const toggleFontStyle = () => {
    if (!selectedFieldId || !selectedField?.style) return;
    const newStyle = selectedField.style.fontStyle === 'italic' ? 'normal' : 'italic';
    onFieldStyleUpdate(selectedFieldId, { fontStyle: newStyle });
  };
  
  // Toggle text decoration (underline)
  const toggleTextDecoration = () => {
    if (!selectedFieldId || !selectedField?.style) return;
    const newDecoration = selectedField.style.textDecoration === 'underline' ? 'none' : 'underline';
    onFieldStyleUpdate(selectedFieldId, { textDecoration: newDecoration });
  };
  
  // Handle field movement
  const handleFieldMove = (fieldId: string, x: number, y: number) => {
    console.log(`Moving field ${fieldId} to (${x}, ${y})`);
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
              <div className="space-y-4">
                <div>
                  <Label>Champ sélectionné</Label>
                  <div className="p-2 bg-gray-100 rounded-md mt-1">
                    <p className="font-medium">{selectedField.label}</p>
                    <p className="text-xs text-gray-500">{selectedField.id}</p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <Label className="mb-2 block">Position</Label>
                  <div className="p-2 bg-blue-50 rounded-md mb-2">
                    <p className="text-xs flex items-center text-blue-600">
                      <Move className="h-3 w-3 mr-1 inline" /> 
                      Cliquez et faites glisser le champ directement sur le modèle pour le repositionner
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs mb-1 block">X</Label>
                      <div className="flex items-center">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            const currentX = selectedField.position?.x || 0;
                            onFieldMove(selectedField.id, Math.max(0, currentX - 1), selectedField.position?.y || 0);
                          }}
                        >
                          -
                        </Button>
                        <Input
                          type="number"
                          value={selectedField.position?.x || 0}
                          onChange={(e) => {
                            const x = parseFloat(e.target.value) || 0;
                            onFieldMove(selectedField.id, x, selectedField.position?.y || 0);
                          }}
                          className="h-7 mx-1 text-center"
                        />
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            const currentX = selectedField.position?.x || 0;
                            onFieldMove(selectedField.id, currentX + 1, selectedField.position?.y || 0);
                          }}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Y</Label>
                      <div className="flex items-center">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            const currentY = selectedField.position?.y || 0;
                            onFieldMove(selectedField.id, selectedField.position?.x || 0, Math.max(0, currentY - 1));
                          }}
                        >
                          -
                        </Button>
                        <Input
                          type="number"
                          value={selectedField.position?.y || 0}
                          onChange={(e) => {
                            const y = parseFloat(e.target.value) || 0;
                            onFieldMove(selectedField.id, selectedField.position?.x || 0, y);
                          }}
                          className="h-7 mx-1 text-center"
                        />
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            const currentY = selectedField.position?.y || 0;
                            onFieldMove(selectedField.id, selectedField.position?.x || 0, currentY + 1);
                          }}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Taille de police</Label>
                    <span className="text-xs font-medium">{selectedField.style?.fontSize || 10}pt</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs">6</span>
                    <Slider
                      value={[selectedField.style?.fontSize || 10]}
                      min={6}
                      max={36}
                      step={1}
                      onValueChange={(value) => handleFontSizeChange(value[0])}
                      className="flex-1"
                    />
                    <span className="text-xs">36</span>
                  </div>
                </div>
                
                <div>
                  <Label className="mb-2 block">Style de texte</Label>
                  <div className="flex space-x-2">
                    <Button
                      variant={selectedField.style?.fontWeight === 'bold' ? 'default' : 'outline'}
                      size="sm"
                      onClick={toggleFontWeight}
                    >
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={selectedField.style?.fontStyle === 'italic' ? 'default' : 'outline'}
                      size="sm"
                      onClick={toggleFontStyle}
                    >
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={selectedField.style?.textDecoration === 'underline' ? 'default' : 'outline'}
                      size="sm"
                      onClick={toggleTextDecoration}
                    >
                      <Underline className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <Label className="mb-2 block">Valeur</Label>
                  <Input
                    value={selectedField.value}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Pour modifier la valeur, utilisez l'onglet "Liste des champs"
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 px-4">
                <p className="text-gray-500 mb-4">
                  Sélectionnez un champ sur le modèle pour modifier ses propriétés,
                  ou ajoutez un nouveau champ à la page.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowProperties(!showProperties)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter un champ
                </Button>
                {showProperties && (
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
