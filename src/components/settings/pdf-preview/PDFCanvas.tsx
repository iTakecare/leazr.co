
import React, { useRef, useEffect, memo } from "react";
import PageNavigation from "./PageNavigation";
import PageImage from "./PageImage";
import PDFFieldDisplay from "../PDFFieldDisplay";

interface PDFCanvasProps {
  localTemplate: any;
  zoomLevel: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageLoaded: boolean;
  setPageLoaded: (loaded: boolean) => void;
  isDraggable: boolean;
  sampleData: any;
  onStartDrag: (fieldId: string, offsetX: number, offsetY: number) => void;
  onDrag: (clientX: number, clientY: number) => void;
  onEndDrag: () => void;
  useRealData?: boolean;
}

// Constantes pour les dimensions de page A4 en mm
const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;

const PDFCanvas: React.FC<PDFCanvasProps> = ({
  localTemplate,
  zoomLevel,
  currentPage,
  setCurrentPage,
  pageLoaded,
  setPageLoaded,
  isDraggable,
  sampleData,
  onStartDrag,
  onDrag,
  onEndDrag,
  useRealData = false
}) => {
  const pdfDocumentRef = useRef<HTMLDivElement>(null);
  const hasTemplateImages = localTemplate?.templateImages && 
                           Array.isArray(localTemplate.templateImages) && 
                           localTemplate.templateImages.length > 0;

  useEffect(() => {
    if (localTemplate?.fields?.length > 0) {
      // Compter les champs avec des positions valides pour cette page
      const validFieldsCount = localTemplate.fields.filter((f: any) => {
        const isForCurrentPage = f.page === currentPage || (currentPage === 0 && f.page === undefined);
        const hasPosition = f.position && typeof f.position.x === 'number' && typeof f.position.y === 'number';
        return isForCurrentPage && hasPosition;
      }).length;
      
      console.log(`Page ${currentPage + 1}: ${validFieldsCount} champs avec positions valides sur ${localTemplate.fields.length} total`);
    }
  }, [localTemplate?.fields, currentPage]);

  // Gestion du déplacement des champs
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      onDrag(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      onEndDrag();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onDrag, onEndDrag]);

  const formatEquipmentDisplay = (equipmentDescription: string | any[]) => {
    try {
      let equipment;
      
      if (typeof equipmentDescription === 'string') {
        equipment = JSON.parse(equipmentDescription);
      } else {
        equipment = equipmentDescription;
      }
      
      if (Array.isArray(equipment) && equipment.length > 0) {
        return equipment.map((item: any, idx: number) => (
          <div key={idx} className="mb-1">
            • {item.title}: {item.purchasePrice}€ × {item.quantity} (Marge: {item.margin}%)
          </div>
        ));
      }
      
      return "Aucun équipement spécifié";
    } catch (e) {
      console.error("Erreur lors du formatage de l'équipement:", e);
      return "Erreur de formatage des données d'équipement";
    }
  };

  const getCurrentPageFields = () => {
    if (!localTemplate?.fields || !Array.isArray(localTemplate.fields)) {
      console.log("Pas de champs disponibles dans le template");
      return [];
    }
    
    // Vérifier que les champs sont bien définis pour cette page
    const fields = localTemplate.fields.filter((f: any) => {
      if (!f) {
        console.log("Champ invalide trouvé (null ou undefined)");
        return false;
      }
      
      // Vérifier si le champ est destiné à la page actuelle
      const isForCurrentPage = f.page === currentPage || (currentPage === 0 && f.page === undefined);
      if (!isForCurrentPage) return false;
      
      // Vérifier si le champ est visible
      const isVisible = f.isVisible !== false;
      if (!isVisible) return false;
      
      // Vérifier si le champ a une position valide
      const hasValidPosition = f.position && 
                            typeof f.position.x === 'number' && !isNaN(f.position.x) &&
                            typeof f.position.y === 'number' && !isNaN(f.position.y) &&
                            f.position.x >= 0 && f.position.x <= PAGE_WIDTH_MM &&
                            f.position.y >= 0 && f.position.y <= PAGE_HEIGHT_MM;
      
      // Journaliser les champs qui sont filtrés à cause d'une position invalide
      if (!hasValidPosition && isForCurrentPage && isVisible) {
        console.log("Champ filtré car position invalide:", f.id, f.label, f.position);
      }
      
      return isForCurrentPage && isVisible && hasValidPosition;
    });
    
    console.log(`Champs pour la page ${currentPage + 1}:`, fields.length);
    fields.forEach((f: any) => {
      console.log(` - ${f.id}: "${f.label}" à (${f.position.x}, ${f.position.y})`);
      
      // Afficher la résolution des valeurs pour le débogage
      if (f.value && typeof f.value === 'string' && f.value.includes('{')) {
        let resolvedValue = f.value;
        
        // Traitement spécial pour l'affichage de l'équipement
        if (f.value === '{equipment_description}') {
          resolvedValue = useRealData ? 
            "Formatage des données d'équipement en temps réel" : 
            "Données d'équipement d'exemple (formatées pour l'affichage)";
        } else {
          // Résoudre les autres variables
          resolvedValue = f.value.replace(/\{([^}]+)\}/g, (match: string, key: string) => {
            const value = sampleData[key];
            return value !== undefined ? String(value) : `[${key} non trouvé]`;
          });
        }
        
        console.log(`   Valeur résolue: "${resolvedValue}"`);
      }
    });
    
    return fields;
  };

  const getCurrentPageImage = () => {
    if (Array.isArray(localTemplate?.templateImages) && localTemplate.templateImages.length > 0) {
      const image = localTemplate.templateImages.find(
        (img: any) => img.page === currentPage
      );
      
      if (image) {
        console.log(`Image trouvée pour la page ${currentPage + 1}`);
        return image;
      } else {
        console.log(`Aucune image trouvée pour la page ${currentPage + 1}`);
      }
    }
    return null;
  };

  const fields = getCurrentPageFields();

  // Ajouter des informations sur l'utilisation de données réelles vs exemples
  const dataSourceText = useRealData ? 
    "Utilisation de données réelles" : 
    "Utilisation de données d'exemple";

  return (
    <div 
      className="bg-gray-100 p-4 flex flex-col justify-center min-h-[800px] overflow-auto"
      onMouseLeave={onEndDrag}
    >
      {useRealData && (
        <div className="text-xs text-blue-600 font-medium mb-2 px-2 py-1 bg-blue-50 rounded-md inline-self-start max-w-max">
          {dataSourceText}
        </div>
      )}
      
      <div 
        ref={pdfDocumentRef}
        className="bg-white shadow-lg relative mx-auto" 
        style={{ 
          width: `${210 * zoomLevel}mm`, 
          height: `${297 * zoomLevel}mm`,
          maxWidth: "100%"
        }}
      >
        {hasTemplateImages && (
          <PageNavigation 
            currentPage={currentPage}
            totalPages={localTemplate.templateImages.length}
            setCurrentPage={setCurrentPage}
          />
        )}
        
        <div className="relative" style={{ height: "100%" }}>
          <PageImage 
            pageImage={getCurrentPageImage()} 
            currentPage={currentPage}
            setPageLoaded={setPageLoaded}
          />
          
          {pageLoaded && fields.map((field: any) => (
            <PDFFieldDisplay 
              key={field.id}
              field={field}
              zoomLevel={zoomLevel}
              currentPage={currentPage}
              sampleData={sampleData}
              isDraggable={isDraggable}
              onStartDrag={onStartDrag}
              useRealData={useRealData}
            />
          ))}
          
          {pageLoaded && fields.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
              {isDraggable ? 
                "Aucun champ sur cette page. Ajoutez des champs dans l'onglet 'Champs du document'." : 
                "Aucun champ sur cette page. Activez le mode 'Positionner les champs' pour les placer."}
            </div>
          )}
        </div>
      </div>
      
      {/* Ajouter une section de débogage pour voir les champs disponibles */}
      <div className="mt-4 p-3 border rounded bg-white text-xs">
        <details>
          <summary className="font-medium cursor-pointer">Informations de débogage ({fields.length} champs sur cette page)</summary>
          {fields.length > 0 ? (
            <div className="mt-2 space-y-1">
              {fields.map((field: any) => (
                <div key={field.id} className="p-1 border-b">
                  <span className="font-bold">{field.label}</span>: {field.value} à ({field.position.x.toFixed(1)}, {field.position.y.toFixed(1)})
                  {field.id === "equipment_table" && sampleData.equipment_description && (
                    <div className="pl-2 mt-1 text-xs text-gray-600">
                      {formatEquipmentDisplay(sampleData.equipment_description)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-gray-500">Aucun champ à afficher sur cette page.</p>
          )}
          
          <div className="mt-3 pt-2 border-t">
            <div className="font-medium">Vérification des données:</div>
            <p className="mt-1">Exemple de donnée client: {sampleData.client_name || "Non défini"}</p>
            <p>Page actuelle: {currentPage + 1}</p>
            <p>Champs totaux: {localTemplate?.fields?.length || 0}</p>
            {sampleData.equipment_description && (
              <div className="mt-2">
                <p className="font-medium">Équipement:</p>
                <div className="pl-2 mt-1">
                  {formatEquipmentDisplay(sampleData.equipment_description)}
                </div>
              </div>
            )}
          </div>
        </details>
      </div>
    </div>
  );
};

export default memo(PDFCanvas);
