
import React, { useState, useEffect, useRef, useMemo } from "react";
import { ArrowLeft, ArrowRight, ZoomIn } from "lucide-react";
import { toast } from "sonner";

interface ProductImageDisplayProps {
  imageUrl: string;
  altText: string;
  imageUrls?: string[];
}

const ProductImageDisplay: React.FC<ProductImageDisplayProps> = ({ 
  imageUrl, 
  altText,
  imageUrls = []
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Références pour éviter les rendus en boucle
  const mountedRef = useRef(true);
  const processingRef = useRef(false);
  const loadedImagesRef = useRef<Set<string>>(new Set());
  
  // Traitement et dédoublonnage des images en une seule fois
  const allImages = useMemo(() => {
    if (processingRef.current) return [];
    
    const isValidImageUrl = (url: string | null | undefined): boolean => {
      if (!url || typeof url !== 'string' || url.trim() === '') return false;
      if (url === '/placeholder.svg') return false;
      
      return !(
        url.includes('.emptyFolderPlaceholder') || 
        url.split('/').pop()?.startsWith('.') ||
        url.includes('undefined') ||
        url.endsWith('/')
      );
    };
    
    // Utiliser un Map pour dédoublonner les URLs par leur chemin de base
    const uniqueUrlsMap = new Map<string, string>();
    
    // Traiter l'image principale si valide
    if (isValidImageUrl(imageUrl)) {
      const baseMainUrl = imageUrl.split('?')[0];
      uniqueUrlsMap.set(baseMainUrl, imageUrl);
    }
    
    // Traiter les images secondaires si valides
    if (Array.isArray(imageUrls)) {
      imageUrls.forEach(url => {
        if (isValidImageUrl(url)) {
          const baseUrl = url.split('?')[0];
          uniqueUrlsMap.set(baseUrl, url);
        }
      });
    }
    
    // Convertir le Map en tableau
    return Array.from(uniqueUrlsMap.values());
  }, [imageUrl, imageUrls]);
  
  // Fonction d'ajout de timestamp pour le cache-busting
  const processImageUrl = (url: string): string => {
    if (!url || url === '/placeholder.svg') return "/placeholder.svg";
    
    try {
      const baseUrl = url.split('?')[0];
      const timestamp = Date.now();
      return `${baseUrl}?t=${timestamp}`;
    } catch (e) {
      return url || "/placeholder.svg";
    }
  };
  
  // Effet pour initialiser l'image sélectionnée
  useEffect(() => {
    if (allImages.length === 0) {
      setSelectedImage('/placeholder.svg');
      setIsLoading(false);
      setHasError(true);
      return;
    }
    
    // Ne définir l'image que si c'est nécessaire pour éviter les rendus en boucle
    if (!selectedImage || !allImages.includes(selectedImage.split('?')[0])) {
      const processedUrl = processImageUrl(allImages[0]);
      setSelectedImage(processedUrl);
      setCurrentIndex(0);
      setIsLoading(true);
      setHasError(false);
    }
  }, [allImages, selectedImage]);
  
  // Nettoyage lors du démontage du composant
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Gestionnaire de chargement d'image réussi
  const handleImageLoad = () => {
    if (!mountedRef.current) return;
    
    setIsLoading(false);
    setHasError(false);
    
    // Ajouter l'URL à la liste des images chargées avec succès
    if (selectedImage) {
      loadedImagesRef.current.add(selectedImage.split('?')[0]);
    }
  };

  // Gestionnaire d'erreur de chargement d'image
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (!mountedRef.current) return;
    
    setIsLoading(false);
    setHasError(true);
    
    const imgElement = e.target as HTMLImageElement;
    const currentSrc = imgElement.src;
    
    // Éviter les tentatives infinies de rechargement
    if (currentSrc.includes('/placeholder.svg')) {
      return;
    }

    // Si l'image n'a pas déjà été tentée plusieurs fois, essayer de la recharger
    const baseUrl = currentSrc.split('?')[0];
    if (!baseUrl.includes('/placeholder.svg')) {
      const attempts = (loadedImagesRef.current.has(baseUrl) ? 0 : 1);
      
      if (attempts < 2) {
        // Délai pour éviter les boucles de rechargement
        setTimeout(() => {
          if (mountedRef.current) {
            // Utiliser un nouveau timestamp pour éviter les problèmes de cache
            imgElement.src = `${baseUrl}?t=${Date.now()}&retry=${attempts}`;
          }
        }, 800);
      } else {
        imgElement.src = '/placeholder.svg';
      }
    } else {
      imgElement.src = '/placeholder.svg';
    }
  };
  
  // Gestionnaire de clic sur une miniature
  const handleThumbnailClick = (url: string, index: number) => {
    if (currentIndex === index) return;
    
    const processedUrl = processImageUrl(url);
    setSelectedImage(processedUrl);
    setCurrentIndex(index);
    setIsLoading(true);
    setHasError(false);
  };

  // Navigation entre les images
  const navigateImage = (direction: 'prev' | 'next') => {
    if (allImages.length <= 1) return;
    
    let newIndex = currentIndex;
    
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : allImages.length - 1;
    } else {
      newIndex = currentIndex < allImages.length - 1 ? currentIndex + 1 : 0;
    }
    
    if (newIndex === currentIndex) return;
    
    const processedUrl = processImageUrl(allImages[newIndex]);
    setSelectedImage(processedUrl);
    setCurrentIndex(newIndex);
    setIsLoading(true);
    setHasError(false);
  };

  // Affichage en cas d'absence d'images
  if (allImages.length === 0) {
    return (
      <div className="flex flex-col-reverse md:flex-row md:gap-4">
        <div className="flex-1 relative">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md relative group">
            <div className="relative w-full aspect-square sm:aspect-[4/3] md:aspect-[3/2] flex items-center justify-center p-4">
              <div className="text-center text-gray-500">
                <img 
                  src="/placeholder.svg"
                  alt={altText}
                  className="max-w-full max-h-full object-contain mx-auto"
                />
                <div className="mt-2 text-sm">Image non disponible</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col-reverse md:flex-row md:gap-4">
      {allImages.length > 1 && (
        <div className="flex overflow-x-auto md:overflow-y-auto md:flex-col md:h-[400px] gap-2 mt-4 md:mt-0 md:w-24 md:min-w-24 pb-2 md:pb-0">
          {allImages.map((url, index) => {
            const imageKey = `thumb-${index}-${url.split('/').pop()?.split('?')[0] || index}`;
            
            return (
              <button
                key={imageKey}
                className={`relative min-w-16 h-16 border-2 rounded-lg transition-all 
                  ${currentIndex === index ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200 hover:border-gray-300'}
                  overflow-hidden flex-shrink-0`}
                onClick={() => handleThumbnailClick(url, index)}
              >
                <img 
                  src={processImageUrl(url)} 
                  alt={`${altText} - image ${index + 1}`}
                  className="w-full h-full object-cover object-center"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder.svg";
                  }}
                />
                {currentIndex === index && (
                  <div className="absolute inset-0 bg-indigo-500 bg-opacity-10"></div>
                )}
              </button>
            );
          })}
        </div>
      )}
      
      <div className="flex-1 relative">
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md relative group">
          <div className="relative w-full aspect-square sm:aspect-[4/3] md:aspect-[3/2] flex items-center justify-center p-4">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              </div>
            )}
            {selectedImage && (
              <img 
                key={`main-${currentIndex}-${selectedImage.split('?')[0]}`}
                src={selectedImage} 
                alt={altText}
                className={`max-w-full max-h-full object-contain transition-all duration-300 
                  ${isLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            )}
            {hasError && (
              <div className="absolute bottom-2 left-2 bg-red-50 text-red-500 text-xs px-2 py-1 rounded z-20">
                Image non disponible
              </div>
            )}
            
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-black bg-opacity-40 rounded-full p-2">
                <ZoomIn className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
          
          {allImages.length > 1 && (
            <>
              <button 
                onClick={() => navigateImage('prev')}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white rounded-full shadow p-2 opacity-70 hover:opacity-100 transition-opacity"
                aria-label="Image précédente"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button 
                onClick={() => navigateImage('next')}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white rounded-full shadow p-2 opacity-70 hover:opacity-100 transition-opacity"
                aria-label="Image suivante"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
        
        {allImages.length > 1 && (
          <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-full">
            {currentIndex + 1} / {allImages.length}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductImageDisplay;
