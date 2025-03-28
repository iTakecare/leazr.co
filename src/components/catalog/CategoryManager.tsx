import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit, Save, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCategories, addCategory, updateCategory, deleteCategory } from "@/services/catalogService";

interface CategoryWithTranslation {
  key: string;
  name: string;
  translation: string;
}

interface CategoryData {
  name: string;
  translation: string;
}

const CategoryManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryTranslation, setNewCategoryTranslation] = useState("");
  const [isEditing, setIsEditing] = useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = useState<Record<string, { name: string, translation: string }>>({});

  // Fetch categories from the database
  const { data: categoriesData = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const categoryList: CategoryWithTranslation[] = (categoriesData as CategoryData[]).map((category) => ({
    key: category.name.toLowerCase(),
    name: category.name,
    translation: category.translation
  }));

  // Mutations for CRUD operations
  const addCategoryMutation = useMutation({
    mutationFn: addCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Catégorie ajoutée avec succès");
      setNewCategoryName("");
      setNewCategoryTranslation("");
    },
    onError: (error) => {
      console.error("Erreur lors de l'ajout de la catégorie:", error);
      toast.error("Impossible d'ajouter la catégorie");
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: updateCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Catégorie mise à jour avec succès");
    },
    onError: (error) => {
      console.error("Erreur lors de la mise à jour de la catégorie:", error);
      toast.error("Impossible de mettre à jour la catégorie");
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Catégorie supprimée avec succès");
    },
    onError: (error) => {
      console.error("Erreur lors de la suppression de la catégorie:", error);
      toast.error("Impossible de supprimer la catégorie");
    }
  });

  const startEditing = (category: CategoryWithTranslation) => {
    setIsEditing(prev => ({ ...prev, [category.key]: true }));
    setEditValues(prev => ({
      ...prev,
      [category.key]: { name: category.name, translation: category.translation }
    }));
  };

  const saveEditing = (key: string, originalName: string) => {
    if (!editValues[key]?.name || !editValues[key]?.translation) {
      toast.error("Le nom et la traduction sont requis");
      return;
    }

    updateCategoryMutation.mutate({
      originalName,
      name: editValues[key].name,
      translation: editValues[key].translation
    });
    
    setIsEditing(prev => ({ ...prev, [key]: false }));
  };

  const cancelEditing = (key: string) => {
    setIsEditing(prev => ({ ...prev, [key]: false }));
  };

  const addCategoryHandler = () => {
    if (!newCategoryName || !newCategoryTranslation) {
      toast.error("Le nom et la traduction sont requis");
      return;
    }

    const key = newCategoryName.toLowerCase();
    
    // Check if category already exists
    if (categoryList.some(cat => cat.key === key)) {
      toast.error("Cette catégorie existe déjà");
      return;
    }

    addCategoryMutation.mutate({
      name: newCategoryName,
      translation: newCategoryTranslation
    });
  };

  const removeCategoryHandler = (name: string) => {
    deleteCategoryMutation.mutate({ name });
  };

  const handleEditNameChange = (key: string, value: string) => {
    setEditValues(prev => ({
      ...prev,
      [key]: { ...prev[key], name: value }
    }));
  };

  const handleEditTranslationChange = (key: string, value: string) => {
    setEditValues(prev => ({
      ...prev,
      [key]: { ...prev[key], translation: value }
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Gestion des catégories</CardTitle>
            <CardDescription>Chargement des catégories...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted/10 rounded-md animate-pulse" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestion des catégories</CardTitle>
          <CardDescription>
            Gérez les catégories de produits et leurs traductions françaises.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom anglais</TableHead>
                  <TableHead>Traduction française</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Aucune catégorie trouvée. Ajoutez votre première catégorie ci-dessous.
                    </TableCell>
                  </TableRow>
                ) : (
                  categoryList.map((category) => (
                    <TableRow key={category.key}>
                      <TableCell>
                        {isEditing[category.key] ? (
                          <Input
                            value={editValues[category.key]?.name || ""}
                            onChange={(e) => handleEditNameChange(category.key, e.target.value)}
                            className="w-full"
                          />
                        ) : (
                          category.name
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing[category.key] ? (
                          <Input
                            value={editValues[category.key]?.translation || ""}
                            onChange={(e) => handleEditTranslationChange(category.key, e.target.value)}
                            className="w-full"
                          />
                        ) : (
                          category.translation
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {isEditing[category.key] ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => cancelEditing(category.key)}
                              >
                                Annuler
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => saveEditing(category.key, category.name)}
                              >
                                <Save className="h-4 w-4 mr-1" /> Enregistrer
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => startEditing(category)}
                              >
                                <Edit className="h-4 w-4 mr-1" /> Éditer
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" /> Supprimer
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Êtes-vous sûr de vouloir supprimer cette catégorie ? 
                                      Cette action ne supprimera pas les produits associés à cette catégorie.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => removeCategoryHandler(category.name)}>
                                      Supprimer
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <div className="pt-6 border-t">
              <h3 className="text-lg font-medium mb-4">Ajouter une nouvelle catégorie</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Input
                    placeholder="Nom de la catégorie (en anglais)"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                </div>
                <div>
                  <Input
                    placeholder="Traduction française"
                    value={newCategoryTranslation}
                    onChange={(e) => setNewCategoryTranslation(e.target.value)}
                  />
                </div>
              </div>
              <Button className="mt-4" onClick={addCategoryHandler}>
                <Plus className="h-4 w-4 mr-2" /> Ajouter une catégorie
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conseils d'utilisation</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2">
            <li>Les catégories sont utilisées pour organiser vos produits.</li>
            <li>La traduction française sera affichée dans l'interface utilisateur.</li>
            <li>
              Supprimer une catégorie ne supprimera pas les produits associés, 
              mais ils n'apparaîtront plus sous cette catégorie.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default CategoryManager;
