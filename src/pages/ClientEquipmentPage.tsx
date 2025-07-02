
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Users } from "lucide-react";
import { useClientData } from "@/hooks/useClientData";
import EquipmentDragDropManager from "@/components/equipment/EquipmentDragDropManager";

const ClientEquipmentPage = () => {
  const { clientData, loading, error } = useClientData();

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <Package className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <div className="text-center">
                <p className="text-muted-foreground mb-2">Aucune information client trouvée</p>
                <p className="text-sm text-muted-foreground">
                  Veuillez contacter l'administrateur pour créer votre fiche client.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-8 w-8 text-primary" />
            Gestion des Équipements
          </h1>
          <p className="text-muted-foreground">
            Gérez l'assignation de vos équipements aux collaborateurs
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Carte d'information */}
        <Card className="lg:col-span-4">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              À propos de la gestion des équipements
            </CardTitle>
            <CardDescription>
              Vous pouvez assigner vos équipements contractuels à vos collaborateurs une fois que les numéros de série sont disponibles. 
              Les équipements d'offres ne peuvent pas encore être assignés car ils n'ont pas de numéro de série.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Gestionnaire d'équipements */}
        <div className="lg:col-span-4">
          <EquipmentDragDropManager 
            clientId={clientData.id}
            readOnly={false}
          />
        </div>
      </div>
    </div>
  );
};

export default ClientEquipmentPage;
