
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { generateOfferPdf } from '@/utils/pdfGenerator';
import { PDFTemplate, PDFField } from '@/types/pdf';

interface PDFPreviewProps {
  template: PDFTemplate;
  onSave?: () => void;
  onDownload?: () => void;
  loading?: boolean;
}

const PDFPreview = ({ template, onSave, onDownload, loading = false }: PDFPreviewProps) => {
  const [activeTab, setActiveTab] = useState('page1');
  const [scale, setScale] = useState(0.5);
  const [previewOffer, setPreviewOffer] = useState<any>(null);

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

  // Render a page with its background image and fields
  const renderPage = (pageNum: number) => {
    const pageImages = getPageImages(pageNum);
    const pageFields = getPageFields(pageNum);
    
    return (
      <div className="relative bg-white shadow-md" style={{ width: `${210 * scale}mm`, height: `${297 * scale}mm` }}>
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
              border: '1px dashed #aaa',
              borderRadius: '4px',
              maxWidth: `${(field.style?.maxWidth || 200) * scale}px`,
              width: field.style?.width ? `${field.style.width * scale}px` : 'auto'
            };
            
            return (
              <div key={index} style={fieldStyle}>
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
              width: field.style?.width ? `${field.style.width * scale}px` : 'auto'
            };
            
            return (
              <div key={index} style={fieldStyle}>
                {resolveFieldValue(field.value)}
              </div>
            );
          }
        })}
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
