import React, { useState } from "react";
import { Upload, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { uploadFileMultiTenant } from "@/services/multiTenantStorageService";
import { getCacheBustedUrl } from "@/services/fileUploadService";

interface ClientLogoUploaderProps {
  clientId?: string;
  initialLogoUrl?: string;
  onLogoUploaded?: (url: string) => void;
  onLogoRemoved?: () => void;
}

export const ClientLogoUploader: React.FC<ClientLogoUploaderProps> = ({
  clientId,
  initialLogoUrl,
  onLogoUploaded,
  onLogoRemoved
}) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validation du fichier
    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner un fichier image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB max
      setError('Le fichier est trop volumineux (max 5MB)');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const fileName = clientId ? `client-${clientId}-logo` : `logo-${Date.now()}`;
      const uploadedUrl = await uploadFileMultiTenant(file, "client-logos", fileName);

      if (uploadedUrl) {
        setLogoUrl(uploadedUrl);
        onLogoUploaded?.(uploadedUrl);
        toast.success('Logo téléchargé avec succès');
      } else {
        throw new Error('Échec du téléchargement');
      }
    } catch (error) {
      console.error('Erreur upload logo:', error);
      setError('Erreur lors du téléchargement du logo');
      toast.error('Erreur lors du téléchargement du logo');
    } finally {
      setIsUploading(false);
      // Reset input
      event.target.value = '';
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl(null);
    onLogoRemoved?.();
    toast.success('Logo supprimé');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center bg-muted/20">
          {logoUrl ? (
            <img
              src={getCacheBustedUrl(logoUrl)}
              alt="Logo client"
              className="w-full h-full object-contain rounded-lg"
            />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => document.getElementById('client-logo-input')?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              {isUploading ? 'Téléchargement...' : logoUrl ? 'Changer logo' : 'Ajouter logo'}
            </Button>
            
            {logoUrl && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemoveLogo}
                disabled={isUploading}
              >
                <X className="mr-2 h-4 w-4" />
                Supprimer
              </Button>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground mt-2">
            PNG, JPG, GIF jusqu'à 5MB
          </p>
        </div>
      </div>

      {error && (
        <Card className="p-3 border-destructive bg-destructive/5">
          <p className="text-sm text-destructive">{error}</p>
        </Card>
      )}

      <input
        id="client-logo-input"
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};