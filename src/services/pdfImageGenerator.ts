import { PDFDocument } from 'pdf-lib';
import { supabase } from '@/integrations/supabase/client';

/**
 * Service pour générer des images de prévisualisation des pages PDF
 */
export class PdfImageGenerator {
  /**
   * Génère une image de prévisualisation pour la première page d'un PDF
   */
  static async generatePagePreview(
    pdfUrl: string, 
    templateId: string,
    pageNumber: number = 1
  ): Promise<string | null> {
    try {
      console.log('🖼️ Génération d\'aperçu pour:', pdfUrl);
      
      // Charger le PDF
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error(`Impossible de charger le PDF: ${response.statusText}`);
      }
      
      const pdfBytes = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      // Vérifier que la page existe
      if (pageNumber > pdfDoc.getPageCount()) {
        console.warn(`Page ${pageNumber} n'existe pas dans le PDF`);
        return null;
      }
      
      // Utiliser l'API de conversion PDF vers image
      const imageUrl = await this.convertPdfPageToImage(pdfBytes, pageNumber, templateId);
      
      return imageUrl;
      
    } catch (error) {
      console.error('Erreur lors de la génération d\'aperçu:', error);
      return null;
    }
  }

  /**
   * Convertit une page PDF en image et l'upload sur Supabase Storage
   */
  private static async convertPdfPageToImage(
    pdfBytes: ArrayBuffer,
    pageNumber: number,
    templateId: string
  ): Promise<string | null> {
    try {
      console.log(`🎨 Début conversion page ${pageNumber} pour template ${templateId}`);
      
      // Créer un canvas pour dessiner la page PDF
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Impossible de créer le contexte canvas');
      }

      // Utiliser PDF.js pour le rendu - configuration améliorée
      const pdfjsLib = await import('pdfjs-dist');
      
      // Configurer le worker avec URL simplifiée
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js';
      
      console.log('📚 PDF.js configuré, worker:', pdfjsLib.GlobalWorkerOptions.workerSrc);
      
      // Charger le document PDF
      const loadingTask = pdfjsLib.getDocument({ 
        data: pdfBytes,
        verbosity: 0 // Réduire les logs PDF.js
      });
      
      const pdf = await loadingTask.promise;
      console.log(`📄 PDF chargé, ${pdf.numPages} pages`);
      
      if (pageNumber > pdf.numPages) {
        throw new Error(`Page ${pageNumber} n'existe pas (max: ${pdf.numPages})`);
      }
      
      const page = await pdf.getPage(pageNumber);
      console.log(`📖 Page ${pageNumber} récupérée`);
      
      // Configurer le viewport avec une échelle appropriée
      const viewport = page.getViewport({ scale: 1.5 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      console.log(`🖼️ Canvas configuré: ${canvas.width}x${canvas.height}`);
      
      // Rendre la page
      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
        canvas: canvas
      };
      
      await page.render(renderContext).promise;
      console.log('✅ Page rendue sur canvas');
      
      // Convertir en blob et uploader
      return new Promise((resolve, reject) => {
        canvas.toBlob(async (blob) => {
          if (!blob) {
            console.error('❌ Impossible de créer le blob depuis le canvas');
            reject(new Error('Impossible de créer le blob'));
            return;
          }
          
          console.log(`💾 Blob créé: ${blob.size} bytes`);
          
          try {
            // Upload vers Supabase Storage
            const fileName = `template-${templateId}-page-${pageNumber}.png`;
            console.log(`⬆️ Upload vers: previews/${fileName}`);
            
            const { data, error } = await supabase.storage
              .from('pdf-templates')
              .upload(`previews/${fileName}`, blob, {
                contentType: 'image/png',
                upsert: true
              });
            
            if (error) {
              console.error('❌ Erreur upload Supabase:', error);
              throw error;
            }
            
            console.log('✅ Upload réussi:', data);
            
            // Obtenir l'URL publique
            const { data: urlData } = supabase.storage
              .from('pdf-templates')
              .getPublicUrl(`previews/${fileName}`);
            
            console.log('🔗 URL publique générée:', urlData.publicUrl);
            resolve(urlData.publicUrl);
            
          } catch (error) {
            console.error('❌ Erreur lors de l\'upload:', error);
            reject(error);
          }
        }, 'image/png', 0.9);
      });
      
    } catch (error) {
      console.error('❌ Erreur lors de la conversion PDF vers image:', error);
      console.error('Détails de l\'erreur:', {
        message: error.message,
        stack: error.stack,
        pageNumber,
        templateId
      });
      return null;
    }
  }

  /**
   * Génère des aperçus pour toutes les pages d'un template
   */
  static async generateAllPagePreviews(
    pdfUrl: string,
    templateId: string
  ): Promise<Array<{ pageNumber: number; imageUrl: string | null }>> {
    try {
      // Charger le PDF pour obtenir le nombre de pages
      const response = await fetch(pdfUrl);
      const pdfBytes = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pageCount = pdfDoc.getPageCount();
      
      console.log(`📄 Génération d'aperçus pour ${pageCount} pages`);
      
      const results = [];
      
      // Générer les aperçus page par page (limité aux 5 premières pour les performances)
      const maxPages = Math.min(pageCount, 5);
      for (let i = 1; i <= maxPages; i++) {
        const imageUrl = await this.generatePagePreview(pdfUrl, templateId, i);
        results.push({
          pageNumber: i,
          imageUrl
        });
        
        // Petite pause pour éviter de surcharger le navigateur
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return results;
      
    } catch (error) {
      console.error('Erreur lors de la génération de tous les aperçus:', error);
      return [];
    }
  }

  /**
   * Met à jour les métadonnées du template avec les URLs des images
   */
  static async updateTemplateWithPreviews(
    templateId: string,
    previews: Array<{ pageNumber: number; imageUrl: string | null }>
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
      
      // Mettre à jour les pages avec les nouvelles images
      previews.forEach(preview => {
        const pageIndex = preview.pageNumber - 1;
        if (pagesData[pageIndex]) {
          pagesData[pageIndex].image_url = preview.imageUrl;
        } else {
          // Créer une nouvelle entrée de page
          pagesData[pageIndex] = {
            page_number: preview.pageNumber,
            image_url: preview.imageUrl,
            width: 595, // Valeur par défaut A4
            height: 842, // Valeur par défaut A4
            dimensions: { width: 595, height: 842 }
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
      
      console.log('✅ Métadonnées du template mises à jour avec les aperçus');
      return true;
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour des métadonnées:', error);
      return false;
    }
  }

  /**
   * Pipeline complet: génère les aperçus et met à jour le template
   */
  static async processTemplateImages(
    pdfUrl: string,
    templateId: string
  ): Promise<boolean> {
    try {
      console.log('🚀 Démarrage du traitement des images pour le template:', templateId);
      console.log('📍 PDF URL:', pdfUrl);
      
      // Vérifier l'accès au PDF
      const testResponse = await fetch(pdfUrl);
      if (!testResponse.ok) {
        throw new Error(`PDF inaccessible: ${testResponse.status} ${testResponse.statusText}`);
      }
      console.log('✅ PDF accessible');
      
      // Générer les aperçus
      const previews = await this.generateAllPagePreviews(pdfUrl, templateId);
      console.log('📊 Aperçus générés:', previews);
      
      if (previews.length === 0) {
        console.warn('⚠️ Aucun aperçu généré');
        return false;
      }
      
      // Vérifier si au moins un aperçu a été généré avec succès
      const successfulPreviews = previews.filter(p => p.imageUrl !== null);
      if (successfulPreviews.length === 0) {
        console.error('❌ Aucun aperçu généré avec succès');
        return false;
      }
      
      console.log(`✅ ${successfulPreviews.length}/${previews.length} aperçus générés avec succès`);
      
      // Mettre à jour le template
      const success = await this.updateTemplateWithPreviews(templateId, previews);
      
      if (success) {
        console.log('✅ Traitement des images terminé avec succès');
      } else {
        console.log('❌ Erreur lors de la mise à jour du template');
      }
      
      return success;
      
    } catch (error) {
      console.error('❌ Erreur lors du traitement complet des images:', error);
      console.error('Détails:', {
        message: error.message,
        stack: error.stack,
        pdfUrl,
        templateId
      });
      return false;
    }
  }

  /**
   * Régénère les aperçus pour un template existant
   */
  static async regenerateTemplateImages(templateId: string): Promise<boolean> {
    try {
      console.log('🔄 Régénération des aperçus pour le template:', templateId);
      
      // Récupérer l'URL du PDF original
      const { data: template, error } = await supabase
        .from('custom_pdf_templates')
        .select('original_pdf_url')
        .eq('id', templateId)
        .single();
      
      if (error || !template?.original_pdf_url) {
        throw new Error('Template ou URL PDF non trouvé');
      }
      
      return await this.processTemplateImages(template.original_pdf_url, templateId);
      
    } catch (error) {
      console.error('❌ Erreur lors de la régénération:', error);
      return false;
    }
  }
}