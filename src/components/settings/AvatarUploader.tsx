
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { SUPABASE_URL, SUPABASE_KEY } from '@/integrations/supabase/client';

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
      // Generate a unique filename
      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '-')}`;
      const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;
      const storageUrl = `${SUPABASE_URL}/storage/v1/object/${bucketName}/${filePath}`;
      
      console.log(`Uploading to: ${storageUrl}`);
      
      // Create FormData for the upload
      const formData = new FormData();
      formData.append('file', file);
      
      // Direct upload using fetch API
      const response = await fetch(storageUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_KEY}`
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Upload error:", errorText);
        
        // If the bucket doesn't exist, create it and retry
        if (errorText.includes("The bucket you're trying to access doesn't exist")) {
          toast.error(`Le bucket "${bucketName}" n'existe pas dans Supabase. Créez-le manuellement dans la console Supabase.`);
          return;
        }
        
        throw new Error(`Erreur lors de l'upload: ${response.status} ${response.statusText}`);
      }
      
      // Get public URL
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucketName}/${filePath}`;
      console.log(`Image uploaded successfully: ${publicUrl}`);
      
      setImageUrl(publicUrl);
      
      if (onImageUploaded) {
        onImageUploaded(publicUrl);
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
