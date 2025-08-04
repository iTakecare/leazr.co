export interface CustomPdfTemplate {
  id: string;
  client_id: string;
  company_id: string;
  name: string;
  description?: string;
  original_pdf_url: string;
  field_mappings: Record<string, any>;
  template_metadata: {
    pages_count?: number;
    file_size?: number;
    file_type?: string;
    upload_date?: string;
  };
  is_active: boolean;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface CreateCustomPdfTemplateData {
  client_id: string;
  name: string;
  description?: string;
  original_pdf_url: string;
  field_mappings?: Record<string, any>;
  template_metadata?: Record<string, any>;
  is_active?: boolean;
}