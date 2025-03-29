
import React, { useCallback } from 'react';
import { toast } from "sonner";
import { useProductImages } from './image-manager/useProductImages';
import ImageUploader from './image-manager/ImageUploader';
import ImageGalleryGrid from './image-manager/ImageGalleryGrid';
import ErrorDisplay from './image-manager/ErrorDisplay';
import LoadingPlaceholder from './image-manager/LoadingPlaceholder';

interface ProductImageManagerProps {
  productId: string;
  onChange?: (images: any[]) => void;
  onSetMainImage?: (imageUrl: string) => void;
}

const ProductImageManager: React.FC<ProductImageManagerProps> = ({
  productId,
  onChange,
  onSetMainImage
}) => {
  const {
    images,
    isUploading,
    isLoadingImages,
    errorMessage,
    getUniqueImageUrl,
    handleRetry,
    handleFileChange,
    handleDelete,
  } = useProductImages({ productId, onChange });
  
  const handleSetMainImage = useCallback((imageInfo: any) => {
    const originalUrl = imageInfo.originalUrl || imageInfo.url;
    if (onSetMainImage) {
      onSetMainImage(originalUrl);
      toast.success("Image principale définie avec succès");
    }
  }, [onSetMainImage]);
  
  if (errorMessage) {
    return <ErrorDisplay errorMessage={errorMessage} handleRetry={handleRetry} />;
  }
  
  if (isLoadingImages && images.length === 0) {
    return <LoadingPlaceholder />;
  }

  return (
    <div className="space-y-4">
      <ImageUploader
        isUploading={isUploading}
        isLoadingImages={isLoadingImages}
        handleFileChange={handleFileChange}
        handleRetry={handleRetry}
      />

      <ImageGalleryGrid
        images={images}
        isLoading={isLoadingImages && images.length > 0}
        getUniqueImageUrl={getUniqueImageUrl}
        handleSetMainImage={handleSetMainImage}
        handleDelete={handleDelete}
      />
    </div>
  );
};

export default ProductImageManager;
