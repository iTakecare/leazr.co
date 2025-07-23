
import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getBrands, getCategories } from "@/services/catalogService";
import { useAuth } from "@/context/AuthContext";
import { useCreateProduct } from "@/hooks/products/useCreateProduct";
import { useUpdateProduct } from "@/hooks/products/useUpdateProduct";
import AIDescriptionHelper from "./AIDescriptionHelper";

interface ProductFormInfoTabProps {
  productToEdit?: any;
  isEditMode: boolean;
  brands: any[];
  categories: any[];
  onProductCreated: () => void;
  onProductUpdated: () => void;
}

interface Brand {
  id: string;
  name: string;
  translation: string;
}

interface Category {
  id: string;
  name: string;
  translation: string;
}

export const ProductFormInfoTab: React.FC<ProductFormInfoTabProps> = ({
  productToEdit,
  isEditMode,
  brands: brandsProp,
  categories: categoriesProp,
  onProductCreated,
  onProductUpdated
}) => {
  const { isAdmin } = useAuth();
  const [formData, setFormData] = useState(productToEdit || {});
  const [imagePreview, setImagePreview] = useState<string | null>(
    productToEdit?.image_url || productToEdit?.imageUrl || null
  );

  // Hooks for product operations
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();

  const { data: brands = [] } = useQuery<Brand[]>({
    queryKey: ["brands"],
    queryFn: getBrands,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  useEffect(() => {
    if (productToEdit) {
      setFormData(productToEdit);
      if (productToEdit.image_url || productToEdit.imageUrl) {
        setImagePreview(productToEdit.image_url || productToEdit.imageUrl);
      }
    }
  }, [productToEdit]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
        setFormData(prev => ({ ...prev, image_url: e.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditMode && productToEdit) {
      // Update existing product
      const updateData = {
        id: productToEdit.id,
        name: formData.name,
        brand_id: formData.brand_id,
        category_id: formData.category_id,
        description: formData.description,
        short_description: formData.short_description,
        price: formData.price,
        monthly_price: formData.monthly_price,
        active: formData.active,
        admin_only: formData.admin_only,
        image_url: imagePreview || '',
      };
      
      updateProductMutation.mutate(updateData, {
        onSuccess: () => {
          onProductUpdated();
        }
      });
    } else {
      // Create new product
      const createData = {
        name: formData.name || '',
        brand_id: formData.brand_id || '',
        category_id: formData.category_id || '',
        description: formData.description || '',
        short_description: formData.short_description || '',
        price: formData.price || 0,
        monthly_price: formData.monthly_price || 0,
        active: formData.active !== false,
        admin_only: formData.admin_only || false,
        image_url: imagePreview || '',
      };
      
      createProductMutation.mutate(createData, {
        onSuccess: () => {
          onProductCreated();
        }
      });
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    handleInputChange('image_url', '');
    handleInputChange('imageUrl', '');
  };

  const handleDescriptionGenerated = (description: string, shortDescription: string) => {
    setFormData(prev => ({
      ...prev,
      description,
      short_description: shortDescription
    }));
  };

  const isLoading = createProductMutation.isPending || updateProductMutation.isPending;

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Image Upload Section */}
          <div className="space-y-4">
            <Label htmlFor="image">Image du produit</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              {imagePreview ? (
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="Aperçu" 
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={removeImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Cliquez pour télécharger une image
                      </span>
                      <input
                        id="image-upload"
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Product Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nom du produit *</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Nom du produit"
                required
              />
            </div>

            <div>
              <Label htmlFor="brand">Marque *</Label>
              <Select 
                value={formData.brand_id || ''} 
                onValueChange={(value) => handleInputChange('brand_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une marque" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category">Catégorie *</Label>
              <Select 
                value={formData.category_id || ''} 
                onValueChange={(value) => handleInputChange('category_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* AI Description Generator */}
        {formData.name && formData.brand_id && formData.category_id && (
          <AIDescriptionHelper
            productName={formData.name}
            categoryId={formData.category_id}
            brandId={formData.brand_id}
            categories={categories}
            brands={brands}
            onDescriptionGenerated={handleDescriptionGenerated}
          />
        )}

        {/* Description Fields */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="short_description">Description courte</Label>
            <Textarea
              id="short_description"
              value={formData.short_description || ''}
              onChange={(e) => handleInputChange('short_description', e.target.value)}
              placeholder="Description courte du produit"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Description détaillée du produit"
              rows={6}
            />
          </div>
        </div>

        {/* Pricing Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isAdmin() && (
            <div>
              <Label htmlFor="price">Prix d'achat (€)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price || ''}
                onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
          )}

          <div>
            <Label htmlFor="monthly_price">Prix mensuel (€)</Label>
            <Input
              id="monthly_price"
              type="number"
              step="0.01"
              value={formData.monthly_price || ''}
              onChange={(e) => handleInputChange('monthly_price', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Status Section */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={formData.active !== false}
              onCheckedChange={(checked) => handleInputChange('active', checked)}
            />
            <Label htmlFor="active">Produit actif</Label>
          </div>

          {isAdmin() && (
            <div className="flex items-center space-x-2">
              <Switch
                id="admin_only"
                checked={formData.admin_only || false}
                onCheckedChange={(checked) => handleInputChange('admin_only', checked)}
              />
              <Label htmlFor="admin_only">Admin seulement</Label>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button type="submit" className="px-8" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isEditMode ? "Mise à jour..." : "Création..."}
              </>
            ) : (
              <>
                {isEditMode ? "Mettre à jour" : "Créer le produit"}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProductFormInfoTab;
