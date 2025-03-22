
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Download, Move, Eye, EyeOff, Search, ArrowDown, ArrowUp } from 'lucide-react';
import { PDFTemplate, PDFField } from '@/types/pdf';
import { generateOfferPdf } from '@/utils/pdfGenerator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PDFVisualEditorProps {
  template: PDFTemplate;
  selectedPage: number;
  onPageChange: (page: number) => void;
  selectedFieldId: string | null;
  onSelectField: (fieldId: string | null) => void;
  onFieldMove: (fieldId: string, x: number, y: number) => void;
  onAddFieldToPage: (fieldId: string) => void;
  allFields: PDFField[];
}

const PDFVisualEditor = ({
  template,
  selectedPage,
  onPageChange,
  selectedFieldId,
  onSelectField,
  onFieldMove,
  onAddFieldToPage,
  allFields
}: PDFVisualEditorProps) => {
  const [scale, setScale] = useState(0.5);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const containerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Get template image for current page
  const getPageImage = () => {
    if (!template.templateImages) return null;
    return template.templateImages.find(img => img.page === selectedPage);
  };

  // Get fields visible on current page
  const getVisibleFields = () => {
    return allFields.filter(f => 
      (f.page === selectedPage || f.page === null) && 
      f.isVisible
    );
  };

  // Get available fields that can be added to the page
  const getAvailableFields = () => {
    const visibleFieldIds = getVisibleFields().map(f => f.id);
    return allFields.filter(f => !visibleFieldIds.includes(f.id));
  };

  // Filter fields by search term and category
  const getFilteredFields = () => {
    let filtered = allFields;
    
    // Filter by search term if provided
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(field => 
        field.label.toLowerCase().includes(lowerSearch) || 
        field.id.toLowerCase().includes(lowerSearch)
      );
    }
    
    // Filter by category if not "all"
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(field => field.category === selectedCategory);
    }
    
    return filtered;
  };

  // Group fields by category
  const getFieldsByCategory = () => {
    const filteredFields = getFilteredFields();
    const categories = ['client', 'offer', 'equipment', 'user', 'general'];
    
    return categories.map(category => {
      const fields = filteredFields.filter(field => field.category === category);
      return {
        category,
        fields
      };
    }).filter(group => group.fields.length > 0);
  };

  // Check if a field is already positioned on the current page
  const isFieldOnCurrentPage = (fieldId: string) => {
    const field = allFields.find(f => f.id === fieldId);
    return field?.isVisible && field?.page === selectedPage;
  };

  // Create a sample offer for preview
  const previewOffer = {
    id: 'PREVIEW-1234',
    client_name: 'Client de test',
    created_at: new Date().toISOString(),
    amount: 15000,
    monthly_payment: 450,
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
      }
    ])
  };

  // Handle download PDF
  const handleDownloadPDF = async () => {
    try {
      // Add template to the offer for preview purposes
      const offerWithTemplate = {
        ...previewOffer,
        __template: template
      };
      await generateOfferPdf(offerWithTemplate);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  // Handle field click
  const handleFieldClick = (e: React.MouseEvent, fieldId: string) => {
    e.stopPropagation();
    onSelectField(fieldId);
  };

  // Handle mouse down on field for dragging
  const handleFieldMouseDown = (e: React.MouseEvent, fieldId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (fieldId !== selectedFieldId) {
      onSelectField(fieldId);
    }
    
    setIsDragging(true);
    setDragStartPos({
      x: e.clientX,
      y: e.clientY
    });
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle mouse move for dragging fields
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !selectedFieldId || !previewRef.current) return;
    
    const selectedField = allFields.find(f => f.id === selectedFieldId);
    if (!selectedField || !selectedField.position) return;
    
    const previewRect = previewRef.current.getBoundingClientRect();
    
    // Calculate new position
    const deltaX = (e.clientX - dragStartPos.x) / scale;
    const deltaY = (e.clientY - dragStartPos.y) / scale;
    
    // Update drag start position for next move event
    setDragStartPos({
      x: e.clientX,
      y: e.clientY
    });
    
    // Update field position
    const newX = Math.max(0, (selectedField.position.x + deltaX));
    const newY = Math.max(0, (selectedField.position.y + deltaY));
    
    onFieldMove(selectedFieldId, newX, newY);
  };

  // Handle mouse up to end dragging
  const handleMouseUp = () => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // Handle click on the preview container
  const handleContainerClick = () => {
    onSelectField(null);
  };
  
  // Add a field to the current page
  const handleAddField = (fieldId: string) => {
    onAddFieldToPage(fieldId);
    onSelectField(fieldId);
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
      
      return value?.toString() || 'Non renseigné';
    });
  };

  // Get all available pages from template images
  const getAvailablePages = () => {
    if (!template.templateImages || template.templateImages.length === 0) return [0];
    const pageNumbers = template.templateImages.map(img => img.page);
    return [...new Set(pageNumbers)].sort((a, b) => a - b);
  };

  // Get category label in French
  const getCategoryLabel = (category: string) => {
    switch(category) {
      case 'client': return 'Client';
      case 'offer': return 'Offre';
      case 'equipment': return 'Équipement';
      case 'user': return 'Vendeur';
      case 'general': return 'Général';
      default: return category;
    }
  };

  const availablePages = getAvailablePages();
  const pageImage = getPageImage();
  const visibleFields = getVisibleFields();
  const fieldsByCategory = getFieldsByCategory();

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <Select 
            value={selectedPage.toString()} 
            onValueChange={(value) => onPageChange(parseInt(value))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Page 1" />
            </SelectTrigger>
            <SelectContent>
              {availablePages.map((page) => (
                <SelectItem key={page} value={page.toString()}>
                  Page {page + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select 
            value={scale.toString()} 
            onValueChange={(value) => setScale(parseFloat(value))}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Zoom" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.3">30%</SelectItem>
              <SelectItem value="0.5">50%</SelectItem>
              <SelectItem value="0.7">70%</SelectItem>
              <SelectItem value="1">100%</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button onClick={handleDownloadPDF}>
          <Download className="h-4 w-4 mr-1" />
          Télécharger PDF
        </Button>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4 flex items-center text-blue-600">
        <Move className="h-4 w-4 mr-2 flex-shrink-0" />
        <p>Faites glisser les champs pour les positionner sur le modèle. Cliquez sur un champ pour le sélectionner.</p>
      </div>
      
      <div className="flex space-x-4 h-[600px]">
        {/* Left column: Available fields */}
        <div className="w-1/3 border rounded-md overflow-hidden flex flex-col">
          <div className="p-3 border-b bg-gray-50">
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Rechercher un champ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList className="w-full">
                <TabsTrigger value="all" className="flex-1">Tous</TabsTrigger>
                <TabsTrigger value="client" className="flex-1">Client</TabsTrigger>
                <TabsTrigger value="offer" className="flex-1">Offre</TabsTrigger>
                <TabsTrigger value="equipment" className="flex-1">Équipement</TabsTrigger>
                <TabsTrigger value="user" className="flex-1">Vendeur</TabsTrigger>
                <TabsTrigger value="general" className="flex-1">Général</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3">
            {fieldsByCategory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucun champ disponible pour ces critères
              </div>
            ) : (
              <div className="space-y-6">
                {fieldsByCategory.map(group => (
                  <div key={group.category}>
                    <h3 className="font-medium text-sm text-gray-500 mb-2 uppercase">
                      {getCategoryLabel(group.category)}
                    </h3>
                    <div className="space-y-2">
                      {group.fields.map(field => (
                        <div 
                          key={field.id}
                          className={`p-2.5 border rounded-md flex justify-between items-center cursor-pointer transition-colors
                            ${isFieldOnCurrentPage(field.id) ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}
                            ${selectedFieldId === field.id ? 'bg-blue-100 border-blue-300' : ''}`}
                          onClick={() => onSelectField(field.id)}
                        >
                          <div className="flex-1 mr-2 overflow-hidden">
                            <div className="font-medium text-sm truncate">{field.label}</div>
                            <div className="text-xs text-gray-500 truncate">{field.value}</div>
                          </div>
                          
                          {isFieldOnCurrentPage(field.id) ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">Positionné</Badge>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 px-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddField(field.id);
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Right column: PDF preview */}
        <div className="w-2/3 border rounded-md">
          <div 
            ref={containerRef}
            className="h-full bg-gray-100 p-4 rounded-md flex justify-center overflow-auto"
            onClick={handleContainerClick}
          >
            <div 
              ref={previewRef} 
              className="relative bg-white shadow-md overflow-hidden"
              style={{ width: `${210 * scale}mm`, height: `${297 * scale}mm` }}
            >
              {/* Background image */}
              {pageImage && (
                <img 
                  src={pageImage.url}
                  alt={`Template background page ${selectedPage + 1}`}
                  className="absolute top-0 left-0 w-full h-full object-contain"
                />
              )}
              
              {/* Fields */}
              {visibleFields.map((field) => {
                const fieldStyle: React.CSSProperties = {
                  position: 'absolute',
                  left: `${(field.position?.x || 0) * scale}px`,
                  top: `${(field.position?.y || 0) * scale}px`,
                  fontSize: `${(field.style?.fontSize || 10) * scale}px`,
                  fontWeight: field.style?.fontWeight || 'normal',
                  fontStyle: field.style?.fontStyle || 'normal',
                  textDecoration: field.style?.textDecoration || 'none',
                  maxWidth: field.style?.maxWidth ? `${field.style.maxWidth * scale}px` : 'auto',
                  padding: '4px',
                  borderRadius: '4px',
                  backgroundColor: selectedFieldId === field.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  border: selectedFieldId === field.id ? '2px solid #3b82f6' : '1px dashed transparent',
                  cursor: 'move',
                  userSelect: 'none',
                  zIndex: selectedFieldId === field.id ? 10 : 1
                };

                if (field.id === 'equipment_table') {
                  // Table fields get a special display
                  return (
                    <div 
                      key={field.id}
                      style={fieldStyle}
                      className="hover:bg-blue-50 hover:border-blue-200"
                      onClick={(e) => handleFieldClick(e, field.id)}
                      onMouseDown={(e) => handleFieldMouseDown(e, field.id)}
                    >
                      <Move className="inline h-3 w-3 mr-1 text-blue-500" />
                      [Tableau d'équipements]
                    </div>
                  );
                }
                
                return (
                  <div 
                    key={field.id}
                    style={fieldStyle}
                    className="hover:bg-blue-50 hover:border-blue-200"
                    onClick={(e) => handleFieldClick(e, field.id)}
                    onMouseDown={(e) => handleFieldMouseDown(e, field.id)}
                  >
                    <Move className="inline h-3 w-3 mr-1 text-blue-500" />
                    {resolveFieldValue(field.value)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      
      {/* Properties panel for selected field */}
      {selectedFieldId && (
        <div className="border p-4 rounded-md bg-gray-50 mt-4">
          <h3 className="font-medium mb-3">Propriétés du champ</h3>
          
          {(() => {
            const field = allFields.find(f => f.id === selectedFieldId);
            if (!field) return null;
            
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium">Position X</label>
                  <Input 
                    type="number" 
                    value={field.position?.x || 0}
                    onChange={(e) => onFieldMove(field.id, Number(e.target.value), field.position?.y || 0)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Position Y</label>
                  <Input 
                    type="number" 
                    value={field.position?.y || 0}
                    onChange={(e) => onFieldMove(field.id, field.position?.x || 0, Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Taille de police</label>
                  <Input 
                    type="number" 
                    value={field.style?.fontSize || 10}
                    onChange={(e) => {
                      const newFields = allFields.map(f => {
                        if (f.id === field.id) {
                          return {
                            ...f,
                            style: {
                              ...f.style,
                              fontSize: Number(e.target.value)
                            }
                          };
                        }
                        return f;
                      });
                      // Cette ligne force la mise à jour du champ
                      onFieldMove(field.id, field.position?.x || 0, field.position?.y || 0);
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Style</label>
                  <Select 
                    value={field.style?.fontWeight || 'normal'}
                    onValueChange={(value) => {
                      const newFields = allFields.map(f => {
                        if (f.id === field.id) {
                          return {
                            ...f,
                            style: {
                              ...f.style,
                              fontWeight: value
                            }
                          };
                        }
                        return f;
                      });
                      // Cette ligne force la mise à jour du champ
                      onFieldMove(field.id, field.position?.x || 0, field.position?.y || 0);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="bold">Gras</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default PDFVisualEditor;
