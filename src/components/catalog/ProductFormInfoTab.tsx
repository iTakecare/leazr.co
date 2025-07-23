
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
import { Upload, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getBrands, getCategories } from "@/services/catalogService";
import { useAuth } from "@/context/AuthContext";

interface ProductFormInfoTabProps {
  formData: any;
  onUpdate: (data: any) => void;
  onImageUpload: (file: File) => void;
  isEditing?: boolean;
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
  formData,
  onUpdate,
  onImageUpload,
  isEditing = false
}) => {
  const { isAdmin } = useAuth();
  const [imagePreview, setImagePreview] = useState<string | null>(
    formData.image_url || formData.imageUrl || null
  );

  const { data: brands = [] } = useQuery<Brand[]>({
    queryKey: ["brands"],
    queryFn: getBrands,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  useEffect(() => {
    if (formData.image_url || formData.imageUrl) {
      setImagePreview(formData.image_url || formData.imageUrl);
    }
  }, [formData.image_url, formData.imageUrl]);

  const handleInputChange = (field: string, value: any) => {
    onUpdate({ [field]: value });
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageUpload(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      imageUrl: imagePreview || '',
      image_url: imagePreview || '',
    };

    if (isEditing) {
      // Pour la mise à jour, on n'inclut que les champs modifiés
      const updateData = {
        name: formData.name,
        brand_id: formData.brand_id,
        category_id: formData.category_id,
        description: formData.description,
        price: formData.price,
        monthly_price: formData.monthly_price,
        active: formData.active,
        admin_only: formData.admin_only,
        image_url: imagePreview || '',
      };
    } else {
      // Pour la création, on inclut tous les champs requis
      const createData = {
        name: formData.name || '',
        brand_id: formData.brand_id || '',
        category_id: formData.category_id || '',
        description: formData.description || '',
        price: formData.price || 0,
        monthly_price: formData.monthly_price || 0,
        active: formData.active !== undefined ? formData.active : true,
        admin_only: formData.admin_only || false,
        imageUrl: imagePreview || '',
        image_url: imagePreview || '',
        company_id: formData.company_id || '',
      };
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    handleInputChange('image_url', '');
    handleInputChange('imageUrl', '');
  };

  return (
    <div className="space-y-6">
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

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Description du produit"
              rows={4}
            />
          </div>
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
    </div>
  );
};

export default ProductFormInfoTab;
