import { CustomPdfTemplateField } from './customPdfTemplateField';

export interface ImageTemplatePage {
  page_number: number;
  image_url: string;
  dimensions: { width: number; height: number };
}

export interface ImageTemplate {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  template_type: 'image-based';
  is_active: boolean;
  created_at: string | Date;
  updated_at: string | Date;
  fields: CustomPdfTemplateField[];
  pages: ImageTemplatePage[];
}

export interface CreateImageTemplateData {
  name: string;
  description?: string;
  pages: ImageTemplatePage[];
}