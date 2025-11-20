import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Category } from "@/types/catalog";
import { CategoryType } from "@/types/categoryTypes";
import { supabase } from "@/integrations/supabase/client";
import { getCategoryTypes } from "@/services/categoryTypeService";
import {
  getAllCompatibilities,
  addCompatibility,
  deleteCompatibility,
} from "@/services/categoryCompatibilityService";
import {
  getLinksByCategory,
  addSpecificLink,
  deleteSpecificLink,
} from "@/services/categorySpecificLinkService";

const CategoryManagerWithTypes = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ 
    name: "", 
    translation: "", 
    description: "",
    category_type_id: "" 
  });
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [activeTab, setActiveTab] = useState("general");
  const [selectedLinkCategory, setSelectedLinkCategory] = useState("");
  const [linkType, setLinkType] = useState<"exception" | "recommended" | "required">("exception");
  const [linkPriority, setLinkPriority] = useState(1);

  const queryClient = useQueryClient();

  // Fetch categories
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch category types
  const { data: categoryTypes = [] } = useQuery({
    queryKey: ["categoryTypes"],
    queryFn: getCategoryTypes,
  });

  // Fetch all compatibilities
  const { data: allCompatibilities = [] } = useQuery({
    queryKey: ["categoryCompatibilities"],
    queryFn: getAllCompatibilities,
  });

  // Fetch specific links for selected category
  const { data: specificLinks = [] } = useQuery({
    queryKey: ["categorySpecificLinks", selectedCategory?.id],
    queryFn: () => getLinksByCategory(selectedCategory!.id),
    enabled: !!selectedCategory?.id,
  });

  // Add category mutation
  const addCategoryMutation = useMutation({
    mutationFn: async (categoryData: typeof newCategory) => {
      const { data, error } = await supabase
        .from("categories")
        .insert({
          name: categoryData.name,
          translation: categoryData.translation,
          description: categoryData.description || null,
          category_type_id: categoryData.category_type_id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setIsAddModalOpen(false);
      setNewCategory({ name: "", translation: "", description: "", category_type_id: "" });
      toast.success("Catégorie ajoutée avec succès");
    },
    onError: (error: Error) => {
      console.error("Error adding category:", error);
      toast.error("Erreur lors de l'ajout de la catégorie");
    }
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async (category: Category) => {
      const { data, error } = await supabase
        .from("categories")
        .update({
          name: category.name,
          translation: category.translation,
          description: category.description || null,
          category_type_id: category.category_type_id || null,
        })
        .eq("id", category.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Catégorie mise à jour avec succès");
    },
    onError: (error: Error) => {
      console.error("Error updating category:", error);
      toast.error("Erreur lors de la mise à jour de la catégorie");
    }
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", categoryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Catégorie supprimée avec succès");
    },
    onError: (error: Error) => {
      console.error("Error deleting category:", error);
      toast.error("Erreur lors de la suppression de la catégorie");
    }
  });

  // Compatibility mutations
  const addCompatibilityMutation = useMutation({
    mutationFn: addCompatibility,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categoryCompatibilities"] });
      toast.success("Compatibilité ajoutée");
    },
    onError: (error: Error) => {
      toast.error("Erreur : " + error.message);
    }
  });

  const deleteCompatibilityMutation = useMutation({
    mutationFn: deleteCompatibility,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categoryCompatibilities"] });
      toast.success("Compatibilité supprimée");
    },
    onError: (error: Error) => {
      toast.error("Erreur : " + error.message);
    }
  });

  // Specific link mutations
  const addLinkMutation = useMutation({
    mutationFn: addSpecificLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorySpecificLinks"] });
      setSelectedLinkCategory("");
      toast.success("Lien ajouté");
    },
    onError: (error: Error) => {
      toast.error("Erreur : " + error.message);
    }
  });

  const deleteLinkMutation = useMutation({
    mutationFn: deleteSpecificLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorySpecificLinks"] });
      toast.success("Lien supprimé");
    },
    onError: (error: Error) => {
      toast.error("Erreur : " + error.message);
    }
  });

  const handleAddCategory = () => {
    if (!newCategory.name.trim() || !newCategory.translation.trim()) {
      toast.error("Nom et traduction sont requis");
      return;
    }
    addCategoryMutation.mutate(newCategory);
  };

  const handleUpdateCategory = () => {
    if (!selectedCategory || !selectedCategory.name.trim() || !selectedCategory.translation.trim()) {
      toast.error("Nom et traduction sont requis");
      return;
    }
    updateCategoryMutation.mutate(selectedCategory);
  };

  const handleDeleteCategory = (category: Category) => {
    const confirmMessage = `Êtes-vous sûr de vouloir supprimer la catégorie "${category.name}" ?`;
    if (window.confirm(confirmMessage)) {
      deleteCategoryMutation.mutate(category.id);
    }
  };

  const handleToggleCompatibility = (childTypeId: string) => {
    if (!selectedCategory?.category_type_id) {
      toast.error("Cette catégorie n'a pas de type assigné");
      return;
    }

    const existing = allCompatibilities.find(
      c => c.parent_category_type_id === selectedCategory.category_type_id && 
           c.child_category_type_id === childTypeId
    );

    if (existing) {
      deleteCompatibilityMutation.mutate(existing.id);
    } else {
      addCompatibilityMutation.mutate({
        parent_category_type_id: selectedCategory.category_type_id,
        child_category_type_id: childTypeId,
        compatibility_strength: 2,
        is_bidirectional: false,
      });
    }
  };

  const handleAddLink = () => {
    if (!selectedCategory || !selectedLinkCategory) {
      toast.error("Veuillez sélectionner une catégorie à lier");
      return;
    }

    addLinkMutation.mutate({
      parent_category_id: selectedCategory.id,
      child_category_id: selectedLinkCategory,
      link_type: linkType,
      priority: linkPriority,
    });
  };

  const currentType = categoryTypes.find(t => t.id === selectedCategory?.category_type_id);

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
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>{category.name}</TableCell>
                <TableCell>{category.translation}</TableCell>
                <TableCell>
                  {category.category_type_id ? (
                    <Badge variant="secondary">
                      {categoryTypes.find(t => t.id === category.category_type_id)?.name || "-"}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedCategory(category);
                      setIsEditModalOpen(true);
                      setActiveTab("general");
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCategory(category)}
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
              <Label htmlFor="name">Nom *</Label>
              <Input
                id="name"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                placeholder="ex: laptop"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="translation">Traduction *</Label>
              <Input
                id="translation"
                value={newCategory.translation}
                onChange={(e) => setNewCategory({ ...newCategory, translation: e.target.value })}
                placeholder="ex: Ordinateur portable"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                placeholder="Description de la catégorie..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Type de catégorie</Label>
              <Select
                value={newCategory.category_type_id}
                onValueChange={(value) => setNewCategory({ ...newCategory, category_type_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucun type</SelectItem>
                  {categoryTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name} - {type.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      {/* Edit Category Modal with Tabs */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier la catégorie</DialogTitle>
          </DialogHeader>
          
          {selectedCategory && (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">Général</TabsTrigger>
                <TabsTrigger value="compatibilities">Compatibilités</TabsTrigger>
                <TabsTrigger value="exceptions">Exceptions</TabsTrigger>
              </TabsList>

              {/* General Tab */}
              <TabsContent value="general" className="space-y-4">
                <div className="grid gap-2">
                  <Label>Nom *</Label>
                  <Input
                    value={selectedCategory.name}
                    onChange={(e) =>
                      setSelectedCategory({ ...selectedCategory, name: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Traduction *</Label>
                  <Input
                    value={selectedCategory.translation}
                    onChange={(e) =>
                      setSelectedCategory({ ...selectedCategory, translation: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Textarea
                    value={selectedCategory.description || ""}
                    onChange={(e) =>
                      setSelectedCategory({ ...selectedCategory, description: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Type de catégorie</Label>
                  <Select
                    value={selectedCategory.category_type_id || ""}
                    onValueChange={(value) =>
                      setSelectedCategory({ ...selectedCategory, category_type_id: value || undefined })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Aucun type</SelectItem>
                      {categoryTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name} - {type.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleUpdateCategory}>Enregistrer</Button>
                </div>
              </TabsContent>

              {/* Compatibilities Tab */}
              <TabsContent value="compatibilities" className="space-y-4">
                {currentType ? (
                  <>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Type actuel : <Badge>{currentType.name}</Badge>
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Ces règles s'appliquent automatiquement à toutes les catégories de ce type
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Types compatibles</Label>
                      {categoryTypes
                        .filter(t => t.id !== selectedCategory.category_type_id)
                        .map((type) => {
                          const isCompatible = allCompatibilities.some(
                            c => c.parent_category_type_id === selectedCategory.category_type_id && 
                                 c.child_category_type_id === type.id
                          );
                          return (
                            <div key={type.id} className="flex items-center space-x-2 p-2 border rounded">
                              <Checkbox
                                checked={isCompatible}
                                onCheckedChange={() => handleToggleCompatibility(type.id)}
                              />
                              <Label className="flex-1 cursor-pointer">
                                {type.name} - {type.description}
                              </Label>
                            </div>
                          );
                        })}
                    </div>
                  </>
                ) : (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      Veuillez d'abord assigner un type à cette catégorie dans l'onglet Général
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Exceptions Tab */}
              <TabsContent value="exceptions" className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Les exceptions sont des liens spécifiques entre catégories qui priment sur les règles de type
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Ajouter une exception</Label>
                  <div className="flex gap-2">
                    <Select value={selectedLinkCategory} onValueChange={setSelectedLinkCategory}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Sélectionner une catégorie..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories
                          .filter(c => c.id !== selectedCategory.id)
                          .map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.translation} ({cat.name})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Select value={linkType} onValueChange={(val: any) => setLinkType(val)}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="exception">Exception</SelectItem>
                        <SelectItem value="recommended">Recommandé</SelectItem>
                        <SelectItem value="required">Requis</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={handleAddLink} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Liens spécifiques</Label>
                  {specificLinks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun lien spécifique</p>
                  ) : (
                    <div className="space-y-2">
                      {specificLinks.map((link) => {
                        const childCat = categories.find(c => c.id === link.child_category_id);
                        return (
                          <div key={link.id} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <p className="font-medium">{childCat?.translation || "-"}</p>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="outline">{link.link_type}</Badge>
                                <Badge variant="secondary">Priorité: {link.priority}</Badge>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteLinkMutation.mutate(link.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoryManagerWithTypes;
