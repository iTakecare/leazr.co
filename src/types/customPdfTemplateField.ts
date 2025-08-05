export interface CustomPdfTemplateField {
  id: string;
  type: 'text' | 'currency' | 'date' | 'number' | 'table' | 'image';
  label: string;
  mapping_key: string; // ex: "client.name", "offer.total_amount"
  position: { x: number; y: number; page: number };
  style: {
    fontSize: number;
    fontFamily: string;
    color: string;
    fontWeight: string;
    textAlign: 'left' | 'center' | 'right';
    width?: number;
    height?: number;
  };
  format?: {
    currency?: string;
    dateFormat?: string;
    numberDecimals?: number;
  };
  conditions?: {
    show_if?: string;
    hide_if?: string;
  };
  isVisible: boolean;
}

export interface CustomPdfTemplatePage {
  page_number: number;
  image_url?: string;
  dimensions?: { width: number; height: number };
  width?: number;
  height?: number;
}

export interface ExtendedCustomPdfTemplate {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  original_pdf_url: string;
  is_active: boolean;
  created_at: string | Date;
  updated_at: string | Date;
  fields: CustomPdfTemplateField[];
  pages_data: CustomPdfTemplatePage[];
  template_metadata: {
    pages_count?: number;
    pages_data?: CustomPdfTemplatePage[];
    file_size?: number;
    file_type?: string;
    upload_date?: string;
  };
}

export interface FieldCategory {
  id: string;
  label: string;
  icon: string;
  fields: FieldDefinition[];
}

export interface FieldDefinition {
  id: string;
  label: string;
  type: CustomPdfTemplateField['type'];
  mapping_key: string;
  defaultStyle: Partial<CustomPdfTemplateField['style']>;
  format?: Partial<CustomPdfTemplateField['format']>;
}

// Définitions des champs disponibles par catégorie
export const FIELD_CATEGORIES: FieldCategory[] = [
  {
    id: 'client',
    label: 'Client',
    icon: 'User',
    fields: [
      {
        id: 'client_name',
        label: 'Nom du client',
        type: 'text',
        mapping_key: 'client.name',
        defaultStyle: { fontSize: 12, fontFamily: 'Arial', color: '#000000', fontWeight: 'normal', textAlign: 'left' }
      },
      {
        id: 'client_email',
        label: 'Email du client',
        type: 'text',
        mapping_key: 'client.email',
        defaultStyle: { fontSize: 10, fontFamily: 'Arial', color: '#000000', fontWeight: 'normal', textAlign: 'left' }
      },
      {
        id: 'client_company',
        label: 'Entreprise du client',
        type: 'text',
        mapping_key: 'client.company',
        defaultStyle: { fontSize: 11, fontFamily: 'Arial', color: '#000000', fontWeight: 'normal', textAlign: 'left' }
      },
      {
        id: 'client_address',
        label: 'Adresse du client',
        type: 'text',
        mapping_key: 'client.address',
        defaultStyle: { fontSize: 10, fontFamily: 'Arial', color: '#000000', fontWeight: 'normal', textAlign: 'left' }
      },
      {
        id: 'client_phone',
        label: 'Téléphone du client',
        type: 'text',
        mapping_key: 'client.phone',
        defaultStyle: { fontSize: 10, fontFamily: 'Arial', color: '#000000', fontWeight: 'normal', textAlign: 'left' }
      }
    ]
  },
  {
    id: 'offer',
    label: 'Offre',
    icon: 'FileText',
    fields: [
      {
        id: 'offer_id',
        label: 'Numéro d\'offre',
        type: 'text',
        mapping_key: 'offer.id',
        defaultStyle: { fontSize: 12, fontFamily: 'Arial', color: '#000000', fontWeight: 'bold', textAlign: 'left' }
      },
      {
        id: 'offer_amount',
        label: 'Montant total',
        type: 'currency',
        mapping_key: 'offer.amount',
        defaultStyle: { fontSize: 14, fontFamily: 'Arial', color: '#000000', fontWeight: 'bold', textAlign: 'right' },
        format: { currency: 'EUR' }
      },
      {
        id: 'offer_monthly_payment',
        label: 'Mensualité',
        type: 'currency',
        mapping_key: 'offer.monthly_payment',
        defaultStyle: { fontSize: 12, fontFamily: 'Arial', color: '#000000', fontWeight: 'bold', textAlign: 'right' },
        format: { currency: 'EUR' }
      },
      {
        id: 'offer_duration',
        label: 'Durée (mois)',
        type: 'number',
        mapping_key: 'offer.duration',
        defaultStyle: { fontSize: 11, fontFamily: 'Arial', color: '#000000', fontWeight: 'normal', textAlign: 'center' }
      }
    ]
  },
  {
    id: 'dates',
    label: 'Dates',
    icon: 'Calendar',
    fields: [
      {
        id: 'offer_created_at',
        label: 'Date de création',
        type: 'date',
        mapping_key: 'offer.created_at',
        defaultStyle: { fontSize: 10, fontFamily: 'Arial', color: '#000000', fontWeight: 'normal', textAlign: 'left' },
        format: { dateFormat: 'dd/MM/yyyy' }
      },
      {
        id: 'current_date',
        label: 'Date actuelle',
        type: 'date',
        mapping_key: 'current_date',
        defaultStyle: { fontSize: 10, fontFamily: 'Arial', color: '#000000', fontWeight: 'normal', textAlign: 'left' },
        format: { dateFormat: 'dd/MM/yyyy' }
      }
    ]
  },
  {
    id: 'equipment',
    label: 'Équipements',
    icon: 'Package',
    fields: [
      {
        id: 'equipment_table',
        label: 'Tableau des équipements',
        type: 'table',
        mapping_key: 'equipment_list',
        defaultStyle: { fontSize: 9, fontFamily: 'Arial', color: '#000000', fontWeight: 'normal', textAlign: 'left', width: 150, height: 100 }
      }
    ]
  }
];