import React, { useRef, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { CustomPdfTemplateField, ExtendedCustomPdfTemplate } from "@/types/customPdfTemplateField";
import { CustomPdfFieldMapper } from "@/services/customPdfFieldMapper";
import { PdfViewer } from "./PdfViewer";
import { cn } from "@/lib/utils";

interface CustomPdfCanvasProps {
  template: ExtendedCustomPdfTemplate;
  currentPage: number;
  zoomLevel: number;
  selectedFieldId?: string;
  sampleData?: any;
  onFieldSelect: (fieldId: string | null) => void;
  onFieldMove: (fieldId: string, position: { x: number; y: number }) => void;
  onFieldAdd?: (field: Omit<CustomPdfTemplateField, 'id'>, position: { x: number; y: number }) => void;
  className?: string;
}

const CustomPdfCanvas: React.FC<CustomPdfCanvasProps> = ({
  template,
  currentPage,
  zoomLevel,
  selectedFieldId,
  sampleData,
  onFieldSelect,
  onFieldMove,
  onFieldAdd,
  className
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragField, setDragField] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // 🔧 DEBUG COMPLET - Tracking des changes de props pour identifier le problème
  useEffect(() => {
    console.log('🔧 DEBUG - Props template changé:', {
      templateId: template.id,
      fieldsCount: template.fields.length,
      fields: template.fields.map(f => ({ id: f.id, label: f.label, page: f.position.page, visible: f.isVisible })),
      currentPage: currentPage
    });
  }, [template, currentPage]);

  useEffect(() => {
    console.log('🔧 DEBUG - sampleData changé:', sampleData);
  }, [sampleData]);

  // Conversion mm vers pixels
  const mmToPx = (mm: number) => mm * 3.7795275591 * zoomLevel;
  const pxToMm = (px: number) => px / (3.7795275591 * zoomLevel);

  // Obtenir la page actuelle via templateImages (images statiques) ou pages_data
  const getCurrentPageBackground = () => {
    // D'abord essayer les pages_data existantes
    const currentPageData = template.pages_data.find(page => page.page_number === currentPage);
    if (currentPageData?.image_url) {
      return `${currentPageData.image_url}?t=${new Date().getTime()}`;
    }

    // Ensuite essayer template_metadata.pages_data
    if (template?.template_metadata?.pages_data && template.template_metadata.pages_data.length > 0) {
      const pageImage = template.template_metadata.pages_data.find(img => img.page_number === currentPage);
      
      if (pageImage) {
        if (pageImage.image_url) {
          return `${pageImage.image_url}?t=${new Date().getTime()}`;
        }
      }
    }
    return null;
  };
  
  // Obtenir les champs de la page actuelle - VERSION DEBUG SIMPLIFIÉE
  const currentPageFields = template.fields.filter(field => {
    const isOnCurrentPage = field.position.page === currentPage;
    
    console.log('🔍 CustomPdfCanvas - Debug filtrage:', {
      fieldId: field.id,
      fieldLabel: field.label,
      fieldPage: field.position.page,
      currentPage: currentPage,
      isOnCurrentPage: isOnCurrentPage,
      fieldVisible: field.isVisible,
      totalFields: template.fields.length
    });
    
    // CORRECTION TEMPORAIRE: Afficher tous les champs visibles de la page courante
    // sans passer par shouldShowField pour le moment
    if (isOnCurrentPage && field.isVisible) {
      console.log(`✅ Field "${field.label}" (${field.id}) - AFFICHÉ sur page ${field.position.page} à ${field.position.x}mm, ${field.position.y}mm`);
      return true;
    }
    
    return false;
  });

  // Dimensions du canvas (A4 en mm converti en px)
  const canvasWidth = mmToPx(210);
  const canvasHeight = mmToPx(297);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Vérifier si on clique sur un champ existant
    const clickedField = currentPageFields.find(field => {
      const fieldX = mmToPx(field.position.x);
      const fieldY = mmToPx(field.position.y);
      const fieldWidth = field.style.width ? mmToPx(field.style.width) : 100;
      const fieldHeight = field.style.height ? mmToPx(field.style.height) : 20;
      
      return x >= fieldX && x <= fieldX + fieldWidth && 
             y >= fieldY && y <= fieldY + fieldHeight;
    });
    
    if (clickedField) {
      onFieldSelect(clickedField.id);
    } else {
      onFieldSelect(null);
    }
  };

  const handleFieldMouseDown = (e: React.MouseEvent, fieldId: string) => {
    e.stopPropagation();
    
    const field = currentPageFields.find(f => f.id === fieldId);
    if (!field) return;
    
    const fieldElement = e.currentTarget;
    const rect = fieldElement.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    setIsDragging(true);
    setDragField(fieldId);
    setDragOffset({ x: offsetX, y: offsetY });
    onFieldSelect(fieldId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragField || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;
    
    // Convertir en mm et limiter aux bordures
    const xMm = Math.max(0, Math.min(pxToMm(x), 210));
    const yMm = Math.max(0, Math.min(pxToMm(y), 297));
    
    onFieldMove(dragField, { x: Math.round(xMm * 10) / 10, y: Math.round(yMm * 10) / 10 });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragField(null);
  };

  const renderField = (field: CustomPdfTemplateField) => {
    // 🔧 DEBUG DÉTAILLÉ - Rendu de champ
    console.log('🎨 RENDERFIELD - Début rendu:', {
      fieldId: field.id,
      fieldLabel: field.label,
      position: field.position,
      style: field.style,
      mapping_key: field.mapping_key
    });
    
    const value = CustomPdfFieldMapper.resolveFieldValue(field.mapping_key, sampleData);
    const isSelected = field.id === selectedFieldId;
    
    // 🔧 DEBUG - Calculs de position
    const leftPx = mmToPx(field.position.x);
    const topPx = mmToPx(field.position.y);
    
    console.log('🎨 RENDERFIELD - Calculs position:', {
      xMm: field.position.x,
      yMm: field.position.y,
      leftPx: leftPx,
      topPx: topPx,
      zoomLevel: zoomLevel
    });
    
    // 🔧 STYLE FORCÉ POUR DEBUG - Rouge fluo très visible
    const style = {
      position: 'absolute' as const,
      left: `${leftPx}px`,
      top: `${topPx}px`,
      fontSize: `${field.style.fontSize * zoomLevel}px`,
      fontFamily: field.style.fontFamily,
      color: '#000000', // Force noir pour visibilité
      fontWeight: field.style.fontWeight,
      textAlign: field.style.textAlign,
      cursor: 'move',
      userSelect: 'none' as const,
      minWidth: field.style.width ? `${mmToPx(field.style.width)}px` : '80px',
      minHeight: field.style.height ? `${mmToPx(field.style.height)}px` : '20px',
      zIndex: isSelected ? 10 : 5,
      maxWidth: '300px',
      // STYLE DEBUG TRÈS VISIBLE
      backgroundColor: '#ff0000', // Rouge fluo
      border: '3px solid #ffff00', // Bordure jaune
      opacity: 1
    };
    
    console.log('🎨 RENDERFIELD - Style final:', style);

    return (
      <div
        key={field.id}
        style={style}
        className={cn(
          "pdf-field border-2 border-dashed p-2 rounded-md transition-all duration-200",
          "bg-white/90 backdrop-blur-sm shadow-sm",
          {
            "border-blue-500 bg-blue-50/90 shadow-lg ring-2 ring-blue-200": isSelected,
            "border-orange-400 hover:border-orange-500 hover:bg-orange-50/90 hover:shadow-md": !isSelected
          }
        )}
        onMouseDown={(e) => handleFieldMouseDown(e, field.id)}
        title={`${field.label} (${field.mapping_key})`}
      >
        {field.type === 'table' ? (
          <div className="bg-white border rounded p-2 min-w-[150px] text-center">
            <div className="text-xs font-semibold mb-1 text-gray-700">📊 Tableau</div>
            <div className="text-xs text-gray-500">
              {sampleData?.equipment_list?.length || 0} équipements
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-xs font-medium text-gray-600 mb-1">{field.label}</div>
            <div className="text-sm" style={{ color: field.style.color }}>
              {value || `[${field.label}]`}
            </div>
          </div>
        )}
        
        {isSelected && (
          <>
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 text-xs bg-blue-500 text-white px-2 py-1 rounded">
              {field.position.x}mm, {field.position.y}mm
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <Card className={cn("relative bg-white overflow-auto", className)}>
      <div
        ref={canvasRef}
        className="relative mx-auto bg-white shadow-lg cursor-crosshair"
        style={{
          width: `${canvasWidth}px`,
          height: `${canvasHeight}px`,
          backgroundColor: '#f9f9f9',
          border: '1px solid #e2e8f0'
        }}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Affichage PDF avec images statiques (comme PDFFieldsEditor) */}
        {getCurrentPageBackground() ? (
          <img
            src={getCurrentPageBackground()}
            alt={`Page ${currentPage}`}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            style={{ opacity: 0.8 }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              console.error("Erreur de chargement de l'image:", target.src);
              target.src = "/placeholder.svg";
              
              setTimeout(() => {
                if (target.src === "/placeholder.svg") {
                  const currentSrc = target.src;
                  const timestamp = new Date().getTime();
                  const newSrc = currentSrc.includes('?') 
                    ? currentSrc.split('?')[0] + `?t=${timestamp}`
                    : `${currentSrc}?t=${timestamp}`;
                  
                  console.log("Tentative de rechargement de l'image avec cache-busting:", newSrc);
                  target.src = newSrc;
                }
              }, 2000);
            }}
            onLoad={() => {
              console.log("Image chargée avec succès");
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-gray-500">
            <p>Images de pages en cours de génération...</p>
          </div>
        )}

        {/* Grille de repères */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          {/* Lignes verticales tous les 10mm */}
          {Array.from({ length: 21 }, (_, i) => (
            <div
              key={`v-${i}`}
              className="absolute top-0 bottom-0 border-l border-gray-300"
              style={{ left: `${mmToPx(i * 10)}px` }}
            />
          ))}
          {/* Lignes horizontales tous les 10mm */}
          {Array.from({ length: 30 }, (_, i) => (
            <div
              key={`h-${i}`}
              className="absolute left-0 right-0 border-t border-gray-300"
              style={{ top: `${mmToPx(i * 10)}px` }}
            />
          ))}
        </div>

        {/* 🔧 DEBUG - Champ de test hardcodé pour vérifier le rendu */}
        <div
          style={{
            position: 'absolute',
            left: '50px',
            top: '50px',
            width: '150px',
            height: '30px',
            backgroundColor: '#00ff00',
            border: '2px solid #0000ff',
            color: '#000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999
          }}
        >
          CHAMP TEST HARDCODÉ
        </div>

        {/* Champs positionnés */}
        {currentPageFields.length > 0 ? (
          <>
            <div style={{ position: 'absolute', top: '10px', left: '10px', color: 'red', fontSize: '12px', zIndex: 1000 }}>
              DEBUG: {currentPageFields.length} champs trouvés
            </div>
            {currentPageFields.map(renderField)}
          </>
        ) : (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
            {template.fields.length === 0 
              ? "Ajoutez des champs depuis la palette à droite" 
              : `Aucun champ sur la page ${currentPage} (Total: ${template.fields.length} champs)`
            }
          </div>
        )}

        {/* Indicateur de page */}
        <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
          Page {currentPage}
        </div>
      </div>
    </Card>
  );
};

export default CustomPdfCanvas;