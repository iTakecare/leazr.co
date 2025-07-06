import { v4 as uuidv4 } from "uuid";

// Interface pour les champs du PDF
export interface PDFField {
  id: string;
  label: string;
  type: string;
  category: string;
  isVisible: boolean;
  value: string;
  position: { x: number; y: number };
  page: number;
  style?: {
    fontSize: number;
    fontWeight: string;
    fontStyle: string;
    textDecoration: string;
  };
}

/**
 * Génère les champs par défaut pour un template PDF
 */
export const generateDefaultPDFFields = (): PDFField[] => {
  const defaultStyle = {
    fontSize: 12,
    fontWeight: "normal",
    fontStyle: "normal",
    textDecoration: "none"
  };

  const fields: PDFField[] = [
    // Champs Client
    {
      id: uuidv4(),
      label: "Nom du client",
      type: "text",
      category: "client",
      isVisible: true,
      value: "client_name",
      position: { x: 20, y: 80 },
      page: -1, // Champs disponibles par défaut
      style: defaultStyle
    },
    {
      id: uuidv4(),
      label: "Email du client",
      type: "text",
      category: "client",
      isVisible: true,
      value: "client_email",
      position: { x: 20, y: 100 },
      page: -1, // Champs disponibles par défaut
      style: defaultStyle
    },
    {
      id: uuidv4(),
      label: "Téléphone du client",
      type: "text",
      category: "client",
      isVisible: true,
      value: "client_phone",
      position: { x: 20, y: 120 },
      page: -1, // Champs disponibles par défaut
      style: defaultStyle
    },
    {
      id: uuidv4(),
      label: "Société du client",
      type: "text",
      category: "client",
      isVisible: true,
      value: "client_company",
      position: { x: 20, y: 140 },
      page: -1, // Champs disponibles par défaut
      style: defaultStyle
    },
    {
      id: uuidv4(),
      label: "Adresse du client",
      type: "text",
      category: "client",
      isVisible: true,
      value: "client_address",
      position: { x: 20, y: 160 },
      page: -1, // Champs disponibles par défaut
      style: defaultStyle
    },

    // Champs Offre
    {
      id: uuidv4(),
      label: "Numéro d'offre",
      type: "text",
      category: "offer",
      isVisible: true,
      value: "offer_id",
      position: { x: 120, y: 80 },
      page: -1, // Champs disponibles par défaut
      style: defaultStyle
    },
    {
      id: uuidv4(),
      label: "Date de création",
      type: "text",
      category: "offer",
      isVisible: true,
      value: "created_at",
      position: { x: 120, y: 100 },
      page: -1, // Champs disponibles par défaut
      style: defaultStyle
    },
    {
      id: uuidv4(),
      label: "Montant total",
      type: "text",
      category: "offer",
      isVisible: true,
      value: "amount",
      position: { x: 120, y: 120 },
      page: -1, // Champs disponibles par défaut
      style: defaultStyle
    },
    {
      id: uuidv4(),
      label: "Mensualité",
      type: "text",
      category: "offer",
      isVisible: true,
      value: "monthly_payment",
      position: { x: 120, y: 140 },
      page: -1, // Champs disponibles par défaut
      style: defaultStyle
    },

    // Champs Équipement
    {
      id: uuidv4(),
      label: "Description équipement",
      type: "text",
      category: "equipment",
      isVisible: true,
      value: "equipment_description",
      position: { x: 20, y: 200 },
      page: -1, // Champs disponibles par défaut
      style: defaultStyle
    },

    // Champs Vendeur
    {
      id: uuidv4(),
      label: "Nom du vendeur",
      type: "text",
      category: "user",
      isVisible: true,
      value: "user_name",
      position: { x: 120, y: 200 },
      page: -1, // Champs disponibles par défaut
      style: defaultStyle
    },

    // Champs Général
    {
      id: uuidv4(),
      label: "Date du jour",
      type: "text",
      category: "general",
      isVisible: true,
      value: "current_date",
      position: { x: 20, y: 240 },
      page: -1, // Champs disponibles par défaut
      style: defaultStyle
    }
  ];

  return fields;
};

/**
 * Vérifie si un template a un ensemble complet de champs par défaut
 */
export const hasDefaultFields = (fields: PDFField[]): boolean => {
  if (!fields || fields.length === 0) return false;
  
  // Vérifier qu'il y a au moins les catégories essentielles avec un nombre minimal de champs
  const requiredCategories = ['client', 'offer', 'equipment', 'user', 'general'];
  const presentCategories = [...new Set(fields.map(f => f.category))];
  
  // Au minimum, on doit avoir au moins 3 des 5 catégories essentielles
  const foundCategories = requiredCategories.filter(cat => presentCategories.includes(cat));
  
  return foundCategories.length >= 3 && presentCategories.includes('client') && presentCategories.includes('offer');
};

/**
 * Fusionne les champs existants avec les champs par défaut manquants
 */
export const mergeWithDefaultFields = (existingFields: PDFField[]): PDFField[] => {
  const defaultFields = generateDefaultPDFFields();
  const existingCategories = [...new Set(existingFields.map(f => f.category))];
  
  // Ajouter seulement les champs des catégories manquantes
  const missingFields = defaultFields.filter(defaultField => 
    !existingCategories.includes(defaultField.category)
  );
  
  return [...existingFields, ...missingFields];
};