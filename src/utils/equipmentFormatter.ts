
/**
 * Format equipment list for display
 * @param equipmentList Array of equipment items or JSON string representation
 * @returns Formatted string representation of equipment
 */
export const formatEquipmentDisplay = (equipmentList: any[] | string): string => {
  try {
    // If it's already a string but not JSON, return it as is
    if (typeof equipmentList === 'string' && !equipmentList.startsWith('[')) {
      return equipmentList;
    }
    
    // Parse string to array if needed
    const items = typeof equipmentList === 'string' 
      ? JSON.parse(equipmentList) 
      : equipmentList;
    
    if (!Array.isArray(items) || items.length === 0) {
      return "Aucun équipement spécifié";
    }
    
    // Format each item
    return items.map(item => {
      const title = item.title || 'Équipement';
      const quantity = item.quantity || 1;
      
      return `${title} (Quantité: ${quantity})`;
    }).join('\n');
  } catch (error) {
    console.error("Error formatting equipment display:", error);
    
    // Return original string if parsing fails
    if (typeof equipmentList === 'string') {
      return equipmentList;
    }
    
    return "Erreur de formatage de l'équipement";
  }
};
