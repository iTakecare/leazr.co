import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllCategoryTypes,
  createCategoryType,
  updateCategoryType,
  deleteCategoryType,
  getCategoryTypeUsage,
  type CategoryType,
} from "@/services/categoryTypeService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, GripVertical } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

export const CategoryTypeManager = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<CategoryType | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; value: string } | null>(null);
  const [formData, setFormData] = useState({
    value: "",
    label: "",
    icon: "",
    bg_color: "bg-blue-100",
    text_color: "text-blue-800",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: types = [], isLoading } = useQuery({
    queryKey: ["category-types-all"],
    queryFn: getAllCategoryTypes,
  });

  const createMutation = useMutation({
    mutationFn: createCategoryType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-types-all"] });
      queryClient.invalidateQueries({ queryKey: ["category-types"] });
      toast({ title: "Type créé avec succès" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CategoryType> }) =>
      updateCategoryType(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-types-all"] });
      queryClient.invalidateQueries({ queryKey: ["category-types"] });
      toast({ title: "Type mis à jour avec succès" });
      setIsDialogOpen(false);
      setEditingType(null);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) => deleteCategoryType(id, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-types-all"] });
      queryClient.invalidateQueries({ queryKey: ["category-types"] });
      toast({ title: "Type désactivé avec succès" });
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      value: "",
      label: "",
      icon: "",
      bg_color: "bg-blue-100",
      text_color: "text-blue-800",
    });
  };

  const handleEdit = (type: CategoryType) => {
    setEditingType(type);
    setFormData({
      value: type.value,
      label: type.label,
      icon: type.icon || "",
      bg_color: type.bg_color,
      text_color: type.text_color,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingType) {
      updateMutation.mutate({
        id: editingType.id,
        updates: {
          label: formData.label,
          icon: formData.icon,
          bg_color: formData.bg_color,
          text_color: formData.text_color,
        },
      });
    } else {
      createMutation.mutate({
        ...formData,
        display_order: types.length + 1,
        is_active: true,
      });
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(types);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updates = items.map((item, index) => ({
      id: item.id,
      display_order: index + 1,
    }));

    queryClient.setQueryData(["category-types-all"], items);
  };

  if (isLoading) {
    return <div className="p-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Types de catégories</h1>
          <p className="text-muted-foreground">
            Gérez les types de catégories disponibles dans le système
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un type
        </Button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="types">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
              {types.map((type, index) => (
                <Draggable key={type.id} draggableId={type.id} index={index}>
                  {(provided) => (
                    <Card
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div {...provided.dragHandleProps}>
                          <GripVertical className="w-5 h-5 text-muted-foreground cursor-move" />
                        </div>

                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-2xl">{type.icon}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{type.label}</span>
                              <Badge variant="secondary" className="text-xs">
                                {type.value}
                              </Badge>
                              {!type.is_active && (
                                <Badge variant="destructive" className="text-xs">
                                  Inactif
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={`${type.bg_color} ${type.text_color} border-0`}>
                                Aperçu
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(type)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirm({ id: type.id, value: type.value })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingType ? "Modifier le type" : "Ajouter un type"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Valeur (identifiant)</label>
              <Input
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="Ex: device"
                disabled={!!editingType}
              />
              {editingType && (
                <p className="text-xs text-muted-foreground mt-1">
                  L'identifiant ne peut pas être modifié
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Label</label>
              <Input
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="Ex: Appareil"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Icône (emoji)</label>
              <Input
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="Ex: 📱"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Couleur de fond</label>
                <Input
                  value={formData.bg_color}
                  onChange={(e) => setFormData({ ...formData, bg_color: e.target.value })}
                  placeholder="Ex: bg-blue-100"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Couleur du texte</label>
                <Input
                  value={formData.text_color}
                  onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                  placeholder="Ex: text-blue-800"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Aperçu</label>
              <Badge className={`${formData.bg_color} ${formData.text_color} border-0`}>
                {formData.icon} {formData.label}
              </Badge>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit}>
              {editingType ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la désactivation</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir désactiver ce type ? Il ne sera plus visible dans les
              sélecteurs mais les catégories existantes le conserveront.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirm) {
                  deleteMutation.mutate(deleteConfirm);
                }
              }}
            >
              Désactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
