import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Plus, Edit, Copy, Trash2, Eye, ToggleLeft, ToggleRight, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePackManagement } from "@/hooks/packs/usePackManagement";
import { PackCreator } from "./PackCreator";

export const PackManager = () => {
  const {
    packs,
    isLoading,
    error,
    isCreatePackOpen,
    setIsCreatePackOpen,
    editingPack,
    setEditingPack,
    handleCreatePack,
    handleEditPack,
    handleDeletePack,
    handleDuplicatePack,
    handleTogglePackStatus,
    handleTogglePackFeatured,
  } = usePackManagement();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Gestion des Packs</h2>
            <p className="text-muted-foreground">
              Créez et gérez des packs promotionnels composés de plusieurs produits
            </p>
          </div>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Chargement des packs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Gestion des Packs</h2>
            <p className="text-muted-foreground">
              Créez et gérez des packs promotionnels composés de plusieurs produits
            </p>
          </div>
        </div>
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-destructive">Erreur lors du chargement des packs</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestion des Packs</h2>
          <p className="text-muted-foreground">
            Créez et gérez des packs promotionnels composés de plusieurs produits
          </p>
        </div>
        <Button onClick={handleCreatePack} className="gap-2">
          <Plus className="h-4 w-4" />
          Créer un pack
        </Button>
      </div>

      {/* Packs List or Empty State */}
      {packs.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun pack créé</h3>
            <p className="text-muted-foreground mb-4">
              Créez votre premier pack promotionnel composé de plusieurs produits
            </p>
            <Button onClick={handleCreatePack} className="gap-2">
              <Plus className="h-4 w-4" />
              Créer un pack
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {packs.map((pack) => (
            <Card key={pack.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{pack.name}</CardTitle>
                    {pack.description && (
                      <CardDescription className="line-clamp-2">
                        {pack.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTogglePackStatus(pack)}
                    >
                      {pack.is_active ? (
                        <ToggleRight className="h-4 w-4 text-green-600" />
                      ) : (
                        <ToggleLeft className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTogglePackFeatured(pack)}
                    >
                      <Star className={`h-4 w-4 ${pack.is_featured ? 'text-yellow-500 fill-current' : 'text-gray-400'}`} />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant={pack.is_active ? "default" : "secondary"}>
                    {pack.is_active ? "Actif" : "Inactif"}
                  </Badge>
                  {pack.is_featured && (
                    <Badge variant="outline">
                      <Star className="h-3 w-3 mr-1" />
                      Mis en avant
                    </Badge>
                  )}
                  {pack.admin_only && (
                    <Badge variant="destructive">Admin uniquement</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Prix d'achat:</span>
                    <span className="font-medium">{pack.total_purchase_price}€</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Prix mensuel:</span>
                    <span className="font-medium">{pack.total_monthly_price}€</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Marge:</span>
                    <span className="font-medium text-green-600">
                      +{pack.total_margin}€
                    </span>
                  </div>
                  {pack.items && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Produits:</span>
                      <span className="font-medium">{pack.items.length}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditPack(pack)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Modifier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicatePack(pack)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeletePack(pack)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pack Creator Dialog */}
      <PackCreator
        open={isCreatePackOpen}
        onOpenChange={setIsCreatePackOpen}
        editingPack={editingPack}
      />
    </div>
  );
};