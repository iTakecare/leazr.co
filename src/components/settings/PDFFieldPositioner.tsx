
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Move, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  AlignLeft, AlignCenter, AlignRight as AlignRightIcon,
  Trash, Copy
} from "lucide-react";
import { toast } from "sonner";

interface FieldPositionerProps {
  field: any;
  page: any;
  onUpdate: (updatedField: any) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  isSelected: boolean;
}

const PDFFieldPositioner = ({
  field,
  page,
  onUpdate,
  onDelete,
  onDuplicate,
  isSelected
}: FieldPositionerProps) => {
  const fieldRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [fieldPos, setFieldPos] = useState({ x: field.x, y: field.y });

  // Update internal state when field props change
  useEffect(() => {
    setFieldPos({ x: field.x, y: field.y });
  }, [field.x, field.y]);

  const startDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelected) return;
    
    setIsDragging(true);
    setStartPos({
      x: e.clientX - fieldPos.x,
      y: e.clientY - fieldPos.y
    });
    
    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
    
    // Add global event listeners
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', stopDrag);
    
    e.stopPropagation();
  };

  const handleDrag = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const containerRect = fieldRef.current?.parentElement?.getBoundingClientRect();
    if (!containerRect) return;
    
    // Calculate new position
    let newX = e.clientX - startPos.x;
    let newY = e.clientY - startPos.y;
    
    // Constrain to container bounds
    newX = Math.max(0, Math.min(newX, containerRect.width - (field.width || 100)));
    newY = Math.max(0, Math.min(newY, containerRect.height - (field.height || 30)));
    
    setFieldPos({ x: newX, y: newY });
    
    // Throttled update to parent (less frequent than the visual update)
    requestAnimationFrame(() => {
      onUpdate({ ...field, x: newX, y: newY });
    });
  };

  const stopDrag = () => {
    setIsDragging(false);
    document.body.style.userSelect = '';
    
    // Remove global event listeners
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', stopDrag);
    
    // Final update with the exact position
    onUpdate({ ...field, x: fieldPos.x, y: fieldPos.y });
    
    toast.success("Position mise à jour");
  };

  const moveField = (direction: 'up' | 'down' | 'left' | 'right', amount: number = 1) => {
    let newX = fieldPos.x;
    let newY = fieldPos.y;
    
    switch (direction) {
      case 'up':
        newY = Math.max(0, newY - amount);
        break;
      case 'down':
        newY = newY + amount;
        break;
      case 'left':
        newX = Math.max(0, newX - amount);
        break;
      case 'right':
        newX = newX + amount;
        break;
    }
    
    setFieldPos({ x: newX, y: newY });
    onUpdate({ ...field, x: newX, y: newY });
  };

  // Render the field with position styles
  return (
    <div
      ref={fieldRef}
      className={`absolute ${isSelected ? 'cursor-move z-10' : 'cursor-pointer'}`}
      style={{
        left: `${fieldPos.x}px`,
        top: `${fieldPos.y}px`,
        width: `${field.width}px`,
        height: `${field.height}px`,
        border: isSelected ? '2px solid #3B82F6' : '1px dashed #d1d5db',
        padding: '4px',
        background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
        fontSize: `${field.fontSize}px`,
        fontFamily: field.fontFamily || 'Arial',
        color: field.color || '#000000',
        fontWeight: field.bold ? 'bold' : 'normal',
        fontStyle: field.italic ? 'italic' : 'normal',
        textAlign: field.alignment || 'left',
        overflow: 'hidden',
        userSelect: 'none',
        transition: isDragging ? 'none' : 'border 0.2s, background 0.2s'
      }}
      onMouseDown={startDrag}
      onClick={(e) => {
        e.stopPropagation();
        // Don't trigger selection on drag end
        if (!isDragging) {
          onUpdate(field);
        }
      }}
    >
      <div className="w-full h-full overflow-hidden">
        {field.fieldType === 'static' ? field.value : `<${field.fieldType}>`}
      </div>
      
      {isSelected && (
        <div className="absolute -bottom-9 left-0 flex items-center space-x-1 bg-background border rounded-md shadow-sm p-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              moveField('left');
            }}
          >
            <ArrowLeft className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              moveField('right');
            }}
          >
            <ArrowRight className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              moveField('up');
            }}
          >
            <ArrowUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              moveField('down');
            }}
          >
            <ArrowDown className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default PDFFieldPositioner;
