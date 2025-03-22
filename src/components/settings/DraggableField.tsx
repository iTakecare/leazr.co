
import React, { useState } from 'react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import { PDFField } from '@/types/pdf';
import 'react-resizable/css/styles.css';

interface DraggableFieldProps {
  field: PDFField;
  selected: boolean;
  pageScale: number;
  editMode: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  onSelect: (fieldId: string) => void;
  onPositionChange: (fieldId: string, x: number, y: number) => void;
  onSizeChange: (fieldId: string, width: number, height: number) => void;
}

const DraggableField: React.FC<DraggableFieldProps> = ({
  field,
  selected,
  pageScale,
  editMode,
  containerRef,
  onSelect,
  onPositionChange,
  onSizeChange
}) => {
  const [position, setPosition] = useState({ 
    x: field.position?.x || 0, 
    y: field.position?.y || 0 
  });
  
  const [size, setSize] = useState({ 
    width: field.style?.width || 100, 
    height: field.style?.height || 30 
  });

  const handleDragStop = (e: any, data: any) => {
    const newX = data.x;
    const newY = data.y;
    setPosition({ x: newX, y: newY });
    onPositionChange(field.id, newX, newY);
  };

  const handleResize = (e: React.SyntheticEvent, { size }: any) => {
    e.stopPropagation();
    const { width, height } = size;
    setSize({ width, height });
    onSizeChange(field.id, width, height);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(field.id);
  };

  return (
    <Draggable
      position={position}
      onStop={handleDragStop}
      disabled={!editMode}
      bounds="parent"
      scale={pageScale}
      handle=".field-handle"
    >
      <div
        className={`absolute cursor-move ${
          selected ? 'ring-2 ring-blue-500 z-50' : 'hover:ring-1 hover:ring-blue-300'
        }`}
        onClick={handleClick}
        style={{
          fontSize: `${field.style?.fontSize || 12}px`,
          fontWeight: field.style?.fontWeight || 'normal',
          fontStyle: field.style?.fontStyle || 'normal',
          textDecoration: field.style?.textDecoration || 'none',
        }}
      >
        <ResizableBox
          width={size.width}
          height={size.height}
          minConstraints={[30, 20]}
          maxConstraints={[500, 200]}
          onResize={handleResize}
          resizeHandles={selected && editMode ? ['se'] : []}
          handle={
            <div className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 rounded-bl opacity-80 cursor-se-resize" />
          }
        >
          <div className={`field-handle w-full h-full p-1 ${selected ? 'bg-blue-50' : ''}`}>
            {field.value || field.label}
          </div>
        </ResizableBox>
      </div>
    </Draggable>
  );
};

export default DraggableField;
