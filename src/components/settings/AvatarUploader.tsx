
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { uploadImage } from '@/services/fileUploadService';
import { toast } from "sonner";

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

    setIsUploading(true);
    try {
      const result = await uploadImage(file, bucketName, folderPath);
      
      if (result) {
        setImageUrl(result.url);
        if (onImageUploaded) {
          onImageUploaded(result.url);
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
