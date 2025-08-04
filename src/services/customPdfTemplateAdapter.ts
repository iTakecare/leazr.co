import { CustomPdfTemplate } from "@/types/customPdfTemplate";
import { ExtendedCustomPdfTemplate, CustomPdfTemplateField } from "@/types/customPdfTemplateField";
import { PDFModel } from "@/utils/pdfModelUtils";

/**
 * Service d'adaptation entre les formats PDFModel et CustomPdfTemplate
 */
export class CustomPdfTemplateAdapter {
  
  /**
   * Convertit un CustomPdfTemplate de base vers ExtendedCustomPdfTemplate
   */
  static toExtended(template: CustomPdfTemplate): ExtendedCustomPdfTemplate {
    // Extraire les champs depuis field_mappings
    const fields: CustomPdfTemplateField[] = this.extractFieldsFromMappings(template.field_mappings);
    
    // Extraire les données de pages depuis template_metadata
    const pages_data = this.extractPagesData(template);
    
    return {
      id: template.id,
      client_id: template.client_id,
      company_id: template.company_id,
      name: template.name,
      description: template.description,
      original_pdf_url: template.original_pdf_url,
      is_active: template.is_active,
      created_at: template.created_at,
      updated_at: template.updated_at,
      fields,
      pages_data,
      template_metadata: template.template_metadata
    };
  }
  
  /**
   * Convertit un ExtendedCustomPdfTemplate vers CustomPdfTemplate pour la sauvegarde
   */
  static fromExtended(extended: ExtendedCustomPdfTemplate): CustomPdfTemplate {
    // Convertir les champs vers field_mappings
    const field_mappings = this.fieldsToMappings(extended.fields);
    
    // Mettre à jour template_metadata avec pages_data
    const template_metadata = {
      ...extended.template_metadata,
      pages_count: extended.pages_data.length,
      pages_data: extended.pages_data
    } as any;
    
    return {
      id: extended.id,
      client_id: extended.client_id,
      company_id: extended.company_id,
      name: extended.name,
      description: extended.description,
      original_pdf_url: extended.original_pdf_url,
      field_mappings,
      template_metadata,
      is_active: extended.is_active,
      created_at: extended.created_at,
      updated_at: extended.updated_at
    };
  }
  
  /**
   * Convertit un PDFModel vers ExtendedCustomPdfTemplate (pour réutiliser les composants existants)
   */
  static fromPDFModel(pdfModel: PDFModel, clientId: string): ExtendedCustomPdfTemplate {
    // Convertir les champs PDFModel vers CustomPdfTemplateField
    const fields: CustomPdfTemplateField[] = pdfModel.fields.map((field, index) => ({
      id: field.id || `field_${index}`,
      type: this.mapPDFFieldType(field),
      label: field.label || field.id || `Champ ${index + 1}`,
      mapping_key: field.value || field.mapping_key || '',
      position: {
        x: field.position?.x || 0,
        y: field.position?.y || 0,
        page: field.page || 1
      },
      style: {
        fontSize: field.style?.fontSize || 12,
        fontFamily: field.style?.fontFamily || 'Arial',
        color: field.style?.color || '#000000',
        fontWeight: field.style?.fontWeight || 'normal',
        textAlign: (field.style?.textAlign as any) || 'left',
        width: field.style?.width,
        height: field.style?.height
      },
      format: field.format,
      conditions: field.conditions,
      isVisible: field.isVisible !== false
    }));
    
    // Convertir les images vers pages_data
    const pages_data = pdfModel.templateImages.map((img, index) => ({
      page_number: img.page || index + 1,
      image_url: img.data || '',
      dimensions: {
        width: 210, // A4 par défaut
        height: 297
      }
    }));
    
    return {
      id: `pdf_${pdfModel.id}`,
      client_id: clientId,
      company_id: pdfModel.company_id,
      name: pdfModel.name,
      description: `Converti depuis le modèle PDF: ${pdfModel.name}`,
      original_pdf_url: '', // À définir
      is_active: true,
      created_at: pdfModel.created_at || new Date().toISOString(),
      updated_at: pdfModel.updated_at || new Date().toISOString(),
      fields,
      pages_data,
      template_metadata: {
        pages_count: pages_data.length,
        file_type: 'pdf',
        upload_date: new Date().toISOString()
      }
    };
  }
  
  /**
   * Extrait les champs depuis field_mappings
   */
  private static extractFieldsFromMappings(mappings: Record<string, any>): CustomPdfTemplateField[] {
    if (!mappings || typeof mappings !== 'object') {
      return [];
    }
    
    // Si mappings.fields existe, l'utiliser directement
    if (mappings.fields && Array.isArray(mappings.fields)) {
      return mappings.fields;
    }
    
    // Sinon, créer des champs à partir des clés de mappings
    return Object.entries(mappings).map(([key, value], index) => ({
      id: key,
      type: 'text' as const,
      label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      mapping_key: key,
      position: { x: 20, y: 20 + (index * 20), page: 1 },
      style: {
        fontSize: 12,
        fontFamily: 'Arial',
        color: '#000000',
        fontWeight: 'normal',
        textAlign: 'left' as const
      },
      isVisible: true
    }));
  }
  
  /**
   * Extrait les données de pages depuis template_metadata
   */
  private static extractPagesData(template: CustomPdfTemplate) {
    const metadata = template.template_metadata;
    
    // Vérifier si pages_data existe dans les métadonnées
    if (metadata && 'pages_data' in metadata && Array.isArray((metadata as any).pages_data)) {
      return (metadata as any).pages_data;
    }
    
    // Créer une page par défaut si aucune donnée
    return [{
      page_number: 1,
      image_url: template.original_pdf_url,
      dimensions: { width: 210, height: 297 }
    }];
  }
  
  /**
   * Convertit les champs vers field_mappings
   */
  private static fieldsToMappings(fields: CustomPdfTemplateField[]): Record<string, any> {
    return {
      fields: fields,
      // Créer aussi un mapping simple pour la compatibilité
      ...fields.reduce((acc, field) => {
        acc[field.mapping_key] = {
          type: field.type,
          position: field.position,
          style: field.style,
          format: field.format
        };
        return acc;
      }, {} as Record<string, any>)
    };
  }
  
  /**
   * Mappe le type de champ PDFModel vers CustomPdfTemplateField
   */
  private static mapPDFFieldType(field: any): CustomPdfTemplateField['type'] {
    if (field.type) return field.type;
    
    const key = field.mapping_key || field.value || '';
    
    if (key.includes('amount') || key.includes('payment') || key.includes('price')) {
      return 'currency';
    }
    
    if (key.includes('date') || key.includes('created_at')) {
      return 'date';
    }
    
    if (key.includes('equipment_table') || key.includes('table')) {
      return 'table';
    }
    
    if (key.includes('quantity') || key.includes('duration')) {
      return 'number';
    }
    
    return 'text';
  }
}