
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Save } from "lucide-react";
import { Product } from "@/types/catalog";
import { useCreateProduct } from "@/hooks/products/useCreateProduct";
import { useUpdateProduct } from "@/hooks/products/useUpdateProduct";
import { getBrands, getCategories } from "@/services/catalogService";

interface ProductFormInfoTabProps {
  productToEdit?: Product;
  onSuccess: () => void;
  isEditMode: boolean;
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

interface FormData {
  name: string;
  description: string;
  short_description?: string;
  brand_id: string;
  category_id: string;
  price: number;
  stock: number;
  sku?: string;
  is_refurbished: boolean;
  condition?: string;
  purchase_price?: number;
  active: boolean;
  admin_only: boolean;
}

const ProductFormInfoTab: React.FC<ProductFormInfoTabProps> = ({ 
  productToEdit, 
  onSuccess, 
  isEditMode 
}) => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<FormData>({
    defaultValues: {
      name: "",
      description: "",
      short_description: "",
      brand_id: "",
      category_id: "",
      price: 0,
      stock: 0,
      sku: "",
      is_refurbished: false,
      condition: "",
      purchase_price: 0,
      active: true,
      admin_only: false,
    }
  });

  // Charger les marques et catégories
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log("🏷️ ProductFormInfoTab - Chargement des données de référence");
        const [brandsData, categoriesData] = await Promise.all([
          getBrands(),
          getCategories()
        ]);
        
        setBrands(brandsData);
        setCategories(categoriesData);
        console.log("🏷️ ProductFormInfoTab - Données chargées:", {
          brands: brandsData.length,
          categories: categoriesData.length
        });
      } catch (error) {
        console.error("🏷️ ProductFormInfoTab - Erreur lors du chargement:", error);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, []);

  // Initialiser le formulaire avec les données du produit en mode édition
  useEffect(() => {
    if (isEditMode && productToEdit && brands.length > 0 && categories.length > 0) {
      console.log("✏️ ProductFormInfoTab - Initialisation du formulaire avec:", {
        name: productToEdit.name,
        brand: productToEdit.brand,
        category: productToEdit.category,
        brand_id: productToEdit.brand_id,
        category_id: productToEdit.category_id
      });

      // Trouver les IDs des marques et catégories
      const selectedBrand = brands.find(b => 
        b.id === productToEdit.brand_id || 
        b.name === productToEdit.brand
      );
      const selectedCategory = categories.find(c => 
        c.id === productToEdit.category_id || 
        c.name === productToEdit.category
      );

      console.log("✏️ ProductFormInfoTab - Marque et catégorie trouvées:", {
        selectedBrand: selectedBrand?.name,
        selectedCategory: selectedCategory?.name
      });

      reset({
        name: productToEdit.name || "",
        description: productToEdit.description || "",
        short_description: productToEdit.shortDescription || productToEdit.short_description || "",
        brand_id: selectedBrand?.id || "",
        category_id: selectedCategory?.id || "",
        price: productToEdit.price || 0,
        stock: productToEdit.stock || 0,
        sku: productToEdit.sku || "",
        is_refurbished: productToEdit.is_refurbished || false,
        condition: productToEdit.condition || "",
        purchase_price: productToEdit.purchase_price || 0,
        active: productToEdit.active !== false,
        admin_only: productToEdit.admin_only || false,
      });
    }
  }, [isEditMode, productToEdit, brands, categories, reset]);

  const onSubmit = async (data: FormData) => {
    console.log("💾 ProductFormInfoTab - Soumission du formulaire:", data);
    
    try {
      if (isEditMode && productToEdit) {
        await updateProduct.mutateAsync({
          id: productToEdit.id,
          ...data
        });
      } else {
        await createProduct.mutateAsync(data);
      }
      onSuccess();
    } catch (error) {
      console.error("💾 ProductFormInfoTab - Erreur lors de la soumission:", error);
    }
  };

  const isLoading = createProduct.isPending || updateProduct.isPending || isLoadingData;

  if (isLoadingData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Chargement des données...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Informations du produit
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du produit *</Label>
              <Input
                id="name"
                {...register("name", { required: "Le nom est obligatoire" })}
                placeholder="Nom du produit"
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                {...register("sku")}
                placeholder="Code produit"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="brand_id">Marque *</Label>
              <Select 
                value={watch("brand_id")} 
                onValueChange={(value) => setValue("brand_id", value)}
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
              {errors.brand_id && (
                <p className="text-sm text-red-600">{errors.brand_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category_id">Catégorie *</Label>
              <Select 
                value={watch("category_id")} 
                onValueChange={(value) => setValue("category_id", value)}
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
              {errors.category_id && (
                <p className="text-sm text-red-600">{errors.category_id.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              {...register("description", { required: "La description est obligatoire" })}
              placeholder="Description détaillée du produit"
              rows={4}
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="short_description">Description courte</Label>
            <Textarea
              id="short_description"
              {...register("short_description")}
              placeholder="Description courte pour l'aperçu"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="price">Prix de vente (€)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                {...register("price", { valueAsNumber: true })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchase_price">Prix d'achat (€)</Label>
              <Input
                id="purchase_price"
                type="number"
                step="0.01"
                {...register("purchase_price", { valueAsNumber: true })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                type="number"
                {...register("stock", { valueAsNumber: true })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="condition">État</Label>
              <Select 
                value={watch("condition") || ""} 
                onValueChange={(value) => setValue("condition", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un état" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Neuf</SelectItem>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Bon</SelectItem>
                  <SelectItem value="fair">Correct</SelectItem>
                  <SelectItem value="poor">Mauvais</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_refurbished"
                checked={watch("is_refurbished")}
                onCheckedChange={(checked) => setValue("is_refurbished", !!checked)}
              />
              <Label htmlFor="is_refurbished">Produit reconditionné</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="active"
                checked={watch("active")}
                onCheckedChange={(checked) => setValue("active", !!checked)}
              />
              <Label htmlFor="active">Produit actif</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="admin_only"
                checked={watch("admin_only")}
                onCheckedChange={(checked) => setValue("admin_only", !!checked)}
              />
              <Label htmlFor="admin_only">Réservé aux administrateurs</Label>
            </div>
          </div>

          <div className="flex gap-4 pt-6">
            <Button type="submit" disabled={isLoading} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {isLoading ? "Enregistrement..." : isEditMode ? "Mettre à jour" : "Créer le produit"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProductFormInfoTab;
