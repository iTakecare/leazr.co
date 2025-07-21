
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, X, Upload, Loader2 } from "lucide-react";
import { Product } from "@/types/catalog";

interface ProductEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (product?: Product) => void;
  productToEdit?: Product;
}

const ProductEditor: React.FC<ProductEditorProps> = ({
  isOpen,
  onClose,
  onSuccess,
  productToEdit
}) => {
  const queryClient = useQueryClient();
  const isEditMode = !!productToEdit;

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    category: "",
    description: "",
    price: 0,
    monthly_price: 0,
    stock: 0,
    active: true,
    admin_only: false,
    image_url: "",
    image_urls: [] as string[],
  });

  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  // Initialize form with product data in edit mode
  useEffect(() => {
    if (isEditMode && productToEdit) {
      setFormData({
        name: productToEdit.name || "",
        brand: productToEdit.brand || "",
        category: productToEdit.category || "",
        description: productToEdit.description || "",
        price: productToEdit.price || 0,
        monthly_price: productToEdit.monthly_price || 0,
        stock: productToEdit.stock || 0,
        active: productToEdit.active !== false,
        admin_only: productToEdit.admin_only || false,
        image_url: productToEdit.image_url || "",
        image_urls: productToEdit.image_urls || [],
      });
    } else {
      // Reset form for creation mode
      setFormData({
        name: "",
        brand: "",
        category: "",
        description: "",
        price: 0,
        monthly_price: 0,
        stock: 0,
        active: true,
        admin_only: false,
        image_url: "",
        image_urls: [],
      });
    }
    setImageFiles([]);
  }, [isEditMode, productToEdit, isOpen]);

  // Load brands and categories
  useEffect(() => {
    if (isOpen) {
      loadBrandsAndCategories();
    }
  }, [isOpen]);

  const loadBrandsAndCategories = async () => {
    try {
      const { getBrands, getCategories } = await import("@/services/catalogService");
      const [brandsData, categoriesData] = await Promise.all([
        getBrands(),
        getCategories()
      ]);
      setBrands(brandsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error("Error loading brands and categories:", error);
      toast.error("Erreur lors du chargement des données");
    }
  };

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (productData: Partial<Product>) => {
      const { createProduct } = await import("@/services/catalogService");
      return createProduct(productData);
    },
    onSuccess: (newProduct) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produit créé avec succès");
      onSuccess(newProduct);
    },
    onError: (error) => {
      console.error("Error creating product:", error);
      toast.error("Erreur lors de la création du produit");
    },
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async (productData: Partial<Product>) => {
      const { updateProduct } = await import("@/services/catalogService");
      if (!productToEdit?.id) throw new Error("Product ID is required for update");
      return updateProduct(productToEdit.id, productData);
    },
    onSuccess: (updatedProduct) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", productToEdit?.id] });
      toast.success("Produit mis à jour avec succès");
      onSuccess(updatedProduct);
    },
    onError: (error) => {
      console.error("Error updating product:", error);
      toast.error("Erreur lors de la mise à jour du produit");
    },
  });

  const handleImageUpload = async (files: FileList) => {
    if (!files.length) return;

    setIsLoading(true);
    try {
      const { uploadProductImage } = await import("@/services/catalogService");
      const uploadPromises = Array.from(files).map(file => 
        uploadProductImage(file, productToEdit?.id || `temp-${Date.now()}`)
      );
      
      const imageUrls = await Promise.all(uploadPromises);
      
      setFormData(prev => ({
        ...prev,
        image_urls: [...prev.image_urls, ...imageUrls],
        image_url: prev.image_url || imageUrls[0] // Set first image as main if no main image
      }));
      
      toast.success(`${imageUrls.length} image(s) uploadée(s)`);
    } catch (error) {
      console.error("Error uploading images:", error);
      toast.error("Erreur lors de l'upload des images");
    } finally {
      setIsLoading(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => {
      const newImageUrls = prev.image_urls.filter((_, i) => i !== index);
      return {
        ...prev,
        image_urls: newImageUrls,
        image_url: prev.image_url === prev.image_urls[index] 
          ? (newImageUrls[0] || "") 
          : prev.image_url
      };
    });
  };

  const setAsMainImage = (imageUrl: string) => {
    setFormData(prev => ({
      ...prev,
      image_url: imageUrl
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Le nom du produit est obligatoire");
      return;
    }

    const productData = {
      ...formData,
      price: Number(formData.price),
      monthly_price: Number(formData.monthly_price),
      stock: Number(formData.stock),
    };

    if (isEditMode) {
      updateProductMutation.mutate(productData);
    } else {
      createProductMutation.mutate(productData);
    }
  };

  const isSubmitting = createProductMutation.isPending || updateProductMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Modifier le produit" : "Créer un nouveau produit"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nom du produit *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nom du produit"
                required
              />
            </div>

            <div>
              <Label htmlFor="brand">Marque</Label>
              <Select
                value={formData.brand}
                onValueChange={(value) => setFormData(prev => ({ ...prev, brand: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une marque" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.name}>
                      {brand.translation || brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category">Catégorie</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.translation || category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData(prev => ({ ...prev, stock: Number(e.target.value) }))}
                placeholder="Quantité en stock"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Prix d'achat (€)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                placeholder="Prix d'achat"
              />
            </div>

            <div>
              <Label htmlFor="monthly_price">Prix mensuel (€)</Label>
              <Input
                id="monthly_price"
                type="number"
                min="0"
                step="0.01"
                value={formData.monthly_price}
                onChange={(e) => setFormData(prev => ({ ...prev, monthly_price: Number(e.target.value) }))}
                placeholder="Prix mensuel"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Description du produit"
              rows={4}
            />
          </div>

          {/* Images */}
          <div>
            <Label>Images du produit</Label>
            <div className="mt-2">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Cliquez pour sélectionner des images ou glissez-déposez
                  </span>
                </label>
              </div>

              {/* Image Preview */}
              {formData.image_urls.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {formData.image_urls.map((imageUrl, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={imageUrl}
                        alt={`Product ${index + 1}`}
                        className={`w-full h-32 object-cover rounded-lg border-2 ${
                          formData.image_url === imageUrl ? 'border-blue-500' : 'border-gray-200'
                        }`}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setAsMainImage(imageUrl)}
                          className="mr-2"
                        >
                          Principal
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      {formData.image_url === imageUrl && (
                        <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                          Principal
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Status Toggles */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
              />
              <Label htmlFor="active">Produit actif</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="admin_only"
                checked={formData.admin_only}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, admin_only: checked }))}
              />
              <Label htmlFor="admin_only">Réservé aux administrateurs</Label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoading}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditMode ? "Mettre à jour" : "Créer le produit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProductEditor;
