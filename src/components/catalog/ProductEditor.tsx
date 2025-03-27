import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { addProduct, uploadProductImage, updateProduct } from "@/services/catalogService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, X, Plus, Image, Euro, Tag, Layers, ArrowRight, Info, ChevronLeft, Settings, RefreshCw, Save, Check, Pencil, Search } from "lucide-react";
import { Product, ProductVariationAttributes, ProductAttributes, VariantCombinationPrice } from "@/types/catalog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { updateProductVariationAttributes, createVariantCombinationPrice, getVariantCombinationPrices, deleteVariantCombinationPrice } from "@/services/variantPriceService";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getAttributes } from "@/services/attributeService";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit } from "lucide-react";

const productCategories = [
  "laptop",
  "desktop",
  "tablet",
  "smartphone",
  "accessories",
  "printer",
  "monitor",
  "software",
  "networking",
  "server",
  "storage",
  "other"
];

const categoryTranslations: Record<string, string> = {
  "laptop": "Ordinateur portable",
  "desktop": "Ordinateur de bureau",
  "tablet": "Tablette",
  "smartphone": "Smartphone",
  "accessories": "Accessoires",
  "printer": "Imprimante",
  "monitor": "Écran",
  "software": "Logiciel",
  "networking": "Réseau",
  "server": "Serveur",
  "storage": "Stockage",
  "other": "Autre"
};

const popularBrands = [
  "Apple",
  "Samsung",
  "HP",
  "Dell",
  "Lenovo",
  "Asus",
  "Acer",
  "Microsoft",
  "Sony",
  "LG",
  "Huawei",
  "Canon",
  "Xerox",
  "Logitech",
  "Brother",
  "Autre"
];

interface ProductEditorProps {
  onSuccess?: () => void;
  product?: Product;
  isEditing?: boolean;
}

