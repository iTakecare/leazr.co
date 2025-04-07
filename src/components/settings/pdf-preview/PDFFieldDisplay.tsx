
import React from "react";

interface PDFFieldDisplayProps {
  field: any;
  scaleFactor: number; // Added this prop
  isDraggable: boolean;
  sampleData: any;
  onStartDrag: (offsetX: number, offsetY: number) => void; // Fixed type to number
  onDrag: (clientX: number, clientY: number) => void;
  onEndDrag: () => void;
  useRealData?: boolean;
}

const PDFFieldDisplay: React.FC<PDFFieldDisplayProps> = ({
  field,
  scaleFactor,
  isDraggable,
  sampleData,
  onStartDrag,
  onDrag,
  onEndDrag,
  useRealData = false
}) => {
  // Calculate position based on the field's x, y coordinates and scale factor
  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${(field.position?.x || 0) * scaleFactor}px`,
    top: `${(field.position?.y || 0) * scaleFactor}px`,
    zIndex: 5,
    fontSize: `${(field.style?.fontSize || 12) * scaleFactor}px`,
    fontWeight: field.style?.fontWeight || 'normal',
    fontStyle: field.style?.fontStyle || 'normal',
    textDecoration: field.style?.textDecoration || 'none',
    color: field.style?.color || 'black',
    whiteSpace: "pre-wrap",
    maxWidth: `${field.style?.maxWidth ? field.style.maxWidth * scaleFactor : 80 * scaleFactor}px`,
    cursor: isDraggable ? 'move' : 'default',
    padding: '2px',
    border: isDraggable ? '1px dashed #ccc' : 'none',
    background: isDraggable ? 'rgba(255, 255, 255, 0.5)' : 'transparent'
  };

  // Simple function to resolve field value from sample data
  const resolveValue = (value: string) => {
    if (!value) return '';
    
    // For demonstration, just show the pattern
    if (useRealData && sampleData) {
      // Here you would implement actual value resolution from sample data
      return `[${value}]`;
    }
    
    return value;
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (!isDraggable) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    onStartDrag(offsetX, offsetY);
  };

  return (
    <div 
      style={style} 
      className="pdf-field"
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDrag={(e) => onDrag(e.clientX, e.clientY)}
      onDragEnd={onEndDrag}
    >
      <span>{resolveValue(field.value)}</span>
    </div>
  );
};

export default PDFFieldDisplay;
