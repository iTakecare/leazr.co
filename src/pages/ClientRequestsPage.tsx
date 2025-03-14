
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useClientOffers, ClientOffer } from "@/hooks/useClientOffers";
import ClientsError from "@/components/clients/ClientsError";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

const ClientRequestsPage = () => {
  const { offers, loading, error, refresh } = useClientOffers();

  if (loading) {
    return (
      <div className="w-full p-8">
        <h1 className="text-3xl font-bold mb-6">Mes Demandes</h1>
        <div className="flex flex-col justify-center items-center min-h-[300px] gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Chargement des demandes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <ClientsError errorMessage={error} onRetry={refresh} />;
  }

  return (
    <div className="w-full">
      <h1 className="text-3xl font-bold mb-6">Mes Demandes</h1>
      
      {offers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-center">
              <h3 className="text-lg font-medium">Aucune demande trouvée</h3>
              <p className="text-muted-foreground mt-2">
                Vous n'avez pas encore de demandes actives.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {offers.map((offer: ClientOffer) => (
            <Card key={offer.id}>
              <CardHeader>
                <CardTitle>Demande #{offer.id.substring(0, 8)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Contenu de la demande en cours d'implémentation</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientRequestsPage;
