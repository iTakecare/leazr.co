
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { TemplateImage as ManagerTemplateImage } from "@/utils/templateManager";
import { uploadFile, ensureBucket } from "@/services/fileStorage";
import { v4 as uuidv4 } from "uuid";

// Local TemplateImage type with the url property
interface TemplateImage extends Omit<ManagerTemplateImage, 'data'> {
  url?: string;
  data: string;
}

interface PDFTemplateImageUploaderProps {
  templateImages: ManagerTemplateImage[];
  onChange: (images: TemplateImage[]) => void;
  selectedPage: number;
  onPageSelect: (page: number) => void;
}

const PDFTemplateImageUploader = ({
  templateImages,
  onChange,
  selectedPage,
  onPageSelect,
}: PDFTemplateImageUploaderProps) => {
  // Convert the incoming templateImages to the local format with url property
  const [images, setImages] = useState<TemplateImage[]>(() => 
    templateImages.map(img => ({
      ...img,
      url: img.data, // Set url to data value
      data: img.data
    }))
  );
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // Update internal state when templateImages changes from parent
    setImages(templateImages.map(img => ({
      ...img,
      url: img.data,
      data: img.data
    })));
  }, [templateImages]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Seul les fichiers images sont autorisés.");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La taille de l'image ne doit pas dépasser 5MB.");
      return;
    }

    setUploading(true);
    toast.info("Chargement de l'image en cours...");

    try {
      // First, try to upload to Supabase Storage
      const bucketName = 'lovable-uploads';
      const uniqueId = uuidv4();
      const filePath = `${uniqueId}.${file.name.split('.').pop()}`;

      // Ensure bucket exists
      await ensureBucket(bucketName);

      // Upload file to Supabase
      const fileUrl = await uploadFile(bucketName, file, filePath);
      
      if (fileUrl) {
        // If Supabase upload succeeds, use the returned URL
        const newImage: TemplateImage = {
          id: uniqueId,
          name: file.name,
          data: fileUrl,
          url: fileUrl,
          page: images.length
        };

        const updatedImages = [...images, newImage];
        setImages(updatedImages);
        onChange(updatedImages);
        onPageSelect(updatedImages.length - 1);
        toast.success("Image ajoutée avec succès");
      } else {
        // Fall back to FileReader for local handling if Supabase upload fails
        const reader = new FileReader();
        reader.onload = (e) => {
          const newImageUrl = e.target?.result as string;
          const newImage: TemplateImage = {
            id: uuidv4(),
            name: file.name,
            data: newImageUrl,
            url: newImageUrl,
            page: images.length
          };

          const updatedImages = [...images, newImage];
          setImages(updatedImages);
          onChange(updatedImages);
          onPageSelect(updatedImages.length - 1);
          toast.success("Image ajoutée en mode local");
        };

        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error("Erreur lors de l'upload de l'image:", error);
      toast.error("Erreur lors de l'ajout de l'image. Essayez à nouveau.");
    } finally {
      setUploading(false);
      // Reset the file input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleDeleteImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index);
    
    // Renumber pages after deletion
    const renumberedImages = updatedImages.map((img, idx) => ({
      ...img,
      page: idx
    }));
    
    setImages(renumberedImages);
    onChange(renumberedImages);
    
    // Select an appropriate page after deletion
    if (selectedPage >= updatedImages.length && updatedImages.length > 0) {
      onPageSelect(updatedImages.length - 1);
    } else if (updatedImages.length === 0) {
      onPageSelect(0);
    }
    
    toast.success("Image supprimée avec succès");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Images du modèle</h3>
        <div>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
          />
          <Label htmlFor="image-upload" asChild>
            <Button variant="outline" className="cursor-pointer" disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Chargement...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Ajouter une image
                </>
              )}
            </Button>
          </Label>
        </div>
      </div>

      {images.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <ImageIcon className="h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">
              Pas d'images dans ce modèle. Ajoutez une image pour commencer.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((image, index) => (
            <Card 
              key={image.id} 
              className={`relative overflow-hidden ${selectedPage === index ? 'ring-2 ring-primary' : ''}`}
              onClick={() => onPageSelect(index)}
            >
              <CardContent className="p-2">
                <div className="aspect-[210/297] relative overflow-hidden rounded">
                  <img
                    src={image.url || image.data}
                    alt={`Page ${index + 1}`}
                    className="w-full h-full object-contain bg-gray-50"
                    onError={(e) => {
                      if (e.currentTarget) {
                        e.currentTarget.src = "/placeholder.svg";
                      }
                    }}
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteImage(index);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center">
                    Page {index + 1}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PDFTemplateImageUploader;
