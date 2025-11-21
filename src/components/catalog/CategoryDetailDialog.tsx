import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SimplifiedCategory } from "@/services/simplifiedCategoryService";
import { CategoryInfoTab } from "./CategoryInfoTab";
import { CategoryProductList } from "./CategoryProductList";
import { CategoryStatsTab } from "./CategoryStatsTab";
import { useQueryClient } from "@tanstack/react-query";

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

  const productCount = (() => {
    if (!category) return 0;
    const categories: any = queryClient.getQueryData(["simplified-categories"]);
    const found = categories?.find((c: any) => c.id === category.id);
    return found?.product_count || 0;
  })();

  if (!category) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-3">
            <span className="text-2xl font-bold">{category.name}</span>
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="info" className="flex-1 flex flex-col min-h-0">
          <TabsList className="px-6 justify-start border-b rounded-none shrink-0 w-full">
            <TabsTrigger value="info">Informations</TabsTrigger>
            <TabsTrigger value="products">Produits ({productCount})</TabsTrigger>
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
                }}
                onViewAllInCatalog={() => {
                  onClose();
                }}
              />
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
