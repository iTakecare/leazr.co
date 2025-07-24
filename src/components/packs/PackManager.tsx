import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Plus } from "lucide-react";

export const PackManager = () => {
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
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Créer un pack
        </Button>
      </div>

      {/* Empty State */}
      <Card className="text-center py-12">
        <CardContent>
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Fonctionnalité en développement</h3>
          <p className="text-muted-foreground mb-4">
            Le système de packs promotionnels sera bientôt disponible
          </p>
          <Button disabled className="gap-2">
            <Plus className="h-4 w-4" />
            Créer un pack
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};