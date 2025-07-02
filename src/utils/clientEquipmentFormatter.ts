export const formatEquipmentForClient = (equipmentDescription: any): string => {
  if (!equipmentDescription) return "Équipement non spécifié";
  
  try {
    // Si c'est déjà une chaîne simple, la retourner
    if (typeof equipmentDescription === 'string' && !equipmentDescription.startsWith('[') && !equipmentDescription.startsWith('{')) {
      return equipmentDescription;
    }
    
    // Essayer de parser le JSON
    let parsed = equipmentDescription;
    if (typeof equipmentDescription === 'string') {
      parsed = JSON.parse(equipmentDescription);
    }
    
    // Si c'est un tableau d'équipements
    if (Array.isArray(parsed)) {
      return parsed.map((item, index) => {
        if (typeof item === 'object' && item !== null) {
          const title = item.title || item.name || item.model || `Équipement ${index + 1}`;
          const quantity = item.quantity ? ` (x${item.quantity})` : '';
          return title + quantity;
        }
        return String(item);
      }).join(", ");
    }
    
    // Si c'est un objet unique
    if (typeof parsed === 'object' && parsed !== null) {
      const title = parsed.title || parsed.name || parsed.model || "Équipement";
      const quantity = parsed.quantity ? ` (x${parsed.quantity})` : '';
      return title + quantity;
    }
    
    return String(parsed);
  } catch (e) {
    console.warn("Erreur lors du parsing de l'équipement:", e);
    return typeof equipmentDescription === 'string' 
      ? equipmentDescription 
      : "Équipement non spécifié";
  }
};

export const getEquipmentSummary = (equipmentDescription: any): { count: number, description: string } => {
  if (!equipmentDescription) return { count: 0, description: "Aucun équipement" };
  
  try {
    let parsed = equipmentDescription;
    if (typeof equipmentDescription === 'string') {
      if (!equipmentDescription.startsWith('[') && !equipmentDescription.startsWith('{')) {
        return { count: 1, description: equipmentDescription };
      }
      parsed = JSON.parse(equipmentDescription);
    }
    
    if (Array.isArray(parsed)) {
      const totalQuantity = parsed.reduce((sum, item) => {
        const quantity = typeof item === 'object' && item?.quantity ? item.quantity : 1;
        return sum + quantity;
      }, 0);
      
      const description = parsed.length === 1 
        ? formatEquipmentForClient(parsed[0])
        : `${parsed.length} types d'équipements`;
        
      return { count: totalQuantity, description };
    }
    
    if (typeof parsed === 'object' && parsed !== null) {
      const quantity = parsed.quantity || 1;
      const description = parsed.title || parsed.name || parsed.model || "Équipement";
      return { count: quantity, description };
    }
    
    return { count: 1, description: String(parsed) };
  } catch (e) {
    return { count: 1, description: typeof equipmentDescription === 'string' ? equipmentDescription : "Équipement" };
  }
};