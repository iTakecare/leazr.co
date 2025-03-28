import React, { useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { uploadImage } from "@/services/imageService";
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface AvatarUploaderProps {
  avatarUrl: string | null | undefined;
  onAvatarChange: (url: string) => void;
}

const AvatarUploader: React.FC<AvatarUploaderProps> = ({ avatarUrl, onAvatarChange }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAvatarUpload = async (file: File) => {
  try {
    setIsUploading(true);
    setMessage('Téléchargement en cours...');
    
    const result = await uploadImage(file, 'avatars', 'users');
    
    if (result && result.url) {
      setAvatarUrl(result.url);
      onAvatarChange(result.url);
      setMessage('Avatar téléchargé avec succès');
    }
  } catch (error) {
    console.error('Erreur lors du téléchargement de l\'avatar:', error);
    setError(error instanceof Error ? error.message : 'Erreur inconnue');
  } finally {
    setIsUploading(false);
  }
};

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      setMessage('Aucun fichier sélectionné');
      return;
    }

    handleAvatarUpload(file);
  };

  const [avatarUrlState, setAvatarUrl] = useState(avatarUrl);

  return (
    <div className="flex flex-col items-center space-y-4">
      <Avatar className="h-32 w-32">
        {avatarUrlState ? (
          <AvatarImage src={avatarUrlState} alt="Avatar" />
        ) : (
          <AvatarFallback>
            {/* Display initials or a default icon here */}
            {/* Example: */}
            {/* <span>AB</span> */}
          </AvatarFallback>
        )}
      </Avatar>
      
      <Label htmlFor="avatar-upload">
        {isUploading ? (
          <Button variant="secondary" disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {message || "Téléchargement..."}
          </Button>
        ) : (
          <Button variant="secondary">
            Télécharger un nouvel avatar
          </Button>
        )}
      </Label>
      <Input
        type="file"
        id="avatar-upload"
        className="hidden"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={isUploading}
      />
      
      {error && <p className="text-red-500">{error}</p>}
      {message && !isUploading && <p className="text-green-500">{message}</p>}
    </div>
  );
};

export default AvatarUploader;
