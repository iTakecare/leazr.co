
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TemplateImage } from "@/utils/templateManager";
import { Trash2, Eye, ArrowUp, ArrowDown, Upload, Loader2 } from "lucide-react";

interface PDFTemplateImageUploaderProps {
  templateImages: TemplateImage[];
  onChange: (images: TemplateImage[]) => void;
  selectedPage: number;
  onPageSelect: (pageIndex: number) => void;
}

const PDFTemplateImageUploader: React.FC<PDFTemplateImageUploaderProps> = ({
  templateImages,
  onChange,
  selectedPage,
  onPageSelect
}) => {
  const [isUploading, setIsUploading] = useState(false);

  // Convert file to base64
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Add a new template image
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const base64Data = await convertFileToBase64(file);
      
      const newImage: TemplateImage = {
        id: `image-${Date.now()}`,
        name: file.name,
        data: base64Data,
        page: templateImages.length
      };

      const updatedImages = [...templateImages, newImage];
      onChange(updatedImages);
      onPageSelect(updatedImages.length - 1);
    } catch (error) {
      console.error("Error uploading image:", error);
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  // Delete an image
  const handleDeleteImage = (imageId: string) => {
    const updatedImages = templateImages.filter(img => img.id !== imageId);
    
    // Update page numbers
    updatedImages.forEach((img, index) => {
      img.page = index;
    });
    
    onChange(updatedImages);
    
    // Update selected page if needed
    if (selectedPage >= updatedImages.length) {
      onPageSelect(Math.max(0, updatedImages.length - 1));
    }
  };

  // Move image up in order
  const moveImageUp = (index: number) => {
    if (index === 0) return;
    
    const newImages = [...templateImages];
    [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
    
    // Update page numbers
    newImages.forEach((img, idx) => {
      img.page = idx;
    });
    
    onChange(newImages);
    
    // Update selected page if needed
    if (selectedPage === index) {
      onPageSelect(selectedPage - 1);
    } else if (selectedPage === index - 1) {
      onPageSelect(selectedPage + 1);
    }
  };

  // Move image down in order
  const moveImageDown = (index: number) => {
    if (index === templateImages.length - 1) return;
    
    const newImages = [...templateImages];
    [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
    
    // Update page numbers
    newImages.forEach((img, idx) => {
      img.page = idx;
    });
    
    onChange(newImages);
    
    // Update selected page if needed
    if (selectedPage === index) {
      onPageSelect(selectedPage + 1);
    } else if (selectedPage === index + 1) {
      onPageSelect(selectedPage - 1);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border rounded-md p-4">
        <Label htmlFor="image-upload" className="text-sm font-medium">
          Ajouter une page au modèle
        </Label>
        <div className="flex gap-2 mt-2">
          <Input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="flex-1"
          />
          <Button disabled={isUploading}>
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Télécharger
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium">
          Pages du modèle ({templateImages.length})
        </h3>
        
        {templateImages.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Aucune page ajoutée. Utilisez le formulaire ci-dessus pour ajouter des pages.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {templateImages.map((image, index) => (
              <Card 
                key={image.id} 
                className={`overflow-hidden cursor-pointer ${selectedPage === index ? 'ring-2 ring-primary' : ''}`}
                onClick={() => onPageSelect(index)}
              >
                <div className="h-40 bg-gray-100 flex items-center justify-center relative">
                  <img 
                    src={image.data} 
                    alt={`Page ${index + 1}`}
                    className="max-h-full max-w-full object-contain"
                  />
                  <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                    Page {index + 1}
                  </div>
                </div>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="truncate text-sm">{image.name || `Page ${index + 1}`}</div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7" 
                        disabled={index === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveImageUp(index);
                        }}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7" 
                        disabled={index === templateImages.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveImageDown(index);
                        }}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteImage(image.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
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

export default PDFTemplateImageUploader;
