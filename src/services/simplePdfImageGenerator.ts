import { supabase } from '@/integrations/supabase/client';

/**
 * Service simplifié pour la génération d'images de prévisualisation PDF
 * Solution de fallback si le générateur complexe échoue
 */
export class SimplePdfImageGenerator {
  
  /**
   * Génère une miniature simple en utilisant une iframe cachée et html2canvas
   */
  static async generateSimplePreview(
    pdfUrl: string, 
    templateId: string
  ): Promise<string | null> {
    try {
      console.log('🎯 Génération simple d\'aperçu pour:', pdfUrl);
      
      // Vérifier l'accessibilité du PDF
      const response = await fetch(pdfUrl, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error(`PDF inaccessible: ${response.status}`);
      }
      
      // Créer une iframe cachée pour charger le PDF
      const iframe = document.createElement('iframe');
      iframe.src = pdfUrl;
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.width = '595px';
      iframe.style.height = '842px';
      iframe.style.border = 'none';
      
      document.body.appendChild(iframe);
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          document.body.removeChild(iframe);
          reject(new Error('Timeout lors du chargement du PDF'));
        }, 10000);
        
        iframe.onload = async () => {
          try {
            clearTimeout(timeout);
            
            // Attendre un peu que le PDF se charge
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Capturer le contenu avec html2canvas si disponible
            const html2canvas = await import('html2canvas').catch(() => null);
            
            if (!html2canvas) {
              // Fallback: créer une image placeholder simple
              const canvas = document.createElement('canvas');
              canvas.width = 300;
              canvas.height = 400;
              const ctx = canvas.getContext('2d');
              
              if (ctx) {
                // Dessiner un placeholder simple
                ctx.fillStyle = '#f8f9fa';
                ctx.fillRect(0, 0, 300, 400);
                ctx.fillStyle = '#6c757d';
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('PDF Template', 150, 180);
                ctx.fillText('Aperçu indisponible', 150, 200);
                
                canvas.toBlob(async (blob) => {
                  if (blob) {
                    const url = await this.uploadImageBlob(blob, templateId);
                    document.body.removeChild(iframe);
                    resolve(url);
                  } else {
                    document.body.removeChild(iframe);
                    resolve(null);
                  }
                }, 'image/png');
              } else {
                document.body.removeChild(iframe);
                resolve(null);
              }
            } else {
              // Utiliser html2canvas pour capturer l'iframe
              const canvas = await html2canvas.default(iframe, {
                width: 595,
                height: 842,
                scale: 0.5
              });
              
              canvas.toBlob(async (blob) => {
                if (blob) {
                  const url = await this.uploadImageBlob(blob, templateId);
                  document.body.removeChild(iframe);
                  resolve(url);
                } else {
                  document.body.removeChild(iframe);
                  resolve(null);
                }
              }, 'image/png');
            }
          } catch (error) {
            console.error('Erreur capture iframe:', error);
            document.body.removeChild(iframe);
            resolve(null);
          }
        };
        
        iframe.onerror = () => {
          clearTimeout(timeout);
          document.body.removeChild(iframe);
          reject(new Error('Erreur lors du chargement du PDF dans l\'iframe'));
        };
      });
      
    } catch (error) {
      console.error('Erreur génération simple:', error);
      return null;
    }
  }
  
  /**
   * Upload un blob image vers Supabase Storage
   */
  private static async uploadImageBlob(blob: Blob, templateId: string): Promise<string | null> {
    try {
      const fileName = `template-${templateId}-simple-preview.png`;
      
      const { data, error } = await supabase.storage
        .from('pdf-templates')
        .upload(`previews/${fileName}`, blob, {
          contentType: 'image/png',
          upsert: true
        });
      
      if (error) {
        console.error('Erreur upload:', error);
        return null;
      }
      
      const { data: urlData } = supabase.storage
        .from('pdf-templates')
        .getPublicUrl(`previews/${fileName}`);
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('Erreur upload blob:', error);
      return null;
    }
  }
  
  /**
   * Met à jour le template avec l'image générée
   */
  static async updateTemplateWithSimplePreview(
    templateId: string,
    imageUrl: string
  ): Promise<boolean> {
    try {
      const { data: template, error: fetchError } = await supabase
        .from('custom_pdf_templates')
        .select('template_metadata')
        .eq('id', templateId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const currentMetadata = template.template_metadata || {};
      const pagesData = currentMetadata.pages_data || [];
      
      // Mettre à jour la première page
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
      
      console.log('✅ Template mis à jour avec aperçu simple');
      return true;
      
    } catch (error) {
      console.error('Erreur mise à jour template:', error);
      return false;
    }
  }
  
  /**
   * Pipeline complet pour générer un aperçu simple
   */
  static async processSimplePreview(
    pdfUrl: string,
    templateId: string
  ): Promise<boolean> {
    try {
      console.log('🚀 Génération d\'aperçu simple pour template:', templateId);
      
      const imageUrl = await this.generateSimplePreview(pdfUrl, templateId);
      
      if (!imageUrl) {
        console.warn('⚠️ Impossible de générer l\'aperçu simple');
        return false;
      }
      
      const success = await this.updateTemplateWithSimplePreview(templateId, imageUrl);
      
      if (success) {
        console.log('✅ Aperçu simple généré et sauvegardé');
      }
      
      return success;
      
    } catch (error) {
      console.error('❌ Erreur pipeline aperçu simple:', error);
      return false;
    }
  }
}