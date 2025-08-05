
import React from "react";

interface PDFFieldDisplayProps {
  field: any;
  scaleFactor: number;
  isDraggable: boolean;
  sampleData: any;
  onStartDrag: (offsetX: number, offsetY: number) => void; 
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

  // Function to resolve field value from sample data - improved version
  const resolveValue = (value: string) => {
    if (!value) return '';
    
    // For demonstration, just show the pattern
    if (useRealData && sampleData) {
      try {
        // Pattern replacement logic
        return value.replace(/\{([^}]+)\}/g, (match, key) => {
          const keyParts = key.split('.');
          let result = sampleData;
          
          for (const part of keyParts) {
            if (!result) return '';
            result = result[part];
          }
          
          // Format currency values properly
          if ((key.includes('amount') || key.includes('payment') || key.includes('price')) && typeof result === 'number') {
            return new Intl.NumberFormat('fr-FR', { 
              style: 'currency', 
              currency: 'EUR',
              minimumFractionDigits: 2 
            }).format(result);
          }
          
          return result !== undefined && result !== null ? String(result) : '';
        });
      } catch (error) {
        console.error("Error resolving value:", error);
        return `[${value}]`;
      }
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

  // Specific handling for equipment table to ensure it displays properly
  if (field.id === 'equipment_table' || field.value?.includes('equipment_description')) {
    const renderEquipmentTable = () => {
      try {
        if (!sampleData || !sampleData.equipment_description) return "<Tableau d'équipements>";
        
        // Parse equipment data
        let equipment = [];
        try {
          if (typeof sampleData.equipment_description === 'string') {
            equipment = JSON.parse(sampleData.equipment_description);
          } else {
            equipment = sampleData.equipment_description;
          }
        } catch (e) {
          console.error("Failed to parse equipment data:", e);
          return "<Erreur de données d'équipement>";
        }
        
        if (!Array.isArray(equipment) || equipment.length === 0) {
          return "<Aucun équipement>";
        }
        
        // Create a simple HTML table structure as a string
        const tableRows = equipment.map((item: any, index: number) => {
          const qty = item.quantity || 1;
          const monthly = item.monthlyPayment || 0;
          
          // Build details string for attributes and specifications
          const detailsArray = [];
          
          if (item.attributes && Object.keys(item.attributes).length > 0) {
            Object.entries(item.attributes).forEach(([key, value]) => {
              detailsArray.push(`${key}: ${value}`);
            });
          }
          
          if (item.specifications && Object.keys(item.specifications).length > 0) {
            Object.entries(item.specifications).forEach(([key, value]) => {
              detailsArray.push(`${key}: ${value}`);
            });
          }
          
          const detailsString = detailsArray.join(' • ');
          
          return `
            <tr>
              <td style="border: 1px solid #ddd; padding: 4px;">
                <div>${item.title || 'Produit'}</div>
                ${detailsString ? `<div style="font-size: 85%; color: #666;">${detailsString}</div>` : ''}
              </td>
              <td style="border: 1px solid #ddd; padding: 4px; text-align: center;">${qty}</td>
              <td style="border: 1px solid #ddd; padding: 4px; text-align: right;">${monthly.toFixed(2)} €</td>
            </tr>
          `;
        }).join('');
        
        // Calculate total
        const total = equipment.reduce((sum: number, item: any) => {
          const qty = item.quantity || 1;
          const monthly = item.monthlyPayment || 0;
          return sum + (qty * monthly);
        }, 0);
        
        return `
          <table style="width: 100%; border-collapse: collapse; font-size: ${10 * scaleFactor}px;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="border: 1px solid #ddd; padding: 4px; text-align: left;">Désignation</th>
                <th style="border: 1px solid #ddd; padding: 4px; text-align: center;">Qté</th>
                <th style="border: 1px solid #ddd; padding: 4px; text-align: right;">Mensualité</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
            <tfoot>
              <tr style="font-weight: bold;">
                <td colspan="2" style="border: 1px solid #ddd; padding: 4px; text-align: right;">Total mensualité:</td>
                <td style="border: 1px solid #ddd; padding: 4px; text-align: right;">${total.toFixed(2)} €</td>
              </tr>
            </tfoot>
          </table>
        `;
      } catch (error) {
        console.error("Error rendering equipment table:", error);
        return "<Erreur de rendu>";
      }
    };

    return (
      <div 
        style={{...style, maxWidth: `${300 * scaleFactor}px`}} 
        className="pdf-field"
        draggable={isDraggable}
        onDragStart={handleDragStart}
        onDrag={(e) => onDrag(e.clientX, e.clientY)}
        onDragEnd={onEndDrag}
        dangerouslySetInnerHTML={{ __html: renderEquipmentTable() }}
      />
    );
  }

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
