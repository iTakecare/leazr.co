
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  getCategories, 
  addCategory, 
  updateCategory, 
  deleteCategory 
} from "@/services/catalogService";
import { 
  PlusCircle, 
  Edit, 
  Trash2, 
  ChevronRight 
} from "lucide-react";
import { toast } from "sonner";
import { Category } from "@/types/catalog";

const CategoryManager = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "", translation: "" });
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  const queryClient = useQueryClient();

  // Fetch categories
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories
  });

  // Add category mutation
  const addCategoryMutation = useMutation({
    mutationFn: addCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Catégorie ajoutée avec succès");
      setIsAddModalOpen(false);
      setNewCategory({ name: "", translation: "" });
    },
    onError: (error) => {
      console.error("Error adding category:", error);
      toast.error("Erreur lors de l'ajout de la catégorie");
    }
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: updateCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Catégorie mise à jour avec succès");
      setIsEditModalOpen(false);
      setEditCategory(null);
    },
    onError: (error) => {
      console.error("Error updating category:", error);
      toast.error("Erreur lors de la mise à jour de la catégorie");
    }
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Catégorie supprimée avec succès");
      setIsDeleteModalOpen(false);
      setSelectedCategory(null);
      if (activeCategory === selectedCategory?.name) {
        setActiveCategory(null);
      }
    },
    onError: (error) => {
      console.error("Error deleting category:", error);
      toast.error("Erreur lors de la suppression de la catégorie");
    }
  });

  // Handle adding a new category
  const handleAddCategory = () => {
    if (!newCategory.name.trim()) {
      toast.error("Le nom de la catégorie est requis");
      return;
    }
    addCategoryMutation.mutate(newCategory);
  };

  // Handle updating a category
  const handleUpdateCategory = () => {
    if (!editCategory || !editCategory.name.trim()) {
      toast.error("Le nom de la catégorie est requis");
      return;
    }
    
    updateCategoryMutation.mutate({
      originalName: selectedCategory?.name || "",
      name: editCategory.name,
      translation: editCategory.translation || ""
    });
  };

  // Handle deleting a category
  const handleDeleteCategory = () => {
    if (!selectedCategory) return;
    deleteCategoryMutation.mutate({ name: selectedCategory.name });
  };

  // Open edit modal with selected category
  const openEditModal = (category: Category) => {
    setSelectedCategory(category);
    setEditCategory({ ...category });
    setIsEditModalOpen(true);
  };

  // Open delete confirmation modal
  const openDeleteModal = (category: Category) => {
    setSelectedCategory(category);
    setIsDeleteModalOpen(true);
  };

  // Handle category selection
  const handleCategorySelect = (category: Category) => {
    setActiveCategory(category.name);
    // Here you could trigger a filter or other actions when a category is selected
  };

  return (
    <div className="h-full flex flex-col">
      <Card className="flex-1 border-none shadow-none">
        <CardHeader className="flex flex-row items-center justify-between py-2">
          <CardTitle className="text-lg font-medium">Catégories</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsAddModalOpen(true)}
            className="h-8 w-8 p-0"
          >
            <PlusCircle className="h-4 w-4" />
            <span className="sr-only">Ajouter une catégorie</span>
          </Button>
        </CardHeader>
        <CardContent className="p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              Aucune catégorie trouvée
            </div>
          ) : (
            <ul className="space-y-1">
              {categories.map((category) => (
                <li 
                  key={category.id || category.name} 
                  className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-gray-100 ${
                    activeCategory === category.name ? "bg-gray-100 font-medium" : ""
                  }`}
                  onClick={() => handleCategorySelect(category)}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{category.name}</span>
                    {category.translation && (
                      <span className="text-xs text-muted-foreground truncate">
                        ({category.translation})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 flex-shrink-0 opacity-0 group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(category);
                      }}
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      <span className="sr-only">Modifier</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteModal(category);
                      }}
                      className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100 hover:opacity-100 hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="sr-only">Supprimer</span>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

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
                placeholder="Nom de la catégorie"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="translation">Traduction (optionnel)</Label>
              <Input
                id="translation"
                value={newCategory.translation}
                onChange={(e) => setNewCategory({ ...newCategory, translation: e.target.value })}
                placeholder="Traduction"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddCategory} disabled={addCategoryMutation.isPending}>
              {addCategoryMutation.isPending ? "Ajout en cours..." : "Ajouter"}
            </Button>
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
                value={editCategory?.name || ""}
                onChange={(e) => setEditCategory({ ...editCategory!, name: e.target.value })}
                placeholder="Nom de la catégorie"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-translation">Traduction (optionnel)</Label>
              <Input
                id="edit-translation"
                value={editCategory?.translation || ""}
                onChange={(e) => setEditCategory({ ...editCategory!, translation: e.target.value })}
                placeholder="Traduction"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdateCategory} disabled={updateCategoryMutation.isPending}>
              {updateCategoryMutation.isPending ? "Mise à jour en cours..." : "Mettre à jour"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la catégorie</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Êtes-vous sûr de vouloir supprimer la catégorie <strong>{selectedCategory?.name}</strong> ?
              Cette action est irréversible.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteCategory}
              disabled={deleteCategoryMutation.isPending}
            >
              {deleteCategoryMutation.isPending ? "Suppression en cours..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoryManager;
