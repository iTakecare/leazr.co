import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  getCategoriesWithProductCount,
  createCategory,
  updateCategory,
  deleteCategory,
  SimplifiedCategory,
} from "@/services/simplifiedCategoryService";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { CategoryDetailDialog } from "./CategoryDetailDialog";

export default function SimplifiedCategoryManager() {
  const { companyId } = useMultiTenant();
  const queryClient = useQueryClient();
  
  const [selectedCategory, setSelectedCategory] = useState<SimplifiedCategory | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit' | 'create'>('view');

  // Queries
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["simplified-categories"],
    queryFn: getCategoriesWithProductCount,
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["simplified-categories"] });
      toast.success("Catégorie supprimée");
      setIsDialogOpen(false);
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });

  // Handlers
  const handleViewCategory = (category: SimplifiedCategory) => {
    setSelectedCategory(category);
    setDialogMode('view');
    setIsDialogOpen(true);
  };

  const handleSaveCategory = async (category: SimplifiedCategory) => {
    if (!companyId) {
      toast.error("Company ID manquant");
      return;
    }

    // Validation minimale avant envoi (évite les inserts de catégories vides)
    if (!category.name?.trim()) {
      toast.error("Le nom de la catégorie est obligatoire");
      return;
    }

    try {
      if (!category.id) {
        // Création : id vide → INSERT
        await createCategory({
          company_id: companyId,
          name: category.name.trim(),
          translation: category.translation?.trim() || category.name.trim(),
          description: category.description?.trim() || undefined,
        });
        toast.success("Catégorie créée");
        setIsDialogOpen(false); // fermer, sinon on reste sur un objet à id vide
      } else {
        // Mise à jour
        await updateCategory(category.id, {
          name: category.name.trim(),
          translation: category.translation?.trim() || category.name.trim(),
          description: category.description?.trim() || undefined,
        });
        toast.success("Catégorie mise à jour");
      }
      queryClient.invalidateQueries({ queryKey: ["simplified-categories"] });
    } catch (error: any) {
      console.error("Erreur sauvegarde catégorie:", error);
      toast.error(
        `Erreur lors de la ${category.id ? "mise à jour" : "création"}${error?.message ? ` : ${error.message}` : ""}`
      );
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette catégorie ?")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Gestion des catégories</h2>
        <Button onClick={() => {
          setSelectedCategory({
            id: '',
            name: '',
            translation: '',
            description: '',
            company_id: companyId || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          setDialogMode('create');
          setIsDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle catégorie
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">Chargement...</div>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead className="text-right">Produits</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Aucune catégorie trouvée</p>
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((category) => (
                  <TableRow
                    key={category.id}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => handleViewCategory(category)}
                  >
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-right">{category.product_count || 0}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <CategoryDetailDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        category={selectedCategory}
        mode={dialogMode}
        onSave={handleSaveCategory}
        onDelete={handleDeleteCategory}
      />
    </div>
  );
}
