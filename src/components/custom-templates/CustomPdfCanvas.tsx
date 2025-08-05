import React, { useRef, useState } from "react";
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

  // Conversion mm vers pixels
  const mmToPx = (mm: number) => mm * 3.7795275591 * zoomLevel;
  const pxToMm = (px: number) => px / (3.7795275591 * zoomLevel);

  // Obtenir la page actuelle
  const currentPageData = template.pages_data.find(page => page.page_number === currentPage);
  
  // Obtenir les champs de la page actuelle
  const currentPageFields = template.fields.filter(field => 
    field.position.page === currentPage && 
    CustomPdfFieldMapper.shouldShowField(field, sampleData)
  );

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
    const value = CustomPdfFieldMapper.resolveFieldValue(field.mapping_key, sampleData);
    const isSelected = field.id === selectedFieldId;
    
    const style = {
      position: 'absolute' as const,
      left: `${mmToPx(field.position.x)}px`,
      top: `${mmToPx(field.position.y)}px`,
      fontSize: `${field.style.fontSize * zoomLevel}px`,
      fontFamily: field.style.fontFamily,
      color: field.style.color,
      fontWeight: field.style.fontWeight,
      textAlign: field.style.textAlign,
      cursor: 'move',
      userSelect: 'none' as const,
      minWidth: field.style.width ? `${mmToPx(field.style.width)}px` : 'auto',
      minHeight: field.style.height ? `${mmToPx(field.style.height)}px` : 'auto',
      zIndex: isSelected ? 10 : 5
    };

    return (
      <div
        key={field.id}
        style={style}
        className={cn(
          "pdf-field border-dashed border-transparent hover:border-blue-400 hover:bg-blue-50/50 p-1 rounded",
          {
            "border-blue-500 bg-blue-50/70 shadow-md": isSelected,
            "border-gray-300": !isSelected
          }
        )}
        onMouseDown={(e) => handleFieldMouseDown(e, field.id)}
      >
        {field.type === 'table' ? (
          <div className="bg-white border rounded p-2 min-w-[200px]">
            <div className="text-xs font-medium mb-1">Tableau des équipements</div>
            <div className="text-xs text-gray-500">
              {sampleData?.equipment_list?.length || 0} éléments
            </div>
          </div>
        ) : (
          <span className="whitespace-pre-wrap">
            {value || `[${field.label}]`}
          </span>
        )}
        
        {isSelected && (
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
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
        {/* Affichage PDF avec PdfViewer canvas-based */}
        {currentPageData?.image_url ? (
          <img
            src={currentPageData.image_url}
            alt={`Page ${currentPage}`}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            style={{ opacity: 0.8 }}
          />
        ) : template.original_pdf_url ? (
          <div className="absolute inset-0 pointer-events-none opacity-80">
            <PdfViewer
              url={template.original_pdf_url}
              currentPage={currentPage}
              zoom={zoomLevel}
              onLoadSuccess={(numPages) => console.log(`PDF loaded with ${numPages} pages`)}
              onLoadError={(error) => console.error('PDF load error:', error)}
              className="w-full h-full"
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-gray-500">
            <p>PDF non disponible</p>
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

        {/* Champs positionnés */}
        {currentPageFields.map(renderField)}

        {/* Indicateur de page */}
        <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
          Page {currentPage}
        </div>
      </div>
    </Card>
  );
};

export default CustomPdfCanvas;