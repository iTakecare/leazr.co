
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, Search, Check, RefreshCw, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { generateSeoAltText, removeBackground } from "@/utils/imageProcessor";

interface ImageProcessingToolProps {
  productName: string;
  productBrand: string;
  onImageProcessed: (file: File) => void;
}

const ImageProcessingTool: React.FC<ImageProcessingToolProps> = ({
  productName,
  productBrand,
  onImageProcessed
}) => {
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [processedPreview, setProcessedPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSelectedFile(file);
    setOriginalPreview(URL.createObjectURL(file));
    setProcessedPreview(null);
  };

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      // Utiliser la marque et le nom du produit comme terme de recherche si non spécifié
      const query = searchQuery.trim() || `${productBrand} ${productName}`;
      
      // API pour chercher des images
      const response = await fetch(`https://api.serpstack.com/search?access_key=${process.env.SERPSTACK_API_KEY || 'demo'}&query=${encodeURIComponent(query)}&type=images&num=10`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch images');
      }
      
      const data = await response.json();
      
      // Si nous sommes en mode démo ou si l'API n'est pas disponible, utiliser des images d'exemple
      let images;
      if (data.error || process.env.SERPSTACK_API_KEY === 'demo') {
        // Générer des URLs d'exemple basées sur le nom du produit
        images = [
          `https://source.unsplash.com/featured/?${encodeURIComponent(productName)}`,
          `https://source.unsplash.com/featured/?${encodeURIComponent(productBrand)}`,
          `https://source.unsplash.com/featured/?laptop`,
          `https://source.unsplash.com/featured/?computer`,
          `https://source.unsplash.com/featured/?tech`,
          `https://source.unsplash.com/featured/?product`,
          `https://source.unsplash.com/featured/?electronics`,
          `https://source.unsplash.com/featured/?gadget`,
          `https://source.unsplash.com/featured/?device`,
          `https://source.unsplash.com/featured/?hardware`
        ];
      } else {
        // Extraire les URLs d'image de la réponse API
        images = data.images_results.map((img: any) => img.original);
      }
      
      setSearchResults(images);
    } catch (error) {
      console.error('Error searching for images:', error);
      toast.error('Failed to search for images');
    } finally {
      setIsSearching(false);
    }
  };

  const toggleImageSelection = (imageUrl: string) => {
    setSelectedImages(prev => {
      if (prev.includes(imageUrl)) {
        return prev.filter(url => url !== imageUrl);
      } else {
        // Limiter à 5 images maximum
        if (prev.length >= 5) {
          toast.warning('Vous pouvez sélectionner au maximum 5 images');
          return prev;
        }
        return [...prev, imageUrl];
      }
    });
  };

  const processImageFromUrl = async (imageUrl: string) => {
    setIsProcessing(true);
    setOriginalPreview(imageUrl);
    
    try {
      // Télécharger l'image depuis l'URL
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Créer un fichier avec un nom basé sur le produit
      const filename = `${productBrand}-${productName}-${Date.now()}.jpg`;
      const file = new File([blob], filename, { type: blob.type });
      
      setSelectedFile(file);
      
      // Effectuer le traitement d'image
      await processImage(imageUrl);
    } catch (error) {
      console.error('Error processing image from URL:', error);
      toast.error('Failed to process image from URL');
      setIsProcessing(false);
    }
  };

  const processSelectedImages = async () => {
    if (selectedImages.length === 0) {
      toast.warning('Veuillez sélectionner au moins une image');
      return;
    }
    
    // Traiter la première image sélectionnée
    await processImageFromUrl(selectedImages[0]);
  };

  const processImage = async (imageUrl: string = originalPreview as string) => {
    setIsProcessing(true);
    try {
      // Charger l'image pour le traitement
      const img = document.createElement('img');
      img.src = imageUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // Créer un canvas pour traiter l'image
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      // Dessiner l'image sur le canvas
      ctx.drawImage(img, 0, 0);

      // Supprimer l'arrière-plan de l'image (simulation)
      await removeBackground(canvas, img);

      // Convertir le canvas en blob
      const processedBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else resolve(new Blob());
        }, 'image/png');
      });

      // Créer une URL pour l'aperçu
      const processedUrl = URL.createObjectURL(processedBlob);
      setProcessedPreview(processedUrl);

      // Créer un fichier à partir du blob traité
      const processedFile = new File(
        [processedBlob],
        selectedFile ? `processed-${selectedFile.name}` : `processed-image-${Date.now()}.png`,
        { type: 'image/png' }
      );

      // Informer le parent que l'image a été traitée
      onImageProcessed(processedFile);
      toast.success('Image traitée avec succès!');
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error('Erreur lors du traitement de l\'image');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <CardContent className="p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="upload">
            <Upload className="h-4 w-4 mr-2" />
            Télécharger une image
          </TabsTrigger>
          <TabsTrigger value="search">
            <Search className="h-4 w-4 mr-2" />
            Rechercher des images
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
                <Input
                  type="file"
                  accept="image/*"
                  id="product-image"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <label
                  htmlFor="product-image"
                  className="cursor-pointer flex flex-col items-center justify-center h-40"
                >
                  {originalPreview ? (
                    <img
                      src={originalPreview}
                      alt="Preview"
                      className="max-h-full object-contain"
                    />
                  ) : (
                    <>
                      <ImageIcon className="h-10 w-10 text-gray-400" />
                      <span className="mt-2 text-sm text-gray-500">
                        Cliquez pour sélectionner une image
                      </span>
                    </>
                  )}
                </label>
              </div>
              {originalPreview && (
                <div className="mt-2 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      setOriginalPreview(null);
                      setProcessedPreview(null);
                    }}
                  >
                    Supprimer
                  </Button>
                </div>
              )}
            </div>

            <div>
              <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
                {isProcessing ? (
                  <div className="flex flex-col items-center justify-center h-40">
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                    <span className="mt-2 text-sm text-gray-500">
                      Traitement en cours...
                    </span>
                  </div>
                ) : processedPreview ? (
                  <div className="flex flex-col items-center justify-center h-40">
                    <img
                      src={processedPreview}
                      alt="Processed"
                      className="max-h-full object-contain"
                    />
                    <div className="absolute top-2 right-2">
                      <Check className="h-5 w-5 text-green-500" />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40">
                    <RefreshCw className="h-10 w-10 text-gray-400" />
                    <span className="mt-2 text-sm text-gray-500">
                      Résultat du traitement
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              disabled={!originalPreview || isProcessing}
              onClick={() => processImage()}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Traitement en cours...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Traiter l'image
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder={`Rechercher des images pour ${productBrand} ${productName}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="button" onClick={handleSearch} disabled={isSearching}>
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {isSearching ? (
            <div className="h-60 flex items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : searchResults.length > 0 ? (
            <div>
              <p className="text-sm mb-2">
                Sélectionnez jusqu'à 5 images pour le traitement ({selectedImages.length}/5)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 max-h-60 overflow-y-auto p-2">
                {searchResults.map((imageUrl, index) => (
                  <div
                    key={index}
                    className={`
                      relative cursor-pointer border-2 rounded-md overflow-hidden
                      ${selectedImages.includes(imageUrl) ? 'border-primary' : 'border-transparent'}
                    `}
                    onClick={() => toggleImageSelection(imageUrl)}
                  >
                    <img
                      src={imageUrl}
                      alt={`Search result ${index + 1}`}
                      className="w-full h-24 object-cover"
                      onError={(e) => {
                        // Remplacer les images non chargées par une image par défaut
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Image+non+disponible';
                      }}
                    />
                    {selectedImages.includes(imageUrl) && (
                      <div className="absolute top-1 right-1 bg-primary text-white rounded-full p-1">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Button
                  onClick={processSelectedImages}
                  disabled={selectedImages.length === 0 || isProcessing}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Traitement en cours...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Traiter l'image sélectionnée
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-60 flex items-center justify-center">
              <p className="text-muted-foreground">
                Recherchez des images pour voir les résultats
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </CardContent>
  );
};

export default ImageProcessingTool;
