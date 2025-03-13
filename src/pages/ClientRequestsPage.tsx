
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useClientOffers, ClientOffer } from "@/hooks/useClientOffers";
import { ClientsError } from "@/components/clients/ClientsError";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

const ClientRequestsPage = () => {
  const { offers, loading, error, refresh } = useClientOffers();

  if (loading) {
    return (
      <div className="w-full p-8">
        <h1 className="text-3xl font-bold mb-6">Mes Demandes en cours</h1>
        <div className="flex justify-center items-center min-h-[300px]">
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
        <h1 className="text-3xl font-bold">Mes Demandes en cours</h1>
        <Button asChild>
          <Link to="/client/new-request">
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle demande
          </Link>
        </Button>
      </div>
      
      {offers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-center">
              <h3 className="text-lg font-medium">Aucune demande en cours</h3>
              <p className="text-muted-foreground mt-2">
                Vous n'avez pas de demandes en attente pour le moment.
              </p>
              <Button className="mt-6" asChild>
                <Link to="/client/new-request">
                  <Plus className="mr-2 h-4 w-4" />
                  Créer une demande
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {offers.map((offer: ClientOffer) => (
            <Card key={offer.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">Demande #{offer.id.substring(0, 8)}</h3>
                    <div className="text-sm text-muted-foreground mb-2">
                      Créée le {new Date(offer.created_at).toLocaleDateString()}
                    </div>
                    <Badge className="bg-yellow-500">En attente de validation</Badge>
                    
                    {offer.equipment_description && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-1">Équipement demandé</h4>
                        <p className="text-sm bg-muted p-2 rounded">{offer.equipment_description}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end">
                    <div className="text-lg font-bold">{formatCurrency(offer.monthly_payment)}/mois</div>
                    <div className="text-sm text-muted-foreground">Montant: {formatCurrency(offer.amount)}</div>
                    
                    <Button className="mt-4" variant="outline" size="sm" asChild>
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
