import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Copy, 
  Eye, 
  EyeOff,
  Star,
  StarOff,
  Package
} from "lucide-react";
import { usePackManagement } from "@/hooks/packs/usePackManagement";
import { PackCreator } from "./PackCreator";
import { ProductPack } from "@/types/pack";

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
    createPackMutation,
    updatePackMutation,
    deletePackMutation,
    duplicatePackMutation,
  } = usePackManagement();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Chargement des packs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Erreur lors du chargement des packs</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Réessayer
        </Button>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('fr-FR');
  };

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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total des packs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{packs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Packs actifs</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{packs.filter(p => p.is_active).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Packs en vedette</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{packs.filter(p => p.is_featured).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valeur totale</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(packs.reduce((sum, pack) => sum + pack.total_monthly_price, 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Packs List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {packs.map((pack) => (
          <Card key={pack.id} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="line-clamp-1">{pack.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {pack.description || "Aucune description"}
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  {pack.is_featured && (
                    <Badge variant="secondary" className="gap-1">
                      <Star className="h-3 w-3" />
                      Vedette
                    </Badge>
                  )}
                  {pack.admin_only && (
                    <Badge variant="outline">Admin</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Pack Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Produits</p>
                  <p className="font-medium">{pack.items?.length || 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Prix mensuel</p>
                  <p className="font-medium">{formatPrice(pack.total_monthly_price)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Marge</p>
                  <p className="font-medium">{formatPrice(pack.total_margin)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Statut</p>
                  <Badge variant={pack.is_active ? "default" : "secondary"}>
                    {pack.is_active ? "Actif" : "Inactif"}
                  </Badge>
                </div>
              </div>

              {/* Validity Period */}
              {(pack.valid_from || pack.valid_to) && (
                <div className="text-sm">
                  <p className="text-muted-foreground">Période de validité</p>
                  <p className="font-medium">
                    {pack.valid_from && formatDate(pack.valid_from)}
                    {pack.valid_from && pack.valid_to && " - "}
                    {pack.valid_to && formatDate(pack.valid_to)}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTogglePackStatus(pack)}
                    disabled={updatePackMutation.isPending}
                    className="gap-1"
                  >
                    {pack.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {pack.is_active ? "Désactiver" : "Activer"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTogglePackFeatured(pack)}
                    disabled={updatePackMutation.isPending}
                    className="gap-1"
                  >
                    {pack.is_featured ? <StarOff className="h-3 w-3" /> : <Star className="h-3 w-3" />}
                    {pack.is_featured ? "Retirer" : "Mettre en vedette"}
                  </Button>
                </div>
                
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditPack(pack)}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDuplicatePack(pack)}
                    disabled={duplicatePackMutation.isPending}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeletePack(pack)}
                    disabled={deletePackMutation.isPending}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {packs.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun pack créé</h3>
            <p className="text-muted-foreground mb-4">
              Commencez par créer votre premier pack promotionnel
            </p>
            <Button onClick={handleCreatePack} className="gap-2">
              <Plus className="h-4 w-4" />
              Créer un pack
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pack Creator Modal */}
      <PackCreator
        open={isCreatePackOpen || !!editingPack}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreatePackOpen(false);
            setEditingPack(null);
          }
        }}
        editingPack={editingPack}
      />
    </div>
  );
};