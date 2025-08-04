import { PDFDocument, PDFPage, rgb } from 'pdf-lib';
import { CustomPdfTemplate } from '@/types/customPdfTemplate';

export interface GenerationOptions {
  templateId: string;
  data: Record<string, any>;
  outputFormat?: 'pdf' | 'buffer';
  quality?: 'low' | 'medium' | 'high';
}

export interface GenerationResult {
  success: boolean;
  pdfUrl?: string;
  buffer?: ArrayBuffer;
  error?: string;
  metadata?: {
    pageCount: number;
    fileSize: number;
    generationTime: number;
  };
}

class PDFGenerationEngine {
  private templates: Map<string, CustomPdfTemplate> = new Map();

  async loadTemplate(template: CustomPdfTemplate): Promise<void> {
    this.templates.set(template.id, template);
  }

  async generatePDF(options: GenerationOptions): Promise<GenerationResult> {
    const startTime = Date.now();
    
    try {
      const template = this.templates.get(options.templateId);
      if (!template) {
        throw new Error(`Template ${options.templateId} non trouvé`);
      }

      // Créer un nouveau document PDF
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4

      // Appliquer les mappings de champs
      await this.applyFieldMappings(page, template, options.data);

      // Générer le PDF
      const pdfBytes = await pdfDoc.save();
      const generationTime = Date.now() - startTime;

      if (options.outputFormat === 'buffer') {
        return {
          success: true,
          buffer: pdfBytes.buffer,
          metadata: {
            pageCount: pdfDoc.getPageCount(),
            fileSize: pdfBytes.length,
            generationTime
          }
        };
      }

      // Simuler l'upload et retourner l'URL
      const mockUrl = `https://generated-pdfs.example.com/${template.id}-${Date.now()}.pdf`;
      
      return {
        success: true,
        pdfUrl: mockUrl,
        metadata: {
          pageCount: pdfDoc.getPageCount(),
          fileSize: pdfBytes.length,
          generationTime
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur de génération inconnue'
      };
    }
  }

  private async applyFieldMappings(
    page: PDFPage,
    template: CustomPdfTemplate,
    data: Record<string, any>
  ): Promise<void> {
    const { field_mappings } = template;
    
    Object.entries(field_mappings).forEach(([fieldKey, mapping]) => {
      const value = data[fieldKey];
      if (value && typeof mapping === 'object' && mapping.x && mapping.y) {
        // Ajouter le texte à la position spécifiée
        page.drawText(String(value), {
          x: mapping.x,
          y: mapping.y,
          size: mapping.fontSize || 12,
          color: rgb(0, 0, 0)
        });
      }
    });
  }

  async batchGenerate(batchOptions: GenerationOptions[]): Promise<GenerationResult[]> {
    const results: GenerationResult[] = [];
    
    for (const options of batchOptions) {
      const result = await this.generatePDF(options);
      results.push(result);
    }
    
    return results;
  }

  async generateOfferPDF(offerData: any): Promise<string> {
    // Méthode de compatibilité pour les offres
    const result = await this.generatePDF({
      templateId: 'default-offer',
      data: offerData
    });
    
    if (result.success && result.pdfUrl) {
      return result.pdfUrl;
    }
    
    throw new Error(result.error || 'Erreur de génération PDF');
  }

  getTemplateMetadata(templateId: string) {
    const template = this.templates.get(templateId);
    if (!template) return null;

    return {
      id: template.id,
      name: template.name,
      fieldCount: Object.keys(template.field_mappings).length,
      lastModified: template.updated_at
    };
  }
}

export { PDFGenerationEngine };
export const pdfGenerationEngine = new PDFGenerationEngine();