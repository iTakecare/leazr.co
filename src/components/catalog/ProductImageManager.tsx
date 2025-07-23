
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  Search, 
  Trash2, 
  Image as ImageIcon, 
  Download,
  Star,
  RotateCcw 
} from 'lucide-react';
import { toast } from 'sonner';
import { Product } from '@/types/catalog';
import { uploadFile, deleteFile, createBucketIfNotExists } from '@/services/fileStorage';
import ImageSearcher from './ImageSearcher';

interface ProductImageManagerProps {
  product: Product;
  onImageUpdate?: (imageUrl: string) => void;
}

interface ProductImage {
  id: string;
  url: string;
  isPrimary: boolean;
  order: number;
}

const ProductImageManager: React.FC<ProductImageManagerProps> = ({ 
  product, 
  onImageUpdate 
}) => {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);

  // Initialize images from product data
  React.useEffect(() => {
    const productImages: ProductImage[] = [];
    
    // Add primary image
    if (product.image_url) {
      productImages.push({
        id: 'primary',
        url: product.image_url,
        isPrimary: true,
        order: 0
      });
    }
    
    // Add additional images
    if (product.image_urls && Array.isArray(product.image_urls)) {
      product.image_urls.forEach((url, index) => {
        if (url !== product.image_url) {
          productImages.push({
            id: `additional-${index}`,
            url,
            isPrimary: false,
            order: index + 1
          });
        }
      });
    }
    
    setImages(productImages);
  }, [product]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    // Limiter à 5 images maximum
    const remainingSlots = 5 - images.length;
    if (remainingSlots <= 0) {
      toast.warning('Maximum 5 images par produit');
      return;
    }
    
    const filesToProcess = acceptedFiles.slice(0, remainingSlots);
    setIsUploading(true);
    
    try {
      // Créer le bucket si nécessaire
      await createBucketIfNotExists('product-images');
      
      const uploadPromises = filesToProcess.map(async (file, index) => {
        const fileName = `${product.id}-${Date.now()}-${index}.${file.name.split('.').pop()}`;
        const filePath = `products/${product.id}/${fileName}`;
        
        const uploadedUrl = await uploadFile('product-images', file, filePath);
        
        if (!uploadedUrl) {
          throw new Error(`Échec de l'upload pour ${file.name}`);
        }
        
        return {
          id: `uploaded-${Date.now()}-${index}`,
          url: uploadedUrl,
          isPrimary: images.length === 0 && index === 0, // Premier image = primaire si aucune autre
          order: images.length + index
        };
      });
      
      const newImages = await Promise.all(uploadPromises);
      setImages(prev => [...prev, ...newImages]);
      
      // Mettre à jour l'image principale si c'est la première
      if (images.length === 0 && newImages.length > 0) {
        onImageUpdate?.(newImages[0].url);
      }
      
      toast.success(`${newImages.length} image(s) ajoutée(s) avec succès`);
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      toast.error('Erreur lors de l\'upload des images');
    } finally {
      setIsUploading(false);
    }
  }, [images, product.id, onImageUpdate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 5,
    disabled: images.length >= 5
  });

  const handleSearchResults = async (imageUrls: string[]) => {
    try {
      const newImages: ProductImage[] = imageUrls.map((url, index) => ({
        id: `searched-${Date.now()}-${index}`,
        url,
        isPrimary: images.length === 0 && index === 0,
        order: images.length + index
      }));
      
      setImages(prev => [...prev, ...newImages]);
      
      // Mettre à jour l'image principale si c'est la première
      if (images.length === 0 && newImages.length > 0) {
        onImageUpdate?.(newImages[0].url);
      }
      
      toast.success(`${newImages.length} image(s) ajoutée(s) depuis la recherche`);
    } catch (error) {
      console.error('Erreur lors de l\'ajout des images:', error);
      toast.error('Erreur lors de l\'ajout des images');
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
      const imageToDelete = images.find(img => img.id === imageId);
      if (!imageToDelete) return;
      
      // Supprimer du stockage si c'est une image uploadée
      if (imageToDelete.url.includes('supabase')) {
        const urlParts = imageToDelete.url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `products/${product.id}/${fileName}`;
        
        await deleteFile('product-images', filePath);
      }
      
      // Retirer de la liste
      const updatedImages = images.filter(img => img.id !== imageId);
      setImages(updatedImages);
      
      // Si on supprime l'image primaire, faire de la première image la nouvelle primaire
      if (imageToDelete.isPrimary && updatedImages.length > 0) {
        updatedImages[0].isPrimary = true;
        onImageUpdate?.(updatedImages[0].url);
      }
      
      toast.success('Image supprimée avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression de l\'image');
    }
  };

  const handleSetPrimary = (imageId: string) => {
    const updatedImages = images.map(img => ({
      ...img,
      isPrimary: img.id === imageId
    }));
    
    setImages(updatedImages);
    
    const primaryImage = updatedImages.find(img => img.isPrimary);
    if (primaryImage) {
      onImageUpdate?.(primaryImage.url);
      toast.success('Image principale mise à jour');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Images du produit
            </span>
            <Badge variant="secondary">
              {images.length}/5
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={() => setIsSearchOpen(true)}
              variant="outline"
              className="flex-1"
            >
              <Search className="mr-2 h-4 w-4" />
              Rechercher en ligne
            </Button>
            
            <div 
              {...getRootProps()} 
              className={`flex-1 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                isDragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-gray-300 hover:border-gray-400'
              } ${images.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input {...getInputProps()} />
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Upload className="h-4 w-4" />
                {isUploading ? 'Upload en cours...' : 'Glisser ou cliquer'}
              </div>
            </div>
          </div>

          {/* Images Grid */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {images.map((image) => (
                <div 
                  key={image.id}
                  className="relative group border rounded-lg overflow-hidden"
                >
                  <div className="aspect-square">
                    <img 
                      src={image.url}
                      alt={`Image ${image.order + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Overlay avec actions */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {!image.isPrimary && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleSetPrimary(image.id)}
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteImage(image.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Badge primaire */}
                  {image.isPrimary && (
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-primary">
                        <Star className="h-3 w-3 mr-1" />
                        Principale
                      </Badge>
                    </div>
                  )}
                  
                  {/* Numéro d'ordre */}
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary">
                      {image.order + 1}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          {images.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune image pour ce produit</p>
              <p className="text-sm">Utilisez la recherche en ligne ou uploadez des fichiers</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de recherche d'images */}
      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Recherche d'images pour le produit</DialogTitle>
          </DialogHeader>
          <ImageSearcher
            product={product}
            onImagesFound={handleSearchResults}
            onClose={() => setIsSearchOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductImageManager;
