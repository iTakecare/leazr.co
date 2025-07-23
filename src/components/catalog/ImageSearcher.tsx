
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Download, Image as ImageIcon, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { imageSearchService, SearchImageResult } from '@/services/imageSearchService';
import { Product } from '@/types/catalog';

interface ImageSearcherProps {
  product: Product;
  onImagesFound: (imageUrls: string[]) => void;
  onClose: () => void;
}

const ImageSearcher: React.FC<ImageSearcherProps> = ({ 
  product, 
  onImagesFound, 
  onClose 
}) => {
  const [searchResults, setSearchResults] = useState<SearchImageResult[]>([]);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [customQuery, setCustomQuery] = useState('');

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const query = customQuery || product.name;
      console.log(`🔍 Recherche d'images pour: ${query}`);
      
      const results = await imageSearchService.searchProductImages(
        query,
        product.brand_id || undefined, // Use brand_id for brand-specific search
        product.category || undefined
      );
      
      setSearchResults(results);
      toast.success(`${results.length} images trouvées`);
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      toast.error('Erreur lors de la recherche d\'images');
    } finally {
      setIsSearching(false);
    }
  };

  const toggleImageSelection = (imageUrl: string) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(imageUrl)) {
      newSelected.delete(imageUrl);
    } else {
      if (newSelected.size < 5) {
        newSelected.add(imageUrl);
      } else {
        toast.warning('Maximum 5 images sélectionnables');
        return;
      }
    }
    setSelectedImages(newSelected);
  };

  const handleProcessAndApply = async () => {
    if (selectedImages.size === 0) {
      toast.warning('Veuillez sélectionner au moins une image');
      return;
    }

    setIsProcessing(true);
    try {
      const selectedUrls = Array.from(selectedImages);
      console.log(`🎨 Traitement de ${selectedUrls.length} images sélectionnées`);
      
      const processedImages = await imageSearchService.processAndStandardizeImages(
        selectedUrls,
        product.name
      );
      
      const uploadedUrls = await imageSearchService.uploadProcessedImages(
        processedImages,
        product.id
      );
      
      onImagesFound(uploadedUrls);
      toast.success(`${uploadedUrls.length} images traitées et appliquées`);
      onClose();
    } catch (error) {
      console.error('Erreur lors du traitement:', error);
      toast.error('Erreur lors du traitement des images');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Recherche d'images pour "{product.name}"
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="custom-query">Personnaliser la recherche (optionnel)</Label>
            <Input
              id="custom-query"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              placeholder={`${product.name} ${product.brand || ''}`}
            />
          </div>
          
          <Button 
            onClick={handleSearch} 
            disabled={isSearching}
            className="w-full"
          >
            {isSearching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recherche en cours...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Rechercher des images
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Résultats ({searchResults.length} images)
              </span>
              <Badge variant="secondary">
                {selectedImages.size}/5 sélectionnées
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
              {searchResults.map((result, index) => (
                <div 
                  key={index}
                  className={`relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                    selectedImages.has(result.url) 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleImageSelection(result.url)}
                >
                  <div className="aspect-square">
                    <img 
                      src={result.thumbnail || result.url}
                      alt={result.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  
                  <div className="absolute top-2 right-2">
                    <Checkbox
                      checked={selectedImages.has(result.url)}
                      onChange={() => toggleImageSelection(result.url)}
                    />
                  </div>
                  
                  {selectedImages.has(result.url) && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <Check className="h-8 w-8 text-primary" />
                    </div>
                  )}
                  
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2">
                    <p className="text-xs truncate">{result.title}</p>
                    <p className="text-xs text-gray-300">{result.width}x{result.height}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleProcessAndApply}
                disabled={selectedImages.size === 0 || isProcessing}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Traitement en cours...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Traiter et appliquer ({selectedImages.size})
                  </>
                )}
              </Button>
              
              <Button variant="outline" onClick={onClose}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ImageSearcher;
