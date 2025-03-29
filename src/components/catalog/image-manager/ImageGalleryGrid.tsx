
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Check, Trash2 } from "lucide-react";

interface ImageGalleryGridProps {
  images: any[];
  isLoading: boolean;
  getUniqueImageUrl: (url: string, index: number) => string;
  handleSetMainImage: (image: any) => void;
  handleDelete: (imageName: string) => void;
}

const ImageGalleryGrid: React.FC<ImageGalleryGridProps> = ({
  images,
  isLoading,
  getUniqueImageUrl,
  handleSetMainImage,
  handleDelete
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image, index) => (
          <Card key={`${image.name}-${index}-loading`} className="overflow-hidden relative">
            <div className="aspect-square bg-gray-100 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Aucune image n'a été téléchargée pour ce produit.</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {images.map((image, index) => (
        <Card key={`${image.name}-${index}`} className="overflow-hidden">
          <div className="relative aspect-square">
            <div className="w-full h-full flex items-center justify-center bg-gray-50 p-2">
              <img
                src={getUniqueImageUrl(image.url, index)}
                alt={`Produit ${index + 1}`}
                className="object-contain max-h-full max-w-full"
                loading="lazy"
                onError={(e) => {
                  console.error(`Failed to load image: ${image.url}`);
                  (e.target as HTMLImageElement).src = "/placeholder.svg";
                }}
              />
            </div>
            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/50 transition-opacity">
              <div className="flex space-x-2">
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => handleSetMainImage(image)}
                  title="Définir comme image principale"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => handleDelete(image.name)}
                  title="Supprimer l'image"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default ImageGalleryGrid;
