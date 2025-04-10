
import React, { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { useDragState, useDragActions } from "./PDFPreviewDragContext";
import { getOfferEquipment, forceMigrateEquipmentData } from "@/services/offerService";
import { OfferEquipment } from "@/types/offerEquipment";

interface PDFFieldProps {
  field: any;
  zoomLevel: number;
  sampleData: any;
  currentPage: number;
}

// Composant pour afficher le tableau d'équipement
const EquipmentTable = ({ equipment, zoomLevel }: { equipment: OfferEquipment[], zoomLevel: number }) => {
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
        {equipment.map((item: OfferEquipment, index: number) => {
          // Extraire les données nécessaires pour l'affichage
          const quantity = parseInt(String(item.quantity) || "1", 10);
          const monthlyPayment = parseFloat(String(item.monthly_payment) || "0");
          const totalMonthlyPayment = monthlyPayment * quantity;
          
          // Créer une chaîne détaillée pour les attributs et spécifications
          const specsList: string[] = [];
          
          if (item.specifications && Array.isArray(item.specifications) && item.specifications.length > 0) {
            item.specifications.forEach(spec => {
              specsList.push(`${spec.key}: ${spec.value}`);
            });
          }
          
          if (item.attributes && Array.isArray(item.attributes) && item.attributes.length > 0) {
            item.attributes.forEach(attr => {
              specsList.push(`${attr.key}: ${attr.value}`);
            });
          }
          
          return (
            <React.Fragment key={index}>
              <tr>
                <td className="border px-1 py-0.5 text-left">
                  <div>
                    <div className="font-medium">{item.title}</div>
                    {specsList.length > 0 && (
                      <div className="text-xs text-gray-500">
                        {specsList.join(' • ')}
                      </div>
                    )}
                  </div>
                </td>
                <td className="border px-1 py-0.5 text-center">{quantity}</td>
                <td className="border px-1 py-0.5 text-right">{formatCurrency(totalMonthlyPayment)}</td>
              </tr>
            </React.Fragment>
          );
        })}
        <tr className="font-bold bg-gray-50">
          <td className="border px-1 py-0.5 text-right" colSpan={2}>Total mensualité :</td>
          <td className="border px-1 py-0.5 text-right">
            {formatCurrency(equipment.reduce((total: number, item: OfferEquipment) => {
              const monthlyPayment = parseFloat(String(item.monthly_payment) || "0");
              const quantity = parseInt(String(item.quantity) || "1", 10);
              return total + (monthlyPayment * quantity);
            }, 0))}
          </td>
        </tr>
      </tbody>
    </table>
  );
};

const PDFField: React.FC<PDFFieldProps> = ({ field, zoomLevel, sampleData, currentPage }) => {
  const { isDraggable } = useDragState();
  const { startDrag } = useDragActions();
  const [equipmentData, setEquipmentData] = useState<OfferEquipment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [migrationAttempted, setMigrationAttempted] = useState(false);
  
  // Charger les données d'équipement si nécessaire
  useEffect(() => {
    const fetchEquipmentData = async () => {
      if (field.id === 'equipment_table' && sampleData && sampleData.id) {
        try {
          setIsLoading(true);
          console.log("Chargement des équipements pour l'offre:", sampleData.id);
          
          // Récupérer les équipements depuis la BD
          const dbEquipment = await getOfferEquipment(sampleData.id);
          console.log("Équipements récupérés:", dbEquipment);
          
          // Si aucun équipement trouvé, essayer de forcer la migration
          if ((!dbEquipment || dbEquipment.length === 0) && !migrationAttempted && sampleData.equipment_description) {
            console.log("Aucun équipement trouvé, tentative de migration forcée...");
            setMigrationAttempted(true);
            
            const migrationSuccess = await forceMigrateEquipmentData(sampleData.id);
            
            if (migrationSuccess) {
              console.log("Migration forcée réussie, récupération des équipements...");
              const migratedEquipment = await getOfferEquipment(sampleData.id);
              setEquipmentData(migratedEquipment);
            } else {
              console.error("Échec de la migration forcée, utilisation des données JSON");
              parseJSONEquipment();
            }
          } else {
            if (dbEquipment && dbEquipment.length > 0) {
              setEquipmentData(dbEquipment);
            } else {
              console.log("Aucun équipement trouvé dans la base de données, utilisation des données JSON");
              parseJSONEquipment();
            }
          }
        } catch (error) {
          console.error("Erreur lors de la récupération des équipements:", error);
          parseJSONEquipment();
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    // Fonction de fallback pour analyser les données JSON
    const parseJSONEquipment = () => {
      try {
        const jsonData = sampleData.equipment_description;
        if (!jsonData) {
          setEquipmentData([]);
          return;
        }
        
        let parsed;
        try {
          parsed = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
        } catch (e) {
          console.error("Erreur de parsing JSON:", e);
          setEquipmentData([]);
          return;
        }
        
        // Traiter différents formats possibles
        let equipmentArray = parsed;
        
        if (!Array.isArray(parsed)) {
          if (parsed && typeof parsed === 'object' && parsed.items && Array.isArray(parsed.items)) {
            equipmentArray = parsed.items;
          } else {
            equipmentArray = [];
          }
        }
        
        // Convertir dans le format attendu
        const formattedEquipment = equipmentArray.map((item: any) => {
          // Extraire les attributs et spécifications
          const attributes = [];
          const specifications = [];
          
          if (item.attributes && typeof item.attributes === 'object') {
            for (const [key, value] of Object.entries(item.attributes)) {
              attributes.push({ key, value: String(value), equipment_id: item.id || 'temp' });
            }
          }
          
          if (item.specifications && typeof item.specifications === 'object') {
            for (const [key, value] of Object.entries(item.specifications)) {
              specifications.push({ key, value: String(value), equipment_id: item.id || 'temp' });
            }
          } else if (item.variants && typeof item.variants === 'object') {
            for (const [key, value] of Object.entries(item.variants)) {
              specifications.push({ key, value: String(value), equipment_id: item.id || 'temp' });
            }
          }
          
          return {
            id: item.id || `temp-${Math.random().toString(36).substring(2, 9)}`,
            offer_id: sampleData.id,
            title: item.title || "Produit sans nom",
            purchase_price: Number(item.purchasePrice || item.purchase_price) || 0,
            quantity: Number(item.quantity) || 1,
            margin: Number(item.margin) || 0,
            monthly_payment: Number(item.monthlyPayment || item.monthly_payment) || 0,
            serial_number: item.serialNumber || item.serial_number,
            attributes,
            specifications
          };
        });
        
        setEquipmentData(formattedEquipment);
      } catch (error) {
        console.error("Erreur lors du parsing des données JSON:", error);
        setEquipmentData([]);
      }
    };
    
    fetchEquipmentData();
  }, [field.id, sampleData, migrationAttempted]);
  
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
  
  // Fonction pour résoudre la valeur du champ en fonction du modèle et des données de l'échantillon
  const resolveFieldValue = (pattern: string | undefined): string => {
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
  
  const renderContent = () => {
    if (field.id === 'equipment_table') {
      if (isLoading) {
        return <p className="text-sm italic">Chargement des données...</p>;
      }
      return <EquipmentTable equipment={equipmentData} zoomLevel={zoomLevel} />;
    }
    
    return <span>{resolveFieldValue(field.value)}</span>;
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
