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

  // Simple direct upload without any complex processing
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
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