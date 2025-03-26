
import React from "react";
import { formatCurrency } from "@/lib/utils";
import { useDragState, useDragActions } from "./PDFPreviewDragContext";

interface PDFFieldProps {
  field: any;
  zoomLevel: number;
  sampleData: any;
  currentPage: number;
}

// Function to parse equipment data from JSON string
const parseEquipmentData = (jsonString: string | any[]) => {
  try {
    if (!jsonString) return [];
    
    if (Array.isArray(jsonString)) return jsonString;
    
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error parsing equipment data:", error);
    return [];
  }
};

// Function to render equipment table
const renderEquipmentTable = (sampleData: any, zoomLevel: number) => {
  const equipment = parseEquipmentData(sampleData.equipment_description);
  
  if (!equipment || equipment.length === 0) {
    return <p className="text-sm italic">Aucun équipement disponible</p>;
  }
  
  return (
    <table className="w-full border-collapse" style={{ fontSize: `${9 * zoomLevel}px` }}>
      <thead>
        <tr className="bg-gray-100">
          <th className="border px-1 py-0.5 text-left">Désignation</th>
          <th className="border px-1 py-0.5 text-center">Qté</th>
          <th className="border px-1 py-0.5 text-right">Mensualité</th>
        </tr>
      </thead>
      <tbody>
        {equipment.map((item: any, index: number) => {
          const quantity = parseInt(item.quantity || 1, 10);
          const monthlyPayment = parseFloat(item.monthlyPayment || 0);
          const totalMonthlyPayment = monthlyPayment * quantity;
          
          return (
            <tr key={index}>
              <td className="border px-1 py-0.5 text-left">{item.title}</td>
              <td className="border px-1 py-0.5 text-center">{quantity}</td>
              <td className="border px-1 py-0.5 text-right">{formatCurrency(totalMonthlyPayment)}</td>
            </tr>
          );
        })}
        <tr className="font-bold bg-gray-50">
          <td className="border px-1 py-0.5 text-right" colSpan={2}>Total mensualité :</td>
          <td className="border px-1 py-0.5 text-right">
            {formatCurrency(equipment.reduce((total: number, item: any) => {
              const monthlyPayment = parseFloat(item.monthlyPayment || 0);
              const quantity = parseInt(item.quantity || 1, 10);
              return total + (monthlyPayment * quantity);
            }, 0))}
          </td>
        </tr>
      </tbody>
    </table>
  );
};

// Resolve field value based on pattern and sample data
const resolveFieldValue = (pattern: string | undefined, sampleData: any): string => {
  if (!pattern || typeof pattern !== 'string') return '';
  
  return pattern.replace(/\{([^}]+)\}/g, (match, key) => {
    const keyParts = key.split('.');
    let value = sampleData;
    
    for (const part of keyParts) {
      if (value === undefined || value === null) {
        return '';
      }
      value = value[part];
    }
    
    if (key === 'page_number') {
      return String(1);
    }
    
    if (key === 'created_at' && typeof value === 'string') {
      try {
        return new Date(value).toLocaleDateString();
      } catch (e) {
        console.error("Error formatting date:", e);
        return value ? String(value) : '';
      }
    }
    
    if ((key.includes('amount') || key.includes('payment') || key.includes('price') || key.includes('commission')) && typeof value === 'number') {
      try {
        return formatCurrency(value);
      } catch (e) {
        console.error("Error formatting currency:", e);
        return typeof value === 'number' ? String(value) : '';
      }
    }
    
    if (value === undefined || value === null) return '';
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  });
};

const PDFField: React.FC<PDFFieldProps> = ({ field, zoomLevel, sampleData, currentPage }) => {
  const { isDraggable } = useDragState();
  const { startDrag } = useDragActions();
  
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
    maxWidth: field.id === 'equipment_table' 
      ? `${mmToPx(150)}px` 
      : `${mmToPx(80)}px`,
    cursor: isDraggable ? 'move' : 'default'
  };
  
  const handleDragStart = (e: React.MouseEvent) => {
    if (!isDraggable) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    startDrag(field.id, offsetX, offsetY);
  };
  
  const renderContent = () => {
    if (field.id === 'equipment_table') {
      return renderEquipmentTable(sampleData, zoomLevel);
    }
    
    return <span>{resolveFieldValue(field.value, sampleData)}</span>;
  };
  
  return (
    <div 
      style={style} 
      className={`pdf-field ${isDraggable ? 'cursor-move hover:ring-2 hover:ring-blue-400' : ''}`}
      draggable={isDraggable}
      onMouseDown={handleDragStart}
    >
      {renderContent()}
    </div>
  );
};

export default PDFField;
