
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Image as ImageIcon } from "lucide-react";
import { Product } from "@/types/catalog";

interface ProductFormImagesTabProps {
  productToEdit?: Product;
  isEditMode: boolean;
}

const ProductFormImagesTab: React.FC<ProductFormImagesTabProps> = ({ 
  productToEdit, 
  isEditMode 
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Gestion des images
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isEditMode && productToEdit?.image_url ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Image actuelle</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative group">
                <img
                  src={productToEdit.image_url}
                  alt={productToEdit.name}
                  className="w-full h-48 object-cover rounded-lg border"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg" />
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-6">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {isEditMode ? "Ajouter ou remplacer des images" : "Ajouter des images"}
            </h3>
            <p className="text-muted-foreground mb-4">
              Glissez-déposez vos images ici ou cliquez pour parcourir.
            </p>
            <p className="text-sm text-muted-foreground">
              Formats acceptés: JPG, PNG, WebP (max 5MB par image)
            </p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>À venir :</strong> Système d'upload d'images complet avec aperçu, 
            suppression et réorganisation des images.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductFormImagesTab;
