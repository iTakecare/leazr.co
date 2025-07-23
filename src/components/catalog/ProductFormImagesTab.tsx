
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Image as ImageIcon } from "lucide-react";
import { Product } from "@/types/catalog";
import ProductImageManager from "./ProductImageManager";

interface ProductFormImagesTabProps {
  productToEdit?: Product;
  isEditMode: boolean;
  onImageUpdate?: (imageUrl: string) => void;
}

const ProductFormImagesTab: React.FC<ProductFormImagesTabProps> = ({ 
  productToEdit, 
  isEditMode,
  onImageUpdate 
}) => {
  return (
    <div className="space-y-6">
      {isEditMode && productToEdit ? (
        <ProductImageManager 
          product={productToEdit}
          onImageUpdate={onImageUpdate}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Gestion des images
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <ImageIcon className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Images non disponibles</h3>
                <p className="text-muted-foreground mb-4">
                  La gestion des images n'est disponible qu'après la création du produit.
                </p>
                <p className="text-sm text-muted-foreground">
                  Créez d'abord le produit, puis revenez ici pour ajouter des images.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProductFormImagesTab;
