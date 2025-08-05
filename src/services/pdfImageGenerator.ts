import { PDFDocument } from 'pdf-lib';
import { supabase } from '@/integrations/supabase/client';

/**
 * Service simplifié pour la gestion des métadonnées PDF (sans génération d'images)
 */
export class PdfImageGenerator {
  /**
   * Génère les métadonnées de base pour un PDF (sans images)
   */
  static async generateBasicMetadata(
    pdfUrl: string, 
    templateId: string
  ): Promise<{ pageCount: number; dimensions: { width: number; height: number } } | null> {
    try {
      console.log('📄 Analyse des métadonnées PDF pour:', pdfUrl);
      
      // Charger le PDF
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error(`Impossible de charger le PDF: ${response.statusText}`);
      }
      
      const pdfBytes = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      const pageCount = pdfDoc.getPageCount();
      const firstPage = pdfDoc.getPage(0);
      const { width, height } = firstPage.getSize();
      
      console.log(`✅ PDF analysé: ${pageCount} pages, dimensions: ${width}x${height}`);
      
      return {
        pageCount,
        dimensions: { width, height }
      };
      
    } catch (error) {
      console.error('Erreur lors de l\'analyse du PDF:', error);
      return null;
    }
  }

  /**
   * DEPRECATED: Cette méthode n'est plus utilisée
   * Le système utilise maintenant l'affichage direct du PDF
   */
  private static async convertPdfPageToImage(): Promise<string | null> {
    console.warn('⚠️ convertPdfPageToImage est deprecated - utilisez l\'affichage direct du PDF');
    return null;
  }

  /**
   * Génère les métadonnées de base pour toutes les pages d'un template
   */
  static async generateAllPageMetadata(
    pdfUrl: string,
    templateId: string
  ): Promise<Array<{ pageNumber: number; dimensions: { width: number; height: number } }>> {
    try {
      const metadata = await this.generateBasicMetadata(pdfUrl, templateId);
      if (!metadata) return [];
      
      const results = [];
      for (let i = 1; i <= metadata.pageCount; i++) {
        results.push({
          pageNumber: i,
          dimensions: metadata.dimensions
        });
      }
      
      return results;
      
    } catch (error) {
      console.error('Erreur lors de la génération des métadonnées:', error);
      return [];
    }
  }

  /**
   * Met à jour les métadonnées du template avec les dimensions de base
   */
  static async updateTemplateWithMetadata(
    templateId: string,
    pageMetadata: Array<{ pageNumber: number; dimensions: { width: number; height: number } }>
  ): Promise<boolean> {
    try {
      // Récupérer les métadonnées actuelles
      const { data: template, error: fetchError } = await supabase
        .from('custom_pdf_templates')
        .select('template_metadata')
        .eq('id', templateId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const currentMetadata = template.template_metadata || {};
      const pagesData = currentMetadata.pages_data || [];
      
      // Mettre à jour les pages avec les nouvelles métadonnées
      pageMetadata.forEach(meta => {
        const pageIndex = meta.pageNumber - 1;
        if (pagesData[pageIndex]) {
          pagesData[pageIndex].width = meta.dimensions.width;
          pagesData[pageIndex].height = meta.dimensions.height;
          pagesData[pageIndex].dimensions = meta.dimensions;
        } else {
          // Créer une nouvelle entrée de page
          pagesData[pageIndex] = {
            page_number: meta.pageNumber,
            image_url: null, // Plus d'images générées
            width: meta.dimensions.width,
            height: meta.dimensions.height,
            dimensions: meta.dimensions
          };
        }
      });
      
      // Sauvegarder les métadonnées mises à jour
      const { error: updateError } = await supabase
        .from('custom_pdf_templates')
        .update({
          template_metadata: {
            ...currentMetadata,
            pages_data: pagesData
          }
        })
        .eq('id', templateId);
      
      if (updateError) throw updateError;
      
      console.log('✅ Métadonnées du template mises à jour');
      return true;
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour des métadonnées:', error);
      return false;
    }
  }

  /**
   * Pipeline simplifié: analyse le PDF et met à jour les métadonnées de base
   */
  static async processTemplateMetadata(
    pdfUrl: string,
    templateId: string
  ): Promise<boolean> {
    try {
      console.log('🚀 Analyse des métadonnées pour le template:', templateId);
      console.log('📍 PDF URL:', pdfUrl);
      
      // Vérifier l'accès au PDF
      const testResponse = await fetch(pdfUrl);
      if (!testResponse.ok) {
        throw new Error(`PDF inaccessible: ${testResponse.status} ${testResponse.statusText}`);
      }
      console.log('✅ PDF accessible');
      
      // Générer les métadonnées de base
      const pageMetadata = await this.generateAllPageMetadata(pdfUrl, templateId);
      console.log('📊 Métadonnées générées:', pageMetadata);
      
      if (pageMetadata.length === 0) {
        console.warn('⚠️ Aucune métadonnée générée');
        return false;
      }
      
      // Mettre à jour le template
      const success = await this.updateTemplateWithMetadata(templateId, pageMetadata);
      
      if (success) {
        console.log('✅ Traitement des métadonnées terminé avec succès');
      } else {
        console.log('❌ Erreur lors de la mise à jour du template');
      }
      
      return success;
      
    } catch (error) {
      console.error('❌ Erreur lors du traitement des métadonnées:', error);
      return false;
    }
  }

  /**
   * Régénère les métadonnées pour un template existant
   */
  static async regenerateTemplateMetadata(templateId: string): Promise<boolean> {
    try {
      console.log('🔄 Régénération des métadonnées pour le template:', templateId);
      
      // Récupérer l'URL du PDF original
      const { data: template, error } = await supabase
        .from('custom_pdf_templates')
        .select('original_pdf_url')
        .eq('id', templateId)
        .single();
      
      if (error || !template?.original_pdf_url) {
        throw new Error('Template ou URL PDF non trouvé');
      }
      
      return await this.processTemplateMetadata(template.original_pdf_url, templateId);
      
    } catch (error) {
      console.error('❌ Erreur lors de la régénération:', error);
      return false;
    }
  }
}