import { supabase } from '@/integrations/supabase/client';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// Set worker path
GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js';

export class SimplePdfImageGenerator {
  static async generateImageFromPdf(pdfUrl: string, templateId: string, pageNumber: number = 1): Promise<string | null> {
    try {
      console.log(`Generating image for template ${templateId}, page ${pageNumber}`);
      
      // Load PDF with PDF.js
      const loadingTask = getDocument(pdfUrl);
      const pdf = await loadingTask.promise;
      
      if (pageNumber > pdf.numPages) {
        console.error(`Page ${pageNumber} does not exist. PDF has ${pdf.numPages} pages`);
        return null;
      }

      // Get the page
      const page = await pdf.getPage(pageNumber);
      
      // Create canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('Could not get canvas context');
      }

      // Set scale for good quality
      const scale = 2.0;
      const viewport = page.getViewport({ scale });
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Render page to canvas
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      };

      await page.render(renderContext).promise;
      
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/jpeg', 0.85);
      });

      if (!blob) {
        throw new Error('Failed to create image blob');
      }

      // Upload to Supabase Storage
      const fileName = `template-${templateId}-page-${pageNumber}-${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from('pdf-templates')
        .upload(`previews/${fileName}`, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) {
        console.error('Error uploading image:', error);
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('pdf-templates')
        .getPublicUrl(`previews/${fileName}`);

      console.log(`Successfully generated image: ${urlData.publicUrl}`);
      return urlData.publicUrl;

    } catch (error) {
      console.error('Error generating PDF image:', error);
      return null;
    }
  }

  static async generateAllPagesImages(pdfUrl: string, templateId: string): Promise<Array<{ pageNumber: number; imageUrl: string | null }>> {
    try {
      console.log(`Generating images for all pages of template ${templateId}`);
      
      const loadingTask = getDocument(pdfUrl);
      const pdf = await loadingTask.promise;
      const numPages = Math.min(pdf.numPages, 10); // Limit to first 10 pages
      
      const results: Array<{ pageNumber: number; imageUrl: string | null }> = [];
      
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const imageUrl = await this.generateImageFromPdf(pdfUrl, templateId, pageNum);
        results.push({ pageNumber: pageNum, imageUrl });
      }
      
      return results;
    } catch (error) {
      console.error('Error generating all pages images:', error);
      return [];
    }
  }

  static async updateTemplateWithImages(templateId: string, images: Array<{ pageNumber: number; imageUrl: string | null }>): Promise<boolean> {
    try {
      // Get current template
      const { data: template, error: fetchError } = await supabase
        .from('custom_pdf_templates')
        .select('template_metadata')
        .eq('id', templateId)
        .single();

      if (fetchError || !template) {
        console.error('Error fetching template:', fetchError);
        return false;
      }

      // Update pages_data with image URLs
      const updatedMetadata = { ...template.template_metadata };
      if (updatedMetadata.pages_data) {
        updatedMetadata.pages_data = updatedMetadata.pages_data.map((pageData: any) => {
          const imageInfo = images.find(img => img.pageNumber === pageData.page_number);
          return {
            ...pageData,
            image_url: imageInfo?.imageUrl || pageData.image_url
          };
        });
      }

      // Update in database
      const { error: updateError } = await supabase
        .from('custom_pdf_templates')
        .update({ template_metadata: updatedMetadata })
        .eq('id', templateId);

      if (updateError) {
        console.error('Error updating template metadata:', updateError);
        return false;
      }

      console.log(`Successfully updated template ${templateId} with ${images.length} images`);
      return true;
    } catch (error) {
      console.error('Error updating template with images:', error);
      return false;
    }
  }

  static async processTemplate(pdfUrl: string, templateId: string): Promise<boolean> {
    try {
      console.log(`Processing template ${templateId} for image generation`);
      
      const images = await this.generateAllPagesImages(pdfUrl, templateId);
      const success = await this.updateTemplateWithImages(templateId, images);
      
      if (success) {
        console.log(`Template ${templateId} processed successfully`);
      }
      
      return success;
    } catch (error) {
      console.error('Error processing template:', error);
      return false;
    }
  }
}