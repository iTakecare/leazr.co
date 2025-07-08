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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBrands, addBrand, updateBrand, deleteBrand } from "@/services/catalogService";

interface BrandWithTranslation {
  key: string;
  name: string;
  translation: string;
}

interface BrandData {
  name: string;
  translation: string;
}

const BrandManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandTranslation, setNewBrandTranslation] = useState("");
  const [isEditing, setIsEditing] = useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = useState<Record<string, { name: string, translation: string }>>({});

  // Fetch brands from the database with forced refresh
  const { data: brandsData = [], isLoading } = useQuery({
    queryKey: ["brands"],
    queryFn: getBrands,
    staleTime: 0, // Force refresh
    gcTime: 0, // Don't cache
  });

  const brandList: BrandWithTranslation[] = (brandsData as BrandData[]).map((brand) => ({
    key: brand.name.toLowerCase(),
    name: brand.name,
    translation: brand.translation
  }));

  // Mutations for CRUD operations
  const addBrandMutation = useMutation({
    mutationFn: addBrand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Marque ajoutée avec succès");
      setNewBrandName("");
      setNewBrandTranslation("");
    },
    onError: (error) => {
      console.error("Erreur lors de l'ajout de la marque:", error);
      toast.error("Impossible d'ajouter la marque");
    }
  });

  const updateBrandMutation = useMutation({
    mutationFn: updateBrand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Marque mise à jour avec succès");
    },
    onError: (error) => {
      console.error("Erreur lors de la mise à jour de la marque:", error);
      toast.error("Impossible de mettre à jour la marque");
    }
  });

  const deleteBrandMutation = useMutation({
    mutationFn: deleteBrand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Marque supprimée avec succès");
    },
    onError: (error) => {
      console.error("Erreur lors de la suppression de la marque:", error);
      toast.error("Impossible de supprimer la marque");
    }
  });

  const startEditing = (brand: BrandWithTranslation) => {
    setIsEditing(prev => ({ ...prev, [brand.key]: true }));
    setEditValues(prev => ({
      ...prev,
      [brand.key]: { name: brand.name, translation: brand.translation }
    }));
  };

  const saveEditing = (key: string, originalName: string) => {
    if (!editValues[key]?.name || !editValues[key]?.translation) {
      toast.error("Le nom et la traduction sont requis");
      return;
    }

    updateBrandMutation.mutate({
      originalName,
      name: editValues[key].name,
      translation: editValues[key].translation
    });
    
    setIsEditing(prev => ({ ...prev, [key]: false }));
  };

  const cancelEditing = (key: string) => {
    setIsEditing(prev => ({ ...prev, [key]: false }));
  };

  const addBrandHandler = () => {
    if (!newBrandName || !newBrandTranslation) {
      toast.error("Le nom et la traduction sont requis");
      return;
    }

    const key = newBrandName.toLowerCase();
    
    // Check if brand already exists
    if (brandList.some(cat => cat.key === key)) {
      toast.error("Cette marque existe déjà");
      return;
    }

    addBrandMutation.mutate({
      name: newBrandName,
      translation: newBrandTranslation
    });
  };

  const removeBrandHandler = (name: string) => {
    deleteBrandMutation.mutate({ name });
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
            <CardTitle>Gestion des marques</CardTitle>
            <CardDescription>Chargement des marques...</CardDescription>
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
          <CardTitle>Gestion des marques</CardTitle>
          <CardDescription>
            Gérez les marques de produits et leurs traductions françaises.
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
                {brandList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Aucune marque trouvée. Ajoutez votre première marque ci-dessous.
                    </TableCell>
                  </TableRow>
                ) : (
                  brandList.map((brand) => (
                    <TableRow key={brand.key}>
                      <TableCell>
                        {isEditing[brand.key] ? (
                          <Input
                            value={editValues[brand.key]?.name || ""}
                            onChange={(e) => handleEditNameChange(brand.key, e.target.value)}
                            className="w-full"
                          />
                        ) : (
                          brand.name
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing[brand.key] ? (
                          <Input
                            value={editValues[brand.key]?.translation || ""}
                            onChange={(e) => handleEditTranslationChange(brand.key, e.target.value)}
                            className="w-full"
                          />
                        ) : (
                          brand.translation
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {isEditing[brand.key] ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => cancelEditing(brand.key)}
                              >
                                Annuler
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => saveEditing(brand.key, brand.name)}
                              >
                                <Save className="h-4 w-4 mr-1" /> Enregistrer
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => startEditing(brand)}
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
                                      Êtes-vous sûr de vouloir supprimer cette marque ? 
                                      Cette action ne supprimera pas les produits associés à cette marque.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => removeBrandHandler(brand.name)}>
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
              <h3 className="text-lg font-medium mb-4">Ajouter une nouvelle marque</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Input
                    placeholder="Nom de la marque (en anglais)"
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                  />
                </div>
                <div>
                  <Input
                    placeholder="Traduction française"
                    value={newBrandTranslation}
                    onChange={(e) => setNewBrandTranslation(e.target.value)}
                  />
                </div>
              </div>
              <Button className="mt-4" onClick={addBrandHandler}>
                <Plus className="h-4 w-4 mr-2" /> Ajouter une marque
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BrandManager;
