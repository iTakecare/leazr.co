
import React, { useState, useRef, useEffect } from 'react';
import { PDFTemplate, PDFField } from '@/types/pdf';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DraggableField from './DraggableField';

interface PDFPreviewProps {
  template: PDFTemplate;
  editMode?: boolean;
  selectedFieldId?: string | null;
  onFieldSelect?: (fieldId: string | null) => void;
  onFieldMove?: (fieldId: string, x: number, y: number) => void;
  onFieldStyleUpdate?: (fieldId: string, newStyle: any) => void;
  availableFields?: PDFField[];
  activeTab?: string;
  onTabChange?: (value: string) => void;
  showAvailableFields?: boolean;
  onDownload?: () => void;
}

const PDFPreview: React.FC<PDFPreviewProps> = ({
  template,
  editMode = false,
  selectedFieldId = null,
  onFieldSelect = () => {},
  onFieldMove = () => {},
  onFieldStyleUpdate = () => {},
  availableFields = [],
  activeTab = 'page1',
  onTabChange = () => {},
  showAvailableFields = false,
  onDownload = () => {}
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  
  // Manage active page
  const currentPage = parseInt(activeTab.replace('page', '')) - 1;
  
  // Get fields for the current page
  const fieldsForCurrentPage = template.fields?.filter(
    field => field.isVisible && field.page === currentPage
  ) || [];

  // Handle adding a field to the current page
  const handleAddField = (fieldId: string) => {
    const field = availableFields?.find(f => f.id === fieldId);
    if (!field) return;
    
    // Center the field on the page by default
    const x = containerRef.current ? (containerRef.current.offsetWidth / 2) - 50 : 100;
    const y = containerRef.current ? (containerRef.current.offsetHeight / 2) - 10 : 100;
    
    // Call parent handler to update position and make field visible on this page
    onFieldMove(fieldId, x, y);
    onFieldSelect(fieldId);
  };

  // Handle field position change
  const handleFieldPositionChange = (fieldId: string, x: number, y: number) => {
    onFieldMove(fieldId, x, y);
  };

  // Handle field size change
  const handleFieldSizeChange = (fieldId: string, width: number, height: number) => {
    onFieldStyleUpdate(fieldId, { width, height });
  };

  // Handle the background click (deselect field)
  const handleContainerClick = () => {
    onFieldSelect(null);
  };

  // Make sure pages exists and has at least one item
  const pages = template.pages && template.pages.length > 0 
    ? template.pages 
    : [{ imageUrl: '' }];

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsList className="mb-4">
          {pages.map((_, index) => (
            <TabsTrigger key={`page${index + 1}`} value={`page${index + 1}`}>
              Page {index + 1}
            </TabsTrigger>
          ))}
        </TabsList>

        {pages.map((page, pageIndex) => (
          <TabsContent key={`page${pageIndex + 1}`} value={`page${pageIndex + 1}`}>
            <div className="flex flex-col md:flex-row gap-4">
              {/* PDF Preview Area */}
              <div 
                className="relative border rounded-md overflow-hidden bg-white"
                style={{ 
                  height: "842px", 
                  width: "595px", 
                  margin: "0 auto",
                  position: "relative" 
                }}
                onClick={handleContainerClick}
                ref={containerRef}
              >
                {/* Background image */}
                {page.imageUrl && (
                  <div className="absolute inset-0">
                    <img
                      src={page.imageUrl}
                      alt={`Page ${pageIndex + 1}`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                {/* Render fields for this page */}
                {fieldsForCurrentPage.map((field) => (
                  <DraggableField
                    key={field.id}
                    field={field}
                    selected={selectedFieldId === field.id}
                    pageScale={scale}
                    editMode={editMode}
                    containerRef={containerRef}
                    onSelect={onFieldSelect}
                    onPositionChange={handleFieldPositionChange}
                    onSizeChange={handleFieldSizeChange}
                  />
                ))}
              </div>

              {/* Available Fields */}
              {editMode && showAvailableFields && availableFields && availableFields.length > 0 && (
                <Card className="md:w-64 p-2 h-fit">
                  <h3 className="text-sm font-medium mb-2">Champs disponibles</h3>
                  <div className="space-y-1 max-h-96 overflow-y-auto">
                    {availableFields.map((field) => (
                      <Button
                        key={field.id}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between text-left font-normal"
                        onClick={() => handleAddField(field.id)}
                      >
                        <span className="truncate">{field.label}</span>
                        <Plus className="h-4 w-4 ml-2 shrink-0" />
                      </Button>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default PDFPreview;
