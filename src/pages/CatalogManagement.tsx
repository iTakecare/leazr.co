import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Product } from "@/types/catalog";
import {
  getCategories,
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  deleteAllProducts,
  uploadMultipleProductImages,
  getBrands
} from "@/services/catalogService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner";
import { ImageIcon, Plus, Upload, X, Layers } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useNavigate } from "react-router-dom";

const CatalogManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    brand: '',
    category: '',
    description: '',
    price: 0,
    active: true,
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: getBrands,
  });

  const addProductMutation = useMutation({
    mutationFn: addProduct,
    onSuccess: () => {
      toast.success("Product added successfully!");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsAddingProduct(false);
      setNewProduct({
        name: '',
        brand: '',
        category: '',
        description: '',
        price: 0,
        active: true,
      });
      setSelectedImage(null);
      setSelectedImages([]);
    },
    onError: (error: any) => {
      toast.error(`Failed to add product: ${error.message}`);
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string, updates: Partial<Product> }) => updateProduct(id, updates),
    onSuccess: () => {
      toast.success("Product updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error: any) => {
      toast.error(`Failed to update product: ${error.message}`);
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      toast.success("Product deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error: any) => {
      toast.error(`Failed to delete product: ${error.message}`);
    },
  });

  const deleteAllProductsMutation = useMutation({
    mutationFn: deleteAllProducts,
    onSuccess: () => {
      toast.success("All products deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error: any) => {
      toast.error(`Failed to delete all products: ${error.message}`);
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: ({ file, productId, isMainImage }: { file: File, productId: string, isMainImage?: boolean }) => uploadProductImage(file, productId, isMainImage),
    onSuccess: () => {
      toast.success("Image uploaded successfully!");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsUploading(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to upload image: ${error.message}`);
      setIsUploading(false);
    },
  });

  const uploadMultipleImagesMutation = useMutation({
    mutationFn: ({ files, productId }: { files: File[], productId: string }) => uploadMultipleProductImages(files, productId),
    onSuccess: () => {
      toast.success("Images uploaded successfully!");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsUploading(false);
      setSelectedImages([]);
    },
    onError: (error: any) => {
      toast.error(`Failed to upload images: ${error.message}`);
      setIsUploading(false);
    },
  });

  const handleAddProduct = async () => {
    try {
      const newProductId = await addProductMutation.mutateAsync(newProduct);

      if (selectedImage) {
        setIsUploading(true);
        await uploadImageMutation.mutateAsync({ file: selectedImage, productId: newProductId.id, isMainImage: true });
      }

      if (selectedImages.length > 0) {
        setIsUploading(true);
        await uploadMultipleImagesMutation.mutateAsync({ files: selectedImages, productId: newProductId.id });
      }

      setIsAddingProduct(false);
    } catch (error: any) {
      toast.error(`Failed to add product: ${error.message}`);
    }
  };

  const handleUpdateProduct = async (id: string, updates: Partial<Product>) => {
    await updateProductMutation.mutateAsync({ id, updates });
  };

  const handleDeleteProduct = async (id: string) => {
    await deleteProductMutation.mutateAsync(id);
  };

  const handleDeleteAllProducts = async () => {
    await deleteAllProductsMutation.mutateAsync();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
    }
  };

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedImages(files);
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="bg-background border-b py-4 px-6 flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Catalogue</h1>
        
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => navigate("/catalogue/regroupement")}
            className="gap-2"
            variant="default"
          >
            <Layers className="h-4 w-4" />
            Regrouper les variantes
          </Button>

          <Button variant="outline" onClick={() => window.location.reload()}>
            Actualiser
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un produit
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Ajouter un produit</DialogTitle>
                <DialogDescription>
                  Ajouter un nouveau produit au catalogue.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Nom
                  </Label>
                  <Input
                    id="name"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="brand" className="text-right">
                    Marque
                  </Label>
                  <Select onValueChange={(value) => setNewProduct({ ...newProduct, brand: value })}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Sélectionner une marque" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((brand) => (
                        <SelectItem key={brand.name} value={brand.name}>{brand.translation || brand.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category" className="text-right">
                    Catégorie
                  </Label>
                  <Select onValueChange={(value) => setNewProduct({ ...newProduct, category: value })}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Sélectionner une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.name} value={category.name}>{category.translation || category.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="description" className="text-right mt-2">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="price" className="text-right">
                    Prix
                  </Label>
                  <Input
                    type="number"
                    id="price"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="active" className="text-right">
                    Actif
                  </Label>
                  <Input
                    type="checkbox"
                    id="active"
                    checked={newProduct.active}
                    onChange={(e) => setNewProduct({ ...newProduct, active: e.target.checked })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="image" className="text-right">
                    Image principale
                  </Label>
                  <div className="col-span-3">
                    <Input
                      type="file"
                      id="image"
                      onChange={handleImageChange}
                    />
                    {selectedImage && (
                      <div className="mt-2">
                        <img
                          src={URL.createObjectURL(selectedImage)}
                          alt="Selected"
                          className="max-w-full h-20 object-cover rounded"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="images" className="text-right">
                    Images supplémentaires
                  </Label>
                  <div className="col-span-3">
                    <Input
                      type="file"
                      id="images"
                      multiple
                      onChange={handleImagesChange}
                    />
                    <div className="mt-2 flex space-x-2">
                      {selectedImages.map((image, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(image)}
                            alt={`Selected ${index}`}
                            className="max-w-[75px] h-20 object-cover rounded"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-0 right-0"
                            onClick={() => {
                              const updatedImages = [...selectedImages];
                              updatedImages.splice(index, 1);
                              setSelectedImages(updatedImages);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <Button type="submit" onClick={handleAddProduct} disabled={isUploading}>
                {isUploading ? (
                  <>
                    <Upload className="mr-2 h-4 w-4 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter
                  </>
                )}
              </Button>
            </DialogContent>
          </Dialog>
          <Button variant="destructive" onClick={handleDeleteAllProducts}>
            Vider le catalogue
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="container mx-auto max-w-5xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Marque</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Actif</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Aucun produit trouvé.
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="max-w-[75px] max-h-[75px] object-cover rounded"
                        />
                      ) : (
                        <div className="w-[75px] h-[75px] bg-gray-200 rounded flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-gray-500" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.brand}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>{product.price}</TableCell>
                    <TableCell>{product.active ? 'Oui' : 'Non'}</TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            Modifier
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Modifier le produit</DialogTitle>
                            <DialogDescription>
                              Modifier les informations du produit.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="name" className="text-right">
                                Nom
                              </Label>
                              <Input
                                id="name"
                                defaultValue={product.name}
                                onChange={(e) => handleUpdateProduct(product.id, { name: e.target.value })}
                                className="col-span-3"
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="brand" className="text-right">
                                Marque
                              </Label>
                              <Select defaultValue={product.brand} onValueChange={(value) => handleUpdateProduct(product.id, { brand: value })}>
                                <SelectTrigger className="col-span-3">
                                  <SelectValue placeholder="Sélectionner une marque" />
                                </SelectTrigger>
                                <SelectContent>
                                  {brands.map((brand) => (
                                    <SelectItem key={brand.name} value={brand.name}>{brand.translation || brand.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="category" className="text-right">
                                Catégorie
                              </Label>
                              <Select defaultValue={product.category} onValueChange={(value) => handleUpdateProduct(product.id, { category: value })}>
                                <SelectTrigger className="col-span-3">
                                  <SelectValue placeholder="Sélectionner une catégorie" />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories.map((category) => (
                                    <SelectItem key={category.name} value={category.name}>{category.translation || category.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid grid-cols-4 items-start gap-4">
                              <Label htmlFor="description" className="text-right mt-2">
                                Description
                              </Label>
                              <Textarea
                                id="description"
                                defaultValue={product.description}
                                onChange={(e) => handleUpdateProduct(product.id, { description: e.target.value })}
                                className="col-span-3"
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="price" className="text-right">
                                Prix
                              </Label>
                              <Input
                                type="number"
                                id="price"
                                defaultValue={product.price}
                                onChange={(e) => handleUpdateProduct(product.id, { price: parseFloat(e.target.value) })}
                                className="col-span-3"
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="active" className="text-right">
                                Actif
                              </Label>
                              <Input
                                type="checkbox"
                                id="active"
                                defaultChecked={product.active}
                                onChange={(e) => handleUpdateProduct(product.id, { active: e.target.checked })}
                                className="col-span-3"
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="image" className="text-right">
                                Image principale
                              </Label>
                              <div className="col-span-3">
                                <Input
                                  type="file"
                                  id="image"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setIsUploading(true);
                                      uploadImageMutation.mutate({ file: file, productId: product.id, isMainImage: true });
                                    }
                                  }}
                                />
                                {product.image_url && (
                                  <div className="mt-2">
                                    <img
                                      src={product.image_url}
                                      alt="Selected"
                                      className="max-w-full h-20 object-cover rounded"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="images" className="text-right">
                                Images supplémentaires
                              </Label>
                              <div className="col-span-3">
                                <Input
                                  type="file"
                                  id="images"
                                  multiple
                                  onChange={(e) => {
                                    const files = Array.from(e.target.files || []);
                                    if (files.length > 0) {
                                      setIsUploading(true);
                                      uploadMultipleImagesMutation.mutate({ files: files, productId: product.id });
                                    }
                                  }}
                                />
                                <div className="mt-2 flex space-x-2">
                                  {(product.image_urls || []).map((imageUrl, index) => (
                                    <div key={index} className="relative">
                                      <img
                                        src={imageUrl}
                                        alt={`Selected ${index}`}
                                        className="max-w-[75px] h-20 object-cover rounded"
                                      />
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-0 right-0"
                                        onClick={() => {
                                          const updatedImageUrls = (product.image_urls || []).filter((_, i) => i !== index);
                                          handleUpdateProduct(product.id, { image_urls: updatedImageUrls });
                                        }}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                          <Button type="submit" disabled={isUploading}>
                            {isUploading ? (
                              <>
                                <Upload className="mr-2 h-4 w-4 animate-spin" />
                                Envoi...
                              </>
                            ) : (
                              <>
                                <Plus className="mr-2 h-4 w-4" />
                                Mettre à jour
                              </>
                            )}
                          </Button>
                        </DialogContent>
                      </Dialog>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteProduct(product.id)}>
                        Supprimer
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>
    </div>
  );
};

export default CatalogManagement;
