
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUp, Trash, Eye, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { getAdminSupabaseClient, supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { 
  detectMimeTypeFromSignature, 
  getMimeTypeFromExtension 
} from "@/services/imageService";

const PDFTemplateUploader = ({ templateImages = [], onChange }) => {
  const [isUploading, setIsUploading] = useState(false);
  
  // Uploader une image
  const uploadImage = async (file) => {
    if (!file) return null;
    
    try {
      setIsUploading(true);
      
      // Générer un nom de fichier unique
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      
      console.log("Tentative d'upload du fichier:", fileName);
      console.log("Type de fichier original:", file.type);
      console.log("Taille du fichier:", file.size);
      
      // Détecter le bon type MIME basé sur la signature du fichier ou l'extension
      const detectedMimeType = await detectMimeTypeFromSignature(file);
      const contentType = detectedMimeType || getMimeTypeFromExtension(fileExt, 'image/png');
      
      console.log("Type MIME détecté:", contentType);
      
      // Créer un nouveau blob avec le bon type MIME
      const arrayBuffer = await file.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: contentType });
      
      // Essayer d'abord avec le client standard
      let { data, error } = await supabase.storage
        .from('pdf-templates')
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: true,
          contentType: contentType // Utiliser le type MIME détecté
        });
        
      if (error) {
        console.log("Erreur avec le client standard. Tentative avec le client admin...");
        
        // Si ça échoue, essayer avec le client admin
        const adminSupabase = getAdminSupabaseClient();
        const result = await adminSupabase.storage
          .from('pdf-templates')
          .upload(fileName, blob, {
            cacheControl: '3600',
            upsert: true,
            contentType: contentType // Utiliser le type MIME détecté
          });
          
        if (result.error) {
          console.error("Erreur détaillée lors de l'upload avec le client admin:", result.error);
          toast.error(`Erreur lors de l'upload du fichier: ${result.error.message}`);
          return null;
        }
        
        data = result.data;
      }
      
      console.log("Fichier uploadé avec succès:", data);
      
      // Récupérer l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('pdf-templates')
        .getPublicUrl(fileName);
        
      console.log("URL publique générée:", publicUrl);
      
      return {
        id: fileName,
        name: file.name,
        url: publicUrl,
        page: templateImages.length
      };
    } catch (error) {
      console.error("Exception non gérée lors de l'upload:", error);
      toast.error(`Erreur lors de l'upload du fichier: ${error.message || JSON.stringify(error)}`);
      return null;
    } finally {
      setIsUploading(false);
    }
  };
  
  // Supprimer une image
  const deleteImage = async (imageId) => {
    try {
      console.log("Tentative de suppression du fichier:", imageId);
      
      // Essayer d'abord avec le client standard
      let { error } = await supabase.storage
        .from('pdf-templates')
        .remove([imageId]);
        
      if (error) {
        console.log("Erreur avec le client standard. Tentative avec le client admin...");
        
        // Si ça échoue, essayer avec le client admin
        const adminSupabase = getAdminSupabaseClient();
        const result = await adminSupabase.storage
          .from('pdf-templates')
          .remove([imageId]);
          
        if (result.error) {
          console.error("Erreur détaillée lors de la suppression avec le client admin:", result.error);
          toast.error(`Erreur lors de la suppression du fichier: ${result.error.message}`);
          return;
        }
      }
      
      console.log("Fichier supprimé avec succès");
      
      // Mettre à jour la liste des images
      const updatedImages = templateImages.filter(img => img.id !== imageId);
      
      // Réindexer les numéros de page
      updatedImages.forEach((img, idx) => {
        img.page = idx;
      });
      
      onChange(updatedImages);
      
      toast.success("Image supprimée avec succès");
    } catch (error) {
      console.error("Exception non gérée lors de la suppression:", error);
      toast.error(`Erreur lors de la suppression du fichier: ${error.message || JSON.stringify(error)}`);
    }
  };
  
  // Gérer l'upload de fichier
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Vérifier le type de fichier (image uniquement)
    if (!file.type.startsWith('image/')) {
      toast.error("Veuillez sélectionner une image");
      return;
    }
    
    console.log("Début du processus d'upload pour:", file.name);
    
    const uploadedImage = await uploadImage(file);
    if (uploadedImage) {
      const newImages = [...templateImages, uploadedImage];
      onChange(newImages);
      toast.success("Image uploadée avec succès");
    }
  };

  // Déplacer une image vers le haut
  const moveUp = (index) => {
    if (index === 0) return;
    
    const newImages = [...templateImages];
    [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
    
    // Mettre à jour les numéros de page
    newImages.forEach((img, idx) => {
      img.page = idx;
    });
    
    onChange(newImages);
  };
  
  // Déplacer une image vers le bas
  const moveDown = (index) => {
    if (index === templateImages.length - 1) return;
    
    const newImages = [...templateImages];
    [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
    
    // Mettre à jour les numéros de page
    newImages.forEach((img, idx) => {
      img.page = idx;
    });
    
    onChange(newImages);
  };
  
  // Prévisualiser une image
  const previewImage = (imageUrl) => {
    window.open(imageUrl, '_blank');
  };
  
  return (
    <div className="space-y-6">
      <div className="border rounded-md p-4">
        <Label htmlFor="template-upload" className="text-sm font-medium">Ajouter un modèle de page</Label>
        <div className="flex gap-2 mt-2">
          <Input
            id="template-upload"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading}
            className="flex-1"
          />
          <Button disabled={isUploading} className="min-w-20">
            {isUploading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                <FileUp className="h-4 w-4 mr-2" />
                <span>Upload</span>
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Formats acceptés: PNG, JPG, WEBP. L'ordre des pages correspond à l'ordre dans lequel elles apparaîtront dans le document final.
        </p>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Pages du modèle</h3>
        
        {templateImages.length === 0 ? (
          <div className="text-center p-8 border border-dashed rounded-md">
            <p className="text-sm text-muted-foreground">
              Aucune page n'a encore été uploadée. Utilisez le formulaire ci-dessus pour ajouter des pages à votre modèle.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templateImages.map((image, index) => (
              <Card key={image.id} className="overflow-hidden">
                <div className="relative bg-gray-100 h-40 flex items-center justify-center">
                  <img 
                    src={image.url} 
                    alt={`Template page ${index + 1}`} 
                    className="max-h-full max-w-full object-contain"
                  />
                  <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                    Page {index + 1}
                  </div>
                </div>
                <CardContent className="p-3">
                  <div className="flex justify-between items-center">
                    <div className="truncate text-sm">{image.name}</div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7" 
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7" 
                        onClick={() => moveDown(index)}
                        disabled={index === templateImages.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7" 
                        onClick={() => previewImage(image.url)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" 
                        onClick={() => deleteImage(image.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFTemplateUploader;