const ProductEditor: React.FC<ProductEditorProps> = ({ 
  onSuccess,
  product,
  isEditing = false
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("basic");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("");
  const [monthlyPrice, setMonthlyPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [imageAltTexts, setImageAltTexts] = useState<string[]>([]);
  const [slug, setSlug] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");

  const [variationAttributes, setVariationAttributes] = useState<ProductVariationAttributes>({});
  const [newAttributeName, setNewAttributeName] = useState("");
  const [newAttributeValues, setNewAttributeValues] = useState("");
  const [isParentProduct, setIsParentProduct] = useState(false);
  const [generatedVariants, setGeneratedVariants] = useState<any[]>([]);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);

  const [variantCombinations, setVariantCombinations] = useState<VariantCombinationPrice[]>([]);
  const [showVariantDialog, setShowVariantDialog] = useState(false);
  const [currentVariantAttributes, setCurrentVariantAttributes] = useState<ProductAttributes>({});
  const [currentVariantPrice, setCurrentVariantPrice] = useState("");
  const [currentVariantMonthlyPrice, setCurrentVariantMonthlyPrice] = useState("");
  const [currentVariantStock, setCurrentVariantStock] = useState("");
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);

  const { data: predefinedAttributes } = useQuery({
    queryKey: ["attributes"],
    queryFn: getAttributes
  });

  const { data: fetchedVariantCombinations, refetch: refetchVariants } = useQuery({
    queryKey: ["variant-combinations", product?.id],
    queryFn: () => getVariantCombinationPrices(product?.id || ""),
    enabled: isEditing && !!product?.id && product.is_parent
  });

  useEffect(() => {
    if (fetchedVariantCombinations) {
      setVariantCombinations(fetchedVariantCombinations);
    }
  }, [fetchedVariantCombinations]);

  useEffect(() => {
    if (isEditing && product) {
      setName(product.name || "");
      setCategory(product.category || "");
      setBrand(product.brand || "");
      setPrice(product.price?.toString() || "");
      setMonthlyPrice(product.monthly_price?.toString() || "");
      setDescription(product.description || "");
      setIsParentProduct(product.is_parent || false);
      
      if (product.meta) {
        setMetaTitle(product.meta.title || "");
        setMetaDescription(product.meta.description || "");
        setKeywords(product.meta.keywords || "");
        setSlug(product.meta.slug || "");
        setCanonicalUrl(product.meta.canonical_url || "");
      }
      
      if (product.variation_attributes) {
        setVariationAttributes(product.variation_attributes);
      }
      
      if (product.image_url) {
        setImagePreviews([product.image_url]);
      }
      
      if (product.image_urls && Array.isArray(product.image_urls)) {
        setImagePreviews(prev => [...prev, ...product.image_urls || []].filter(Boolean));
      }
      
      if (product.image_alt_texts && Array.isArray(product.image_alt_texts)) {
        setImageAltTexts(product.image_alt_texts);
      } else {
        setImageAltTexts(Array(imagePreviews.length).fill(""));
      }

      if (product.is_parent && product.id) {
        refetchVariants();
      }
    }
  }, [isEditing, product, refetchVariants]);

  useEffect(() => {
    if (name && !slug) {
      const generatedSlug = name
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setSlug(generatedSlug);
    }
  }, [name, slug]);

  const resetForm = () => {
    setName("");
    setCategory("");
    setBrand("");
    setPrice("");
    setMonthlyPrice("");
    setDescription("");
    setImageFiles([]);
    setImagePreviews([]);
    setVariationAttributes({});
    setNewAttributeName("");
    setNewAttributeValues("");
    setIsParentProduct(false);
    setActiveTab("basic");
    setVariantCombinations([]);
    
    setMetaTitle("");
    setMetaDescription("");
    setKeywords("");
    setImageAltTexts([]);
    setSlug("");
    setCanonicalUrl("");
  };

  const handleGoBack = () => {
    navigate("/catalog");
  };

  const addProductMutation = useMutation({
    mutationFn: (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => 
      isEditing && product ? 
        updateProduct(product.id, productData) : 
        addProduct(productData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      
      const productData = data as Product;
      
      if (imageFiles.length > 0 && productData.id) {
        uploadImages(productData.id);
      } else {
        finishProductCreation(productData.id);
      }
    },
    onError: (error) => {
      console.error(`Erreur lors de ${isEditing ? "la modification" : "l'ajout"} du produit:`, error);
      toast.error(`Erreur lors de ${isEditing ? "la modification" : "l'ajout"} du produit`);
      setIsSubmitting(false);
    }
  });

  const createVariantCombinationMutation = useMutation({
    mutationFn: (data: Omit<VariantCombinationPrice, 'id' | 'created_at' | 'updated_at'>) => 
      createVariantCombinationPrice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["variant-combinations", product?.id] });
      toast.success("Combinaison de variante ajoutée avec succès");
      setShowVariantDialog(false);
      resetVariantForm();
      refetchVariants();
    },
    onError: (error) => {
      console.error("Erreur lors de la création de la combinaison de variante:", error);
      toast.error("Erreur lors de la création de la combinaison de variante");
    }
  });

  const deleteVariantCombinationMutation = useMutation({
    mutationFn: (id: string) => deleteVariantCombinationPrice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["variant-combinations", product?.id] });
      toast.success("Combinaison de variante supprimée avec succès");
      refetchVariants();
    },
    onError: (error) => {
      console.error("Erreur lors de la suppression de la combinaison de variante:", error);
      toast.error("Erreur lors de la suppression de la combinaison de variante");
    }
  });

  const uploadImages = async (productId: string) => {
    try {
      console.log(`Starting to upload ${imageFiles.length} images for product ${productId}`);
      
      if (imageFiles.length > 0) {
        console.log(`Uploading main image: ${imageFiles[0].name}`);
        await uploadProductImage(imageFiles[0], productId, true);
      }
      
      for (let i = 1; i < imageFiles.length && i < 5; i++) {
        console.log(`Uploading additional image ${i}: ${imageFiles[i].name}`);
        await uploadProductImage(imageFiles[i], productId, false);
      }
      
      console.log("All images uploaded successfully");
      finishProductCreation(productId);
    } catch (error) {
      console.error("Erreur lors du téléchargement des images:", error);
      toast.error("Le produit a été ajouté mais certaines images n'ont pas pu être téléchargées");
      finishProductCreation(productId);
    }
  };

  const finishProductCreation = async (productId: string) => {
    try {
      if (isParentProduct && Object.keys(variationAttributes).length > 0) {
        try {
          await updateProductVariationAttributes(productId, variationAttributes);
          toast.success("Attributs de variante enregistrés avec succès");
        } catch (error) {
          console.error("Erreur lors de l'enregistrement des attributs de variante:", error);
          toast.error("Erreur lors de l'enregistrement des attributs de variante");
        }
      }
    } catch (error) {
      console.error("Erreur lors de la finalisation de la création du produit:", error);
    } finally {
      setIsSubmitting(false);
      handleSuccess();
    }
  };

  const handleSuccess = () => {
    resetForm();
    if (onSuccess) {
      onSuccess();
    }
    toast.success(`Le produit a été ${isEditing ? "modifié" : "ajouté"} avec succès`);
    navigate("/catalog");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !category || (!isParentProduct && !price)) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setIsSubmitting(true);

    try {
      const productData = {
        name,
        category,
        price: isParentProduct ? 0 : parseFloat(price) || 0,
        monthly_price: isParentProduct ? 0 : (monthlyPrice ? parseFloat(monthlyPrice) : undefined),
        description,
        brand: brand || "",
        imageUrl: product?.image_url || "",
        specifications: product?.specifications || {},
        active: true,
        is_parent: isParentProduct,
        stock: isParentProduct ? 0 : undefined,
        variation_attributes: isParentProduct ? variationAttributes : {},
        meta: {
          title: metaTitle || name,
          description: metaDescription,
          keywords,
          slug,
          canonical_url: canonicalUrl,
        },
        image_alt_texts: imageAltTexts.length > 0 ? imageAltTexts : undefined
      };

      addProductMutation.mutate(productData);
    } catch (error) {
      console.error("Erreur lors de la préparation des données:", error);
      toast.error("Erreur lors de la préparation des données du produit");
      setIsSubmitting(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    console.log(`Selected ${files.length} new image files`);
    const newFiles = Array.from(files).slice(0, 5 - imageFiles.length);
    if (newFiles.length === 0) return;
    
    const updatedFiles = [...imageFiles, ...newFiles].slice(0, 5);
    setImageFiles(updatedFiles);

    setImageAltTexts(prev => {
      const newAltTexts = [...prev];
      while (newAltTexts.length < updatedFiles.length) {
        newAltTexts.push("");
      }
      return newAltTexts;
    });

    newFiles.forEach(file => {
      console.log(`Processing file: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => {
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
    setImageAltTexts(prev => prev.filter((_, i) => i !== index));
  };

  const handleAltTextChange = (index: number, text: string) => {
    setImageAltTexts(prev => {
      const newAltTexts = [...prev];
      newAltTexts[index] = text;
      return newAltTexts;
    });
  };
  
  const generateSeoDescription = () => {
    if (description) {
      const truncated = description.substring(0, 155);
      setMetaDescription(truncated + (description.length > 155 ? "..." : ""));
      toast.success("Description méta générée à partir de la description");
    } else {
      toast.error("Veuillez d'abord ajouter une description produit");
    }
  };

  const generateKeywords = () => {
    const parts = [name, brand, categoryTranslations[category] || category];
    const keywordsStr = parts.filter(Boolean).join(", ");
    setKeywords(keywordsStr);
    toast.success("Mots-clés générés à partir des informations produit");
  };

  const generateAltText = (index: number) => {
    const position = index === 0 ? "" : ` vue ${index + 1}`;
    let altText = `${name}${position}`;
    
    if (brand) {
      altText += ` ${brand}`;
    }
    
    if (category) {
      altText += ` - ${categoryTranslations[category] || category}`;
    }
    
    handleAltTextChange(index, altText);
    toast.success(`Texte alternatif généré pour l'image ${index + 1}`);
  };

  const handleAddAttribute = () => {
    if (!newAttributeName || !newAttributeValues) {
      toast.error("Veuillez saisir un nom d'attribut et au moins une valeur");
      return;
    }
    
    const values = newAttributeValues.split(',').map(v => v.trim()).filter(Boolean);
    
    if (values.length === 0) {
      toast.error("Veuillez saisir au moins une valeur pour l'attribut");
      return;
    }
    
    setVariationAttributes(prev => ({
      ...prev,
      [newAttributeName]: values
    }));
    
    setNewAttributeName("");
    setNewAttributeValues("");
  };

  const handleRemoveAttribute = (attributeName: string) => {
    setVariationAttributes(prev => {
      const updated = { ...prev };
      delete updated[attributeName];
      return updated;
    });
  };

  const generateAttributeCombinations = () => {
    const filteredAttributes: ProductVariationAttributes = {};
    selectedAttributes.forEach(attr => {
      if (variationAttributes[attr]) {
        filteredAttributes[attr] = variationAttributes[attr];
      }
    });

    if (Object.keys(filteredAttributes).length === 0) {
      toast.error("Veuillez sélectionner au moins un attribut pour générer des variantes");
      return;
    }

    const attributeNames = Object.keys(filteredAttributes);
    const combinations: Array<ProductAttributes> = [];

    const generateCombos = (current: ProductAttributes, depth: number) => {
      if (depth === attributeNames.length) {
        combinations.push({...current});
        return;
      }

      const attrName = attributeNames[depth];
      const values = filteredAttributes[attrName];

      values.forEach(val => {
        current[attrName] = val;
        generateCombos(current, depth + 1);
      });
    };

    generateCombos({}, 0);
    setGeneratedVariants(combinations);
  };

  const handleGenerateVariants = () => {
    generateAttributeCombinations();
    setShowGenerateDialog(true);
  };

  const handleAddVariantCombination = (variant: ProductAttributes) => {
    setCurrentVariantAttributes(variant);
    setShowVariantDialog(true);
  };

  const handleEditVariantCombination = (variant: VariantCombinationPrice) => {
    setEditingVariantId(variant.id);
    setCurrentVariantAttributes(variant.attributes);
    setCurrentVariantPrice(variant.price.toString());
    setCurrentVariantMonthlyPrice(variant.monthly_price?.toString() || "");
    setCurrentVariantStock(variant.stock?.toString() || "");
    setShowVariantDialog(true);
  };

  const resetVariantForm = () => {
    setCurrentVariantAttributes({});
    setCurrentVariantPrice("");
    setCurrentVariantMonthlyPrice("");
    setCurrentVariantStock("");
    setEditingVariantId(null);
  };

  const handleSaveVariantCombination = () => {
    if (!product?.id) {
      toast.error("Vous devez d'abord enregistrer le produit principal");
      return;
    }

    if (!currentVariantPrice) {
      toast.error("Veuillez saisir un prix pour cette variante");
      return;
    }

    const combinationData = {
      product_id: product.id,
      attributes: currentVariantAttributes,
      price: parseFloat(currentVariantPrice) || 0,
      monthly_price: currentVariantMonthlyPrice ? parseFloat(currentVariantMonthlyPrice) : undefined,
      stock: currentVariantStock ? parseInt(currentVariantStock) : undefined
    };

    createVariantCombinationMutation.mutate(combinationData);
  };

  const handleDeleteVariantCombination = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette combinaison de variante ?")) {
      deleteVariantCombinationMutation.mutate(id);
    }
  };

  const handleAttributeSelectionChange = (attributeName: string) => {
    setSelectedAttributes(prev => {
      if (prev.includes(attributeName)) {
        return prev.filter(attr => attr !== attributeName);
      } else {
        return [...prev, attributeName];
      }
    });
  };

  const renderVariantAttributeCheckboxes = () => {
    return Object.keys(variationAttributes).map(attrName => (
      <div key={attrName} className="flex items-center space-x-2">
        <input
          type="checkbox"
          id={`attr-${attrName}`}
          checked={selectedAttributes.includes(attrName)}
          onChange={() => handleAttributeSelectionChange(attrName)}
          className="rounded border-gray-300 text-primary focus:ring-primary"
        />
        <Label htmlFor={`attr-${attrName}`}>{attrName}</Label>
      </div>
    ));
  };

  return (
    <div className="container py-6 max-w-4xl mx-auto">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={handleGoBack} className="mr-2">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Retour au catalogue
        </Button>
        <h1 className="text-2xl font-bold">
          {isEditing ? "Modifier le produit" : "Créer un nouveau produit"}
        </h1>
      </div>

      <Card className="mb-8">
        <CardHeader className="pb-2">
          <CardTitle>{isEditing ? "Modifier le produit" : "Créer un nouveau produit"}</CardTitle>
          <CardDescription>
            {isEditing 
              ? "Modifiez les caractéristiques de votre produit." 
              : "Ajoutez un nouveau produit au catalogue avec toutes ses caractéristiques."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 w-full mb-6">
              <TabsTrigger value="basic">
                <Info className="h-4 w-4 mr-2" />
                Informations
              </TabsTrigger>
              <TabsTrigger value="images">
                <Image className="h-4 w-4 mr-2" />
                Images
              </TabsTrigger>
              <TabsTrigger value="seo">
                <Search className="h-4 w-4 mr-2" />
                SEO
              </TabsTrigger>
              <TabsTrigger value="variants" disabled={!isParentProduct}>
                <Layers className="h-4 w-4 mr-2" />
                Variantes
              </TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="space-y-6">
              <TabsContent value="basic" className="space-y-6 mt-0">
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
                  <Label htmlFor="brand">Marque</Label>
                  <Select value={brand} onValueChange={setBrand}>
                    <SelectTrigger>
                      <SelectValue placeholder="Slectionner une marque" />
                    </SelectTrigger>
                    <SelectContent>
                      {popularBrands.map((brandName) => (
                        <SelectItem key={brandName} value={brandName}>
                          {brandName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category" className="required">Catégorie</Label>
                  <Select value={category} onValueChange={setCategory} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {productCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {categoryTranslations[cat] || cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_parent"
                      checked={isParentProduct}
                      onCheckedChange={setIsParentProduct}
                    />
                    <Label htmlFor="is_parent">Ce produit a des variantes</Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Activez cette option si vous souhaitez créer des variantes (tailles, couleurs, etc.)
                  </p>
                </div>

                {!isParentProduct && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="price" className="required">Prix (€)</Label>
                      <div className="relative">
                        <Input
                          id="price"
                          type="number"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          required
                          className="pl-8"
                        />
                        <Euro className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="monthly_price">Mensualité (€/mois)</Label>
                      <div className="relative">
                        <Input
                          id="monthly_price"
                          type="number"
                          value={monthlyPrice}
                          onChange={(e) => setMonthlyPrice(e.target.value)}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          className="pl-8"
                        />
                        <Euro className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">Mensualité pour le leasing du produit</p>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description du produit"
                    className="min-h-[150px]"
                  />
                </div>
              </TabsContent>

              <TabsContent value="images" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Images du produit</CardTitle>
                    <CardDescription>
                      Ajoutez jusqu'à 5 images pour votre produit. La première sera utilisée comme image principale.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {imagePreviews.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                        {imagePreviews.map((preview, index) => (
                          <div key={index} className="relative border rounded-md overflow-hidden aspect-square">
                            <img
                              src={preview}
                              alt={imageAltTexts[index] || `Aperçu ${index + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/placeholder.svg";
                              }}
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
                              <p className="text-sm text-muted-foreground">Cliquez pour télécharger des images (max 5)</p>
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
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="seo" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Optimisation pour les moteurs de recherche (SEO)</CardTitle>
                    <CardDescription>
                      Optimisez votre produit pour améliorer sa visibilité dans les moteurs de recherche.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="meta-title">Titre méta</Label>
                        <span className="text-xs text-muted-foreground">
                          {metaTitle.length}/60 caractères
                        </span>
                      </div>
                      <Input
                        id="meta-title"
                        value={metaTitle}
                        onChange={(e) => setMetaTitle(e.target.value)}
                        placeholder="Titre pour les moteurs de recherche"
                        maxLength={60}
                      />
                      <p className="text-xs text-muted-foreground">
                        Le titre qui apparaîtra dans les résultats de recherche. Si vide, le nom du produit sera utilisé.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="meta-description">Description méta</Label>
                        <span className="text-xs text-muted-foreground">
                          {metaDescription.length}/155 caractères
                        </span>
                      </div>
                      <div className="relative">
                        <Textarea
                          id="meta-description"
                          value={metaDescription}
                          onChange={(e) => setMetaDescription(e.target.value)}
                          placeholder="Description courte pour les moteurs de recherche"
                          className="pr-24"
                          maxLength={155}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-2 text-xs px-2 py-1 h-auto"
                          onClick={generateSeoDescription}
                        >
                          Générer
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Cette description apparaîtra sous le titre dans les résultats de recherche.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="keywords">Mots-clés</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-xs px-2 py-1 h-auto"
                          onClick={generateKeywords}
                        >
                          Générer
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="image-alt-texts">Textes alternatifs</Label>
                        <span className="text-xs text-muted-foreground">
                          {imageAltTexts.length}/5 textes
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {imageAltTexts.map((altText, index) => (
                          <div key={index} className="relative">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-xs font-medium">Image {index + 1}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-xs px-2 py-0 h-auto"
                                onClick={() => generateAltText(index)}
                              >
                                Générer
                              </Button>
                            </div>
                            <Input
                              value={altText}
                              onChange={(e) => handleAltTextChange(index, e.target.value)}
                              placeholder={`Texte alternatif pour l'image ${index + 1}`}
                            />
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Les textes alternatifs sont utilisés par les lecteurs d'écran et améliorent le référencement des images.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="variants" className="space-y-6 mt-0">
                {isParentProduct ? (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Attributs de variante</CardTitle>
                        <CardDescription>
                          Définissez les attributs qui différencient vos variantes (couleur, taille, etc.)
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="attribute-name">Nom de l'attribut</Label>
                              <Select value={newAttributeName} onValueChange={setNewAttributeName}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner ou saisir un nom" />
                                </SelectTrigger>
                                <SelectContent>
                                  {predefinedAttributes && predefinedAttributes.map((attr: any) => (
                                    <SelectItem key={attr.name} value={attr.name}>
                                      {attr.name}
                                    </SelectItem>
                                  ))}
                                  <SelectItem value="custom">Personnalisé...</SelectItem>
                                </SelectContent>
                              </Select>
                              {newAttributeName === "custom" && (
                                <Input
                                  className="mt-2"
                                  placeholder="Nom personnalisé de l'attribut"
                                  onChange={(e) => setNewAttributeName(e.target.value)}
                                  value=""
                                />
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="attribute-values">Valeurs possibles</Label>
                              <Textarea
                                id="attribute-values"
                                value={newAttributeValues}
                                onChange={(e) => setNewAttributeValues(e.target.value)}
                                placeholder="Valeurs séparées par des virgules (ex: Rouge, Bleu, Vert)"
                              />
                            </div>
                          </div>

                          <Button
                            type="button"
                            onClick={handleAddAttribute}
                            disabled={!newAttributeName || !newAttributeValues}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Ajouter l'attribut
                          </Button>
                        </div>

                        {Object.keys(variationAttributes).length > 0 && (
                          <div className="space-y-4 pt-4 border-t">
                            <h3 className="font-medium">Attributs définis</h3>
                            <div className="space-y-2">
                              {Object.entries(variationAttributes).map(([attrName, values]) => (
                                <div key={attrName} className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                                  <div>
                                    <span className="font-medium">{attrName}:</span>{" "}
                                    <span className="text-muted-foreground">{values.join(", ")}</span>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveAttribute(attrName)}
                                    className="text-destructive hover:text-destructive/90"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>

                            <Button
                              type="button"
                              onClick={handleGenerateVariants}
                              className="mt-4"
                              disabled={Object.keys(variationAttributes).length === 0}
                            >
                              <Layers className="h-4 w-4 mr-2" />
                              Générer des combinaisons de variantes
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {isEditing && variantCombinations.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Combinaisons de prix des variantes</CardTitle>
                          <CardDescription>
                            Gérer les prix pour chaque combinaison d'attributs
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Attributs</TableHead>
                                <TableHead>Prix</TableHead>
                                <TableHead>Mensualité</TableHead>
                                <TableHead>Stock</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {variantCombinations.map((variant) => (
                                <TableRow key={variant.id}>
                                  <TableCell>
                                    {Object.entries(variant).map(([key, value]) => (
                                      <Badge key={key} variant="outline" className="mr-1">
                                        {key}: {value as string}
                                      </Badge>
                                    ))}
                                  </TableCell>
                                  <TableCell>{variant.price.toFixed(2)} €</TableCell>
                                  <TableCell>{variant.monthly_price ? `${variant.monthly_price.toFixed(2)} €` : '-'}</TableCell>
                                  <TableCell>{variant.stock !== undefined && variant.stock !== null ? variant.stock : '-'}</TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEditVariantCombination(variant)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive"
                                      onClick={() => handleDeleteVariantCombination(variant.id)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <Alert className="bg-muted">
                    <AlertDescription>
                      Pour gérer les variantes, activez l'option "Ce produit a des variantes" dans l'onglet "Informations".
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              <div className="flex justify-end pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoBack}
                  className="mr-2"
                  disabled={isSubmitting}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      {isEditing ? "Modification en cours..." : "Création en cours..."}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {isEditing ? "Modifier le produit" : "Créer le produit"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Générer des combinaisons de variantes</DialogTitle>
            <DialogDescription>
              Sélectionnez les attributs à inclure dans la génération de variantes
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="font-medium">Sélectionnez les attributs</h4>
              <div className="grid grid-cols-2 gap-2">
                {renderVariantAttributeCheckboxes()}
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Combinaisons générées ({generatedVariants.length})</h4>
              <ScrollArea className="h-60">
                <div className="space-y-2">
                  {generatedVariants.map((variant, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-muted/50 rounded-md">
                      <div>
                        {Object.entries(variant).map(([key, value]) => (
                          <Badge key={key} variant="outline">
                            {key}: {value}
                          </Badge>
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddVariantCombination(variant)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Ajouter
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" onClick={() => setShowGenerateDialog(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showVariantDialog} onOpenChange={setShowVariantDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingVariantId ? "Modifier la combinaison" : "Ajouter une combinaison"}
            </DialogTitle>
            <DialogDescription>
              Définir les prix pour cette combinaison d'attributs.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 p-3 rounded-md space-y-2">
              <h4 className="font-medium">Attributs sélectionnés</h4>
              <div className="flex flex-wrap gap-1">
                {Object.entries(currentVariantAttributes).map(([key, value]) => (
                  <Badge key={key} variant="outline">
                    {key}: {value}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="variant-price" className="required">Prix (€)</Label>
                <div className="relative">
                  <Input
                    id="variant-price"
                    type="number"
                    value={currentVariantPrice}
                    onChange={(e) => setCurrentVariantPrice(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                    className="pl-8"
                  />
                  <Euro className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="variant-monthly-price">Mensualité (€/mois)</Label>
                <div className="relative">
                  <Input
                    id="variant-monthly-price"
                    type="number"
                    value={currentVariantMonthlyPrice}
                    onChange={(e) => setCurrentVariantMonthlyPrice(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="pl-8"
                  />
                  <Euro className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="variant-stock">Stock</Label>
                <Input
                  id="variant-stock"
                  type="number"
                  value={currentVariantStock}
                  onChange={(e) => setCurrentVariantStock(e.target.value)}
                  placeholder="Quantité en stock"
                  min="0"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowVariantDialog(false)}>
              Annuler
            </Button>
            <Button type="button" onClick={handleSaveVariantCombination}>
              {editingVariantId ? "Modifier" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductEditor;
