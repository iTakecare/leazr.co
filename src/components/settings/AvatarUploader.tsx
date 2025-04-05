
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';

interface AvatarUploaderProps {
  initialImageUrl?: string;
  onImageUploaded?: (url: string) => void;
  bucketName?: string;
  folderPath?: string;
}

const AvatarUploader: React.FC<AvatarUploaderProps> = ({
  initialImageUrl,
  onImageUploaded,
  bucketName = "avatars",
  folderPath = ""
}) => {
  const [imageUrl, setImageUrl] = useState<string | undefined>(initialImageUrl);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Veuillez sélectionner un fichier image");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image est trop volumineuse (max 5MB)");
      return;
    }

    setIsUploading(true);
    try {
      // Extract file extension and generate a unique filename
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;
      
      // Determine the correct MIME type based on extension
      let contentType = file.type;
      if (!contentType || contentType === 'application/octet-stream') {
        // Fallback to extension-based detection
        if (fileExt === 'png') contentType = 'image/png';
        else if (fileExt === 'jpg' || fileExt === 'jpeg') contentType = 'image/jpeg';
        else if (fileExt === 'gif') contentType = 'image/gif';
        else if (fileExt === 'webp') contentType = 'image/webp';
        else if (fileExt === 'svg') contentType = 'image/svg+xml';
      }
      
      console.log(`Uploading file: ${fileName} with content type: ${contentType}`);
      
      // Convert file to arrayBuffer and create a new Blob with explicit content type
      const arrayBuffer = await file.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: contentType });
      
      // Using the FormData API for direct upload to ensure content-type is preserved
      const formData = new FormData();
      const fileWithCorrectType = new File([blob], fileName, { type: contentType });
      formData.append('file', fileWithCorrectType);
      
      // Upload using fetch API to better control the content-type
      const response = await fetch(
        `${supabase.supabaseUrl}/storage/v1/object/${bucketName}/${filePath}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabase.supabaseKey}`
          },
          body: formData
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Upload failed:", errorText);
        throw new Error("Upload failed");
      }
      
      // Generate and use the public URL
      const { data } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
      
      const uploadedUrl = data.publicUrl;
      
      if (uploadedUrl) {
        console.log(`Image uploaded successfully: ${uploadedUrl}`);
        setImageUrl(uploadedUrl);
        
        if (onImageUploaded) {
          onImageUploaded(uploadedUrl);
        }
        toast.success("Image téléchargée avec succès");
      } else {
        console.error("Failed to get public URL");
        toast.error("Échec du téléchargement de l'image");
      }
    } catch (error) {
      console.error("Erreur de téléchargement:", error);
      toast.error("Erreur de téléchargement de l'image");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <Avatar className="w-24 h-24">
        <AvatarImage src={imageUrl} />
        <AvatarFallback className="bg-muted text-xl">?</AvatarFallback>
      </Avatar>
      
      <div className="flex flex-col items-center">
        <Label 
          htmlFor="avatar-upload" 
          className="cursor-pointer px-4 py-2 text-sm font-medium text-center bg-primary text-primary-foreground hover:bg-primary/90 rounded-md"
        >
          {isUploading ? "Téléchargement..." : "Changer l'image"}
        </Label>
        <input
          id="avatar-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading}
        />
        {imageUrl && (
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => {
              setImageUrl(undefined);
              if (onImageUploaded) {
                onImageUploaded("");
              }
            }}
          >
            Supprimer l'image
          </Button>
        )}
      </div>
    </div>
  );
};

export default AvatarUploader;
