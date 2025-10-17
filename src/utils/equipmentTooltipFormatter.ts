/**
 * Formate l'equipment_description pour l'affichage dans le tooltip
 * avec les quantités sur plusieurs lignes
 * 
 * @param equipmentDescription - La description d'équipement (JSON string, objet, ou array)
 * @returns Un tableau de lignes formatées ["2 x iPhone 16 Pro Max", "1 x MacBook Pro"]
 */
export const formatEquipmentWithQuantities = (equipmentDescription: any): string[] => {
  if (!equipmentDescription) {
    return ["Aucun équipement"];
  }

  try {
    let equipmentData;

    // Si c'est une string, essayer de la parser
    if (typeof equipmentDescription === 'string') {
      if (equipmentDescription.startsWith('[') || equipmentDescription.startsWith('{')) {
        equipmentData = JSON.parse(equipmentDescription);
      } else {
        // Si c'est juste du texte, le retourner tel quel
        return [equipmentDescription];
      }
    } else {
      equipmentData = equipmentDescription;
    }

    // Si c'est un tableau d'équipements
    if (Array.isArray(equipmentData)) {
      return equipmentData.map((item) => {
        const quantity = item.quantity || 1;
        const title = item.title || "Équipement sans titre";
        return `${quantity} x ${title}`;
      });
    }

    // Si c'est un objet unique
    if (typeof equipmentData === 'object' && equipmentData.title) {
      const quantity = equipmentData.quantity || 1;
      return [`${quantity} x ${equipmentData.title}`];
    }

    return ["Format d'équipement non reconnu"];
  } catch (error) {
    console.error("Erreur lors du parsing de l'équipement:", error);
    return ["Erreur de format"];
  }
};

/**
 * Formate l'équipement pour l'affichage tronqué dans la cellule du tableau
 * (sans les quantités, séparé par des virgules)
 */
export const formatEquipmentForCell = (equipmentDescription: any): string => {
  if (!equipmentDescription) {
    return "Non spécifié";
  }

  try {
    let equipmentData;

    if (typeof equipmentDescription === 'string') {
      if (equipmentDescription.startsWith('[') || equipmentDescription.startsWith('{')) {
        equipmentData = JSON.parse(equipmentDescription);
      } else {
        return equipmentDescription;
      }
    } else {
      equipmentData = equipmentDescription;
    }

    if (Array.isArray(equipmentData)) {
      return equipmentData
        .map((item) => item.title || "Sans titre")
        .join(", ");
    }

    if (typeof equipmentData === 'object' && equipmentData.title) {
      return equipmentData.title;
    }

    return "Non spécifié";
  } catch (error) {
    return "Format invalide";
  }
}
