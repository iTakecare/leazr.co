
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Move, Plus } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { generateOfferPdf } from '@/utils/pdfGenerator';
import { PDFTemplate, PDFField } from '@/types/pdf';

interface PDFPreviewProps {
  template: PDFTemplate;
  onSave?: () => void;
  onDownload?: () => void;
  loading?: boolean;
  editMode?: boolean;
  onFieldMove?: (fieldId: string, x: number, y: number) => void;
  onFieldSelect?: (fieldId: string) => void;
  selectedFieldId?: string;
  availableFields?: PDFField[];
}

const PDFPreview = ({ 
  template, 
  onSave, 
  onDownload, 
  loading = false, 
  editMode = false,
  onFieldMove,
  onFieldSelect,
  selectedFieldId,
  availableFields = []
}: PDFPreviewProps) => {
  const [activeTab, setActiveTab] = useState('page1');
  const [scale, setScale] = useState(0.5);
  const [previewOffer, setPreviewOffer] = useState<any>(null);
  const [draggedField, setDraggedField] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showAvailableFields, setShowAvailableFields] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Create a sample offer for preview with realistic data
    const sampleOffer = {
      id: 'preview-123456789',
      client_name: 'Client Exemple',
      client_company: 'Entreprise Exemple',
      client_email: 'client@exemple.com',
      client_phone: '+32 471 123 456',
      amount: 15000,
      monthly_payment: 450,
      duration: 36,
      created_at: new Date().toISOString(),
      status: 'draft',
      clients: {
        name: 'Jean Dupont',
        company: 'Société Exemple',
        email: 'jean.dupont@exemple.be',
        phone: '+32 471 234 567',
        address: 'Rue des Exemples 123, 1000 Bruxelles'
      },
      user: {
        name: 'Pierre Martin',
        email: 'pierre.martin@itakecare.be',
        phone: '+32 477 890 123'
      },
      equipment_description: JSON.stringify([
        {
          title: 'MacBook Pro 16"',
          description: 'Apple M2 Pro, 32GB RAM, 1TB SSD',
          purchasePrice: 3200,
          quantity: 2,
          margin: 10
        },
        {
          title: 'Écran Dell UltraSharp 32"',
          description: '4K, USB-C, DisplayPort',
          purchasePrice: 800,
          quantity: 2,
          margin: 15
        },
        {
          title: 'Chaise de bureau ergonomique',
          description: 'Modèle premium avec support lombaire',
          purchasePrice: 450,
          quantity: 2,
          margin: 20
        }
      ]),
      __template: template // Pass the template directly for preview
    };
    
    setPreviewOffer(sampleOffer);
  }, [template]);

  const handleDownloadPDF = async () => {
    if (!previewOffer) return;
    
    try {
      await generateOfferPdf(previewOffer);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    console.error("Error loading image:", event.currentTarget.src);
    // Use a fallback image or handle the error
    event.currentTarget.src = 'https://placehold.co/600x400?text=Image+Not+Found';
  };

  // Function to resolve field values from the sample offer
  const resolveFieldValue = (pattern: string) => {
    if (!previewOffer) return pattern;
    
    return pattern.replace(/\{([^}]+)\}/g, (match, key) => {
      const keyParts = key.split('.');
      let value = previewOffer;
      
      for (const part of keyParts) {
        if (value === undefined || value === null) {
          return '';
        }
        value = value[part];
      }
      
      // Format according to type
      if (typeof value === 'number') {
        // Detect if it's a monetary value
        if (key.includes('amount') || key.includes('payment') || key.includes('price') || key.includes('commission')) {
          return formatCurrency(value);
        }
        return value.toString();
      } else if (value instanceof Date || (typeof value === 'string' && Date.parse(value))) {
        return formatDate(value);
      }
      
      return value || 'Non renseigné';
    });
  };

  // Get the template images for the current page
  const getPageImages = (pageNum: number) => {
    if (!template.templateImages) return [];
    return template.templateImages.filter(img => img.page === pageNum);
  };

  // Get the fields for the current page
  const getPageFields = (pageNum: number) => {
    if (!template.fields) return [];
    return template.fields.filter(field => field.isVisible && (field.page === pageNum || field.page === null));
  };

  // Helper function to handle width scaling properly for both string and number types
  const getScaledWidth = (width: string | number | undefined, scale: number): string => {
    if (width === undefined) return 'auto';
    
    if (typeof width === 'number') {
      return `${width * scale}px`;
    } else if (typeof width === 'string') {
      // Try to convert to number if it's a numeric string without units
      const numericWidth = parseFloat(width);
      if (!isNaN(numericWidth) && width.trim().endsWith('px')) {
        return `${numericWidth * scale}px`;
      } else if (!isNaN(numericWidth) && !width.includes('px')) {
        return `${numericWidth * scale}px`;
      }
      // Return as is if it's a relative unit like %, em, rem, etc.
      return width;
    }
    
    return 'auto';
  };

  // Handle clicking on a field to select it
  const handleFieldClick = (event: React.MouseEvent, fieldId: string) => {
    if (!editMode || !onFieldSelect) return;
    
    event.stopPropagation();
    onFieldSelect(fieldId);
  };

  // Handle start dragging a field
  const handleDragStart = (event: React.MouseEvent, fieldId: string) => {
    if (!editMode || !onFieldMove) return;
    
    event.preventDefault();
    event.stopPropagation();
    setDraggedField(fieldId);
    setIsDragging(true);
    
    if (onFieldSelect) {
      onFieldSelect(fieldId);
    }
    
    // Add event listeners for drag and drop
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  };
  
  // Handle dragging a field
  const handleDragMove = (event: MouseEvent) => {
    if (!isDragging || !draggedField || !previewRef.current || !onFieldMove) return;
    
    const previewRect = previewRef.current.getBoundingClientRect();
    
    // Calculate position relative to preview container
    const x = (event.clientX - previewRect.left) / scale;
    const y = (event.clientY - previewRect.top) / scale;
    
    // Update field position
    onFieldMove(draggedField, x, y);
  };
  
  // Handle end dragging a field
  const handleDragEnd = () => {
    setDraggedField(null);
    setIsDragging(false);
    
    // Remove event listeners
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
  };

  // Handle adding a field from the available fields 
  const handleAddFieldToCurrent = (field: PDFField) => {
    if (!previewRef.current || !onFieldMove) return;
    
    const previewRect = previewRef.current.getBoundingClientRect();
    
    // Calculate position for center of the container
    const x = 50;
    const y = 50;
    
    // Update field position
    onFieldMove(field.id, x, y);
    
    if (onFieldSelect) {
      onFieldSelect(field.id);
    }
  };

  // Get current page number from active tab
  const getCurrentPageNumber = () => {
    return parseInt(activeTab.replace('page', '')) - 1;
  };

  // Get available fields for the current page that aren't already visible
  const getAvailableFieldsForCurrentPage = () => {
    const currentPage = getCurrentPageNumber();
    if (!availableFields) return [];
    
    const visibleFieldIds = getPageFields(currentPage).map(f => f.id);
    
    return availableFields.filter(field => !visibleFieldIds.includes(field.id));
  };

  // Render a page with its background image and fields
  const renderPage = (pageNum: number) => {
    const pageImages = getPageImages(pageNum);
    const pageFields = getPageFields(pageNum);
    const currentPageAvailableFields = getAvailableFieldsForCurrentPage();
    
    return (
      <div 
        ref={previewRef} 
        className="relative bg-white shadow-md" 
        style={{ width: `${210 * scale}mm`, height: `${297 * scale}mm` }}
        onClick={() => onFieldSelect && onFieldSelect('')}
      >
        {/* Background image */}
        {pageImages.map((img, index) => (
          <img 
            key={index}
            src={img.url}
            alt={`Template background page ${pageNum}`}
            className="absolute top-0 left-0 w-full h-full object-contain"
            onError={handleImageError}
          />
        ))}
        
        {/* Fields */}
        {pageFields.map((field, index) => {
          if (field.id === 'equipment_table') {
            // For equipment table, just show a placeholder
            const fieldStyle = {
              position: 'absolute' as const,
              left: `${(field.position?.x || 0) * scale}px`,
              top: `${(field.position?.y || 0) * scale}px`,
              fontSize: `${(field.style?.fontSize || 10) * scale}px`,
              fontWeight: field.style?.fontWeight || 'normal',
              fontStyle: field.style?.fontStyle || 'normal',
              padding: '4px',
              backgroundColor: 'rgba(200, 200, 200, 0.2)',
              border: selectedFieldId === field.id ? '2px solid #2563eb' : '1px dashed #aaa',
              borderRadius: '4px',
              maxWidth: `${(field.style?.maxWidth || 200) * scale}px`,
              width: getScaledWidth(field.style?.width, scale),
              cursor: editMode ? 'move' : 'default',
              zIndex: selectedFieldId === field.id ? 10 : 1
            };
            
            return (
              <div 
                key={index} 
                style={fieldStyle}
                className={editMode ? 'hover:outline hover:outline-blue-500' : ''}
                onClick={(e) => handleFieldClick(e, field.id)}
                onMouseDown={(e) => handleDragStart(e, field.id)}
              >
                {editMode && <Move size={12} className="inline mr-1" />}
                [Tableau d'équipements]
              </div>
            );
          } else {
            // For text fields
            const fieldStyle = {
              position: 'absolute' as const,
              left: `${(field.position?.x || 0) * scale}px`,
              top: `${(field.position?.y || 0) * scale}px`,
              fontSize: `${(field.style?.fontSize || 10) * scale}px`,
              fontWeight: field.style?.fontWeight || 'normal',
              fontStyle: field.style?.fontStyle || 'normal',
              textDecoration: field.style?.textDecoration || 'none',
              maxWidth: `${(field.style?.maxWidth || 200) * scale}px`,
              width: getScaledWidth(field.style?.width, scale),
              cursor: editMode ? 'move' : 'default',
              userSelect: 'none' as const,
              padding: editMode ? '2px' : '0',
              border: selectedFieldId === field.id ? '2px solid #2563eb' : editMode ? '1px dashed transparent' : 'none',
              borderRadius: '4px',
              backgroundColor: selectedFieldId === field.id ? 'rgba(219, 234, 254, 0.3)' : 'transparent',
              zIndex: selectedFieldId === field.id ? 10 : 1
            };
            
            return (
              <div 
                key={index} 
                style={fieldStyle}
                className={editMode ? 'hover:outline hover:outline-blue-500 hover:bg-blue-50' : ''}
                onClick={(e) => handleFieldClick(e, field.id)}
                onMouseDown={(e) => handleDragStart(e, field.id)}
              >
                {editMode && <Move size={12} className="inline mr-1 text-blue-500" />}
                {resolveFieldValue(field.value)}
              </div>
            );
          }
        })}

        {/* Available Fields Panel */}
        {editMode && showAvailableFields && (
          <div className="absolute top-2 right-2 w-64 bg-white shadow-lg rounded-md p-3 border border-gray-200 z-20">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium">Champs disponibles</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowAvailableFields(false)}
              >
                ×
              </Button>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {currentPageAvailableFields.length > 0 ? (
                currentPageAvailableFields.map((field) => (
                  <div 
                    key={field.id}
                    className="flex items-center justify-between p-2 text-sm hover:bg-gray-100 rounded-md cursor-pointer mb-1"
                    onClick={() => handleAddFieldToCurrent(field)}
                  >
                    <span>{field.label}</span>
                    <Plus size={14} />
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 p-2">Aucun champ disponible</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Get available pages
  const getAvailablePages = () => {
    if (!template.templateImages || template.templateImages.length === 0) return [0];
    const pageNumbers = template.templateImages.map(img => img.page);
    return [...new Set(pageNumbers)].sort((a, b) => a - b);
  };

  const availablePages = getAvailablePages();

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Zoom:</span>
          <select 
            value={scale} 
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="text-sm border rounded p-1"
          >
            <option value="0.3">30%</option>
            <option value="0.5">50%</option>
            <option value="0.7">70%</option>
            <option value="1">100%</option>
          </select>
        </div>
        
        <div className="flex space-x-2">
          {editMode && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowAvailableFields(!showAvailableFields)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Ajouter un champ
            </Button>
          )}
          
          {onSave && (
            <Button 
              onClick={onSave} 
              variant="outline" 
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          )}
          
          <Button 
            onClick={handleDownloadPDF} 
            disabled={loading || !previewOffer}
          >
            Télécharger PDF
          </Button>
        </div>
      </div>
      
      {editMode && (
        <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-blue-600 flex items-center">
            <Move className="h-4 w-4 mr-2" />
            Faites glisser les champs pour les positionner sur le modèle. Cliquez sur un champ pour le sélectionner.
          </p>
        </div>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="mb-4">
          {availablePages.map((page, index) => (
            <TabsTrigger key={page} value={`page${index + 1}`}>
              Page {page + 1}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {availablePages.map((page, index) => (
          <TabsContent 
            key={page}
            value={`page${index + 1}`} 
            className="flex-1 overflow-auto p-4 bg-gray-100 flex justify-center"
          >
            {renderPage(page)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default PDFPreview;
