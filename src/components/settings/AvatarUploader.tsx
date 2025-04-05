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
      // Normalize filename to prevent extension confusion
      const timestamp = Date.now();
      const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-');
      
      // Extract proper extension - only keep the last extension if multiple exist
      let fileName = originalName;
      const extensionMatch = originalName.match(/\.([^.]+)$/);
      const extension = extensionMatch ? extensionMatch[1].toLowerCase() : '';
      
      // Ensure we have a timestamp prefix for uniqueness
      fileName = `${timestamp}-${fileName}`;
      const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;
      
      // Determine proper MIME type using the proper extension
      let contentType = 'application/octet-stream'; // default fallback
      
      if (extension === 'png') contentType = 'image/png';
      else if (extension === 'jpg' || extension === 'jpeg') contentType = 'image/jpeg';
      else if (extension === 'gif') contentType = 'image/gif';
      else if (extension === 'webp') contentType = 'image/webp';
      else if (extension === 'svg') contentType = 'image/svg+xml';
      else if (file.type.startsWith('image/')) contentType = file.type;
      
      console.log(`Uploading image with content type: ${contentType}`);
      
      // Create a blob with the correct MIME type
      const fileBlob = new Blob([await file.arrayBuffer()], { type: contentType });
      
      // Upload the file using explicit content type
      const { error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, fileBlob, {
          contentType: contentType,
          upsert: true
        });
      
      if (error) {
        console.error("Erreur de téléchargement:", error);
        toast.error("Échec du téléchargement de l'image");
        return;
      }
      
      // Get the public URL
      const { data } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
      
      const publicUrl = data.publicUrl;
      console.log("Image uploaded successfully:", publicUrl);
      
      if (publicUrl) {
        setImageUrl(publicUrl);
        
        if (onImageUploaded) {
          onImageUploaded(publicUrl);
        }
        toast.success("Image téléchargée avec succès");
      } else {
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
