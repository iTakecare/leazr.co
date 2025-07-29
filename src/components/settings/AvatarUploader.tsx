
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ensureBucket, uploadImage, getCacheBustedUrl } from "@/services/fileUploadService";

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
  const [error, setError] = useState<string | null>(null);

  // Debug logs
  console.log("🔍 AvatarUploader - Render state:", {
    imageUrl,
    isUploading,
    error,
    bucketName,
    folderPath,
    initialImageUrl
  });

  useEffect(() => {
    // Update the image URL when the initialImageUrl prop changes
    if (initialImageUrl) {
      // Vérifier si l'URL est un objet JSON (cas d'erreur)
      if (typeof initialImageUrl === 'string' && 
          (initialImageUrl.startsWith('{') || initialImageUrl.startsWith('['))) {
        console.error("Initial image URL is JSON, not displaying:", initialImageUrl);
        setImageUrl(undefined);
      } else {
        setImageUrl(initialImageUrl);
      }
    } else {
      setImageUrl(undefined);
    }
  }, [initialImageUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset previous errors
    setError(null);

    // Validate file type and size
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!validImageTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      setError("Veuillez sélectionner un fichier image (JPG, PNG, GIF ou WebP)");
      toast.error("Veuillez sélectionner un fichier image (JPG, PNG, GIF ou WebP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("L'image est trop volumineuse (max 5MB)");
      toast.error("L'image est trop volumineuse (max 5MB)");
      return;
    }

    setIsUploading(true);
    
    try {
      // Ensure bucket exists
      await ensureBucket(bucketName);
      
      // Use our direct upload method
      const url = await uploadImage(file, bucketName, folderPath);
      
      if (url) {
        console.log(`Image uploaded successfully: ${url}`);
        
        // Verify the URL isn't JSON
        if (url.startsWith('{') || url.startsWith('[')) {
          throw new Error("L'URL retournée est un JSON, pas une URL d'image valide");
        }
        
        setImageUrl(url);
        
        if (onImageUploaded) {
          onImageUploaded(url);
        }
        
        toast.success("Image téléchargée avec succès");
      } else {
        throw new Error("Erreur lors du téléchargement de l'image");
      }
    } catch (error) {
      console.error("Erreur de téléchargement:", error);
      setError("Erreur lors du téléchargement de l'image");
      toast.error("Erreur lors du téléchargement de l'image");
    } finally {
      setIsUploading(false);
    }
  };

  // Use cache busting for the avatar image
  const displayImageUrl = imageUrl ? getCacheBustedUrl(imageUrl) : '';

  return (
    <div className="flex flex-col items-center space-y-4">
      <Avatar className="w-24 h-24">
        <AvatarImage 
          src={displayImageUrl} 
          onError={(e) => {
            console.error("Error loading avatar image:", e);
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <AvatarFallback className="bg-muted text-xl">?</AvatarFallback>
      </Avatar>
      
      {error && (
        <p className="text-destructive text-sm">{error}</p>
      )}
      
      <div className="flex flex-col items-center space-y-2">
        {/* Simplified button approach - direct Button instead of Label */}
        <Button
          onClick={() => document.getElementById('avatar-upload')?.click()}
          disabled={isUploading}
          className="w-full"
        >
          {isUploading ? "Téléchargement..." : "📷 Changer l'image"}
        </Button>
        
        <input
          id="avatar-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading}
        />
        
        {/* Debug info */}
        <div className="text-xs text-muted-foreground">
          Bucket: {bucketName} | Folder: {folderPath}
        </div>
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
