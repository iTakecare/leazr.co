
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Product } from "@/types/catalog";
import { updateProduct, addProduct } from "@/services/catalogService";
import { useParams } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { Plus, Check, X, Upload, Loader2 } from "lucide-react";
import { generateSeoAltText } from "@/utils/imageProcessor";
import { InputWithCounter } from "@/components/ui/input-with-counter";
import ImageProcessingTool from "@/components/catalog/ImageProcessingTool";

interface ProductEditorProps {
  product?: Product;
  isEditing?: boolean;
}

const ProductEditor: React.FC<ProductEditorProps> = ({ product, isEditing = false }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();

  const [formData, setFormData] = useState<Partial<Product>>({
    name: "",
    brand: "",
    category: "",
    description: "",
    price: 0,
    active: true,
    shortDescription: "",
    sku: "",
    specifications: {},
    image_alts: [],
  });
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        brand: product.brand,
        category: product.category,
        description: product.description,
        price: product.price,
        active: product.active,
        shortDescription: product.shortDescription,
        sku: product.sku,
        imageUrl: product.imageUrl,
        image_alts: product.image_alts,
        specifications: product.specifications,
        // Conserver les attributs de variante
        variation_attributes: product.variation_attributes,
        is_parent: product.is_parent,
      });
      setPreviewImage(product.imageUrl || null);
    }
  }, [product]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const inputElement = e.target as HTMLInputElement;
    const isCheckbox = inputElement.type === 'checkbox';
    
    setFormData((prev) => ({
      ...prev,
      [name]: isCheckbox ? inputElement.checked : value,
    }));
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: parseFloat(value),
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleImageUpload = async (file: File) => {
    setIsImageUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("upload_preset", "ml_default");

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();
      if (data.secure_url) {
        setFormData((prev) => ({
          ...prev,
          imageUrl: data.secure_url,
        }));
        setPreviewImage(data.secure_url);
        toast.success("Image uploaded successfully!");
      } else {
        toast.error("Failed to upload image.");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Error uploading image.");
    } finally {
      setIsImageUploading(false);
    }
  };

  const mutation = useMutation({
    mutationFn: isEditing ? 
      (productData: Partial<Product>) => updateProduct(id as string, productData) : 
      (productData: Partial<Product>) => addProduct(productData as Omit<Product, 'id' | 'createdAt' | 'updatedAt'>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(`Product ${isEditing ? "updated" : "created"}!`);
      navigate("/catalog");
    },
    onError: (error: any) => {
      toast.error(
        `Error ${isEditing ? "updating" : "creating"} product: ${error?.message || error}`
      );
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const productData = {
      ...formData,
      price: parseFloat(formData.price?.toString() || "0"),
      image_alts: formData.image_alts || [],
      specifications: formData.specifications || {},
    };

    mutation.mutate(productData);
  };

  const addAltText = () => {
    setFormData((prev) => {
      const newAlt = generateSeoAltText(
        prev.brand || "",
        prev.name || "",
        (prev.image_alts?.length || 0) + 1
      );
      return {
        ...prev,
        image_alts: [...(prev.image_alts || []), newAlt],
      };
    });
  };

  const updateAltText = (index: number, value: string) => {
    setFormData((prev) => {
      const updatedAlts = [...(prev.image_alts || [])];
      updatedAlts[index] = value;
      return {
        ...prev,
        image_alts: updatedAlts,
      };
    });
  };

  const removeAltText = (index: number) => {
    setFormData((prev) => {
      const updatedAlts = [...(prev.image_alts || [])];
      updatedAlts.splice(index, 1);
      return {
        ...prev,
        image_alts: updatedAlts,
      };
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Product" : "Create New Product"}</CardTitle>
          <CardDescription>
            {isEditing
              ? "Edit the product details here."
              : "Enter the product details to create a new product."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                type="text"
                id="name"
                name="name"
                value={formData.name || ""}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="brand">Brand</Label>
              <Input
                type="text"
                id="brand"
                name="brand"
                value={formData.brand || ""}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                type="text"
                id="category"
                name="category"
                value={formData.category || ""}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input
                type="text"
                id="sku"
                name="sku"
                value={formData.sku || ""}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description || ""}
              onChange={handleChange}
            />
          </div>

          <div>
            <Label htmlFor="shortDescription">Short Description</Label>
            <InputWithCounter
              name="shortDescription"
              value={formData.shortDescription || ""}
              onChange={handleChange}
              maxLength={255}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Price</Label>
              <Input
                type="number"
                id="price"
                name="price"
                value={formData.price?.toString() || ""}
                onChange={handlePriceChange}
                step="0.01"
              />
            </div>
            <div>
              <Label htmlFor="active">Active</Label>
              <Switch
                id="active"
                name="active"
                checked={formData.active || false}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, active: checked }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="image">Image</Label>
            <div className="flex items-center space-x-4">
              <Input
                type="file"
                id="image"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <Label htmlFor="image" className="cursor-pointer bg-secondary text-secondary-foreground rounded-md px-4 py-2 hover:bg-secondary/80">
                {selectedImage ? "Change Image" : "Upload Image"}
              </Label>
              {selectedImage && (
                <Button type="button" variant="outline" size="sm" onClick={() => {
                  setSelectedImage(null);
                  setPreviewImage(null);
                  setFormData(prev => ({ ...prev, imageUrl: null }));
                }}>
                  <X className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              )}
              {isImageUploading && <Loader2 className="h-5 w-5 animate-spin" />}
            </div>
            {previewImage && (
              <div className="mt-2">
                <img
                  src={previewImage}
                  alt="Product Preview"
                  className="max-h-40 rounded-md object-contain"
                />
              </div>
            )}
          </div>

          <div>
            <Label>SEO Alt Text</Label>
            <div className="space-y-2">
              {(formData.image_alts || []).map((alt, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    type="text"
                    value={alt}
                    onChange={(e) => updateAltText(index, e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAltText(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="secondary" size="sm" onClick={addAltText}>
                <Plus className="h-4 w-4 mr-2" />
                Add Alt Text
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center">
            <Upload className="h-4 w-4 mr-2 text-primary" />
            Image Processing
          </CardTitle>
          <CardDescription>
            Improve your product images with our image processing tool.
          </CardDescription>
        </CardHeader>
        {isEditing && (
          <ImageProcessingTool
            productName={formData.name || ''}
            productBrand={formData.brand || ''}
            onImageProcessed={(file: File) => {
              if (file) {
                handleImageUpload(file);
              }
            }}
          />
        )}
      </Card>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="ghost" onClick={() => navigate("/catalog")}>
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              {isEditing ? "Update Product" : "Create Product"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default ProductEditor;
