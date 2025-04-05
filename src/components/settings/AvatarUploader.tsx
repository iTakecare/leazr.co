
import React, { useState, useEffect } from "react";
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

  useEffect(() => {
    // Update the image URL when the initialImageUrl prop changes
    setImageUrl(initialImageUrl);
  }, [initialImageUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
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
      // Generate a unique filename with timestamp and original extension
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      const fileName = `${uniqueName}.${fileExt}`;
      const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;
      
      console.log(`Uploading file: ${fileName} with content type: ${file.type}`);

      // Create FormData for proper multipart/form-data upload
      const formData = new FormData();
      formData.append('file', file);
      
      // Use supabase Storage API directly - let it handle bucket existence
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          contentType: file.type, // Set the content type explicitly
          upsert: true // Override if file exists
        });
      
      if (error) {
        console.error("Upload error:", error);
        
        // If bucket doesn't exist, try to create it and retry
        if (error.message.includes("bucket") && error.message.includes("not found")) {
          toast.error(`Le bucket ${bucketName} n'existe pas. Impossible de télécharger le fichier.`);
          return;
        }
        
        throw error;
      }
      
      // Get the public URL with cache busting parameter
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
      
      // Add cache busting parameter
      const uploadedUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      
      console.log(`Image uploaded successfully: ${uploadedUrl}`);
      setImageUrl(uploadedUrl);
      
      if (onImageUploaded) {
        onImageUploaded(uploadedUrl);
      }
      
      toast.success("Image téléchargée avec succès");
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
        <AvatarImage 
          src={imageUrl} 
          onError={(e) => {
            console.error("Error loading avatar image:", e);
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
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
