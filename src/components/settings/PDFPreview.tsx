
import React, { useState, useRef, useEffect } from 'react';
import { PDFTemplate, PDFField } from '@/types/pdf';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

const PDFPreview = ({
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
  onDownload
}: PDFPreviewProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragFieldId, setDragFieldId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Manage active page
  const currentPage = parseInt(activeTab.replace('page', '')) - 1;
  
  // Get fields for the current page
  const fieldsForCurrentPage = template.fields?.filter(
    field => field.isVisible && field.page === currentPage
  ) || [];

  const startDrag = (e: React.MouseEvent, fieldId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!containerRef.current) return;
    
    const field = template.fields?.find(f => f.id === fieldId);
    if (!field) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const offsetX = e.clientX - containerRect.left - (field.position?.x || 0);
    const offsetY = e.clientY - containerRect.top - (field.position?.y || 0);
    
    setIsDragging(true);
    setDragFieldId(fieldId);
    setDragOffset({ x: offsetX, y: offsetY });
    
    console.log("Starting drag for field:", fieldId);
    
    // Select the field when starting to drag
    onFieldSelect(fieldId);
    
    // Add event listeners to document for dragging
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  };
  
  const handleDragMove = (e: MouseEvent) => {
    if (!isDragging || !dragFieldId || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, e.clientX - containerRect.left - dragOffset.x);
    const y = Math.max(0, e.clientY - containerRect.top - dragOffset.y);
    
    console.log("Moving field to:", { x, y });
    
    // Update field position in real-time
    onFieldMove(dragFieldId, x, y);
  };
  
  const handleDragEnd = () => {
    setIsDragging(false);
    setDragFieldId(null);
    
    // Remove event listeners
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
  };
  
  // Clean up event listeners when component unmounts
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging, dragFieldId, dragOffset]);

  // Handle adding a field to the current page
  const handleAddField = (fieldId: string) => {
    const field = availableFields?.find(f => f.id === fieldId);
    if (!field) return;
    
    // Center the field on the page by default
    const x = containerRef.current ? (containerRef.current.offsetWidth / 2) - 50 : 100;
    const y = containerRef.current ? (containerRef.current.offsetHeight / 2) - 10 : 100;
    
    // Update the field position and make it visible on this page
    const updatedField = {
      ...field,
      isVisible: true,
      page: currentPage,
      position: { x, y }
    };
    
    // Call parent handler to update the field
    if (onFieldSelect) {
      onFieldSelect(fieldId);
    }
    
    // Call parent handler to update position
    if (onFieldMove) {
      onFieldMove(fieldId, x, y);
    }
  };

  // Handle the background click (deselect field)
  const handleContainerClick = (e: React.MouseEvent) => {
    // Only deselect if clicking directly on the container, not on a field
    if (e.target === e.currentTarget) {
      onFieldSelect(null);
    }
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
                className="w-full flex-1 relative border rounded-md overflow-hidden bg-white"
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
                  <div
                    key={field.id}
                    className={`absolute p-1 transition-all cursor-move ${
                      selectedFieldId === field.id 
                        ? 'outline outline-2 outline-blue-500 bg-blue-50' 
                        : 'hover:outline hover:outline-1 hover:outline-blue-300'
                    }`}
                    style={{
                      left: `${field.position?.x || 0}px`,
                      top: `${field.position?.y || 0}px`,
                      fontSize: `${field.style?.fontSize || 12}px`,
                      fontWeight: field.style?.fontWeight || 'normal',
                      fontStyle: field.style?.fontStyle || 'normal',
                      textDecoration: field.style?.textDecoration || 'none',
                      minWidth: '30px',
                      minHeight: '20px',
                      zIndex: selectedFieldId === field.id ? 10 : 1
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onFieldSelect(field.id);
                    }}
                    onMouseDown={(e) => {
                      if (editMode) {
                        startDrag(e, field.id);
                      }
                    }}
                  >
                    {field.value || field.label}
                  </div>
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
