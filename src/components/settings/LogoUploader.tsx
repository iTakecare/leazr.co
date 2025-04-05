
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Upload, RefreshCw, AlertCircle, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  const getCacheBustedUrl = (url: string | null): string => {
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
  
  const ensureBucketExists = async (bucketName: string): Promise<boolean> => {
    try {
      // Vérifier si le bucket existe
      const { data, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.error("Erreur lors de la vérification des buckets:", error);
        return false;
      }
      
      if (data.some(bucket => bucket.name === bucketName)) {
        return true;
      }
      
      // Créer le bucket s'il n'existe pas
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true
      });
      
      if (createError) {
        if (createError.message.includes('already exists')) {
          return true;
        }
        console.error(`Erreur lors de la création du bucket ${bucketName}:`, createError);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error(`Erreur dans ensureBucketExists pour ${bucketName}:`, error);
      return false;
    }
  };
  
  const uploadFileDirectly = async (file: File, bucketName: string, folderPath: string) => {
    try {
      // Valider la taille du fichier (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Le fichier est trop volumineux (max 5MB)");
        return null;
      }
      
      // Générer un nom de fichier unique
      const timestamp = Date.now();
      const fileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-');
      const uniqueFileName = `${timestamp}-${fileName}`;
      const fullPath = folderPath ? `${folderPath}/${uniqueFileName}` : uniqueFileName;
      
      // Déterminer le type de contenu en fonction de l'extension du fichier
      const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
      const mimeTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml'
      };
      const contentType = mimeTypes[fileExt] || 'application/octet-stream';
      
      console.log(`Uploading logo ${uniqueFileName} with content type ${contentType}`);
      
      // Méthode 1: Utiliser fetch directement pour avoir plus de contrôle sur le Content-Type
      try {
        const formData = new FormData();
        const blob = new Blob([await file.arrayBuffer()], { type: contentType });
        formData.append('file', blob, uniqueFileName);
        
        const url = `${supabase.supabaseUrl}/storage/v1/object/${bucketName}/${fullPath}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabase.supabaseKey}`,
            'x-upsert': 'true'
          },
          body: formData
        });
        
        if (!response.ok) {
          console.log("L'upload direct par fetch a échoué, tentative avec l'API Supabase");
          throw new Error("Fetch upload failed");
        }
      } catch (fetchError) {
        console.log("Fallback à la méthode Supabase SDK", fetchError);
        
        // Méthode 2: Utiliser l'API Supabase comme fallback
        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(fullPath, file, {
            contentType,
            upsert: true,
            cacheControl: "3600"
          });
        
        if (error) {
          console.error("Erreur lors de l'upload via SDK:", error);
          throw error;
        }
      }
      
      // Récupérer l'URL publique
      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fullPath);
      
      if (!publicUrlData || !publicUrlData.publicUrl) {
        throw new Error("Impossible d'obtenir l'URL publique");
      }
      
      console.log("Logo uploadé avec succès:", publicUrlData.publicUrl);
      return { url: publicUrlData.publicUrl, fileName: uniqueFileName };
    } catch (error) {
      console.error("Erreur lors de l'upload:", error);
      return null;
    }
  };
  
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
      const result = await uploadFileDirectly(file, bucketName, folderPath);
      
      if (result && result.url) {
        // S'assurer que l'URL n'est pas un objet JSON
        if (isPotentiallyJSON(result.url)) {
          throw new Error("L'URL retournée semble être un JSON, pas une URL d'image valide");
        }
        
        setLogoUrl(result.url);
        setUploadSuccess(true);
        
        if (onLogoUploaded) {
          onLogoUploaded(result.url);
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
