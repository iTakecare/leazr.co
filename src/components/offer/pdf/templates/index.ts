import { ClassicBusinessTemplate } from './ClassicBusinessTemplate';

export interface PdfTemplateInfo {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  component: any;
}

export const PDF_TEMPLATES: Record<string, PdfTemplateInfo> = {
  'classic-business': {
    id: 'classic-business',
    name: 'Classic Business',
    description: 'Design sobre et professionnel, idéal pour tous types d\'entreprises',
    thumbnail: '📄',
    component: ClassicBusinessTemplate,
  },
};

export const getTemplateById = (id: string) => {
  return PDF_TEMPLATES[id] || PDF_TEMPLATES['classic-business'];
};
