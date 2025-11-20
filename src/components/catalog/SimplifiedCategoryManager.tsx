import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  getCategoriesWithProductCount,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryProducts,
  getTypeCompatibilities,
  setTypeCompatibilities,
  CATEGORY_TYPES,
  SimplifiedCategory,
} from "@/services/simplifiedCategoryService";
import { useMultiTenant } from "@/hooks/useMultiTenant";

export default function SimplifiedCategoryManager() {
  const { companyId } = useMultiTenant();
  const queryClient = useQueryClient();
  
  const [selectedCategory, setSelectedCategory] = useState<SimplifiedCategory | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    translation: "",
    type: "device",
    description: "",
  });
  
  const [selectedCompatibilities, setSelectedCompatibilities] = useState<string[]>([]);

  // Queries
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["simplified-categories"],
    queryFn: getCategoriesWithProductCount,
  });

  const { data: categoryProducts = [] } = useQuery({
    queryKey: ["category-products", selectedCategory?.id],
    queryFn: () => selectedCategory ? getCategoryProducts(selectedCategory.id, 30) : Promise.resolve([]),
    enabled: !!selectedCategory,
  });

  const { data: compatibilities = [] } = useQuery({
    queryKey: ["type-compatibilities", selectedCategory?.type],
    queryFn: () => selectedCategory ? getTypeCompatibilities(selectedCategory.type) : Promise.resolve([]),
    enabled: !!selectedCategory,
  });

  // Mettre à jour selectedCompatibilities quand les compatibilities changent
  useEffect(() => {
    if (compatibilities && !isEditing) {
      setSelectedCompatibilities(compatibilities);
    }
  }, [compatibilities, isEditing]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["simplified-categories"] });
      toast.success("Catégorie créée avec succès");
      resetForm();
      setIsSheetOpen(false);
    },
    onError: () => {
      toast.error("Erreur lors de la création de la catégorie");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<SimplifiedCategory> }) =>
      updateCategory(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["simplified-categories"] });
      toast.success("Catégorie mise à jour");
      resetForm();
      setIsSheetOpen(false);
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["simplified-categories"] });
      toast.success("Catégorie supprimée");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });

  const compatibilityMutation = useMutation({
    mutationFn: ({ type, childTypes }: { type: string; childTypes: string[] }) =>
      setTypeCompatibilities(type, childTypes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["type-compatibilities"] });
      toast.success("Compatibilités mises à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour des compatibilités");
    },
  });

  // Handlers
  const resetForm = () => {
    setFormData({ name: "", translation: "", type: "device", description: "" });
    setSelectedCategory(null);
    setIsEditing(false);
    setSelectedCompatibilities([]);
  };

  const handleOpenSheet = (category?: SimplifiedCategory) => {
    if (category) {
      setSelectedCategory(category);
      setFormData({
        name: category.name,
        translation: category.translation,
        type: category.type,
        description: category.description || "",
      });
      setIsEditing(true);
    } else {
      resetForm();
    }
    setIsSheetOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.translation || !formData.type) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    if (!companyId) {
      toast.error("Company ID manquant");
      return;
    }

    if (isEditing && selectedCategory) {
      updateMutation.mutate({
        id: selectedCategory.id,
        updates: {
          name: formData.name,
          translation: formData.translation,
          type: formData.type,
          description: formData.description || undefined,
        },
      });
    } else {
      createMutation.mutate({
        name: formData.name,
        translation: formData.translation,
        type: formData.type,
        description: formData.description || undefined,
        company_id: companyId,
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette catégorie ?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSaveCompatibilities = () => {
    if (selectedCategory) {
      compatibilityMutation.mutate({
        type: selectedCategory.type,
        childTypes: selectedCompatibilities,
      });
    }
  };

  const handleViewCategory = (category: SimplifiedCategory) => {
    setSelectedCategory(category);
    setSelectedCompatibilities(compatibilities);
    setIsSheetOpen(true);
    setIsEditing(false);
  };

  if (isLoading) {
    return <div className="p-8 text-center">Chargement des catégories...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Gestion des Catégories</h2>
        <Button onClick={() => handleOpenSheet()}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle catégorie
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Produits</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow
                key={category.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleViewCategory(category)}
              >
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                    {CATEGORY_TYPES.find(t => t.value === category.type)?.label || category.type}
                  </span>
                </TableCell>
                <TableCell className="text-right">{category.product_count || 0}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenSheet(category)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(category.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>
              {isEditing ? "Modifier la catégorie" : selectedCategory ? "Détails de la catégorie" : "Nouvelle catégorie"}
            </SheetTitle>
            <SheetDescription>
              {isEditing ? "Modifiez les informations de la catégorie" : selectedCategory ? "Consultez les détails et produits" : "Créez une nouvelle catégorie"}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Form section - only show when creating or editing */}
            {(isEditing || !selectedCategory) && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nom *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Ordinateurs portables"
                  />
                </div>

                <div>
                  <Label htmlFor="translation">Traduction *</Label>
                  <Input
                    id="translation"
                    value={formData.translation}
                    onChange={(e) => setFormData({ ...formData, translation: e.target.value })}
                    placeholder="Ex: Laptops"
                  />
                </div>

                <div>
                  <Label htmlFor="type">Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description optionnelle"
                  />
                </div>

                <Button onClick={handleSave} className="w-full">
                  {isEditing ? "Mettre à jour" : "Créer"}
                </Button>
              </div>
            )}

            {/* View section - only show when viewing */}
            {selectedCategory && !isEditing && (
              <>
                <div className="space-y-2">
                  <h3 className="font-semibold">Informations</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Nom:</span> {selectedCategory.name}</p>
                    <p><span className="font-medium">Translation:</span> {selectedCategory.translation}</p>
                    <p><span className="font-medium">Type:</span> {CATEGORY_TYPES.find(t => t.value === selectedCategory.type)?.label}</p>
                    {selectedCategory.description && (
                      <p><span className="font-medium">Description:</span> {selectedCategory.description}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Produits ({categoryProducts.length})</h3>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {categoryProducts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucun produit dans cette catégorie</p>
                    ) : (
                      categoryProducts.map((product) => (
                        <div key={product.id} className="flex items-center justify-between p-2 border rounded text-sm">
                          <div className="flex-1">
                            <p className="font-medium">{product.name}</p>
                            {product.brand_name && (
                              <p className="text-xs text-muted-foreground">{product.brand_name}</p>
                            )}
                          </div>
                          {product.monthly_price && (
                            <p className="text-sm font-medium">{product.monthly_price}€/mois</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Compatibilités</h3>
                  <p className="text-xs text-muted-foreground">
                    Les produits de type "{CATEGORY_TYPES.find(t => t.value === selectedCategory.type)?.label}" 
                    sont compatibles avec :
                  </p>
                  <div className="space-y-2">
                    {CATEGORY_TYPES.filter(t => t.value !== selectedCategory.type).map((type) => (
                      <div key={type.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={type.value}
                          checked={selectedCompatibilities.includes(type.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCompatibilities([...selectedCompatibilities, type.value]);
                            } else {
                              setSelectedCompatibilities(selectedCompatibilities.filter(t => t !== type.value));
                            }
                          }}
                        />
                        <label
                          htmlFor={type.value}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {type.label}
                        </label>
                      </div>
                    ))}
                  </div>
                  <Button onClick={handleSaveCompatibilities} className="w-full mt-2" variant="outline">
                    Sauvegarder les compatibilités
                  </Button>
                </div>

                <Button onClick={() => handleOpenSheet(selectedCategory)} className="w-full">
                  <Pencil className="mr-2 h-4 w-4" />
                  Modifier
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
