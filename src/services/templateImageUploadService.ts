import { getFileUploadClient } from '@/integrations/supabase/client';

export async function uploadTemplateImage(file: File, bucketName: string): Promise<string> {
  if (!file) {
    throw new Error('No file provided');
  }

  // Basic validation
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  const fileExtension = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
  const filePath = `${fileName}`;

  const supabase = getFileUploadClient();

  // IMPORTANT : sans `contentType` explicite, Supabase Storage renvoie
  // "Invalid Content-Type header" (le SDK sérialise mal le MIME du File).
  // On passe file.type avec un fallback "application/octet-stream" si absent.
  const contentType = file.type || 'application/octet-stream';

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType,
    });

  if (error) {
    console.error('Upload error:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

export async function uploadMultipleTemplateImages(
  files: File[],
  bucketName: string
): Promise<string[]> {
  if (!files || files.length === 0) {
    throw new Error('No files provided');
  }

  // Upload all files in parallel
  const uploadPromises = files.map(file => uploadTemplateImage(file, bucketName));
  
  try {
    const urls = await Promise.all(uploadPromises);
    return urls;
  } catch (error) {
    console.error('Error uploading multiple files:', error);
    throw error;
  }
}