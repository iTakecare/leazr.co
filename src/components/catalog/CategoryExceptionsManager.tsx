import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSpecificLinkDetails,
  addSpecificLink,
  deleteSpecificLink,
  updateSpecificLinkPriority,
} from "@/services/categorySpecificLinkService";
import { getCategoriesWithProductCount } from "@/services/simplifiedCategoryService";
import { useToast } from "@/hooks/use-toast";
import { CategorySpecificLink } from "@/types/categoryTypes";

interface CategoryExceptionsManagerProps {
  categoryId: string;
}

export const CategoryExceptionsManager: React.FC<
  CategoryExceptionsManagerProps
> = ({ categoryId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [priority, setPriority] = useState<string>("1");

  const { data: exceptions = [], isLoading } = useQuery({
    queryKey: ["category-exceptions", categoryId],
    queryFn: () => getSpecificLinkDetails(categoryId),
  });

  const { data: allCategories = [] } = useQuery({
    queryKey: ["categories-for-exceptions"],
    queryFn: getCategoriesWithProductCount,
  });

  const availableCategories = allCategories.filter(
    (cat) =>
      cat.id !== categoryId &&
      !exceptions.some((exc) => exc.child_category_id === cat.id)
  );

  const addMutation = useMutation({
    mutationFn: () =>
      addSpecificLink({
        parent_category_id: categoryId,
        child_category_id: selectedChildId,
        priority: parseInt(priority),
        link_type: "exception",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-exceptions"] });
      toast({
        title: "Exception ajoutée",
        description: "Le lien spécifique a été créé avec succès",
      });
      setIsAdding(false);
      setSelectedChildId("");
      setPriority("1");
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter l'exception",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSpecificLink(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-exceptions"] });
      toast({
        title: "Exception supprimée",
        description: "Le lien spécifique a été supprimé",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'exception",
        variant: "destructive",
      });
    },
  });

  const updatePriorityMutation = useMutation({
    mutationFn: ({ id, priority }: { id: string; priority: number }) =>
      updateSpecificLinkPriority(id, priority),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-exceptions"] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Exceptions spécifiques</h4>
        {!isAdding && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
            disabled={availableCategories.length === 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="border rounded-lg p-3 space-y-3 bg-accent/20">
          <Select value={selectedChildId} onValueChange={setSelectedChildId}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une catégorie" />
            </SelectTrigger>
            <SelectContent>
              {availableCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground whitespace-nowrap">
              Priorité:
            </label>
            <Input
              type="number"
              min="1"
              max="5"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-20"
            />
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => addMutation.mutate()}
              disabled={!selectedChildId || addMutation.isPending}
            >
              Confirmer
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsAdding(false);
                setSelectedChildId("");
                setPriority("1");
              }}
            >
              Annuler
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-muted-foreground text-center py-4">
          Chargement...
        </div>
      ) : exceptions.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-4 border rounded-lg border-dashed">
          <AlertCircle className="h-4 w-4 mx-auto mb-2 opacity-50" />
          Aucune exception spécifique
        </div>
      ) : (
        <div className="space-y-2">
          {exceptions.map((exception) => (
            <div
              key={exception.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {exception.child_category?.name}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Priorité: {exception.priority}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Select
                  value={String(exception.priority)}
                  onValueChange={(val) =>
                    updatePriorityMutation.mutate({
                      id: exception.id,
                      priority: parseInt(val),
                    })
                  }
                >
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((p) => (
                      <SelectItem key={p} value={String(p)}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(exception.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
