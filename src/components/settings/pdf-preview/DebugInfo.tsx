
import React from "react";
import { formatCurrency } from "@/lib/utils";

interface DebugInfoProps {
  fields: any[];
  sampleData: any;
  currentPage: number;
  localTemplate: any;
}

const DebugInfo: React.FC<DebugInfoProps> = ({
  fields,
  sampleData,
  currentPage,
  localTemplate
}) => {
  const formatEquipmentDisplay = (equipmentData: any[] | string) => {
    try {
      let equipment;
      
      if (typeof equipmentData === 'string') {
        equipment = JSON.parse(equipmentData);
      } else {
        equipment = equipmentData;
      }
      
      if (Array.isArray(equipment) && equipment.length > 0) {
        // Calculer la mensualité totale
        const totalMonthlyPayment = equipment.reduce((total, item) => {
          const monthlyPayment = parseFloat(item.monthlyPayment || 0);
          const quantity = parseInt(item.quantity || 1);
          return total + (monthlyPayment * quantity);
        }, 0);
        
        return (
          <div>
            {equipment.map((item: any, idx: number) => (
              <div key={idx} className="mb-4 p-3 border border-gray-200 rounded bg-white">
                <h3 className="font-medium text-base">{item.title}</h3>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <p className="text-xs text-gray-500">Quantité</p>
                    <p className="font-medium">{item.quantity}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Mensualité</p>
                    <p className="font-medium text-blue-600">{formatCurrency(item.monthlyPayment * item.quantity)}</p>
                  </div>
                </div>
              </div>
            ))}
            <div className="mt-2 p-2 border-t border-gray-300">
              <div className="flex justify-between items-center">
                <p className="font-medium">Total mensualité:</p>
                <p className="font-bold text-blue-600">{formatCurrency(totalMonthlyPayment)} HTVA / mois</p>
              </div>
            </div>
          </div>
        );
      }
      
      return <div className="text-gray-500">Aucun équipement spécifié</div>;
    } catch (e) {
      console.error("Erreur lors du formatage de l'équipement:", e);
      return <div className="text-red-500">Erreur de formatage des données d'équipement</div>;
    }
  };

  return (
    <div className="mt-4 p-3 border rounded bg-white text-xs">
      <details>
        <summary className="font-medium cursor-pointer">Informations de débogage ({fields.length} champs sur cette page)</summary>
        {fields.length > 0 ? (
          <div className="mt-2 space-y-1">
            {fields.map((field: any) => (
              <div key={field.id} className="p-1 border-b">
                <span className="font-bold">{field.label}</span>: {field.value} à ({field.position.x.toFixed(1)}, {field.position.y.toFixed(1)})
                {field.id === "equipment_table" && (
                  <div className="pl-2 mt-1 text-xs text-gray-600">
                    {sampleData.equipment_data ? (
                      <div className="my-2">
                        {formatEquipmentDisplay(sampleData.equipment_data)}
                      </div>
                    ) : (
                      <div>
                        {formatEquipmentDisplay(sampleData.equipment_description || '[]')}
                      </div>
                    )}
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
          {(sampleData.equipment_description || sampleData.equipment_data) && (
            <div className="mt-2">
              <p className="font-medium">Équipement:</p>
              <div className="pl-2 mt-1">
                {sampleData.equipment_data ? (
                  <div className="my-2">
                    {formatEquipmentDisplay(sampleData.equipment_data)}
                  </div>
                ) : (
                  <div>
                    {formatEquipmentDisplay(sampleData.equipment_description || '[]')}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </details>
    </div>
  );
};

export default DebugInfo;
