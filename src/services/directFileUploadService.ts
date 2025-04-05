
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Upload a file using the FileReader API combined with direct Supabase storage
 */
export async function uploadFileDirectly(
  file: File,
  bucketName: string,
  folderPath: string = ""
): Promise<{ url: string; fileName: string } | null> {
  try {
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Le fichier est trop volumineux (max 5MB)");
      return null;
    }
    
    // Generate a unique file name with timestamp to prevent conflicts
    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-');
    const uniqueFileName = `${timestamp}-${safeFileName}`;
    const fullPath = folderPath ? `${folderPath}/${uniqueFileName}` : uniqueFileName;
    
    // Determine content type based on file extension
    const fileExt = safeFileName.split('.').pop()?.toLowerCase() || '';
    const contentType = getContentTypeByExtension(fileExt);
    
    console.log(`Uploading file ${uniqueFileName} with content type ${contentType}`);
    
    // Use FileReader to get the file data as ArrayBuffer
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        if (!event.target?.result) {
          reject(new Error("Failed to read file"));
          return;
        }
        
        try {
          // Convert ArrayBuffer to Blob with explicit type
          const arrayBuffer = event.target.result as ArrayBuffer;
          const blob = new Blob([arrayBuffer], { type: contentType });
          
          // Upload the blob to Supabase Storage
          const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(fullPath, blob, {
              contentType,
              upsert: true,
              cacheControl: "0"
            });
          
          if (error) {
            console.error("Storage upload error:", error);
            reject(error);
            return;
          }
          
          // Get the public URL
          const { data: publicUrlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fullPath);
          
          console.log("File uploaded successfully:", publicUrlData.publicUrl);
          resolve({ 
            url: publicUrlData.publicUrl,
            fileName: uniqueFileName 
          });
        } catch (err) {
          console.error("Error during upload:", err);
          reject(err);
        }
      };
      
      reader.onerror = (error) => {
        console.error("FileReader error:", error);
        reject(error);
      };
      
      // Read file as ArrayBuffer
      reader.readAsArrayBuffer(file);
    });
  } catch (error) {
    console.error("Upload error:", error);
    toast.error("Erreur lors du téléchargement du fichier");
    return null;
  }
}

/**
 * Get content type based on file extension
 */
function getContentTypeByExtension(extension: string): string {
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
}

/**
 * Ensure bucket exists and is properly configured
 */
export async function ensureBucketExists(bucketName: string): Promise<boolean> {
  try {
    // Check if bucket exists
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error("Error listing buckets:", error);
      return false;
    }
    
    if (buckets.some(bucket => bucket.name === bucketName)) {
      console.log(`Bucket ${bucketName} already exists`);
      return true;
    }
    
    // Create bucket if it doesn't exist
    console.log(`Creating bucket ${bucketName}`);
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true
    });
    
    if (createError) {
      if (createError.message.includes('already exists')) {
        console.log(`Bucket ${bucketName} already exists (from error)`);
        return true;
      }
      console.error(`Error creating bucket ${bucketName}:`, createError);
      return false;
    }
    
    console.log(`Bucket ${bucketName} created successfully`);
    return true;
  } catch (error) {
    console.error(`Error in ensureBucketExists for ${bucketName}:`, error);
    return false;
  }
}

/**
 * Gets a URL with cache-busting parameter
 */
export function getCacheBustedUrl(url: string | null): string {
  if (!url) return '';
  
  // If it's a data URL, return as is
  if (url.startsWith('data:')) {
    return url;
  }
  
  // Add cache-busting parameter
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${Date.now()}`;
}
