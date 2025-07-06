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
      category: "Client",
      isVisible: true,
      value: "client_name",
      position: { x: 20, y: 80 },
      page: 0,
      style: defaultStyle
    },
    {
      id: uuidv4(),
      label: "Email du client",
      type: "text",
      category: "Client",
      isVisible: true,
      value: "client_email",
      position: { x: 20, y: 100 },
      page: 0,
      style: defaultStyle
    },
    {
      id: uuidv4(),
      label: "Téléphone du client",
      type: "text",
      category: "Client",
      isVisible: true,
      value: "client_phone",
      position: { x: 20, y: 120 },
      page: 0,
      style: defaultStyle
    },
    {
      id: uuidv4(),
      label: "Société du client",
      type: "text",
      category: "Client",
      isVisible: true,
      value: "client_company",
      position: { x: 20, y: 140 },
      page: 0,
      style: defaultStyle
    },
    {
      id: uuidv4(),
      label: "Adresse du client",
      type: "text",
      category: "Client",
      isVisible: true,
      value: "client_address",
      position: { x: 20, y: 160 },
      page: 0,
      style: defaultStyle
    },

    // Champs Offre
    {
      id: uuidv4(),
      label: "Numéro d'offre",
      type: "text",
      category: "Offre",
      isVisible: true,
      value: "offer_id",
      position: { x: 120, y: 80 },
      page: 0,
      style: defaultStyle
    },
    {
      id: uuidv4(),
      label: "Date de création",
      type: "text",
      category: "Offre",
      isVisible: true,
      value: "created_at",
      position: { x: 120, y: 100 },
      page: 0,
      style: defaultStyle
    },
    {
      id: uuidv4(),
      label: "Montant total",
      type: "text",
      category: "Offre",
      isVisible: true,
      value: "amount",
      position: { x: 120, y: 120 },
      page: 0,
      style: defaultStyle
    },
    {
      id: uuidv4(),
      label: "Mensualité",
      type: "text",
      category: "Offre",
      isVisible: true,
      value: "monthly_payment",
      position: { x: 120, y: 140 },
      page: 0,
      style: defaultStyle
    },

    // Champs Équipement
    {
      id: uuidv4(),
      label: "Description équipement",
      type: "text",
      category: "Équipement",
      isVisible: true,
      value: "equipment_description",
      position: { x: 20, y: 200 },
      page: 0,
      style: defaultStyle
    },

    // Champs Vendeur
    {
      id: uuidv4(),
      label: "Nom du vendeur",
      type: "text",
      category: "Vendeur",
      isVisible: true,
      value: "user_name",
      position: { x: 120, y: 200 },
      page: 0,
      style: defaultStyle
    },

    // Champs Général
    {
      id: uuidv4(),
      label: "Date du jour",
      type: "text",
      category: "Général",
      isVisible: true,
      value: "current_date",
      position: { x: 20, y: 240 },
      page: 0,
      style: defaultStyle
    }
  ];

  return fields;
};

/**
 * Vérifie si un template a des champs par défaut
 */
export const hasDefaultFields = (fields: PDFField[]): boolean => {
  if (!fields || fields.length === 0) return false;
  
  // Vérifier qu'il y a au moins quelques champs de base
  const requiredCategories = ['Client', 'Offre'];
  const presentCategories = [...new Set(fields.map(f => f.category))];
  
  return requiredCategories.every(cat => presentCategories.includes(cat));
};