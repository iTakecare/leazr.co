
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Category } from "@/types/catalog";

const CategoryManager = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "", translation: "" });
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const queryClient = useQueryClient();

  // Fetch categories query
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data;
    }
  });

  // Add category mutation
  const addCategoryMutation = useMutation({
    mutationFn: async (categoryData: Omit<Category, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("categories")
        .insert([categoryData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setIsAddModalOpen(false);
      setNewCategory({ name: "", translation: "" });
      toast.success("Catégorie ajoutée avec succès");
    },
    onError: (error) => {
      console.error("Error adding category:", error);
      toast.error("Erreur lors de l'ajout de la catégorie");
    }
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, ...categoryData }: Category) => {
      const { data, error } = await supabase
        .from("categories")
        .update(categoryData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setIsEditModalOpen(false);
      setSelectedCategory(null);
      toast.success("Catégorie mise à jour avec succès");
    },
    onError: (error) => {
      console.error("Error updating category:", error);
      toast.error("Erreur lors de la mise à jour de la catégorie");
    }
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Catégorie supprimée avec succès");
    },
    onError: (error) => {
      console.error("Error deleting category:", error);
      toast.error("Erreur lors de la suppression de la catégorie");
    }
  });

  const handleAddCategory = () => {
    if (!newCategory.name.trim() || !newCategory.translation.trim()) {
      toast.error("Tous les champs sont requis");
      return;
    }
    addCategoryMutation.mutate(newCategory);
  };

  const handleUpdateCategory = () => {
    if (!selectedCategory || !selectedCategory.name.trim() || !selectedCategory.translation.trim()) {
      toast.error("Tous les champs sont requis");
      return;
    }
    updateCategoryMutation.mutate(selectedCategory);
  };

  const handleDeleteCategory = (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette catégorie ?")) {
      deleteCategoryMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Gérer les catégories</h2>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une catégorie
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-4">Chargement...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Traduction</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>{category.name}</TableCell>
                <TableCell>{category.translation}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedCategory(category);
                      setIsEditModalOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCategory(category.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Add Category Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une catégorie</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nom</Label>
              <Input
                id="name"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                placeholder="ex: laptop"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="translation">Traduction</Label>
              <Input
                id="translation"
                value={newCategory.translation}
                onChange={(e) => setNewCategory({ ...newCategory, translation: e.target.value })}
                placeholder="ex: Ordinateur portable"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddCategory}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la catégorie</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nom</Label>
              <Input
                id="edit-name"
                value={selectedCategory?.name || ""}
                onChange={(e) =>
                  setSelectedCategory(
                    selectedCategory
                      ? { ...selectedCategory, name: e.target.value }
                      : null
                  )
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-translation">Traduction</Label>
              <Input
                id="edit-translation"
                value={selectedCategory?.translation || ""}
                onChange={(e) =>
                  setSelectedCategory(
                    selectedCategory
                      ? { ...selectedCategory, translation: e.target.value }
                      : null
                  )
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdateCategory}>Mettre à jour</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoryManager;
