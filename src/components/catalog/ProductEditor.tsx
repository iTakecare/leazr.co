
import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addProduct, uploadProductImage } from "@/services/catalogService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Upload, X, Plus, Image } from "lucide-react";
import { Product } from "@/types/catalog";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName("");
    setCategory("");
    setPrice("");
    setDescription("");
    setImageFiles([]);
    setImagePreviews([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const addProductMutation = useMutation({
    mutationFn: (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => addProduct(productData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      
      // Upload images if any were selected
      if (imageFiles.length > 0 && data.id) {
        uploadImages(data.id);
      } else {
        setIsSubmitting(false);
        handleSuccess();
      }
    },
    onError: (error) => {
      toast.error("Erreur lors de l'ajout du produit");
      setIsSubmitting(false);
    }
  });

  const uploadImages = async (productId: string) => {
    try {
      // Upload main image first
      if (imageFiles.length > 0) {
        await uploadProductImage(imageFiles[0], productId, true);
      }
      
      // Upload additional images
      for (let i = 1; i < imageFiles.length && i < 5; i++) {
        await uploadProductImage(imageFiles[i], productId, false);
      }
      
      setIsSubmitting(false);
      handleSuccess();
    } catch (error) {
      toast.error("Le produit a été ajouté mais certaines images n'ont pas pu être téléchargées");
      setIsSubmitting(false);
      handleSuccess();
    }
  };

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
    const files = e.target.files;
    if (!files) return;

    // Limit to 5 images total
    const newFiles = Array.from(files).slice(0, 5 - imageFiles.length);
    if (newFiles.length === 0) return;
    
    // Add new files to existing files (up to 5 total)
    const updatedFiles = [...imageFiles, ...newFiles].slice(0, 5);
    setImageFiles(updatedFiles);

    // Create previews for the new files
    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => {
          // Ensure we don't exceed 5 previews
          const updated = [...prev, reader.result as string].slice(0, 5);
          return updated;
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
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

        <ScrollArea className="pr-4 mt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
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
              <Label>Images du produit (max 5)</Label>
              
              {imagePreviews.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative border rounded-md overflow-hidden aspect-square">
                      <img
                        src={preview}
                        alt={`Aperçu ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      {index === 0 && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-1">
                          Image principale
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {imagePreviews.length < 5 && (
                    <div 
                      className="border border-dashed rounded-md flex items-center justify-center cursor-pointer aspect-square bg-muted/50" 
                      onClick={() => document.getElementById("image-upload")?.click()}
                    >
                      <div className="text-center space-y-1">
                        <Plus className="mx-auto h-6 w-6 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Ajouter</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center border border-dashed rounded-md p-6 cursor-pointer" onClick={() => document.getElementById("image-upload")?.click()}>
                  <div className="text-center space-y-2">
                    <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Cliquez pour télécharger des images (max 5)</p>
                  </div>
                </div>
              )}
              
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
                multiple
              />
              
              <p className="text-xs text-muted-foreground mt-2">
                La première image sera utilisée comme image principale.
                {imagePreviews.length > 0 && ` ${5 - imagePreviews.length} emplacement(s) restant(s).`}
              </p>
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
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default ProductEditor;
