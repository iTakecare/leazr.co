import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { uploadTemplateImage } from '@/services/templateImageUploadService';
import { toast } from "sonner";

interface ImagePage {
  page_number: number;
  image_url: string;
  dimensions: { width: number; height: number };
  file: File;
}

interface ImageTemplateUploaderProps {
  onImagesUploaded: (pages: Omit<ImagePage, 'file'>[]) => void;
  maxPages?: number;
}

export function ImageTemplateUploader({ onImagesUploaded, maxPages = 10 }: ImageTemplateUploaderProps) {
  const [pages, setPages] = useState<ImagePage[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (pages.length + acceptedFiles.length > maxPages) {
      toast.error(`Maximum ${maxPages} pages autorisées`);
      return;
    }

    const newPages: ImagePage[] = [];

    for (const file of acceptedFiles) {
      // Get image dimensions
      const img = new Image();
      const imageUrl = URL.createObjectURL(file);
      
      await new Promise((resolve) => {
        img.onload = () => {
          newPages.push({
            page_number: pages.length + newPages.length + 1,
            image_url: imageUrl,
            dimensions: { width: img.width, height: img.height },
            file
          });
          resolve(null);
        };
        img.src = imageUrl;
      });
    }

    setPages(prev => [...prev, ...newPages]);
  }, [pages.length, maxPages]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
    },
    multiple: true
  });

  const removePage = (index: number) => {
    setPages(prev => {
      const newPages = prev.filter((_, i) => i !== index);
      // Renuméroter les pages
      return newPages.map((page, i) => ({ ...page, page_number: i + 1 }));
    });
  };

  const reorderPages = (fromIndex: number, toIndex: number) => {
    setPages(prev => {
      const newPages = [...prev];
      const [movedPage] = newPages.splice(fromIndex, 1);
      newPages.splice(toIndex, 0, movedPage);
      // Renuméroter les pages
      return newPages.map((page, i) => ({ ...page, page_number: i + 1 }));
    });
  };

  const uploadPages = async () => {
    if (pages.length === 0) {
      toast.error("Ajoutez au moins une image");
      return;
    }

    setIsUploading(true);
    try {
      const uploadedPages: Omit<ImagePage, 'file'>[] = [];

      for (const page of pages) {
        const uploadedUrl = await uploadTemplateImage(page.file, 'template-images');
        uploadedPages.push({
          page_number: page.page_number,
          image_url: uploadedUrl,
          dimensions: page.dimensions
        });
      }

      onImagesUploaded(uploadedPages);
      toast.success(`${pages.length} page(s) uploadée(s) avec succès`);
      setPages([]);
    } catch (error) {
      console.error('Error uploading pages:', error);
      toast.error("Erreur lors de l'upload des images");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Zone de drop */}
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">
              {isDragActive ? 'Déposez les images ici' : 'Glissez-déposez vos images ici'}
            </h3>
            <p className="text-muted-foreground mb-4">
              ou <span className="text-primary underline">cliquez pour parcourir</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Formats supportés: JPG, PNG, GIF, WebP • Max {maxPages} pages
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Aperçu des pages */}
      {pages.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Pages du template ({pages.length})</h3>
              <Button onClick={uploadPages} disabled={isUploading}>
                {isUploading ? 'Upload en cours...' : 'Créer le template'}
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {pages.map((page, index) => (
                <div
                  key={index}
                  className="relative border rounded-lg overflow-hidden bg-muted"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', index.toString())}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                    reorderPages(fromIndex, index);
                  }}
                >
                  {/* Numéro de page */}
                  <div className="absolute top-2 left-2 bg-black/75 text-white text-xs px-2 py-1 rounded z-10">
                    Page {page.page_number}
                  </div>

                  {/* Bouton de suppression */}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 h-6 w-6 p-0 z-10"
                    onClick={() => removePage(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>

                  {/* Image */}
                  <div className="aspect-[3/4]">
                    <img
                      src={page.image_url}
                      alt={`Page ${page.page_number}`}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Infos de l'image */}
                  <div className="p-2 bg-background">
                    <p className="text-xs text-muted-foreground">
                      {page.dimensions.width} × {page.dimensions.height}px
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">Conseils pour vos templates :</p>
                <ul className="text-blue-700 mt-1 space-y-1">
                  <li>• Utilisez des images haute résolution (300 DPI minimum)</li>
                  <li>• Gardez les zones de texte visibles et contrastées</li>
                  <li>• Glissez-déposez pour réorganiser l'ordre des pages</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}