
export const formatEquipmentDisplay = (equipmentDescription: any): string => {
  if (!equipmentDescription) return "Équipement non détaillé";
  
  try {
    if (typeof equipmentDescription === 'string') {
      if (equipmentDescription.startsWith('[') || equipmentDescription.startsWith('{')) {
        try {
          const parsed = JSON.parse(equipmentDescription);
          if (Array.isArray(parsed)) {
            return parsed.map(item => 
              typeof item === 'object' && item.title ? item.title : 
              typeof item === 'object' ? "Produit" : String(item)
            ).join(", ");
          } else if (parsed && typeof parsed === 'object') {
            return parsed.title || parsed.name || parsed.model || "Équipement";
          }
        } catch (e) {
          console.log("L'equipment_description n'est pas un JSON valide, utilisation en l'état");
          // Si ce n'est pas un JSON valide, retourner les 30 premiers caractères
          return equipmentDescription.substring(0, 30) + (equipmentDescription.length > 30 ? '...' : '');
        }
      } else {
        return equipmentDescription;
      }
    } else if (Array.isArray(equipmentDescription)) {
      return equipmentDescription.map((item: any) => 
        typeof item === 'object' && item.title ? item.title :
        typeof item === 'object' ? "Produit" : String(item)
      ).join(", ");
    } else if (typeof equipmentDescription === 'object' && equipmentDescription !== null) {
      return equipmentDescription.title || equipmentDescription.name || equipmentDescription.model || "Équipement";
    }
  } catch (e) {
    console.error("Erreur lors du parsing de l'équipement:", e);
    return typeof equipmentDescription === 'string' 
      ? (equipmentDescription.substring(0, 30) + (equipmentDescription.length > 30 ? '...' : ''))
      : "Équipement non détaillé";
  }
  
  return "Équipement non détaillé";
};
