
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllProductImages, updateProductImage } from "@/services/catalogService";
import { Loader2, Search, Pencil, Save, X, Image, Eye, Upload, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { getImageUrlWithCacheBuster } from "@/utils/imageUtils";

interface ProductImage {
  id: string;
  productId: string;
  productName: string;
  imageUrl: string;
  imageName: string;
  imageAlt: string;
  isMain: boolean;
}

const ProductImageLibrary = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedImage, setSelectedImage] = useState<ProductImage | null>(null);
  const [editImageName, setEditImageName] = useState("");
  const [editImageAlt, setEditImageAlt] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  // Fetch all product images
  const { data: images = [], isLoading, error, refetch } = useQuery({
    queryKey: ["product-images"],
    queryFn: getAllProductImages
  });

  // Update image mutation
  const updateImageMutation = useMutation({
    mutationFn: updateProductImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-images"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Image mise à jour avec succès");
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la mise à jour: ${error.message}`);
    }
  });

  // Filter images based on search term and active tab
  const filteredImages = images.filter((image: ProductImage) => {
    const matchesSearch = image.productName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         image.imageName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         image.imageAlt.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "main") return matchesSearch && image.isMain;
    if (activeTab === "noalt") return matchesSearch && (!image.imageAlt || image.imageAlt.trim() === "");
    
    return matchesSearch;
  });

  // Open edit dialog for an image
  const handleEditImage = (image: ProductImage) => {
    setSelectedImage(image);
    setEditImageName(image.imageName || getFileNameFromUrl(image.imageUrl));
    setEditImageAlt(image.imageAlt || "");
    setIsEditDialogOpen(true);
  };

  // Extract filename from URL
  const getFileNameFromUrl = (url: string): string => {
    try {
      const urlParts = url.split('/');
      let fileName = urlParts[urlParts.length - 1];
      // Remove query parameters if any
      fileName = fileName.split('?')[0];
      return fileName;
    } catch (error) {
      return "image";
    }
  };

  // Save image updates
  const handleSaveImageDetails = () => {
    if (!selectedImage) return;
    
    updateImageMutation.mutate({
      id: selectedImage.productId,
      imageData: {
        imageUrl: selectedImage.imageUrl,
        newName: editImageName,
        altText: editImageAlt
      }
    });
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditDialogOpen(false);
    setSelectedImage(null);
    setEditImageName("");
    setEditImageAlt("");
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Bibliothèque d'images produits</CardTitle>
        <CardDescription>
          Gérez les images de vos produits, modifiez leurs noms et leurs attributs alt pour le SEO.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Search and filters */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une image..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                Grille
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                Liste
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Actualiser
              </Button>
            </div>
          </div>
          
          {/* Tabs for filtering */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 w-full max-w-md">
              <TabsTrigger value="all">Toutes les images</TabsTrigger>
              <TabsTrigger value="main">Images principales</TabsTrigger>
              <TabsTrigger value="noalt">Sans alt</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Loading state */}
          {isLoading && (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          
          {/* Error state */}
          {error && (
            <div className="text-center py-8 text-red-500">
              Erreur lors du chargement des images: {(error as Error).message}
            </div>
          )}
          
          {/* Empty state */}
          {!isLoading && filteredImages.length === 0 && (
            <div className="text-center py-12">
              <Image className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="mt-4 text-lg font-medium">Aucune image trouvée</p>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? `Aucune image ne correspond à "${searchTerm}"`
                  : "Commencez par ajouter des images à vos produits"}
              </p>
            </div>
          )}
          
          {/* Grid view */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredImages.map((image: ProductImage) => (
                <div 
                  key={`${image.productId}-${image.imageUrl}`}
                  className="border rounded-md overflow-hidden flex flex-col"
                >
                  <div className="relative h-40 bg-gray-100 flex items-center justify-center">
                    <img 
                      src={getImageUrlWithCacheBuster(image.imageUrl)} 
                      alt={image.imageAlt || "Product image"}
                      className="max-h-full max-w-full object-contain p-2"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.svg";
                      }}
                    />
                    {image.isMain && (
                      <Badge className="absolute top-2 left-2 bg-green-500">Principale</Badge>
                    )}
                  </div>
                  <div className="p-3 flex-1 flex flex-col">
                    <h4 className="text-sm font-medium truncate">{image.productName}</h4>
                    <p className="text-xs text-muted-foreground truncate">
                      {image.imageName || getFileNameFromUrl(image.imageUrl)}
                    </p>
                    <div className="flex mt-2 gap-2 justify-end">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="h-8 px-2" 
                        onClick={() => handleEditImage(image)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* List view */}
          {viewMode === "list" && (
            <div className="border rounded-md overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted">
                    <th className="py-2 px-4 text-left text-sm font-medium">Image</th>
                    <th className="py-2 px-4 text-left text-sm font-medium">Produit</th>
                    <th className="py-2 px-4 text-left text-sm font-medium">Nom de fichier</th>
                    <th className="py-2 px-4 text-left text-sm font-medium">Alt</th>
                    <th className="py-2 px-4 text-left text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredImages.map((image: ProductImage) => (
                    <tr 
                      key={`${image.productId}-${image.imageUrl}`}
                      className="border-t hover:bg-muted/50"
                    >
                      <td className="py-2 px-4">
                        <div className="relative h-12 w-12 bg-gray-100 flex items-center justify-center rounded-md">
                          <img 
                            src={getImageUrlWithCacheBuster(image.imageUrl)} 
                            alt={image.imageAlt || "Product image"}
                            className="max-h-full max-w-full object-contain p-1"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/placeholder.svg";
                            }}
                          />
                          {image.isMain && (
                            <div className="absolute -top-1 -right-1">
                              <Badge className="h-4 text-[10px] bg-green-500">Main</Badge>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-4 text-sm truncate max-w-[150px]">
                        {image.productName}
                      </td>
                      <td className="py-2 px-4 text-sm truncate max-w-[150px]">
                        {image.imageName || getFileNameFromUrl(image.imageUrl)}
                      </td>
                      <td className="py-2 px-4 text-sm truncate max-w-[150px]">
                        {image.imageAlt || (
                          <span className="text-muted-foreground italic">Non défini</span>
                        )}
                      </td>
                      <td className="py-2 px-4 text-sm">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="h-8 px-2" 
                          onClick={() => handleEditImage(image)}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Modifier
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier les détails de l'image</DialogTitle>
          </DialogHeader>
          
          {selectedImage && (
            <div className="space-y-4">
              <div className="flex justify-center p-2 bg-gray-100 rounded-md">
                <img 
                  src={getImageUrlWithCacheBuster(selectedImage.imageUrl)} 
                  alt={selectedImage.imageAlt || "Image preview"}
                  className="max-h-[200px] object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder.svg";
                  }}
                />
              </div>
              
              <div>
                <Label htmlFor="product-name">Produit</Label>
                <Input 
                  id="product-name" 
                  value={selectedImage.productName} 
                  disabled 
                />
              </div>
              
              <div>
                <Label htmlFor="image-name">Nom de l'image</Label>
                <Input 
                  id="image-name" 
                  value={editImageName} 
                  onChange={(e) => setEditImageName(e.target.value)}
                  placeholder="Nom du fichier"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Le nom sera utilisé pour améliorer le référencement SEO.
                </p>
              </div>
              
              <div>
                <Label htmlFor="image-alt">Texte alternatif (Alt)</Label>
                <Input 
                  id="image-alt" 
                  value={editImageAlt} 
                  onChange={(e) => setEditImageAlt(e.target.value)}
                  placeholder="Description de l'image pour l'accessibilité"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Le texte alternatif est utilisé par les lecteurs d'écran et les moteurs de recherche.
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit}>
              <X className="h-4 w-4 mr-1" />
              Annuler
            </Button>
            <Button 
              onClick={handleSaveImageDetails} 
              disabled={updateImageMutation.isPending}
            >
              {updateImageMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ProductImageLibrary;
