
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Upload, RefreshCw, AlertCircle, Check } from "lucide-react";
import { uploadImage, getCacheBustedUrl } from "@/services/fileUploadService";

interface LogoUploaderProps {
  initialLogoUrl?: string;
  onLogoUploaded?: (url: string) => void;
  bucketName?: string;
  folderPath?: string;
}

const LogoUploader: React.FC<LogoUploaderProps> = ({
  initialLogoUrl,
  onLogoUploaded,
  bucketName = "site-settings",
  folderPath = "logos"
}) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (initialLogoUrl) {
      setLogoUrl(initialLogoUrl);
    }
  }, [initialLogoUrl]);
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Reset des états
    setErrorMessage(null);
    setUploadSuccess(false);
    
    // Valider le type de fichier
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    
    if (!validImageTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
      setErrorMessage("Veuillez sélectionner un fichier image valide (JPG, PNG, GIF, WEBP ou SVG)");
      toast.error("Format d'image non pris en charge");
      return;
    }
    
    setIsUploading(true);
    
    try {
      const url = await uploadImage(file, bucketName, folderPath);
      
      if (url) {
        setLogoUrl(url);
        setUploadSuccess(true);
        
        if (onLogoUploaded) {
          onLogoUploaded(url);
        }
        
        toast.success("Logo téléchargé avec succès");
      }
    } catch (error) {
      console.error("Erreur de téléchargement:", error);
      setErrorMessage("Erreur lors du téléchargement du logo. Vérifiez les permissions du bucket de stockage.");
      toast.error("Erreur lors du téléchargement du logo");
    } finally {
      setIsUploading(false);
      
      // Reset de l'input file pour permettre de télécharger à nouveau le même fichier
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setErrorMessage(null);
    toast.info("Rafraîchissement du logo...");
    
    // Tenter de recharger le logo
    if (logoUrl) {
      const refreshedUrl = getCacheBustedUrl(logoUrl);
      setLogoUrl(refreshedUrl);
    }
  };
  
  const handleRemove = () => {
    if (!logoUrl) return;
    
    setLogoUrl(null);
    
    if (onLogoUploaded) {
      onLogoUploaded("");
    }
    
    toast.success("Logo supprimé avec succès");
  };

  // URL avec cache-busting pour l'affichage
  const displayLogoUrl = logoUrl ? getCacheBustedUrl(logoUrl) : '';

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center">
        <div className="mb-4 p-2 border border-dashed rounded-xl flex items-center justify-center bg-background w-full aspect-square max-w-[240px]">
          {errorMessage ? (
            <div className="flex flex-col items-center justify-center text-center p-4">
              <AlertCircle className="h-8 w-8 text-destructive mb-2" />
              <p className="text-sm text-destructive">{errorMessage}</p>
              <Button variant="outline" size="sm" onClick={handleRetry} className="mt-2">
                <RefreshCw className="h-4 w-4 mr-2" />
                Réessayer
              </Button>
            </div>
          ) : isUploading ? (
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Téléchargement en cours...</p>
            </div>
          ) : logoUrl ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <img 
                src={displayLogoUrl} 
                alt="Logo du site" 
                className="max-w-full max-h-full object-contain"
                onError={() => {
                  setErrorMessage("Impossible de charger l'image. Réessayez ou choisissez une autre image.");
                }}
              />
              {uploadSuccess && (
                <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                  <Check className="h-4 w-4" />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center">
              <p className="text-sm text-muted-foreground">
                Aucun logo téléchargé
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Formats acceptés: JPG, PNG, GIF, WEBP, SVG
              </p>
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          <Label 
            htmlFor="logo-upload" 
            className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border rounded-md bg-background hover:bg-accent"
          >
            <Upload className="w-4 h-4" />
            {logoUrl ? "Changer le logo" : "Télécharger un logo"}
          </Label>
          <Input
            id="logo-upload"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />
          
          {logoUrl && (
            <Button 
              variant="outline" 
              onClick={handleRemove}
              disabled={isUploading}
            >
              Supprimer
            </Button>
          )}
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleRetry}
            disabled={isUploading || !logoUrl}
            title="Rafraîchir l'affichage"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LogoUploader;
