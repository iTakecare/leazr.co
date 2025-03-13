import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProductById, updateProduct, deleteProduct, uploadProductImage } from "@/services/catalogService";
import Container from "@/components/layout/Container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, Trash2, Upload, PlusCircle, MinusCircle, ChevronDown, ChevronUp, Tag, Package, Layers } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Product, ProductVariant } from "@/types/catalog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

const ProductDetail = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [specifications, setSpecifications] = useState<Record<string, string>>({});
  const [newSpecKey, setNewSpecKey] = useState("");
  const [newSpecValue, setNewSpecValue] = useState("");
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [isParentProduct, setIsParentProduct] = useState(false);
  const [parentProduct, setParentProduct] = useState<Product | null>(null);
  const [showVariants, setShowVariants] = useState(true);
  
  const { data: product, isLoading } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => getProductById(productId!),
    enabled: !!productId,
  });

  useEffect(() => {
    if (product) {
      console.log("Product data loaded:", product);
      setFormData(product);
      
      if (product.specifications) {
        setSpecifications(product.specifications as Record<string, string>);
      }
      
      if (product.variants) {
        setIsParentProduct(true);
        setVariants(product.variants);
      } else {
        setIsParentProduct(false);
      }
      
      if (product.parent_id) {
        fetchParentProduct(product.parent_id);
      }
    }
  }, [product]);
  
  const fetchParentProduct = async (parentId: string) => {
    try {
      const parent = await getProductById(parentId);
      if (parent) {
        setParentProduct(parent);
        
        if (parent.variants) {
          setVariants(parent.variants.filter(v => v.id !== productId));
        } else {
          const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('parent_id', parentId)
            .neq('id', productId);
            
          if (!error && data) {
            setVariants(data.map(item => ({
              id: item.id,
              name: item.name,
              price: Number(item.price),
              attributes: (item.variation_attributes as Record<string, string | number | boolean>) || {}
            })));
          }
        }
      }
    } catch (error) {
      console.error("Error fetching parent product:", error);
    }
  };
  
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) => 
      updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produit mis à jour avec succès");
    },
    onError: (error) => {
      toast.error("Erreur lors de la mise à jour du produit");
    }
  });
  
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      navigate("/catalog");
      toast.success("Produit supprimé avec succès");
    },
    onError: (error) => {
      toast.error("Erreur lors de la suppression du produit");
    }
  });
  
  const imageMutation = useMutation({
    mutationFn: ({ file, id }: { file: File; id: string }) => 
      uploadProductImage(file, id),
    onSuccess: (imageUrl: string) => {
      setFormData(prev => ({ ...prev, imageUrl }));
      updateMutation.mutate({ 
        id: productId!, 
        data: { imageUrl } 
      });
      toast.success("Image mise à jour avec succès");
    },
    onError: (error) => {
      toast.error("Erreur lors de la mise à jour de l'image");
    }
  });
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  
  const handleSpecificationChange = (key: string, value: string) => {
    setSpecifications({ ...specifications, [key]: value });
  };
  
  const addSpecification = () => {
    if (newSpecKey && newSpecValue) {
      handleSpecificationChange(newSpecKey, newSpecValue);
      setNewSpecKey("");
      setNewSpecValue("");
    }
  };
  
  const removeSpecification = (key: string) => {
    const newSpecs = { ...specifications };
    delete newSpecs[key];
    setSpecifications(newSpecs);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (productId) {
      updateMutation.mutate({ 
        id: productId, 
        data: { 
          ...formData,
          specifications 
        } 
      });
    }
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && productId) {
      imageMutation.mutate({ file, id: productId });
    }
  };
  
  const navigateToVariant = (variantId: string) => {
    navigate(`/catalog/${variantId}`);
  };
  
  const navigateToParent = () => {
    if (parentProduct) {
      navigate(`/catalog/${parentProduct.id}`);
    }
  };
  
  if (isLoading) {
    return (
      <Container>
        <div className="py-8 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </Container>
    );
  }
  
  if (!product) {
    return (
      <Container>
        <div className="py-8">
          <h1 className="text-2xl">Produit non trouvé</h1>
          <Button onClick={() => navigate("/catalog")} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour au catalogue
          </Button>
        </div>
      </Container>
    );
  }
  
  return (
    <Container>
      <div className="py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => navigate("/catalog")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour
          </Button>
          <h1 className="text-3xl font-bold">Éditer le produit</h1>
          {product.is_variation && parentProduct && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={navigateToParent}
              className="ml-auto"
            >
              <Layers className="mr-2 h-4 w-4" />
              Voir le produit parent
            </Button>
          )}
        </div>
        
        {product.is_variation && parentProduct && (
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <div className="flex items-center">
              <div className="mr-3">
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Ce produit est une variation de</p>
                <p className="text-lg font-semibold">{parentProduct.name}</p>
              </div>
            </div>
          </div>
        )}
        
        <Tabs defaultValue="general">
          <TabsList className="mb-4">
            <TabsTrigger value="general">Informations générales</TabsTrigger>
            <TabsTrigger value="specifications">Spécifications</TabsTrigger>
            <TabsTrigger value="variants">Variantes {variants.length > 0 && `(${variants.length})`}</TabsTrigger>
          </TabsList>
          
          <form onSubmit={handleSubmit}>
            <div className="flex justify-end mb-4">
              <div className="flex items-center gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" type="button">
                      <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer le produit</AlertDialogTitle>
                      <AlertDialogDescription>
                        Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteMutation.mutate(productId!)}>
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                
                <Button type="submit">
                  <Save className="mr-2 h-4 w-4" /> Enregistrer
                </Button>
              </div>
            </div>
            
            <TabsContent value="general" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom du produit</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name || ""}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="brand">Marque</Label>
                    <Input
                      id="brand"
                      name="brand"
                      value={formData.brand || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category">Catégorie</Label>
                    <Input
                      id="category"
                      name="category"
                      value={formData.category || ""}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="price">Prix (€)</Label>
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      value={formData.price || ""}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      rows={5}
                      value={formData.description || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Label>Image du produit</Label>
                  <div className="border rounded-md overflow-hidden aspect-square mb-4">
                    {formData.imageUrl ? (
                      <img
                        src={formData.imageUrl}
                        alt={formData.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.svg";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <p className="text-muted-foreground">Aucune image</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center">
                    <Label htmlFor="image" className="cursor-pointer">
                      <div className="flex items-center gap-2 text-primary">
                        <Upload className="h-4 w-4" />
                        <span>Télécharger une image</span>
                      </div>
                      <input
                        id="image"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </Label>
                  </div>
                  
                  {product.is_variation && product.variation_attributes && (
                    <div className="mt-6">
                      <h3 className="text-lg font-medium mb-3">Attributs de variation</h3>
                      <div className="space-y-3 bg-muted p-4 rounded-lg">
                        {Object.entries(product.variation_attributes).map(([key, value]) => (
                          <div key={key} className="grid grid-cols-2 gap-2">
                            <div className="text-sm font-medium">{key}:</div>
                            <div className="text-sm">{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="specifications" className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-medium mb-4">Spécifications techniques</h3>
                  
                  <div className="space-y-4">
                    {Object.entries(specifications).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <Input 
                          value={key} 
                          disabled 
                          className="w-1/3" 
                        />
                        <Input 
                          value={value} 
                          onChange={(e) => handleSpecificationChange(key, e.target.value)} 
                          className="w-2/3" 
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeSpecification(key)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <h4 className="text-sm font-medium mb-2">Ajouter une spécification</h4>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={newSpecKey}
                      onChange={(e) => setNewSpecKey(e.target.value)}
                      placeholder="Nom de la spécification"
                      className="w-1/3"
                    />
                    <Input 
                      value={newSpecValue}
                      onChange={(e) => setNewSpecValue(e.target.value)}
                      placeholder="Valeur"
                      className="w-2/3"
                    />
                    <Button
                      type="button"
                      onClick={addSpecification}
                    >
                      Ajouter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="variants" className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">Variantes du produit</h3>
                    {variants.length > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowVariants(!showVariants)}
                      >
                        {showVariants ? (
                          <>
                            <ChevronUp className="h-4 w-4 mr-1" />
                            Masquer
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4 mr-1" />
                            Afficher
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  
                  {isParentProduct ? (
                    <>
                      <p className="text-muted-foreground mb-4">
                        Ce produit est un produit parent avec {variants.length} variantes.
                      </p>
                      
                      {variants.length > 0 && showVariants ? (
                        <div className="space-y-3">
                          {variants.map(variant => (
                            <div 
                              key={variant.id}
                              className="border p-3 rounded-lg hover:bg-muted/50 cursor-pointer"
                              onClick={() => navigateToVariant(variant.id)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center">
                                    {variant.imageUrl ? (
                                      <img 
                                        src={variant.imageUrl} 
                                        alt={variant.name} 
                                        className="w-full h-full object-cover rounded-md"
                                      />
                                    ) : (
                                      <Package className="h-5 w-5 text-muted-foreground" />
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-medium">{variant.name}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {variant.price.toLocaleString('fr-FR', {
                                        style: 'currency',
                                        currency: 'EUR'
                                      })}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  {variant.attributes && Object.entries(variant.attributes).map(([key, value]) => (
                                    <Badge key={key} variant="outline" className="ml-2">
                                      {key}: {value}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : variants.length === 0 ? (
                        <div className="text-center p-6 bg-muted/50 rounded-lg">
                          <p>Aucune variante trouvée pour ce produit</p>
                        </div>
                      ) : null}
                    </>
                  ) : product.is_variation && parentProduct ? (
                    <>
                      <p className="text-muted-foreground mb-4">
                        Ce produit est une variante de {parentProduct.name}
                      </p>
                      
                      {variants.length > 0 && showVariants ? (
                        <>
                          <h4 className="text-md font-medium mb-2">Autres variantes du même produit :</h4>
                          <div className="space-y-3">
                            {variants.map(variant => (
                              <div 
                                key={variant.id}
                                className="border p-3 rounded-lg hover:bg-muted/50 cursor-pointer"
                                onClick={() => navigateToVariant(variant.id)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center">
                                      {variant.imageUrl ? (
                                        <img 
                                          src={variant.imageUrl} 
                                          alt={variant.name} 
                                          className="w-full h-full object-cover rounded-md"
                                        />
                                      ) : (
                                        <Package className="h-5 w-5 text-muted-foreground" />
                                      )}
                                    </div>
                                    <div>
                                      <div className="font-medium">{variant.name}</div>
                                      <div className="text-sm text-muted-foreground">
                                        {variant.price.toLocaleString('fr-FR', {
                                          style: 'currency',
                                          currency: 'EUR'
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    {variant.attributes && Object.entries(variant.attributes).map(([key, value]) => (
                                      <Badge key={key} variant="outline" className="ml-2">
                                        {key}: {value}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : null}
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-32 border rounded-md bg-muted/50">
                      <p className="text-muted-foreground">Ce produit n'a pas de variantes</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </form>
        </Tabs>
      </div>
    </Container>
  );
};

export default ProductDetail;
