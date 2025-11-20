import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SimplifiedCategory } from "@/services/simplifiedCategoryService";
import { getCategoryTypes } from "@/services/categoryTypeService";
import { CategoryInfoTab } from "./CategoryInfoTab";
import { CategoryProductList } from "./CategoryProductList";
import { CategoryExceptionsManager } from "./CategoryExceptionsManager";
import { CategoryStatsTab } from "./CategoryStatsTab";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTypeCompatibilities, setTypeCompatibilities } from "@/services/simplifiedCategoryService";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CategoryDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  category: SimplifiedCategory | null;
  mode: 'view' | 'edit' | 'create';
  onSave: (category: SimplifiedCategory) => void;
  onDelete: (id: string) => void;
}

export function CategoryDetailDialog({
  isOpen,
  onClose,
  category,
  mode,
  onSave,
  onDelete,
}: CategoryDetailDialogProps) {
  const queryClient = useQueryClient();
  const [selectedCompatibilities, setSelectedCompatibilities] = useState<string[]>([]);
  const [isSavingCompatibilities, setIsSavingCompatibilities] = useState(false);

  const { data: categoryTypes = [] } = useQuery({
    queryKey: ["category-types"],
    queryFn: getCategoryTypes,
  });

  const { data: productCount = 0 } = useQuery({
    queryKey: ["category-product-count", category?.id],
    queryFn: async () => {
      if (!category) return 0;
      // Get from the cached categories list
      const categories: any = queryClient.getQueryData(["simplified-categories"]);
      const found = categories?.find((c: any) => c.id === category.id);
      return found?.product_count || 0;
    },
    enabled: !!category,
  });

  const { data: exceptionCount = 0 } = useQuery({
    queryKey: ["category-exception-count", category?.id],
    queryFn: async () => {
      if (!category) return 0;
      // This will be populated when exceptions are loaded
      return 0;
    },
    enabled: !!category,
  });

  const { data: compatibilities = [], isLoading: loadingCompatibilities } = useQuery({
    queryKey: ["type-compatibilities", category?.type],
    queryFn: async () => {
      if (!category) return [];
      const result = await getTypeCompatibilities(category.type);
      setSelectedCompatibilities(result || []);
      return result;
    },
    enabled: !!category,
  });

  const saveCompatibilitiesMutation = useMutation({
    mutationFn: async () => {
      if (!category) return;
      await setTypeCompatibilities(category.type, selectedCompatibilities);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["type-compatibilities"] });
      toast.success("Compatibilités enregistrées");
    },
    onError: () => {
      toast.error("Erreur lors de l'enregistrement des compatibilités");
    },
  });

  const handleSaveCompatibilities = async () => {
    setIsSavingCompatibilities(true);
    await saveCompatibilitiesMutation.mutateAsync();
    setIsSavingCompatibilities(false);
  };

  const toggleCompatibility = (type: string) => {
    setSelectedCompatibilities(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  if (!category) return null;

  const typeConfig = categoryTypes.find(t => t.value === category.type) || {
    bg_color: "bg-gray-100 dark:bg-gray-900/30",
    text_color: "text-gray-800 dark:text-gray-200",
    icon: "📦",
    label: category.type,
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${typeConfig.bg_color} ${typeConfig.text_color}`}>
              <span>{typeConfig.icon}</span>
              <span>{typeConfig.label}</span>
            </span>
            <span className="text-2xl font-bold">{category.name}</span>
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="info" className="flex-1 flex flex-col min-h-0">
          <TabsList className="px-6 justify-start border-b rounded-none shrink-0 w-full">
            <TabsTrigger value="info">Informations</TabsTrigger>
            <TabsTrigger value="products">Produits ({productCount})</TabsTrigger>
            <TabsTrigger value="compatibilities">Compatibilités</TabsTrigger>
            <TabsTrigger value="exceptions">Exceptions ({exceptionCount})</TabsTrigger>
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-y-auto">
            <TabsContent value="info" className="p-6 m-0">
              <CategoryInfoTab
                category={category}
                mode={mode}
                onSave={onSave}
                onDelete={onDelete}
              />
            </TabsContent>
            
            <TabsContent value="products" className="p-6 m-0 h-full">
              <CategoryProductList
                categoryId={category.id}
                onEditProduct={(productId) => {
                  console.log("Edit product:", productId);
                  // TODO: Open product edit modal
                }}
                onViewAllInCatalog={() => {
                  onClose();
                  // TODO: Filter main catalog
                }}
              />
            </TabsContent>
            
            <TabsContent value="compatibilities" className="p-6 m-0">
              <div className="space-y-6 max-w-2xl">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Compatibilités générales</h3>
                  <p className="text-sm text-muted-foreground">
                    Les catégories de type <span className="font-medium">{typeConfig.label}</span> sont compatibles avec :
                  </p>
                </div>

                {loadingCompatibilities ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-4 border rounded-lg p-4">
                    {categoryTypes.filter(t => t.value !== category.type).map((type) => (
                      <div key={type.value} className="flex items-center space-x-3">
                        <Checkbox
                          id={`compat-${type.value}`}
                          checked={selectedCompatibilities.includes(type.value)}
                          onCheckedChange={() => toggleCompatibility(type.value)}
                        />
                        <label
                          htmlFor={`compat-${type.value}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {type.label}
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  onClick={handleSaveCompatibilities}
                  disabled={isSavingCompatibilities}
                  className="w-full"
                >
                  {isSavingCompatibilities && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enregistrer les compatibilités
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="exceptions" className="p-6 m-0">
              <CategoryExceptionsManager categoryId={category.id} />
            </TabsContent>
            
            <TabsContent value="stats" className="p-6 m-0">
              <CategoryStatsTab categoryId={category.id} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
