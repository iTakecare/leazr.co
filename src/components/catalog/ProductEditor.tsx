
import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addProduct, uploadProductImage } from "@/services/catalogService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

interface ProductEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ProductEditor: React.FC<ProductEditorProps> = ({ isOpen, onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName("");
    setCategory("");
    setPrice("");
    setDescription("");
    setImageFile(null);
    setImagePreview(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const addProductMutation = useMutation({
    mutationFn: addProduct,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      
      // Si une image a été choisie, on l'upload
      if (imageFile && data.id) {
        uploadImageMutation.mutate({ file: imageFile, id: data.id });
      } else {
        setIsSubmitting(false);
        handleSuccess();
      }
    },
    onError: () => {
      setIsSubmitting(false);
    }
  });

  const uploadImageMutation = useMutation({
    mutationFn: ({ file, id }: { file: File; id: string }) => uploadProductImage(file, id),
    onSuccess: () => {
      setIsSubmitting(false);
      handleSuccess();
    },
    onError: () => {
      toast.error("Le produit a été ajouté mais l'image n'a pas pu être téléchargée");
      setIsSubmitting(false);
      handleSuccess();
    }
  });

  const handleSuccess = () => {
    resetForm();
    if (onSuccess) {
      onSuccess();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !category || !price) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setIsSubmitting(true);

    addProductMutation.mutate({
      name,
      category,
      price: parseFloat(price),
      description,
      imageUrl: "",
      specifications: {}
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Ajouter un produit</SheetTitle>
          <SheetDescription>
            Ajoutez un nouveau produit au catalogue.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="required">Nom du produit</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom du produit"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category" className="required">Catégorie</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Catégorie du produit"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price" className="required">Prix (€)</Label>
            <Input
              id="price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description du produit"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Image du produit</Label>
            
            {imagePreview ? (
              <div className="relative border rounded-md overflow-hidden aspect-square mb-2">
                <img
                  src={imagePreview}
                  alt="Aperçu"
                  className="w-full h-full object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={removeImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center border border-dashed rounded-md p-6 cursor-pointer" onClick={() => document.getElementById("image-upload")?.click()}>
                <div className="text-center space-y-2">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Cliquez pour télécharger une image</p>
                </div>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>
            )}
          </div>

          <SheetFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2 h-4 w-4 border-2 border-t-transparent rounded-full"></span>
                  Ajout en cours...
                </span>
              ) : (
                "Ajouter le produit"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default ProductEditor;
