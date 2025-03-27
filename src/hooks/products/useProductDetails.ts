import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProductById,
  updateProduct,
  createProduct,
  deleteProduct as deleteProductService,
} from "@/services/catalogService";
import { Product, ProductAttributes } from "@/types/catalog";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface UseProductDetailsProps {
  productId?: string;
  isEditing: boolean;
}

export const useProductDetails = ({ productId, isEditing }: UseProductDetailsProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Local state for managing the product details
  const [product, setProduct] = useState<Product>(
    {} as Product // Initialize as empty Product
  );
  const [isDirty, setIsDirty] = useState(false);
  const [initialProduct, setInitialProduct] = useState<Product>(
    {} as Product // Initialize as empty Product
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [specificationValues, setSpecificationValues] = useState<Record<string, string | number | boolean>>({});
  const [attributeValues, setAttributeValues] = useState<ProductAttributes>({});
  const [isParent, setIsParent] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [isCreatingVariant, setIsCreatingVariant] = useState(false);
  const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false);
  const [isVariantCombinationDialogOpen, setIsVariantCombinationDialogOpen] = useState(false);
  const [isVariantCombinationCreating, setIsVariantCombinationCreating] = useState(false);
  const [isVariantCombinationDeleting, setIsVariantCombinationDeleting] = useState(false);
  const [isDeletingVariant, setIsDeletingVariant] = useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [stockValue, setStockValue] = useState<number>(0);
  const [isStockUpdating, setIsStockUpdating] = useState(false);
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [bulkEditValues, setBulkEditValues] = useState<Partial<Product>>({});
  const [isBulkUpdateDialogOpen, setIsBulkUpdateDialogOpen] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isPriceDialogOpen, setIsPriceDialogOpen] = useState(false);
  const [priceValue, setPriceValue] = useState<number>(0);
  const [isPriceUpdating, setIsPriceUpdating] = useState(false);
  const [isMonthlyPriceDialogOpen, setIsMonthlyPriceDialogOpen] = useState(false);
  const [monthlyPriceValue, setMonthlyPriceValue] = useState<number>(0);
  const [isMonthlyPriceUpdating, setIsMonthlyPriceUpdating] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [imageUrlValue, setImageUrlValue] = useState<string>("");
  const [isImageUrlUpdating, setIsImageUrlUpdating] = useState(false);
  const [isImageUrlsDialogOpen, setIsImageUrlsDialogOpen] = useState(false);
  const [imageUrlsValue, setImageUrlsValue] = useState<string[]>([]);
  const [isImageUrlsUpdating, setIsImageUrlsUpdating] = useState(false);
  const [isImageAltTextsDialogOpen, setIsImageAltTextsDialogOpen] = useState(false);
  const [imageAltTextsValue, setImageAltTextsValue] = useState<string[]>([]);
  const [isImageAltTextsUpdating, setIsImageAltTextsUpdating] = useState(false);
  const [isMetaDialogOpen, setIsMetaDialogOpen] = useState(false);
  const [metaTitleValue, setMetaTitleValue] = useState<string>("");
  const [metaDescriptionValue, setMetaDescriptionValue] = useState<string>("");
  const [metaKeywordsValue, setMetaKeywordsValue] = useState<string>("");
  const [metaSlugValue, setMetaSlugValue] = useState<string>("");
  const [metaCanonicalUrlValue, setMetaCanonicalUrlValue] = useState<string>("");
  const [isMetaUpdating, setIsMetaUpdating] = useState(false);
  const [isSkuDialogOpen, setIsSkuDialogOpen] = useState(false);
  const [skuValue, setSkuValue] = useState<string>("");
  const [isSkuUpdating, setIsSkuUpdating] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [categoryValue, setCategoryValue] = useState<string>("");
  const [isCategoryUpdating, setIsCategoryUpdating] = useState(false);
  const [isBrandDialogOpen, setIsBrandDialogOpen] = useState(false);
  const [brandValue, setBrandValue] = useState<string>("");
  const [isBrandUpdating, setIsBrandUpdating] = useState(false);
  const [isDescriptionDialogOpen, setIsDescriptionDialogOpen] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState<string>("");
  const [isDescriptionUpdating, setIsDescriptionUpdating] = useState(false);
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);
  const [nameValue, setNameValue] = useState<string>("");
  const [isNameUpdating, setIsNameUpdating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch product data
  const { data, isLoading, error } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => getProductById(productId || ""),
    enabled: isEditing && !!productId,
    onSuccess: (fetchedProduct) => {
      if (fetchedProduct) {
        setProduct(fetchedProduct);
        setInitialProduct(fetchedProduct);
        setIsParent(fetchedProduct.is_parent || false);
        setSpecificationValues(fetchedProduct.specifications || {});
        setAttributeValues(fetchedProduct.attributes || {});
      }
    },
  });

  // Mutations for updating and creating products
  const updateProductMutation = useMutation(updateProduct, {
    onSuccess: (updatedProduct) => {
      toast.success("Produit mis à jour avec succès!");
      queryClient.invalidateQueries(["product", updatedProduct.id]);
      queryClient.invalidateQueries(["products"]);
      setIsDirty(false);
      setInitialProduct(updatedProduct);
      setProduct(updatedProduct);
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la mise à jour du produit: ${error.message || "Unknown error"}`);
    },
    onSettled: () => {
      setIsSaving(false);
    },
  });

  const createProductMutation = useMutation(createProduct, {
    onSuccess: (newProduct) => {
      toast.success("Produit créé avec succès!");
      queryClient.invalidateQueries(["products"]);
      navigate(`/catalog/${newProduct.id}`);
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la création du produit: ${error.message || "Unknown error"}`);
    },
    onSettled: () => {
      setIsSaving(false);
    },
  });

  const deleteProductMutation = useMutation(deleteProductService, {
    onSuccess: () => {
      toast.success("Produit supprimé avec succès!");
      queryClient.invalidateQueries(["products"]);
      navigate("/catalog");
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la suppression du produit: ${error.message || "Unknown error"}`);
    },
    onSettled: () => {
      setIsDeleting(false);
    },
  });

  // Handlers for updating product properties
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProduct({ ...product, name: e.target.value });
    setIsDirty(true);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setProduct({ ...product, description: e.target.value });
    setIsDirty(true);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPrice = parseFloat(e.target.value);
    setProduct({ ...product, price: isNaN(newPrice) ? 0 : newPrice });
    setIsDirty(true);
  };

  const handleMonthlyPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMonthlyPrice = parseFloat(e.target.value);
    setProduct({ ...product, monthly_price: isNaN(newMonthlyPrice) ? 0 : newMonthlyPrice });
    setIsDirty(true);
  };

  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProduct({ ...product, image_url: e.target.value });
    setIsDirty(true);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProduct({ ...product, category: e.target.value });
    setIsDirty(true);
  };

  const handleBrandChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProduct({ ...product, brand: e.target.value });
    setIsDirty(true);
  };

  const handleSkuChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProduct({ ...product, sku: e.target.value });
    setIsDirty(true);
  };

  const handleStockChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStock = parseInt(e.target.value, 10);
    setProduct({ ...product, stock: isNaN(newStock) ? 0 : newStock });
    setIsDirty(true);
  };

  const handleActiveChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProduct({ ...product, active: e.target.checked });
    setIsDirty(true);
  };

  const handleMetaTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!product.meta) {
      setProduct({ ...product, meta: { ...product.meta, title: e.target.value } });
    } else {
      setProduct({ ...product, meta: { ...product.meta, title: e.target.value } });
    }
    setIsDirty(true);
  };

  const handleMetaDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!product.meta) {
      setProduct({ ...product, meta: { ...product.meta, description: e.target.value } });
    } else {
      setProduct({ ...product, meta: { ...product.meta, description: e.target.value } });
    }
    setIsDirty(true);
  };

  const handleMetaKeywordsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!product.meta) {
      setProduct({ ...product, meta: { ...product.meta, keywords: e.target.value } });
    } else {
      setProduct({ ...product, meta: { ...product.meta, keywords: e.target.value } });
    }
    setIsDirty(true);
  };

  const handleMetaSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!product.meta) {
      setProduct({ ...product, meta: { ...product.meta, slug: e.target.value } });
    } else {
      setProduct({ ...product, meta: { ...product.meta, slug: e.target.value } });
    }
    setIsDirty(true);
  };

  const handleMetaCanonicalUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!product.meta) {
      setProduct({ ...product, meta: { ...product.meta, canonical_url: e.target.value } });
    } else {
      setProduct({ ...product, meta: { ...product.meta, canonical_url: e.target.value } });
    }
    setIsDirty(true);
  };

  const handleImageUrlsChange = (newImageUrls: string[]) => {
    setProduct({ ...product, image_urls: newImageUrls });
    setIsDirty(true);
  };

  const handleImageAltTextsChange = (newImageAltTexts: string[]) => {
    setProduct({ ...product, image_alt_texts: newImageAltTexts });
    setIsDirty(true);
  };

  const handleSpecificationChange = (
    key: string,
    value: string | number | boolean
  ) => {
    setSpecificationValues(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleAttributeChange = (
    key: string,
    value: string
  ) => {
    setAttributeValues(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  // Function to handle saving the product
  const handleSave = useCallback(async () => {
    setIsSaving(true);

    // Prepare the product data for saving
    const productToSave = {
      ...product,
      specifications: specificationValues,
      attributes: attributeValues,
    };

    if (isEditing) {
      updateProductMutation.mutate(productToSave);
    } else {
      createProductMutation.mutate(productToSave);
    }
  }, [product, specificationValues, attributeValues, isEditing, updateProductMutation, createProductMutation]);

  // Function to handle deleting the product
  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    deleteProductMutation.mutate(product.id);
  }, [product, deleteProductMutation]);

  // Function to handle cloning the product
  const handleClone = useCallback(async () => {
    setIsCloning(true);

    // Prepare the product data for cloning
    const productToClone = {
      ...product,
      id: undefined, // remove id for cloning
      name: `${product.name} (Clone)`,
      sku: `${product.sku}-clone`,
      active: false,
    };

    createProductMutation.mutate(productToClone);
  }, [product, createProductMutation]);

  // Function to reset the form to initial values
  const handleReset = () => {
    setProduct(initialProduct);
    setSpecificationValues(initialProduct.specifications || {});
    setAttributeValues(initialProduct.attributes || {});
    setIsDirty(false);
  };

  // Function to update specifications
  const updateSpecifications = () => {
    if (!product || !Object.keys(specificationValues).length) return;
  
    // Convert boolean values to strings to satisfy the type requirement
    const processedSpecs: Record<string, string | number> = {};
  
    Object.entries(specificationValues).forEach(([key, value]) => {
      if (typeof value === 'boolean') {
        processedSpecs[key] = value.toString();
      } else {
        processedSpecs[key] = value;
      }
    });
  
    setProduct({
      ...product,
      specifications: processedSpecs
    });
  
    setIsDirty(true);
  };

  // Function to handle bulk editing
  const handleBulkEdit = (field: string, value: any) => {
    setBulkEditValues(prev => ({ ...prev, [field]: value }));
  };

  // Function to apply bulk updates
  const applyBulkUpdates = () => {
    setProduct(prevProduct => ({ ...prevProduct, ...bulkEditValues }));
    setIsDirty(true);
    setIsBulkUpdateDialogOpen(false);
  };

  // Function to handle price update
  const applyPriceUpdate = () => {
    setProduct(prevProduct => ({ ...prevProduct, price: priceValue }));
    setIsDirty(true);
    setIsPriceDialogOpen(false);
  };

  // Function to handle monthly price update
  const applyMonthlyPriceUpdate = () => {
    setProduct(prevProduct => ({ ...prevProduct, monthly_price: monthlyPriceValue }));
    setIsDirty(true);
    setIsMonthlyPriceDialogOpen(false);
  };

  // Function to handle image url update
  const applyImageUrlUpdate = () => {
    setProduct(prevProduct => ({ ...prevProduct, image_url: imageUrlValue }));
    setIsDirty(true);
    setIsImageDialogOpen(false);
  };

  // Function to handle image urls update
  const applyImageUrlsUpdate = () => {
    setProduct(prevProduct => ({ ...prevProduct, image_urls: imageUrlValue }));
    setIsDirty(true);
    setIsImageUrlsDialogOpen(false);
  };

  // Function to handle image alt texts update
  const applyImageAltTextsUpdate = () => {
    setProduct(prevProduct => ({ ...prevProduct, image_alt_texts: imageAltTextsValue }));
    setIsDirty(true);
    setIsImageAltTextsDialogOpen(false);
  };

  // Function to handle meta update
  const applyMetaUpdate = () => {
    setProduct(prevProduct => ({
      ...prevProduct,
      meta: {
        title: metaTitleValue,
        description: metaDescriptionValue,
        keywords: metaKeywordsValue,
        slug: metaSlugValue,
        canonical_url: metaCanonicalUrlValue,
      }
    }));
    setIsDirty(true);
    setIsMetaDialogOpen(false);
  };

  // Function to handle sku update
  const applySkuUpdate = () => {
    setProduct(prevProduct => ({ ...prevProduct, sku: skuValue }));
    setIsDirty(true);
    setIsSkuDialogOpen(false);
  };

  // Function to handle category update
  const applyCategoryUpdate = () => {
    setProduct(prevProduct => ({ ...prevProduct, category: categoryValue }));
    setIsDirty(true);
    setIsCategoryDialogOpen(false);
  };

  // Function to handle brand update
  const applyBrandUpdate = () => {
    setProduct(prevProduct => ({ ...prevProduct, brand: brandValue }));
    setIsDirty(true);
    setIsBrandDialogOpen(false);
  };

  // Function to handle description update
  const applyDescriptionUpdate = () => {
    setProduct(prevProduct => ({ ...prevProduct, description: descriptionValue }));
    setIsDirty(true);
    setIsDescriptionDialogOpen(false);
  };

  // Function to handle name update
  const applyNameUpdate = () => {
    setProduct(prevProduct => ({ ...prevProduct, name: nameValue }));
    setIsDirty(true);
    setIsNameDialogOpen(false);
  };

  // Function to handle stock update
  const applyStockUpdate = () => {
    setProduct(prevProduct => ({ ...prevProduct, stock: stockValue }));
    setIsDirty(true);
    setIsStockDialogOpen(false);
  };

  return {
    product,
    isLoading,
    error,
    isDirty,
    isDialogOpen,
    isDeleteDialogOpen,
    isCloning,
    isSaving,
    isDeleting,
    isParent,
    specificationValues,
    attributeValues,
    isCreatingVariant,
    isVariantDialogOpen,
    isVariantCombinationDialogOpen,
    isVariantCombinationCreating,
    isVariantCombinationDeleting,
    isDeletingVariant,
    isStockDialogOpen,
    stockValue,
    isStockUpdating,
    isBulkEditing,
    bulkEditValues,
    isBulkUpdateDialogOpen,
    isBulkUpdating,
    isPriceDialogOpen,
    priceValue,
    isPriceUpdating,
    isMonthlyPriceDialogOpen,
    monthlyPriceValue,
    isMonthlyPriceUpdating,
    isImageDialogOpen,
    imageUrlValue,
    isImageUrlUpdating,
    isImageUrlsDialogOpen,
    imageUrlsValue,
    isImageUrlsUpdating,
    isImageAltTextsDialogOpen,
    imageAltTextsValue,
    isImageAltTextsUpdating,
    isMetaDialogOpen,
    metaTitleValue,
    metaDescriptionValue,
    metaKeywordsValue,
    metaSlugValue,
    metaCanonicalUrlValue,
    isMetaUpdating,
    isSkuDialogOpen,
    skuValue,
    isSkuUpdating,
    isCategoryDialogOpen,
    categoryValue,
    isCategoryUpdating,
    isBrandDialogOpen,
    brandValue,
    isBrandUpdating,
    isDescriptionDialogOpen,
    descriptionValue,
    isDescriptionUpdating,
    isNameDialogOpen,
    nameValue,
    isNameUpdating,
    handleNameChange,
    handleDescriptionChange,
    handlePriceChange,
    handleMonthlyPriceChange,
    handleImageUrlChange,
    handleCategoryChange,
    handleBrandChange,
    handleSkuChange,
    handleStockChange,
    handleActiveChange,
    handleMetaTitleChange,
    handleMetaDescriptionChange,
    handleMetaKeywordsChange,
    handleMetaSlugChange,
    handleMetaCanonicalUrlChange,
    handleImageUrlsChange,
    handleImageAltTextsChange,
    handleSpecificationChange,
    handleAttributeChange,
    handleSave,
    handleDelete,
    handleClone,
    handleReset,
    setIsDialogOpen,
    setIsDeleteDialogOpen,
    setIsCloning,
    setIsCreatingVariant,
    setIsVariantDialogOpen,
    setIsVariantCombinationDialogOpen,
    setIsVariantCombinationCreating,
    setIsVariantCombinationDeleting,
    setIsDeletingVariant,
    setIsStockDialogOpen,
    setStockValue,
    setIsStockUpdating,
    setIsBulkEditing,
    setBulkEditValues,
    setIsBulkUpdateDialogOpen,
    setIsBulkUpdating,
    setIsPriceDialogOpen,
    setPriceValue,
    setIsPriceUpdating,
    setIsMonthlyPriceDialogOpen,
    setMonthlyPriceValue,
    setIsMonthlyPriceUpdating,
    setIsImageDialogOpen,
    setImageUrlValue,
    setIsImageUrlUpdating,
    setIsImageUrlsDialogOpen,
    setImageUrlsValue,
    setIsImageUrlsUpdating,
    setIsImageAltTextsDialogOpen,
    setImageAltTextsValue,
    setIsImageAltTextsUpdating,
    setIsMetaDialogOpen,
    setMetaTitleValue,
    setMetaDescriptionValue,
    setMetaKeywordsValue,
    setMetaSlugValue,
    setMetaCanonicalUrlValue,
    setIsMetaUpdating,
    setIsSkuDialogOpen,
    setSkuValue,
    setIsSkuUpdating,
    setIsCategoryDialogOpen,
    setCategoryValue,
    setIsCategoryUpdating,
    setIsBrandDialogOpen,
    setBrandValue,
    setIsBrandUpdating,
    setIsDescriptionDialogOpen,
    setDescriptionValue,
    setIsDescriptionUpdating,
    setIsNameDialogOpen,
    setNameValue,
    setIsNameUpdating,
    updateSpecifications,
    handleBulkEdit,
    applyBulkUpdates,
    applyPriceUpdate,
    applyMonthlyPriceUpdate,
    applyImageUrlUpdate,
    applyImageUrlsUpdate,
    applyImageAltTextsUpdate,
    applyMetaUpdate,
    applySkuUpdate,
    applyCategoryUpdate,
    applyBrandUpdate,
    applyDescriptionUpdate,
    applyNameUpdate,
    applyStockUpdate,
  };
};
