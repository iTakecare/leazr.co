import { supabase } from "@/integrations/supabase/client";

export type CountryCode = 'BE' | 'FR' | 'LU';

export interface UploadStatus {
  country: CountryCode;
  uploaded: boolean;
  fileName?: string;
  uploadedAt?: string;
  size?: number;
}

export const uploadPostalCodeFile = async (
  file: File, 
  country: CountryCode
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Validate file type
    if (!file.name.endsWith('.txt')) {
      return { success: false, error: 'Le fichier doit être au format .txt' };
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      return { success: false, error: 'Le fichier est trop volumineux (max 50MB)' };
    }

    // Upload to storage bucket with standardized naming
    const fileName = `${country}.txt`;
    const { error } = await supabase.storage
      .from('postal-code-imports')
      .upload(fileName, file, {
        upsert: true, // Override existing file
        contentType: 'text/plain'
      });

    if (error) {
      console.error('Upload error:', error);
      return { success: false, error: `Erreur d'upload: ${error.message}` };
    }

    return { success: true };
  } catch (error) {
    console.error('Upload service error:', error);
    return { success: false, error: 'Erreur inattendue lors de l\'upload' };
  }
};

export const getUploadedFilesStatus = async (): Promise<UploadStatus[]> => {
  try {
    const countries: CountryCode[] = ['BE', 'FR', 'LU'];
    const statuses: UploadStatus[] = [];

    for (const country of countries) {
      try {
        const { data, error } = await supabase.storage
          .from('postal-code-imports')
          .list('', {
            search: `${country}.txt`
          });

        if (error || !data || data.length === 0) {
          statuses.push({
            country,
            uploaded: false
          });
        } else {
          const file = data[0];
          statuses.push({
            country,
            uploaded: true,
            fileName: file.name,
            uploadedAt: file.updated_at || file.created_at,
            size: file.metadata?.size
          });
        }
      } catch (error) {
        console.error(`Error checking file for ${country}:`, error);
        statuses.push({
          country,
          uploaded: false
        });
      }
    }

    return statuses;
  } catch (error) {
    console.error('Error getting upload status:', error);
    return [];
  }
};

export const deleteUploadedFile = async (country: CountryCode): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from('postal-code-imports')
      .remove([`${country}.txt`]);

    return !error;
  } catch (error) {
    console.error('Delete error:', error);
    return false;
  }
};