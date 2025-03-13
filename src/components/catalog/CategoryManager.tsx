
import React, { useState } from "react";
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

interface CategoryManagerProps {
  categories: string[];
  categoryTranslations: Record<string, string>;
}

interface CategoryWithTranslation {
  key: string;
  name: string;
  translation: string;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ categories, categoryTranslations }) => {
  const initialCategories = categories.map(category => ({
    key: category.toLowerCase(),
    name: category,
    translation: categoryTranslations[category.toLowerCase()] || category
  }));

  const [categoryList, setCategoryList] = useState<CategoryWithTranslation[]>(initialCategories);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryTranslation, setNewCategoryTranslation] = useState("");
  const [isEditing, setIsEditing] = useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = useState<Record<string, { name: string, translation: string }>>({});

  const startEditing = (category: CategoryWithTranslation) => {
    setIsEditing(prev => ({ ...prev, [category.key]: true }));
    setEditValues(prev => ({
      ...prev,
      [category.key]: { name: category.name, translation: category.translation }
    }));
  };

  const saveEditing = (key: string) => {
    if (!editValues[key]?.name || !editValues[key]?.translation) {
      toast.error("Le nom et la traduction sont requis");
      return;
    }

    setCategoryList(prevList => 
      prevList.map(cat => 
        cat.key === key 
          ? { 
              key: editValues[key].name.toLowerCase(), 
              name: editValues[key].name, 
              translation: editValues[key].translation 
            }
          : cat
      )
    );
    
    setIsEditing(prev => ({ ...prev, [key]: false }));
    toast.success("Catégorie mise à jour");
  };

  const cancelEditing = (key: string) => {
    setIsEditing(prev => ({ ...prev, [key]: false }));
  };

  const addCategory = () => {
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

    setCategoryList(prevList => [
      ...prevList, 
      { 
        key, 
        name: newCategoryName, 
        translation: newCategoryTranslation 
      }
    ]);

    setNewCategoryName("");
    setNewCategoryTranslation("");
    toast.success("Catégorie ajoutée");
  };

  const removeCategory = (key: string) => {
    setCategoryList(prevList => prevList.filter(cat => cat.key !== key));
    toast.success("Catégorie supprimée");
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
                {categoryList.map((category) => (
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
                              onClick={() => saveEditing(category.key)}
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
                                  <AlertDialogAction onClick={() => removeCategory(category.key)}>
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
                ))}
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
              <Button className="mt-4" onClick={addCategory}>
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
            <li>
              Les modifications apportées ici ne sont que visuelles et n'affectent pas 
              les catégories dans la base de données.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default CategoryManager;
