import React, { useRef, useState, useEffect } from "react";
import { Document, Page, pdfjs } from 'react-pdf';
import { Card } from "@/components/ui/card";
import { CustomPdfTemplateField, ExtendedCustomPdfTemplate } from "@/types/customPdfTemplateField";
import { CustomPdfFieldMapper } from "@/services/customPdfFieldMapper";
import { cn } from "@/lib/utils";

// Configure PDF.js worker pour react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
  const [pdfLoadError, setPdfLoadError] = useState(false);
  const [pageWidth, setPageWidth] = useState(0);
  const [pageHeight, setPageHeight] = useState(0);

  // Conversion mm vers pixels (1mm = 3.7795275591px à 96 DPI)
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
          height: `${canvasHeight}px`
        }}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* PDF Viewer avec react-pdf pour compatibilité Chrome */}
        {template.original_pdf_url && (
          <div className="absolute inset-0 w-full h-full pointer-events-none">
            <Document
              file={template.original_pdf_url}
              onLoadSuccess={(pdf) => {
                console.log('✅ PDF loaded successfully with react-pdf:', pdf.numPages, 'pages');
                setPdfLoadError(false);
              }}
              onLoadError={(error) => {
                console.error('❌ PDF failed to load with react-pdf:', error);
                setPdfLoadError(true);
              }}
              loading={
                <div className="flex items-center justify-center h-full bg-gray-100">
                  <div className="text-gray-600">Chargement du PDF...</div>
                </div>
              }
              error={
                <div className="flex items-center justify-center h-full bg-red-50">
                  <div className="text-red-600">Erreur de chargement du PDF</div>
                </div>
              }
            >
              <Page
                pageNumber={currentPage}
                scale={zoomLevel}
                onLoadSuccess={(page) => {
                  setPageWidth(page.width);
                  setPageHeight(page.height);
                  console.log('✅ Page loaded:', page.pageNumber, `${page.width}x${page.height}`);
                }}
                className="react-pdf__Page"
                canvasBackground="white"
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>
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