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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Category } from "@/types/catalog";
import { CategoryType, CategoryCompatibility, CategorySpecificLink } from "@/types/categoryTypes";
import { supabase } from "@/integrations/supabase/client";
import {
  getCategoryTypes,
  addCategoryType,
  updateCategoryType,
  deleteCategoryType,
} from "@/services/categoryTypeService";
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

const UnifiedCategoryManager = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("categories");

  // ========== CATEGORIES TAB STATE ==========
  const [isCategoryAddModalOpen, setIsCategoryAddModalOpen] = useState(false);
  const [isCategoryEditModalOpen, setIsCategoryEditModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: "",
    translation: "",
    description: "",
    category_type_id: "",
  });
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // ========== TYPES TAB STATE ==========
  const [isTypeAddModalOpen, setIsTypeAddModalOpen] = useState(false);
  const [isTypeEditModalOpen, setIsTypeEditModalOpen] = useState(false);
  const [newType, setNewType] = useState({
    name: "",
    description: "",
    display_order: 0,
    is_active: true,
  });
  const [selectedType, setSelectedType] = useState<CategoryType | null>(null);

  // ========== COMPATIBILITIES TAB STATE ==========
  const [isCompatibilityAddModalOpen, setIsCompatibilityAddModalOpen] = useState(false);
  const [newCompatibility, setNewCompatibility] = useState({
    parent_category_type_id: "",
    child_category_type_id: "",
    compatibility_strength: 1,
    is_bidirectional: false,
  });

  // ========== EXCEPTIONS TAB STATE ==========
  const [selectedParentCategory, setSelectedParentCategory] = useState<string>("");
  const [isExceptionAddModalOpen, setIsExceptionAddModalOpen] = useState(false);
  const [newException, setNewException] = useState({
    child_category_id: "",
    link_type: "exception" as "exception" | "recommended" | "required",
    priority: 1,
  });

  // ========== QUERIES ==========
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*, category_types(id, name)")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: categoryTypes = [], isLoading: typesLoading } = useQuery({
    queryKey: ["categoryTypes"],
    queryFn: getCategoryTypes,
  });

  const { data: compatibilities = [] } = useQuery({
    queryKey: ["categoryCompatibilities"],
    queryFn: getAllCompatibilities,
  });

  const { data: specificLinks = [] } = useQuery({
    queryKey: ["categorySpecificLinks", selectedParentCategory],
    queryFn: () => getLinksByCategory(selectedParentCategory),
    enabled: !!selectedParentCategory,
  });

  // ========== CATEGORIES MUTATIONS ==========
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
      setIsCategoryAddModalOpen(false);
      setNewCategory({ name: "", translation: "", description: "", category_type_id: "" });
      toast.success("Catégorie ajoutée avec succès");
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de l'ajout : " + error.message);
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async (category: Category) => {
      const { data, error } = await supabase
        .from("categories")
        .update({
          name: category.name,
          translation: category.translation,
          description: category.description,
          category_type_id: category.category_type_id,
        })
        .eq("id", category.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setIsCategoryEditModalOpen(false);
      setSelectedCategory(null);
      toast.success("Catégorie mise à jour avec succès");
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la mise à jour : " + error.message);
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", categoryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Catégorie supprimée avec succès");
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la suppression : " + error.message);
    },
  });

  // ========== TYPES MUTATIONS ==========
  const addTypeMutation = useMutation({
    mutationFn: addCategoryType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categoryTypes"] });
      toast.success("Type de catégorie ajouté avec succès");
      setIsTypeAddModalOpen(false);
      setNewType({ name: "", description: "", display_order: 0, is_active: true });
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de l'ajout : " + error.message);
    },
  });

  const updateTypeMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CategoryType> }) =>
      updateCategoryType(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categoryTypes"] });
      toast.success("Type de catégorie mis à jour");
      setIsTypeEditModalOpen(false);
      setSelectedType(null);
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la mise à jour : " + error.message);
    },
  });

  const deleteTypeMutation = useMutation({
    mutationFn: deleteCategoryType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categoryTypes"] });
      toast.success("Type de catégorie supprimé");
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la suppression : " + error.message);
    },
  });

  // ========== COMPATIBILITIES MUTATIONS ==========
  const addCompatibilityMutation = useMutation({
    mutationFn: addCompatibility,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categoryCompatibilities"] });
      toast.success("Compatibilité ajoutée avec succès");
      setIsCompatibilityAddModalOpen(false);
      setNewCompatibility({
        parent_category_type_id: "",
        child_category_type_id: "",
        compatibility_strength: 1,
        is_bidirectional: false,
      });
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de l'ajout : " + error.message);
    },
  });

  const deleteCompatibilityMutation = useMutation({
    mutationFn: deleteCompatibility,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categoryCompatibilities"] });
      toast.success("Compatibilité supprimée");
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la suppression : " + error.message);
    },
  });

  // ========== EXCEPTIONS MUTATIONS ==========
  const addExceptionMutation = useMutation({
    mutationFn: addSpecificLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorySpecificLinks"] });
      toast.success("Exception ajoutée avec succès");
      setIsExceptionAddModalOpen(false);
      setNewException({ child_category_id: "", link_type: "exception", priority: 1 });
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de l'ajout : " + error.message);
    },
  });

  const deleteExceptionMutation = useMutation({
    mutationFn: deleteSpecificLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorySpecificLinks"] });
      toast.success("Exception supprimée");
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la suppression : " + error.message);
    },
  });

  // ========== HANDLERS ==========
  const handleAddCategory = () => {
    if (!newCategory.name.trim() || !newCategory.translation.trim()) {
      toast.error("Le nom et la traduction sont requis");
      return;
    }
    addCategoryMutation.mutate(newCategory);
  };

  const handleUpdateCategory = () => {
    if (!selectedCategory) return;
    updateCategoryMutation.mutate(selectedCategory);
  };

  const handleDeleteCategory = (categoryId: string, categoryName: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la catégorie "${categoryName}" ?`)) {
      deleteCategoryMutation.mutate(categoryId);
    }
  };

  const handleAddType = () => {
    if (!newType.name.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    addTypeMutation.mutate(newType);
  };

  const handleUpdateType = () => {
    if (!selectedType || !selectedType.name.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    updateTypeMutation.mutate({
      id: selectedType.id,
      updates: {
        name: selectedType.name,
        description: selectedType.description,
        display_order: selectedType.display_order,
        is_active: selectedType.is_active,
      },
    });
  };

  const handleDeleteType = (id: string, name: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le type "${name}" ?`)) {
      deleteTypeMutation.mutate(id);
    }
  };

  const handleAddCompatibility = () => {
    if (!newCompatibility.parent_category_type_id || !newCompatibility.child_category_type_id) {
      toast.error("Veuillez sélectionner les deux types");
      return;
    }
    addCompatibilityMutation.mutate(newCompatibility);
  };

  const handleDeleteCompatibility = (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette compatibilité ?")) {
      deleteCompatibilityMutation.mutate(id);
    }
  };

  const handleAddException = () => {
    if (!selectedParentCategory || !newException.child_category_id) {
      toast.error("Veuillez sélectionner les deux catégories");
      return;
    }
    addExceptionMutation.mutate({
      parent_category_id: selectedParentCategory,
      child_category_id: newException.child_category_id,
      link_type: newException.link_type,
      priority: newException.priority,
    });
  };

  const handleDeleteException = (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette exception ?")) {
      deleteExceptionMutation.mutate(id);
    }
  };

  if (categoriesLoading || typesLoading) {
    return <div className="p-4">Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="categories">Catégories</TabsTrigger>
          <TabsTrigger value="types">Types</TabsTrigger>
          <TabsTrigger value="compatibilities">Compatibilités</TabsTrigger>
          <TabsTrigger value="exceptions">Exceptions</TabsTrigger>
        </TabsList>

        {/* ========== CATEGORIES TAB ========== */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Gestion des catégories</h3>
            <Button onClick={() => setIsCategoryAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une catégorie
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Traduction</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category: any) => (
                <TableRow key={category.id}>
                  <TableCell>{category.name}</TableCell>
                  <TableCell>{category.translation}</TableCell>
                  <TableCell>
                    {category.category_types ? (
                      <Badge variant="outline">{category.category_types.name}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {category.description || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedCategory(category);
                        setIsCategoryEditModalOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCategory(category.id, category.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* ========== TYPES TAB ========== */}
        <TabsContent value="types" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Types de catégories</h3>
            <Button onClick={() => setIsTypeAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un type
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Ordre</TableHead>
                <TableHead>Actif</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoryTypes.map((type) => (
                <TableRow key={type.id}>
                  <TableCell>{type.name}</TableCell>
                  <TableCell className="max-w-xs truncate">{type.description || "-"}</TableCell>
                  <TableCell>{type.display_order}</TableCell>
                  <TableCell>
                    {type.is_active ? (
                      <Badge variant="outline">Actif</Badge>
                    ) : (
                      <Badge variant="secondary">Inactif</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedType(type);
                        setIsTypeEditModalOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteType(type.id, type.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* ========== COMPATIBILITIES TAB ========== */}
        <TabsContent value="compatibilities" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Compatibilités automatiques (Type → Type)</h3>
            <Button onClick={() => setIsCompatibilityAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une compatibilité
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type parent</TableHead>
                <TableHead>Type enfant</TableHead>
                <TableHead>Force</TableHead>
                <TableHead>Bidirectionnel</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {compatibilities.map((comp) => (
                <TableRow key={comp.id}>
                  <TableCell>{comp.parent_type?.name || "-"}</TableCell>
                  <TableCell>{comp.child_type?.name || "-"}</TableCell>
                  <TableCell>{comp.compatibility_strength}</TableCell>
                  <TableCell>
                    {comp.is_bidirectional ? (
                      <Badge variant="outline">Oui</Badge>
                    ) : (
                      <Badge variant="secondary">Non</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCompatibility(comp.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* ========== EXCEPTIONS TAB ========== */}
        <TabsContent value="exceptions" className="space-y-4">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Exceptions spécifiques (Catégorie → Catégorie)</h3>
            
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label>Sélectionner une catégorie parente</Label>
                <Select value={selectedParentCategory} onValueChange={setSelectedParentCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat: any) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedParentCategory && (
                <Button onClick={() => setIsExceptionAddModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une exception
                </Button>
              )}
            </div>

            {selectedParentCategory && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Catégorie liée</TableHead>
                    <TableHead>Type de lien</TableHead>
                    <TableHead>Priorité</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {specificLinks.map((link) => (
                    <TableRow key={link.id}>
                      <TableCell>{link.child_category?.name || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            link.link_type === "required"
                              ? "destructive"
                              : link.link_type === "recommended"
                              ? "default"
                              : "outline"
                          }
                        >
                          {link.link_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{link.priority}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteException(link.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ========== MODALS ========== */}
      
      {/* ADD CATEGORY MODAL */}
      <Dialog open={isCategoryAddModalOpen} onOpenChange={setIsCategoryAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une catégorie</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nom</Label>
              <Input
                id="name"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="translation">Traduction</Label>
              <Input
                id="translation"
                value={newCategory.translation}
                onChange={(e) => setNewCategory({ ...newCategory, translation: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="category_type">Type de catégorie</Label>
              <Select
                value={newCategory.category_type_id}
                onValueChange={(value) =>
                  setNewCategory({ ...newCategory, category_type_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucun</SelectItem>
                  {categoryTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryAddModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddCategory}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT CATEGORY MODAL */}
      <Dialog open={isCategoryEditModalOpen} onOpenChange={setIsCategoryEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la catégorie</DialogTitle>
          </DialogHeader>
          {selectedCategory && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Nom</Label>
                <Input
                  id="edit-name"
                  value={selectedCategory.name}
                  onChange={(e) =>
                    setSelectedCategory({ ...selectedCategory, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-translation">Traduction</Label>
                <Input
                  id="edit-translation"
                  value={selectedCategory.translation}
                  onChange={(e) =>
                    setSelectedCategory({ ...selectedCategory, translation: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-category_type">Type de catégorie</Label>
                <Select
                  value={selectedCategory.category_type_id || ""}
                  onValueChange={(value) =>
                    setSelectedCategory({ ...selectedCategory, category_type_id: value || null })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Aucun</SelectItem>
                    {categoryTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={selectedCategory.description || ""}
                  onChange={(e) =>
                    setSelectedCategory({ ...selectedCategory, description: e.target.value })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryEditModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdateCategory}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADD TYPE MODAL */}
      <Dialog open={isTypeAddModalOpen} onOpenChange={setIsTypeAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un type de catégorie</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="type-name">Nom</Label>
              <Input
                id="type-name"
                value={newType.name}
                onChange={(e) => setNewType({ ...newType, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="type-description">Description</Label>
              <Textarea
                id="type-description"
                value={newType.description}
                onChange={(e) => setNewType({ ...newType, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="type-order">Ordre d'affichage</Label>
              <Input
                id="type-order"
                type="number"
                value={newType.display_order}
                onChange={(e) =>
                  setNewType({ ...newType, display_order: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="type-active"
                checked={newType.is_active}
                onCheckedChange={(checked) => setNewType({ ...newType, is_active: checked })}
              />
              <Label htmlFor="type-active">Actif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTypeAddModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddType}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT TYPE MODAL */}
      <Dialog open={isTypeEditModalOpen} onOpenChange={setIsTypeEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le type de catégorie</DialogTitle>
          </DialogHeader>
          {selectedType && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-type-name">Nom</Label>
                <Input
                  id="edit-type-name"
                  value={selectedType.name}
                  onChange={(e) => setSelectedType({ ...selectedType, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-type-description">Description</Label>
                <Textarea
                  id="edit-type-description"
                  value={selectedType.description || ""}
                  onChange={(e) =>
                    setSelectedType({ ...selectedType, description: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-type-order">Ordre d'affichage</Label>
                <Input
                  id="edit-type-order"
                  type="number"
                  value={selectedType.display_order}
                  onChange={(e) =>
                    setSelectedType({
                      ...selectedType,
                      display_order: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-type-active"
                  checked={selectedType.is_active}
                  onCheckedChange={(checked) =>
                    setSelectedType({ ...selectedType, is_active: checked })
                  }
                />
                <Label htmlFor="edit-type-active">Actif</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTypeEditModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdateType}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADD COMPATIBILITY MODAL */}
      <Dialog open={isCompatibilityAddModalOpen} onOpenChange={setIsCompatibilityAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une compatibilité automatique</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="parent-type">Type parent</Label>
              <Select
                value={newCompatibility.parent_category_type_id}
                onValueChange={(value) =>
                  setNewCompatibility({ ...newCompatibility, parent_category_type_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  {categoryTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="child-type">Type enfant</Label>
              <Select
                value={newCompatibility.child_category_type_id}
                onValueChange={(value) =>
                  setNewCompatibility({ ...newCompatibility, child_category_type_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  {categoryTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="strength">Force de compatibilité (1-5)</Label>
              <Input
                id="strength"
                type="number"
                min="1"
                max="5"
                value={newCompatibility.compatibility_strength}
                onChange={(e) =>
                  setNewCompatibility({
                    ...newCompatibility,
                    compatibility_strength: parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="bidirectional"
                checked={newCompatibility.is_bidirectional}
                onCheckedChange={(checked) =>
                  setNewCompatibility({ ...newCompatibility, is_bidirectional: checked })
                }
              />
              <Label htmlFor="bidirectional">Bidirectionnel</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCompatibilityAddModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddCompatibility}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADD EXCEPTION MODAL */}
      <Dialog open={isExceptionAddModalOpen} onOpenChange={setIsExceptionAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une exception spécifique</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="child-category">Catégorie liée</Label>
              <Select
                value={newException.child_category_id}
                onValueChange={(value) =>
                  setNewException({ ...newException, child_category_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter((cat: any) => cat.id !== selectedParentCategory)
                    .map((cat: any) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="link-type">Type de lien</Label>
              <Select
                value={newException.link_type}
                onValueChange={(value: any) =>
                  setNewException({ ...newException, link_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exception">Exception</SelectItem>
                  <SelectItem value="recommended">Recommandé</SelectItem>
                  <SelectItem value="required">Requis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Priorité</Label>
              <Input
                id="priority"
                type="number"
                min="1"
                value={newException.priority}
                onChange={(e) =>
                  setNewException({ ...newException, priority: parseInt(e.target.value) || 1 })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExceptionAddModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddException}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnifiedCategoryManager;
