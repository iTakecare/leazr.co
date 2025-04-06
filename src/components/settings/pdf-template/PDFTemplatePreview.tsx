
import React, { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, Save, Maximize2, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { generateSamplePdf } from "@/services/offers/offerPdf";

interface PDFTemplatePreviewProps {
  template: any;
  onSave: (updatedFields: any[]) => void;
}

const PDFTemplatePreview: React.FC<PDFTemplatePreviewProps> = ({ template, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const previewRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDraggable, setIsDraggable] = useState(false);
  
  // Exemple de données pour l'aperçu
  const SAMPLE_OFFER = {
    id: "abcdef1234567890",
    offer_id: "OFF-25AB37",
    client_name: "Entreprise Exemple",
    client_email: "contact@exemple.fr",
    clients: {
      company: "Entreprise Exemple SA",
      name: "Jean Dupont",
      email: "jean.dupont@exemple.fr",
      address: "123 Rue de l'Exemple, 75000 Paris",
      phone: "+33 1 23 45 67 89"
    },
    equipment_description: JSON.stringify([
      {
        title: "MacBook Pro 16\" M2 Pro",
        purchasePrice: 2399,
        quantity: 1,
        margin: 15,
        monthlyPayment: 50
      },
      {
        title: "Écran Dell 27\" UltraSharp",
        purchasePrice: 399,
        quantity: 2,
        margin: 20,
        monthlyPayment: 25
      }
    ]),
    amount: 3596,
    monthly_payment: 99.89,
    created_at: new Date().toISOString()
  };
  
  const handleGeneratePreview = async () => {
    try {
      setLoading(true);
      
      const offerWithTemplate = {
        ...SAMPLE_OFFER,
        __template: template
      };
      
      await generateSamplePdf(offerWithTemplate);
      toast.success("PDF généré avec succès");
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setLoading(false);
    }
  };

  const totalPages = template?.templateImages?.length || 1;
  
  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
      setPageLoaded(false);
    }
  };
  
  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
      setPageLoaded(false);
    }
  };

  const getCurrentPageBackground = () => {
    if (template?.templateImages && template.templateImages.length > 0) {
      const pageImage = template.templateImages.find(img => img.page === currentPage);
      
      if (pageImage) {
        if (pageImage.url) {
          return pageImage.url;
        }
        else if (pageImage.data) {
          return pageImage.data;
        }
      }
    }
    return null;
  };

  const resolveFieldValue = (pattern: string) => {
    if (!pattern || typeof pattern !== 'string') return '';
    
    return pattern.replace(/\{([^}]+)\}/g, (match, key) => {
      const keyParts = key.split('.');
      let value: any = SAMPLE_OFFER;
      
      for (const part of keyParts) {
        if (value === undefined || value === null) {
          return '';
        }
        value = value[part];
      }
      
      if (key === 'page_number') {
        return String(currentPage + 1);
      }
      
      if (key === 'created_at' && typeof value === 'string') {
        try {
          return new Date(value).toLocaleDateString();
        } catch (e) {
          return value ? String(value) : '';
        }
      }
      
      if ((key.includes('amount') || key.includes('payment')) && typeof value === 'number') {
        try {
          return formatCurrency(value);
        } catch (e) {
          return typeof value === 'number' ? String(value) : '';
        }
      }
      
      if (value === undefined || value === null) return '';
      return typeof value === 'object' ? JSON.stringify(value) : String(value);
    });
  };

  const getCurrentPageFields = () => {
    return template?.fields?.filter((f: any) => 
      f.isVisible && (f.page === currentPage || (currentPage === 0 && f.page === undefined))
    ) || [];
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error("Erreur de chargement de l'image");
    e.currentTarget.src = "/placeholder.svg";
  };

  const handleImageLoad = () => {
    setPageLoaded(true);
  };

  const zoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.1, 2));
  };

  const zoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
  };

  const handleDragStart = (fieldId: string, offsetX: number, offsetY: number) => {
    if (!isDraggable) return;
    
    setIsDragging(true);
    setDraggedFieldId(fieldId);
    setDragOffsetX(offsetX);
    setDragOffsetY(offsetY);
  };

  const handleDrag = (clientX: number, clientY: number) => {
    if (!isDragging || !draggedFieldId || !isDraggable) return;

    const container = previewRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = (clientX - rect.left - dragOffsetX) / (3.7795275591 * zoomLevel);
    const y = (clientY - rect.top - dragOffsetY) / (3.7795275591 * zoomLevel);

    const updatedFields = template.fields.map((field: any) => {
      if (field.id === draggedFieldId) {
        return {
          ...field,
          position: {
            x: Math.max(0, x),
            y: Math.max(0, y)
          }
        };
      }
      return field;
    });

    template.fields = updatedFields;
    setHasUnsavedChanges(true);
  };

  const handleDragEnd = () => {
    if (!isDraggable) return;
    
    setIsDragging(false);
    setDraggedFieldId(null);
  };

  const handleSaveChanges = () => {
    if (hasUnsavedChanges) {
      onSave(template.fields);
      setHasUnsavedChanges(false);
      toast.success("Positions des champs sauvegardées");
    }
  };

  const toggleDragMode = () => {
    setIsDraggable(!isDraggable);
    if (isDraggable && hasUnsavedChanges) {
      handleSaveChanges();
    }
  };

  const renderField = (field: any) => {
    const mmToPx = (mm: number) => mm * 3.7795275591 * zoomLevel;
    
    const xPx = mmToPx(field.position?.x || 0);
    const yPx = mmToPx(field.position?.y || 0);
    
    const fontSize = field.style?.fontSize 
      ? field.style.fontSize * zoomLevel
      : 9 * zoomLevel;
    
    const style = {
      position: "absolute" as const,
      left: `${xPx}px`,
      top: `${yPx}px`,
      zIndex: 5,
      fontSize: `${fontSize}px`,
      fontWeight: field.style?.fontWeight || 'normal',
      fontStyle: field.style?.fontStyle || 'normal',
      textDecoration: field.style?.textDecoration || 'none',
      color: field.style?.color || 'black',
      whiteSpace: "pre-wrap" as const,
      maxWidth: `${mmToPx(80)}px`,
      cursor: isDraggable ? 'move' : 'default'
    };

    return (
      <div 
        key={field.id}
        style={style} 
        className="pdf-field"
        draggable={isDraggable}
        onDragStart={(e) => {
          if (!isDraggable) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const offsetX = e.clientX - rect.left;
          const offsetY = e.clientY - rect.top;
          handleDragStart(field.id, offsetX, offsetY);
        }}
        onDrag={(e) => handleDrag(e.clientX, e.clientY)}
        onDragEnd={() => handleDragEnd()}
      >
        <span>{resolveFieldValue(field.value)}</span>
      </div>
    );
  };

  const renderPage = () => {
    const backgroundImage = getCurrentPageBackground();
    
    if (backgroundImage) {
      return (
        <div className="relative" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <div className="flex-grow relative">
            <img 
              src={backgroundImage} 
              alt={`Template page ${currentPage + 1}`}
              className="w-full h-full object-contain"
              onError={handleImageError}
              onLoad={handleImageLoad}
              style={{ display: "block" }}
            />
            
            {pageLoaded && getCurrentPageFields().map(renderField)}
          </div>
          
          <div className="w-full" style={{ 
            position: "absolute", 
            bottom: 0, 
            left: 0, 
            right: 0,
            padding: `${10 * zoomLevel}px`
          }}>
            <div className="text-center" style={{ 
              borderTop: "1px solid #e5e7eb", 
              paddingTop: `${10 * zoomLevel}px`
            }}>
              <p className="text-center font-bold" style={{ fontSize: `${10 * zoomLevel}px` }}>
                {template?.footerText || "Cette offre est valable 30 jours à compter de sa date d'émission."}
              </p>
              <div className="flex justify-center items-center mt-2">
                <p className="text-center" style={{ fontSize: `${8 * zoomLevel}px` }}>
                  {template?.companyName || 'iTakeCare'} - {template?.companyAddress || 'Avenue du Général Michel 1E, 6000 Charleroi, Belgique'}<br />
                  {template?.companySiret || 'TVA: BE 0795.642.894'} - {template?.companyContact || 'Tel: +32 471 511 121 - Email: hello@itakecare.be'}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // Affichage basique si pas d'image de fond
    return (
      <div className="min-h-[842px] flex flex-col justify-between">
        <div className="flex-grow">
          <div className="border-b p-6" style={{ backgroundColor: template?.primaryColor || '#2C3E50', color: "white" }}>
            <div className="flex justify-between items-center">
              {template?.logoURL && (
                <img 
                  src={template.logoURL} 
                  alt="Logo" 
                  className="h-10 object-contain"
                />
              )}
              <h1 className="text-xl font-bold">{resolveFieldValue(template?.headerText || "OFFRE N° {offer_id}")}</h1>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="flex justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-2">CLIENT</h2>
                <p>{SAMPLE_OFFER.clients.company}</p>
                <p>{SAMPLE_OFFER.clients.name}</p>
                <p>{SAMPLE_OFFER.clients.email}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Date: {new Date().toLocaleDateString()}</p>
                <p className="text-sm text-gray-600">Référence: {SAMPLE_OFFER.offer_id}</p>
              </div>
            </div>
            
            {getCurrentPageFields().map(renderField)}
          </div>
        </div>
        
        <div className="mt-auto p-6 text-xs text-gray-600 bg-gray-50 border-t">
          <p className="text-center font-bold mb-2">{template?.footerText || "Cette offre est valable 30 jours à compter de sa date d'émission."}</p>
          <hr className="my-2 border-gray-300" />
          <div className="flex justify-center items-center">
            <p className="text-center">
              {template?.companyName || 'iTakeCare'} - {template?.companyAddress || 'Avenue du Général Michel 1E, 6000 Charleroi, Belgique'}<br />
              {template?.companySiret || 'TVA: BE 0795.642.894'} - {template?.companyContact || 'Tel: +32 471 511 121 - Email: hello@itakecare.be'}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Aperçu du modèle de PDF</h3>
        <div className="flex gap-2">
          <div className="flex items-center border rounded-md mr-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={zoomOut}
              disabled={zoomLevel <= 0.5}
              className="h-8 px-2"
            >
              -
            </Button>
            <span className="text-xs px-2">{Math.round(zoomLevel * 100)}%</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={zoomIn}
              disabled={zoomLevel >= 2}
              className="h-8 px-2"
            >
              +
            </Button>
          </div>
          <Button
            variant={isDraggable ? "default" : "outline"}
            size="sm"
            onClick={toggleDragMode}
            className="h-8"
          >
            {isDraggable ? "Terminer le positionnement" : "Positionner les champs"}
          </Button>
          {hasUnsavedChanges && (
            <Button
              variant="default"
              size="sm"
              onClick={handleSaveChanges}
              className="h-8"
            >
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleGeneratePreview}
            disabled={loading}
          >
            <FileDown className="h-4 w-4 mr-2" />
            Générer un PDF d'exemple
          </Button>
        </div>
      </div>
      
      <Card>
        <CardContent className="p-0 overflow-hidden">
          <div 
            ref={previewRef}
            className="bg-gray-100 p-4 flex justify-center min-h-[800px] overflow-auto"
          >
            <div className="bg-white shadow-lg relative" style={{ 
              width: `${210 * zoomLevel}mm`, 
              height: `${297 * zoomLevel}mm`,
              maxWidth: "100%"
            }}>
              {totalPages > 1 && (
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={prevPage}
                    disabled={currentPage === 0}
                    className="h-8 w-8 bg-white bg-opacity-75"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <span className="flex items-center justify-center text-sm px-2 bg-white bg-opacity-75 rounded">
                    {currentPage + 1} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={nextPage}
                    disabled={currentPage === totalPages - 1}
                    className="h-8 w-8 bg-white bg-opacity-75"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              {renderPage()}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="text-sm text-muted-foreground">
        <p>Pour positionner les champs sur vos pages:</p>
        <ol className="list-decimal list-inside ml-4 space-y-1 mt-2">
          <li>Ajoutez des pages en uploadant des images dans l'onglet "Pages du modèle"</li>
          <li>Allez dans l'onglet "Champs et positionnement" pour définir les champs</li>
          <li>Cliquez sur "Positionner les champs" pour activer le mode de positionnement</li>
          <li>Déplacez les champs en les faisant glisser à l'emplacement souhaité</li>
          <li>Cliquez sur "Sauvegarder" pour enregistrer les positions</li>
          <li>Cliquez sur "Terminer le positionnement" pour désactiver le mode d'édition</li>
        </ol>
        <p className="mt-2">Les coordonnées X/Y représentent la position en millimètres depuis le coin supérieur gauche de la page.</p>
      </div>
    </div>
  );
};

export default PDFTemplatePreview;
