
import { supabase } from '@/integrations/supabase/client';

export interface SearchImageResult {
  url: string;
  title: string;
  snippet: string;
  thumbnail: string;
  width: number;
  height: number;
  source: string;
}

export interface ProcessedImage {
  originalUrl: string;
  processedBlob: Blob;
  filename: string;
}

/**
 * Service de recherche d'images de produits en ligne
 */
export class ImageSearchService {
  
  async searchProductImages(productName: string, brand?: string, category?: string): Promise<SearchImageResult[]> {
    try {
      console.log(`🔍 Recherche d'images pour: ${productName} ${brand || ''}`);
      
      // Construire la requête de recherche
      const searchQuery = this.buildSearchQuery(productName, brand, category);
      
      // Appeler l'Edge Function pour la recherche
      const { data, error } = await supabase.functions.invoke('search-product-images', {
        body: { 
          query: searchQuery,
          maxResults: 20 // Chercher plus d'images pour avoir plus de choix
        }
      });

      if (error) {
        console.error('Erreur lors de la recherche d\'images:', error);
        throw new Error(`Erreur de recherche: ${error.message}`);
      }

      return data.images || [];
    } catch (error) {
      console.error('Exception lors de la recherche d\'images:', error);
      throw error;
    }
  }

  private buildSearchQuery(productName: string, brand?: string, category?: string): string {
    let query = productName;
    
    if (brand) {
      query += ` ${brand}`;
    }
    
    if (category) {
      query += ` ${category}`;
    }
    
    // Ajouter des mots-clés pour obtenir des images de face et de produit
    query += ' product front view white background';
    
    return query;
  }

  async processAndStandardizeImages(
    imageUrls: string[], 
    productName: string
  ): Promise<ProcessedImage[]> {
    try {
      console.log(`🎨 Traitement de ${imageUrls.length} images pour ${productName}`);
      
      const { data, error } = await supabase.functions.invoke('process-product-images', {
        body: { 
          imageUrls,
          productName,
          targetSize: { width: 600, height: 600 },
          backgroundColor: 'white'
        }
      });

      if (error) {
        console.error('Erreur lors du traitement des images:', error);
        throw new Error(`Erreur de traitement: ${error.message}`);
      }

      return data.processedImages || [];
    } catch (error) {
      console.error('Exception lors du traitement des images:', error);
      throw error;
    }
  }

  async uploadProcessedImages(
    processedImages: ProcessedImage[],
    productId: string
  ): Promise<string[]> {
    try {
      console.log(`📤 Upload de ${processedImages.length} images pour le produit ${productId}`);
      
      const uploadPromises = processedImages.map(async (processedImage, index) => {
        const fileName = `${productId}-${Date.now()}-${index}.webp`;
        const filePath = `products/${productId}/${fileName}`;
        
        const { error } = await supabase.storage
          .from('product-images')
          .upload(filePath, processedImage.processedBlob, {
            contentType: 'image/webp',
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.error(`Erreur upload image ${index}:`, error);
          throw error;
        }

        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        return urlData.publicUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      console.log(`✅ ${uploadedUrls.length} images uploadées avec succès`);
      
      return uploadedUrls;
    } catch (error) {
      console.error('Exception lors de l\'upload des images:', error);
      throw error;
    }
  }
}

export const imageSearchService = new ImageSearchService();
