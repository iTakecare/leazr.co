
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { uploadImage } from '@/utils/imageUtils';
import { ensureStorageBucket } from '@/services/storageService';
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
      console.log(`Tentative d'upload vers le bucket: ${bucketName}`);
      
      // S'assurer que le bucket existe et est public
      const bucketExists = await ensureStorageBucket(bucketName);
      if (!bucketExists) {
        toast.error(`Le bucket ${bucketName} n'a pas pu être créé ou accédé`);
        setIsUploading(false);
        return;
      }
      
      // Créer un nouveau File avec le bon type MIME
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      let contentType = file.type;
      
      if (!contentType.startsWith('image/')) {
        switch (fileExt) {
          case 'png': contentType = 'image/png'; break;
          case 'jpg':
          case 'jpeg': contentType = 'image/jpeg'; break;
          case 'gif': contentType = 'image/gif'; break;
          case 'webp': contentType = 'image/webp'; break;
          default: contentType = 'image/jpeg';
        }
      }
      
      // Créer un nouveau File avec le type MIME correct
      const newFile = new File([file], file.name, {
        type: contentType,
        lastModified: file.lastModified
      });
      
      // Upload l'image avec le bon type MIME
      const result = await uploadImage(newFile, bucketName, folderPath);
      
      if (result) {
        // S'assurer que l'URL n'a pas de doubles slashes
        let cleanUrl = result.replace(/\/\/([^\/])/g, '/$1');
        
        // Ajouter le paramètre de cache-busting
        cleanUrl = `${cleanUrl}?t=${Date.now()}`;
        
        console.log("Image uploadée avec succès:", cleanUrl);
        setImageUrl(cleanUrl);
        
        if (onImageUploaded) {
          onImageUploaded(cleanUrl);
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
        {imageUrl ? (
          <AvatarImage 
            src={imageUrl} 
            alt="Avatar téléchargé" 
            onError={() => console.error("Erreur de chargement de l'image:", imageUrl)} 
          />
        ) : null}
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
