
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Upload, RefreshCw, AlertCircle, Check } from "lucide-react";
import { ensureBucketExists, uploadFileDirectly, getCacheBustedUrl } from "@/services/directFileUploadService";

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
  
  // Fonction pour vérifier si une chaîne est potentiellement du JSON
  const isPotentiallyJSON = (str: string): boolean => {
    return (typeof str === 'string') && (str.startsWith('{') || str.startsWith('['));
  };
  
  // Ajouter un paramètre de cache-busting à l'URL
  const getCacheBustedUrlLocal = (url: string | null): string => {
    if (!url) return '';
    
    // Si c'est un objet JSON, ne pas l'utiliser
    if (isPotentiallyJSON(url)) {
      console.error("L'URL du logo semble être un objet JSON invalide:", url);
      return '';
    }
    
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${Date.now()}&r=${retryCount}`;
  };
  
  useEffect(() => {
    if (initialLogoUrl) {
      // Vérifier si c'est un objet JSON (cas d'erreur)
      if (isPotentiallyJSON(initialLogoUrl)) {
        console.error("L'URL initiale du logo est un JSON, ne pas l'afficher:", initialLogoUrl);
        setLogoUrl(null);
      } else {
        setLogoUrl(initialLogoUrl);
      }
    }
  }, [initialLogoUrl, retryCount]);
  
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
      // S'assurer que le bucket existe
      const bucketExists = await ensureBucketExists(bucketName);
      
      if (!bucketExists) {
        throw new Error(`Impossible de créer ou d'accéder au bucket ${bucketName}`);
      }
      
      // Upload du fichier
      const url = await uploadFileDirectly(file, bucketName, folderPath);
      
      if (url) {
        // S'assurer que l'URL n'est pas un objet JSON
        if (isPotentiallyJSON(url)) {
          throw new Error("L'URL retournée semble être un JSON, pas une URL d'image valide");
        }
        
        setLogoUrl(url);
        setUploadSuccess(true);
        
        if (onLogoUploaded) {
          onLogoUploaded(url);
        }
        
        toast.success("Logo téléchargé avec succès");
      } else {
        throw new Error("Erreur lors du téléchargement du logo");
      }
    } catch (error) {
      console.error("Erreur de téléchargement:", error);
      setErrorMessage("Erreur lors du téléchargement du logo");
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
  };
  
  const handleRemove = async () => {
    if (!logoUrl) return;
    
    setLogoUrl(null);
    
    if (onLogoUploaded) {
      onLogoUploaded("");
    }
    
    toast.success("Logo supprimé avec succès");
  };

  // URL avec cache-busting pour l'affichage
  const displayLogoUrl = logoUrl ? getCacheBustedUrlLocal(logoUrl) : '';

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
                onError={(e) => {
                  console.error("Erreur de chargement de l'image du logo:", logoUrl);
                  setErrorMessage("Impossible de charger l'image. Réessayez ou choisissez une autre image.");
                  // Cacher l'image en erreur
                  (e.target as HTMLImageElement).style.display = 'none';
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
