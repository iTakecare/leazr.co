
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useClientOffers, ClientOffer } from "@/hooks/useClientOffers";
import ClientsError from "@/components/clients/ClientsError";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters";
import { Loader2, RefreshCw, FileText } from "lucide-react";
import { Link } from "react-router-dom";

const ClientRequestsPage = () => {
  const { offers, loading, error, refresh } = useClientOffers();

  console.log("ClientRequestsPage - Offers:", offers);

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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Mes Demandes</h1>
        <Button variant="outline" onClick={refresh} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </Button>
      </div>
      
      {(!offers || offers.length === 0) ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-center">
              <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
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
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Demande #{offer.id.substring(0, 8)}</CardTitle>
                    <CardDescription>
                      Créée le {new Date(offer.created_at).toLocaleDateString('fr-FR')}
                    </CardDescription>
                  </div>
                  <Badge 
                    className={`${
                      offer.status === 'accepted' ? 'bg-green-500' : 
                      offer.status === 'rejected' ? 'bg-red-500' : 
                      'bg-yellow-500'
                    }`}
                  >
                    {offer.status === 'accepted' ? 'Acceptée' : 
                     offer.status === 'rejected' ? 'Refusée' : 
                     'En attente'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Montant total</p>
                      <p className="font-medium">{formatCurrency(offer.amount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Loyer mensuel</p>
                      <p className="font-medium">{formatCurrency(offer.monthly_payment)}/mois</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Équipement</p>
                    <p className="text-sm">{offer.equipment_description || "Description non disponible"}</p>
                  </div>
                  
                  <div className="pt-4">
                    <Button size="sm" asChild>
                      <Link to={`/client/requests/${offer.id}`}>
                        Voir les détails
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientRequestsPage;
