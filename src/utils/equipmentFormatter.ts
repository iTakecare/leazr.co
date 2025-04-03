
export const formatEquipmentDisplay = (equipmentDescription: any): string => {
  if (!equipmentDescription) return "Équipement non détaillé";
  
  try {
    if (typeof equipmentDescription === 'string') {
      if (equipmentDescription.startsWith('[') || equipmentDescription.startsWith('{')) {
        try {
          const parsed = JSON.parse(equipmentDescription);
          if (Array.isArray(parsed)) {
            return parsed.map(item => 
              typeof item === 'object' 
                ? (item.title || item.name || item.model || JSON.stringify(item)) 
                : String(item)
            ).join(", ");
          } else if (parsed && typeof parsed === 'object') {
            return parsed.title || parsed.name || parsed.model || JSON.stringify(parsed);
          }
        } catch (e) {
          console.log("L'equipment_description n'est pas un JSON valide, utilisation en l'état");
          return equipmentDescription;
        }
      } else {
        return equipmentDescription;
      }
    } else if (Array.isArray(equipmentDescription)) {
      return equipmentDescription.map((item: any) => 
        typeof item === 'object' 
          ? (item.title || item.name || item.model || JSON.stringify(item)) 
          : String(item)
      ).join(", ");
    } else if (typeof equipmentDescription === 'object' && equipmentDescription !== null) {
      return JSON.stringify(equipmentDescription);
    }
  } catch (e) {
    console.error("Erreur lors du parsing de l'équipement:", e);
    return typeof equipmentDescription === 'string' 
      ? equipmentDescription 
      : "Équipement non détaillé (erreur de format)";
  }
  
  return "Équipement non détaillé";
};
