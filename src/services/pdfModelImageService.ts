import { getSupabaseClient } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

export interface PDFModelImage {
  id: string;
  image_id: string;
  name: string;
  data: string;
  page: number;
}

/**
 * Service pour gérer les images des modèles PDF de manière optimisée
 */
export class PDFModelImageService {
  private supabase = getSupabaseClient();

  /**
   * Charge toutes les images d'un modèle PDF
   */
  async loadImages(modelId: string): Promise<PDFModelImage[]> {
    try {
      const { data, error } = await this.supabase
        .from('pdf_model_images')
        .select('*')
        .eq('model_id', modelId)
        .order('page', { ascending: true });

      if (error) {
        console.error("Erreur lors du chargement des images:", error);
        throw new Error(`Erreur lors du chargement des images: ${error.message}`);
      }

      return data || [];
    } catch (error: any) {
      console.error("Exception lors du chargement des images:", error);
      throw error;
    }
  }

  /**
   * Sauvegarde les images d'un modèle PDF (par petits chunks pour éviter les timeouts)
   */
  async saveImages(modelId: string, images: PDFModelImage[]): Promise<void> {
    try {
      // D'abord, supprimer toutes les images existantes du modèle
      await this.clearImages(modelId);

      // Ensuite, sauvegarder les nouvelles images par chunks
      const chunkSize = 5; // Traiter 5 images à la fois pour éviter les timeouts
      
      for (let i = 0; i < images.length; i += chunkSize) {
        const chunk = images.slice(i, i + chunkSize);
        
        const imagesToInsert = chunk.map(image => ({
          model_id: modelId,
          image_id: image.id,
          name: image.name,
          data: image.data,
          page: image.page
        }));

        const { error } = await this.supabase
          .from('pdf_model_images')
          .insert(imagesToInsert);

        if (error) {
          console.error(`Erreur lors de la sauvegarde du chunk ${i}-${i + chunkSize}:`, error);
          throw new Error(`Erreur lors de la sauvegarde des images: ${error.message}`);
        }

        // Petit délai entre les chunks pour éviter la surcharge
        if (i + chunkSize < images.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`${images.length} images sauvegardées avec succès pour le modèle ${modelId}`);
    } catch (error: any) {
      console.error("Exception lors de la sauvegarde des images:", error);
      throw error;
    }
  }

  /**
   * Supprime toutes les images d'un modèle PDF
   */
  async clearImages(modelId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('pdf_model_images')
        .delete()
        .eq('model_id', modelId);

      if (error) {
        console.error("Erreur lors de la suppression des images:", error);
        throw new Error(`Erreur lors de la suppression des images: ${error.message}`);
      }
    } catch (error: any) {
      console.error("Exception lors de la suppression des images:", error);
      throw error;
    }
  }

  /**
   * Ajoute une nouvelle image à un modèle PDF
   */
  async addImage(modelId: string, image: Omit<PDFModelImage, 'id'>): Promise<PDFModelImage> {
    try {
      const newImage = {
        model_id: modelId,
        image_id: uuidv4(),
        name: image.name,
        data: image.data,
        page: image.page
      };

      const { data, error } = await this.supabase
        .from('pdf_model_images')
        .insert(newImage)
        .select()
        .single();

      if (error) {
        console.error("Erreur lors de l'ajout de l'image:", error);
        throw new Error(`Erreur lors de l'ajout de l'image: ${error.message}`);
      }

      return {
        id: data.image_id,
        image_id: data.image_id,
        name: data.name,
        data: data.data,
        page: data.page
      };
    } catch (error: any) {
      console.error("Exception lors de l'ajout de l'image:", error);
      throw error;
    }
  }

  /**
   * Supprime une image spécifique d'un modèle PDF
   */
  async deleteImage(modelId: string, imageId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('pdf_model_images')
        .delete()
        .eq('model_id', modelId)
        .eq('image_id', imageId);

      if (error) {
        console.error("Erreur lors de la suppression de l'image:", error);
        throw new Error(`Erreur lors de la suppression de l'image: ${error.message}`);
      }
    } catch (error: any) {
      console.error("Exception lors de la suppression de l'image:", error);
      throw error;
    }
  }
}

// Instance singleton du service
export const pdfModelImageService = new PDFModelImageService();