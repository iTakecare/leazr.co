import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";
import {
  getCategoryTypes,
  addCategoryType,
  updateCategoryType,
  deleteCategoryType,
} from "@/services/categoryTypeService";
import { CategoryType } from "@/types/categoryTypes";
import { Switch } from "@/components/ui/switch";

const CategoryTypeManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<CategoryType | null>(null);
  const [newType, setNewType] = useState({
    name: "",
    description: "",
    display_order: 0,
    is_active: true,
  });

  const { data: types, isLoading } = useQuery({
    queryKey: ["categoryTypes"],
    queryFn: getCategoryTypes,
  });

  const addMutation = useMutation({
    mutationFn: addCategoryType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categoryTypes"] });
      toast.success("Type de catégorie ajouté avec succès");
      setIsAddModalOpen(false);
      setNewType({ name: "", description: "", display_order: 0, is_active: true });
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de l'ajout : " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CategoryType> }) =>
      updateCategoryType(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categoryTypes"] });
      toast.success("Type de catégorie mis à jour");
      setIsEditModalOpen(false);
      setSelectedType(null);
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la mise à jour : " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategoryType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categoryTypes"] });
      toast.success("Type de catégorie supprimé");
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la suppression : " + error.message);
    },
  });

  const handleAdd = () => {
    if (!newType.name.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    addMutation.mutate(newType);
  };

  const handleEdit = (type: CategoryType) => {
    setSelectedType(type);
    setIsEditModalOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedType || !selectedType.name.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    updateMutation.mutate({
      id: selectedType.id,
      updates: {
        name: selectedType.name,
        description: selectedType.description,
        display_order: selectedType.display_order,
        is_active: selectedType.is_active,
      },
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le type "${name}" ?`)) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <div className="p-4">Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Types de catégories</h2>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
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
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {types?.map((type) => (
            <TableRow key={type.id}>
              <TableCell className="font-medium">{type.name}</TableCell>
              <TableCell>{type.description || "-"}</TableCell>
              <TableCell>{type.display_order}</TableCell>
              <TableCell>{type.is_active ? "Oui" : "Non"}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(type)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(type.id, type.name)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Add Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un type de catégorie</DialogTitle>
            <DialogDescription>
              Les types permettent d'organiser automatiquement les compatibilités.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nom *</label>
              <Input
                value={newType.name}
                onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                placeholder="Ex: device, accessory..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={newType.description}
                onChange={(e) => setNewType({ ...newType, description: e.target.value })}
                placeholder="Description du type..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Ordre d'affichage</label>
              <Input
                type="number"
                value={newType.display_order}
                onChange={(e) =>
                  setNewType({ ...newType, display_order: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={newType.is_active}
                onCheckedChange={(checked) =>
                  setNewType({ ...newType, is_active: checked })
                }
              />
              <label className="text-sm font-medium">Actif</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAdd}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le type de catégorie</DialogTitle>
          </DialogHeader>
          {selectedType && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nom *</label>
                <Input
                  value={selectedType.name}
                  onChange={(e) =>
                    setSelectedType({ ...selectedType, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={selectedType.description || ""}
                  onChange={(e) =>
                    setSelectedType({ ...selectedType, description: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Ordre d'affichage</label>
                <Input
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
              <div className="flex items-center gap-2">
                <Switch
                  checked={selectedType.is_active}
                  onCheckedChange={(checked) =>
                    setSelectedType({ ...selectedType, is_active: checked })
                  }
                />
                <label className="text-sm font-medium">Actif</label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdate}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoryTypeManager;
