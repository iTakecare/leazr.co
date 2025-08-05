import html2canvas from 'html2canvas';
import { supabase } from '@/integrations/supabase/client';

/**
 * Générateur de miniatures de fallback utilisant html2canvas
 */
export class FallbackImageGenerator {
  
  /**
   * Génère une miniature en capturant un iframe PDF
   */
  static async generateThumbnailFromPdf(
    pdfUrl: string,
    templateId: string
  ): Promise<string | null> {
    try {
      console.log('📸 Génération de miniature par capture d\'iframe pour:', pdfUrl);
      
      // Créer un conteneur invisible
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '-9999px';
      container.style.left = '-9999px';
      container.style.width = '595px';
      container.style.height = '842px';
      container.style.backgroundColor = 'white';
      document.body.appendChild(container);
      
      // Créer l'iframe
      const iframe = document.createElement('iframe');
      iframe.src = `${pdfUrl}#page=1&view=FitH`;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      container.appendChild(iframe);
      
      // Attendre le chargement
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout lors du chargement du PDF'));
        }, 10000);
        
        iframe.onload = () => {
          clearTimeout(timeout);
          // Attendre un peu plus pour que le PDF s'affiche
          setTimeout(resolve, 2000);
        };
        
        iframe.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Erreur lors du chargement du PDF'));
        };
      });
      
      // Capturer avec html2canvas
      const canvas = await html2canvas(container, {
        width: 595,
        height: 842,
        scale: 0.5, // Réduire la résolution pour la performance
        useCORS: true,
        allowTaint: true,
        backgroundColor: 'white'
      });
      
      // Nettoyer le DOM
      document.body.removeChild(container);
      
      // Convertir en blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Impossible de créer le blob'));
          }
        }, 'image/png', 0.8);
      });
      
      // Upload vers Supabase
      const fileName = `fallback-${templateId}-thumb.png`;
      const { data, error } = await supabase.storage
        .from('pdf-templates')
        .upload(`previews/${fileName}`, blob, {
          contentType: 'image/png',
          upsert: true
        });
      
      if (error) {
        throw error;
      }
      
      // Obtenir l'URL publique
      const { data: urlData } = supabase.storage
        .from('pdf-templates')
        .getPublicUrl(`previews/${fileName}`);
      
      console.log('✅ Miniature de fallback générée:', urlData.publicUrl);
      return urlData.publicUrl;
      
    } catch (error) {
      console.error('❌ Erreur lors de la génération de miniature de fallback:', error);
      return null;
    }
  }
  
  /**
   * Met à jour le template avec la miniature de fallback
   */
  static async updateTemplateWithFallbackThumbnail(
    templateId: string,
    imageUrl: string
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
      
      // Mettre à jour la première page avec la miniature
      if (pagesData[0]) {
        pagesData[0].image_url = imageUrl;
      } else {
        pagesData[0] = {
          page_number: 1,
          image_url: imageUrl,
          width: 595,
          height: 842,
          dimensions: { width: 595, height: 842 }
        };
      }
      
      // Sauvegarder
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
      
      console.log('✅ Template mis à jour avec miniature de fallback');
      return true;
      
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour avec miniature de fallback:', error);
      return false;
    }
  }
  
  /**
   * Pipeline complet pour générer et sauvegarder une miniature de fallback
   */
  static async processFallbackThumbnail(
    pdfUrl: string,
    templateId: string
  ): Promise<boolean> {
    try {
      console.log('🚀 Génération de miniature de fallback pour template:', templateId);
      
      const imageUrl = await this.generateThumbnailFromPdf(pdfUrl, templateId);
      
      if (!imageUrl) {
        console.error('❌ Impossible de générer la miniature de fallback');
        return false;
      }
      
      const success = await this.updateTemplateWithFallbackThumbnail(templateId, imageUrl);
      
      if (success) {
        console.log('✅ Miniature de fallback traitée avec succès');
      }
      
      return success;
      
    } catch (error) {
      console.error('❌ Erreur lors du traitement de la miniature de fallback:', error);
      return false;
    }
  }
}