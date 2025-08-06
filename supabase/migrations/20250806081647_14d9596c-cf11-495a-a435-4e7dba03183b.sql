-- Create RLS policies for client-logos bucket

-- Policy to allow authenticated users to view/select files from their company folder
CREATE POLICY "Users can view their company logos" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'client-logos' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (
    SELECT company_id::text 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Policy to allow authenticated users to upload files to their company folder
CREATE POLICY "Users can upload their company logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'client-logos' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (
    SELECT company_id::text 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Policy to allow authenticated users to update files in their company folder
CREATE POLICY "Users can update their company logos" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'client-logos' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (
    SELECT company_id::text 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Policy to allow authenticated users to delete files from their company folder
CREATE POLICY "Users can delete their company logos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'client-logos' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (
    SELECT company_id::text 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);