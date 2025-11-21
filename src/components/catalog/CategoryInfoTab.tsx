import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SimplifiedCategory, getCategoryStats } from "@/services/simplifiedCategoryService";
import { Pencil, Trash2, Save, X, Package, DollarSign, CheckCircle, Tag } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface CategoryInfoTabProps {
  category: SimplifiedCategory;
  mode: 'view' | 'edit' | 'create';
  onSave: (category: SimplifiedCategory) => void;
  onDelete: (id: string) => void;
}

export function CategoryInfoTab({ category, mode: initialMode, onSave, onDelete }: CategoryInfoTabProps) {
  const [mode, setMode] = useState(initialMode);
  const [formData, setFormData] = useState({
    name: category.name,
    translation: category.translation,
    description: category.description || "",
  });

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["category-stats", category.id],
    queryFn: () => getCategoryStats(category.id),
    enabled: !!category.id,
  });

  const handleSave = () => {
    onSave({
      ...category,
      ...formData,
    });
    setMode('view');
  };

  const handleCancel = () => {
    setFormData({
      name: category.name,
      translation: category.translation,
      description: category.description || "",
    });
    setMode('view');
  };

  if (mode === 'edit') {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Nom de la catégorie</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Smartphones"
            />
          </div>

          <div>
            <Label htmlFor="translation">Traduction</Label>
            <Input
              id="translation"
              value={formData.translation}
              onChange={(e) => setFormData({ ...formData, translation: e.target.value })}
              placeholder="Ex: Smartphones"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description détaillée de la catégorie..."
              rows={4}
            />
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={handleSave} className="flex-1">
            <Save className="mr-2 h-4 w-4" />
            Enregistrer
          </Button>
          <Button onClick={handleCancel} variant="outline" className="flex-1">
            <X className="mr-2 h-4 w-4" />
            Annuler
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Carte d'identité */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Informations générales</h3>
          <div className="grid grid-cols-2 gap-4 p-4 bg-accent/20 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Nom</p>
              <p className="font-medium">{category.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Traduction</p>
              <p className="font-medium">{category.translation}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Créée le</p>
              <p className="font-medium">
                {category.created_at ? format(new Date(category.created_at), "dd MMM yyyy", { locale: fr }) : "N/A"}
              </p>
            </div>
          </div>
        </div>

        {category.description && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Description</p>
            <p className="text-sm p-4 bg-accent/10 rounded-lg">{category.description}</p>
          </div>
        )}
      </div>

      {/* Statistiques clés */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Statistiques clés</h3>
        {loadingStats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 border rounded-lg animate-pulse">
                <div className="h-4 bg-accent/20 rounded w-16 mb-2"></div>
                <div className="h-8 bg-accent/20 rounded w-12"></div>
              </div>
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-primary" />
                <p className="text-xs text-muted-foreground font-medium">Produits</p>
              </div>
              <p className="text-2xl font-bold">{stats.totalProducts}</p>
            </div>
            <div className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <p className="text-xs text-muted-foreground font-medium">Valeur</p>
              </div>
              <p className="text-2xl font-bold">{Math.round(stats.totalCatalogValue).toLocaleString()}€</p>
            </div>
            <div className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                <p className="text-xs text-muted-foreground font-medium">Actifs</p>
              </div>
              <p className="text-2xl font-bold">{stats.activeProducts}</p>
            </div>
            <div className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="h-4 w-4 text-primary" />
                <p className="text-xs text-muted-foreground font-medium">Marques</p>
              </div>
              <p className="text-2xl font-bold">
                {stats.brandDistribution ? Object.keys(stats.brandDistribution).length : 0}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t">
        <Button onClick={() => setMode('edit')} className="flex-1">
          <Pencil className="mr-2 h-4 w-4" />
          Modifier
        </Button>
        <Button onClick={() => onDelete(category.id)} variant="destructive" className="flex-1">
          <Trash2 className="mr-2 h-4 w-4" />
          Supprimer
        </Button>
      </div>
    </div>
  );
}
