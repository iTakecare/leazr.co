
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUp, Trash, Eye, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { getAdminSupabaseClient, supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { 
  uploadImage
} from "@/services/imageService";

const PDFTemplateUploader = ({ templateImages = [], onChange }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [localImages, setLocalImages] = useState([]);
  
  console.log("PDFTemplateUploader render with templateImages:", templateImages);
  
  // Initialize local state once on mount and when templateImages changes significantly
  useEffect(() => {
    console.log("useEffect triggered with templateImages:", templateImages);
    // Only update if templateImages exists and is different from current localImages
    if (templateImages && Array.isArray(templateImages)) {
      console.log("Setting localImages state to:", templateImages);
      setLocalImages(templateImages);
    }
  }, [templateImages]);
  
  // Upload an image using the service
  const handleImageUpload = async (file) => {
    if (!file) return null;
    
    try {
      setIsUploading(true);
      
      console.log("Début du processus d'upload pour:", file.name);
      
      // Use uploadImage function that correctly handles MIME type
      const result = await uploadImage(file, uuidv4(), 'pdf-templates');
      
      if (result && result.url) {
        console.log("Upload successful, image URL:", result.url);
        return {
          id: result.url.split('/').pop(),
          name: file.name,
          url: result.url,
          page: localImages.length
        };
      } else {
        throw new Error("L'URL du fichier n'a pas été générée correctement");
      }
    } catch (error) {
      console.error("Exception non gérée lors de l'upload:", error);
      toast.error(`Erreur lors de l'upload du fichier: ${error.message || JSON.stringify(error)}`);
      return null;
    } finally {
      setIsUploading(false);
    }
  };
  
  // Delete an image
  const deleteImage = async (imageId) => {
    try {
      console.log("Tentative de suppression du fichier:", imageId);
      
      // Try with the standard client first
      let { error } = await supabase.storage
        .from('pdf-templates')
        .remove([imageId]);
        
      if (error) {
        console.log("Erreur avec le client standard. Tentative avec le client admin...");
        
        // If it fails, try with the admin client
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
      
      // Update the image list
      const updatedImages = localImages.filter(img => img.id !== imageId);
      
      // Reindex page numbers
      updatedImages.forEach((img, idx) => {
        img.page = idx;
      });
      
      setLocalImages(updatedImages);
      onChange(updatedImages);
      
      toast.success("Image supprimée avec succès");
    } catch (error) {
      console.error("Exception non gérée lors de la suppression:", error);
      toast.error(`Erreur lors de la suppression du fichier: ${error.message || JSON.stringify(error)}`);
    }
  };
  
  // Handle file upload
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file type (images only)
    if (!file.type.startsWith('image/')) {
      toast.error("Veuillez sélectionner une image");
      return;
    }
    
    console.log("Début du processus d'upload pour:", file.name);
    
    const uploadedImage = await handleImageUpload(file);
    if (uploadedImage) {
      const newImages = [...localImages, uploadedImage];
      console.log("New images array after upload:", newImages);
      setLocalImages(newImages);
      onChange(newImages); // Notify parent component immediately
      toast.success("Image uploadée avec succès");
    }
  };

  // Move an image up
  const moveUp = (index) => {
    if (index === 0) return;
    
    const newImages = [...localImages];
    [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
    
    // Update page numbers
    newImages.forEach((img, idx) => {
      img.page = idx;
    });
    
    setLocalImages(newImages);
    onChange(newImages); // Notify parent component immediately
  };
  
  // Move an image down
  const moveDown = (index) => {
    if (index === localImages.length - 1) return;
    
    const newImages = [...localImages];
    [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
    
    // Update page numbers
    newImages.forEach((img, idx) => {
      img.page = idx;
    });
    
    setLocalImages(newImages);
    onChange(newImages); // Notify parent component immediately
  };
  
  // Preview an image
  const previewImage = (imageUrl) => {
    window.open(imageUrl, '_blank');
  };
  
  // Handle image loading error
  const handleImageError = (e, imageUrl) => {
    console.error("Image failed to load:", imageUrl);
    e.target.src = "/placeholder.svg"; // Fallback image
    
    // Try to reload the image with a cache-busting parameter
    setTimeout(() => {
      if (e.target.src === "/placeholder.svg") {
        const timestamp = new Date().getTime();
        e.target.src = `${imageUrl}?t=${timestamp}`;
        console.log("Attempting to reload image with cache-busting:", `${imageUrl}?t=${timestamp}`);
      }
    }, 2000);
  };

  // Force re-render of images by adding timestamp to URLs
  const timestampedImages = localImages.map(img => ({
    ...img,
    displayUrl: `${img.url}?t=${new Date().getTime()}`
  }));
  
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
        <h3 className="text-sm font-medium">Pages du modèle ({localImages.length})</h3>
        
        {localImages.length === 0 ? (
          <div className="text-center p-8 border border-dashed rounded-md">
            <p className="text-sm text-muted-foreground">
              Aucune page n'a encore été uploadée. Utilisez le formulaire ci-dessus pour ajouter des pages à votre modèle.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {timestampedImages.map((image, index) => (
              <Card key={`${image.id}-${index}`} className="overflow-hidden">
                <div className="relative bg-gray-100 h-40 flex items-center justify-center">
                  <img 
                    src={image.displayUrl} 
                    alt={`Template page ${index + 1}`}
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => handleImageError(e, image.url)}
                  />
                  <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                    Page {index + 1}
                  </div>
                </div>
                <CardContent className="p-3">
                  <div className="flex justify-between items-center">
                    <div className="truncate text-sm">{image.name || `Page ${index + 1}`}</div>
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
                        disabled={index === localImages.length - 1}
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

