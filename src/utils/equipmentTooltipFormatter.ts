/**
 * Combine et formate tous les équipements d'une offre
 * Prend en compte à la fois equipment_description (legacy) et offer_equipment (nouveau)
 * 
 * @param equipmentDescription - L'ancien champ JSON (legacy)
 * @param offerEquipment - Array d'équipements de la table offer_equipment
 * @returns Un tableau de lignes formatées ["4 x Lenovo M90q", "4 x HP ProBook 460 G11"]
 */
export const formatAllEquipmentWithQuantities = (
  equipmentDescription: any,
  offerEquipment?: any[]
): string[] => {
  const allEquipment: string[] = [];
  
  // 1. Si offer_equipment existe et contient des données, l'utiliser EXCLUSIVEMENT
  if (offerEquipment && Array.isArray(offerEquipment) && offerEquipment.length > 0) {
    offerEquipment.forEach((item) => {
      const quantity = item.quantity || 1;
      const title = item.title || "Équipement sans titre";
      allEquipment.push(`${quantity} x ${title}`);
    });
    
    // IMPORTANT : Retourner directement ici pour éviter les doublons
    return allEquipment;
  }
  
  // 2. SINON (fallback pour les anciennes offres), utiliser equipment_description
  if (equipmentDescription) {
    try {
      let equipmentData;

      if (typeof equipmentDescription === 'string') {
        if (equipmentDescription.startsWith('[') || equipmentDescription.startsWith('{')) {
          equipmentData = JSON.parse(equipmentDescription);
        } else {
          return [equipmentDescription];
        }
      } else {
        equipmentData = equipmentDescription;
      }

      if (Array.isArray(equipmentData)) {
        equipmentData.forEach((item) => {
          const quantity = item.quantity || 1;
          const title = item.title || "Équipement sans titre";
          allEquipment.push(`${quantity} x ${title}`);
        });
      } else if (typeof equipmentData === 'object' && equipmentData.title) {
        const quantity = equipmentData.quantity || 1;
        allEquipment.push(`${quantity} x ${equipmentData.title}`);
      }
    } catch (error) {
      console.error("Erreur lors du parsing de equipment_description:", error);
    }
  }
  
  return allEquipment.length > 0 ? allEquipment : ["Aucun équipement"];
};

/**
 * Ancienne fonction conservée pour compatibilité
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
 * Formate tous les équipements pour l'affichage tronqué dans la cellule
 * Combine offer_equipment et equipment_description
 */
export const formatAllEquipmentForCell = (
  equipmentDescription: any,
  offerEquipment?: any[]
): string => {
  const titles: string[] = [];
  
  // 1. Si offer_equipment existe, l'utiliser EXCLUSIVEMENT
  if (offerEquipment && Array.isArray(offerEquipment) && offerEquipment.length > 0) {
    offerEquipment.forEach((item) => {
      titles.push(item.title || "Sans titre");
    });
    
    // IMPORTANT : Retourner directement ici
    return titles.join(", ");
  }
  
  // 2. SINON (fallback), utiliser equipment_description
  if (equipmentDescription) {
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
        equipmentData.forEach((item) => {
          titles.push(item.title || "Sans titre");
        });
      } else if (typeof equipmentData === 'object' && equipmentData.title) {
        titles.push(equipmentData.title);
      }
    } catch (error) {
      console.error("Erreur lors du parsing:", error);
    }
  }
  
  return titles.length > 0 ? titles.join(", ") : "Non spécifié";
};

/**
 * Ancienne fonction conservée pour compatibilité
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
