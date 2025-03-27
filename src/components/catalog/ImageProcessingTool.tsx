
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Search, ImageIcon, Loader2, Check, X, Download, Wand2, Image } from "lucide-react";
import { removeBackground } from "@/utils/imageProcessor";

interface ImageProcessingToolProps {
  productName: string;
  productBrand: string;
  onImageProcessed: (file: File) => void;
}

interface SearchResultImage {
  url: string;
  title: string;
  source: string;
  selected: boolean;
}

const ImageProcessingTool: React.FC<ImageProcessingToolProps> = ({
  productName,
  productBrand,
  onImageProcessed
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<Blob | null>(null);
  const [processedPreview, setProcessedPreview] = useState<string | null>(null);
  const [isBackgroundRemoved, setIsBackgroundRemoved] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<SearchResultImage[]>([]);
  const [viewMode, setViewMode] = useState<'upload' | 'search'>('upload');

  useEffect(() => {
    if (productName || productBrand) {
      const query = `${productBrand} ${productName}`.trim();
      setSearchQuery(query);
    }
  }, [productName, productBrand]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Reset processing state
    setIsProcessing(false);
    setProcessedImage(null);
    setProcessedPreview(null);
    setIsBackgroundRemoved(false);
    
    // Set original image
    setOriginalImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setOriginalPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    
    // Generate search query if empty
    if (!searchQuery) {
      const query = `${productBrand} ${productName}`.trim();
      setSearchQuery(query || file.name);
    }
  };

  const handleBackgroundRemoval = async () => {
    if (!originalImage || !originalPreview) {
      toast.error("Veuillez d'abord sélectionner une image");
      return;
    }

    setIsProcessing(true);
    try {
      // Load image for processing
      const img = new Image();
      img.src = originalPreview;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // Process image
      const processedBlob = await removeBackground(img);
      
      // Create preview
      const url = URL.createObjectURL(processedBlob);
      setProcessedPreview(url);
      setProcessedImage(processedBlob);
      setIsBackgroundRemoved(true);
      toast.success("Arrière-plan supprimé avec succès");
    } catch (error) {
      console.error("Erreur lors de la suppression de l'arrière-plan:", error);
      toast.error("Erreur lors de la suppression de l'arrière-plan");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUseProcessedImage = () => {
    if (!processedImage) {
      toast.error("Aucune image traitée disponible");
      return;
    }

    // Create SEO-friendly filename
    const cleanBrand = productBrand?.replace(/[^a-zA-Z0-9]/g, '-') || 'brand';
    const cleanModel = productName?.replace(/[^a-zA-Z0-9]/g, '-') || 'product';
    const timestamp = Date.now();
    const filename = `${cleanBrand}-${cleanModel}-iTakecare-leasing-informatique-reconditionne-${timestamp}.webp`;

    // Convert blob to file with SEO filename
    const file = new File([processedImage], filename, { type: 'image/webp' });
    
    // Pass the processed file to parent component
    onImageProcessed(file);
    
    toast.success("Image optimisée ajoutée");
  };

  const searchImages = async () => {
    if (!searchQuery.trim()) {
      toast.error("Veuillez entrer une requête de recherche");
      return;
    }

    setIsSearching(true);
    setSearchResults([]);

    try {
      // Simulation de résultats de recherche - dans une implémentation réelle, 
      // ceci serait remplacé par un appel à une API comme Google Custom Search ou Bing Image Search
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulating image search results from e-commerce sites
      const mockSites = ['coolblue.be', 'krefel.be', 'mediamarkt.be', 'vandenborre.be', 'fnac.be'];
      const mockResults: SearchResultImage[] = Array(10).fill(null).map((_, i) => {
        const randomSite = mockSites[Math.floor(Math.random() * mockSites.length)];
        // Use placeholder images with different colors to simulate different product images
        const placeholderColor = Math.floor(Math.random() * 999999).toString(16).padStart(6, '0');
        return {
          url: `https://via.placeholder.com/600/${placeholderColor}?text=${encodeURIComponent(searchQuery)}`,
          title: `${searchQuery} - Image ${i + 1}`,
          source: randomSite,
          selected: false
        };
      });
      
      setSearchResults(mockResults);
      toast.success(`${mockResults.length} images trouvées`);
    } catch (error) {
      console.error("Erreur lors de la recherche d'images:", error);
      toast.error("Erreur lors de la recherche d'images");
    } finally {
      setIsSearching(false);
    }
  };

  const toggleImageSelection = (index: number) => {
    const updatedResults = [...searchResults];
    updatedResults[index].selected = !updatedResults[index].selected;
    setSearchResults(updatedResults);
    
    // Update selectedImages array
    const selected = updatedResults.filter(img => img.selected);
    setSelectedImages(selected);
    
    // Limit to 5 selections
    if (selected.length > 5) {
      toast.warning("Vous ne pouvez sélectionner que 5 images maximum");
      updatedResults[index].selected = false;
      setSearchResults(updatedResults);
      setSelectedImages(updatedResults.filter(img => img.selected));
    }
  };

  const useSelectedImage = async (imageUrl: string) => {
    setIsProcessing(true);
    try {
      // Fetch the image from URL
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Create File object
      const filename = `image-${Date.now()}.${blob.type.split('/')[1] || 'jpg'}`;
      const file = new File([blob], filename, { type: blob.type });
      
      // Set as original image
      setOriginalImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Reset processed image
      setProcessedImage(null);
      setProcessedPreview(null);
      setIsBackgroundRemoved(false);
      
      // Switch to upload view
      setViewMode('upload');
      
      toast.success("Image sélectionnée pour traitement");
    } catch (error) {
      console.error("Erreur lors du chargement de l'image:", error);
      toast.error("Erreur lors du chargement de l'image");
    } finally {
      setIsProcessing(false);
    }
  };

  const processSelectedImages = async () => {
    if (selectedImages.length === 0) {
      toast.error("Veuillez sélectionner au moins une image");
      return;
    }
    
    // Pour l'instant, on traite seulement la première image sélectionnée
    // Dans une implémentation complète, on traiterait toutes les images sélectionnées
    await useSelectedImage(selectedImages[0].url);
  };

  return (
    <Card className="mt-4 border-dashed border-primary/40 bg-muted/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center">
          <Wand2 className="h-4 w-4 mr-2 text-primary" />
          Assistant de traitement d'image
        </CardTitle>
        <CardDescription>
          Optimisez vos images de produits en quelques clics (suppression d'arrière-plan, optimisation SEO)
        </CardDescription>
        
        <div className="flex mt-2 space-x-2">
          <Button 
            variant={viewMode === 'upload' ? "default" : "outline"} 
            size="sm"
            onClick={() => setViewMode('upload')}
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            Uploader une image
          </Button>
          <Button 
            variant={viewMode === 'search' ? "default" : "outline"} 
            size="sm" 
            onClick={() => setViewMode('search')}
          >
            <Search className="h-4 w-4 mr-2" />
            Chercher des images
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {viewMode === 'upload' ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="product-image">Sélectionner une image</Label>
              <Input
                id="product-image"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
            </div>

            {originalPreview && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Image originale</div>
                  <div className="relative border rounded-md overflow-hidden bg-white aspect-square flex items-center justify-center">
                    <img
                      src={originalPreview}
                      alt="Image originale"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Image traitée</div>
                  <div className="relative border rounded-md overflow-hidden bg-[url('/placeholder.svg')] aspect-square flex items-center justify-center">
                    {isProcessing ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : processedPreview ? (
                      <img
                        src={processedPreview}
                        alt="Image traitée"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <div className="text-center p-4 text-muted-foreground">
                        <ImageIcon className="h-8 w-8 mb-2 mx-auto" />
                        <p>Cliquez sur "Supprimer l'arrière-plan" pour traiter l'image</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button 
                type="button" 
                onClick={handleBackgroundRemoval}
                disabled={!originalImage || isProcessing}
                className="flex-1"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4 mr-2" />
                )}
                Supprimer l'arrière-plan
              </Button>
              
              <Button
                type="button"
                onClick={handleUseProcessedImage}
                disabled={!processedImage}
                variant="default"
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-2" />
                Utiliser cette image
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Input
                  type="text"
                  placeholder="Rechercher des images"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchImages()}
                  className="flex-1"
                />
                <Button 
                  onClick={searchImages}
                  disabled={isSearching || !searchQuery.trim()}
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Rechercher
                </Button>
              </div>
            </div>
            
            {isSearching ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : searchResults.length > 0 ? (
              <>
                <div className="text-sm mb-2">
                  Sélectionnez jusqu'à 5 images (sélectionnées: {selectedImages.length}/5)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {searchResults.map((image, index) => (
                    <div 
                      key={index}
                      className={`relative aspect-square border rounded-md overflow-hidden ${image.selected ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => toggleImageSelection(index)}
                    >
                      <img 
                        src={image.url} 
                        alt={image.title}
                        className="w-full h-full object-cover"
                      />
                      {image.selected && (
                        <div className="absolute top-1 right-1 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
                        {image.source}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-end space-x-2 mt-4">
                  <Button
                    onClick={processSelectedImages}
                    disabled={selectedImages.length === 0}
                    variant="default"
                  >
                    <Image className="h-4 w-4 mr-2" />
                    Traiter {selectedImages.length > 0 ? `(${selectedImages.length})` : ''}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <Search className="h-8 w-8 mb-2" />
                <p>Aucun résultat. Essayez une nouvelle recherche.</p>
              </div>
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground pt-0">
        La suppression d'arrière-plan s'effectue localement dans le navigateur sans envoi à un service externe.
      </CardFooter>
    </Card>
  );
};

export default ImageProcessingTool;
