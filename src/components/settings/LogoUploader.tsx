
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
    
    console.log("Fichier sélectionné:", {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified
    });
    
    // Reset des états
    setErrorMessage(null);
    setUploadSuccess(false);
    
    // Validation stricte du fichier
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    const validExtensions = /\.(jpe?g|png|gif|webp|svg)$/i;
    
    if (!validTypes.includes(file.type) && !validExtensions.test(file.name)) {
      const errorMsg = `Type de fichier non valide. Fichier: ${file.type}, Extension: ${file.name.split('.').pop()}`;
      console.error(errorMsg);
      setErrorMessage("Veuillez sélectionner un fichier image valide (JPG, PNG, GIF, WEBP ou SVG)");
      toast.error("Format d'image non pris en charge");
      return;
    }
    
    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Le fichier est trop volumineux. Taille maximum: 5MB");
      toast.error("Fichier trop volumineux");
      return;
    }
    
    setIsUploading(true);
    
    try {
      console.log("Début de l'upload du logo...");
      
      // Upload direct du fichier File sans conversion
      const url = await uploadImage(file, bucketName, folderPath);
      
      if (url) {
        console.log("Upload réussi, URL:", url);
        setLogoUrl(url);
        setUploadSuccess(true);
        
        if (onLogoUploaded) {
          onLogoUploaded(url);
        }
        
        toast.success("Logo téléchargé avec succès");
      } else {
        setErrorMessage("Erreur lors du téléchargement du logo");
        toast.error("Erreur lors du téléchargement du logo");
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
    setErrorMessage(null);
    toast.info("Prêt pour un nouvel upload...");
  };
  
  const handleRemove = () => {
    if (!logoUrl) return;
    
    setLogoUrl(null);
    setUploadSuccess(false);
    
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
        <div className="mb-4 p-4 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-background w-full aspect-square max-w-[240px]">
          {errorMessage ? (
            <div className="flex flex-col items-center justify-center text-center p-4">
              <AlertCircle className="h-8 w-8 text-destructive mb-2" />
              <p className="text-sm text-destructive mb-2">{errorMessage}</p>
              <Button variant="outline" size="sm" onClick={handleRetry}>
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
                  console.error("Erreur de chargement de l'image:", displayLogoUrl);
                  setErrorMessage("Impossible de charger l'image");
                }}
                onLoad={() => {
                  console.log("Image chargée avec succès:", displayLogoUrl);
                }}
              />
              {uploadSuccess && (
                <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                  <Check className="h-4 w-4" />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-4">
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Aucun logo téléchargé
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Formats acceptés: JPG, PNG, GIF, WEBP, SVG
              </p>
              <p className="text-xs text-muted-foreground">
                Taille maximum: 5MB
              </p>
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          <Label 
            htmlFor="logo-upload" 
            className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border rounded-md bg-background hover:bg-accent transition-colors"
          >
            <Upload className="w-4 h-4" />
            {logoUrl ? "Changer le logo" : "Télécharger un logo"}
          </Label>
          <Input
            id="logo-upload"
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml"
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
          
          {errorMessage && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleRetry}
              disabled={isUploading}
              title="Réessayer"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogoUploader;
