
export interface PDFField {
  id: string;
  label: string;
  type: string;
  category: 'client' | 'offer' | 'equipment' | 'user' | 'general';
  isVisible: boolean;
  value: string;
  position?: {
    x: number;
    y: number;
  };
  page: number | null;
  style?: {
    fontSize: number;
    fontWeight: string;
    fontStyle: string;
    textDecoration?: string;
    maxWidth?: number;
    width?: number;
    height?: number;
  };
}

export interface PDFPage {
  imageUrl?: string;
}

export interface PDFTemplateImage {
  id: string;
  name: string;
  url: string;
  page: number;
}

export interface PDFTemplate {
  id: string;
  name: string;
  companyName: string;
  companyAddress: string;
  companyContact: string;
  companySiret: string;
  logoURL?: string;
  primaryColor: string;
  secondaryColor: string;
  headerText: string;
  footerText: string;
  templateImages?: PDFTemplateImage[];
  fields: PDFField[];
  pages: PDFPage[];
}
