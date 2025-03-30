
import React from "react";
import PageTransition from "@/components/layout/PageTransition";
import { useClientOffers } from "@/hooks/useClientOffers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters";
import { Loader2, FileText, Calendar } from "lucide-react";

const ClientOffers = () => {
  const { offers, loading, error, refresh } = useClientOffers();

  if (loading) {
    return (
      <PageTransition>
        <div className="container py-8">
          <h1 className="text-3xl font-bold mb-6">Mes Offres</h1>
          <div className="flex flex-col justify-center items-center min-h-[300px] gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p>Chargement des offres...</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <div className="container py-8">
          <h1 className="text-3xl font-bold mb-6">Mes Offres</h1>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={refresh}>Réessayer</Button>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-6">Mes Offres</h1>
        
        {offers && offers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {offers.map((offer) => (
              <Card key={offer.id} className="shadow-md hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">Offre #{offer.id.substring(0, 8)}</CardTitle>
                    <Badge variant={
                      offer.status === 'accepted' ? "secondary" : 
                      offer.status === 'rejected' ? "destructive" : "default"
                    }>
                      {offer.status === 'accepted' ? 'Acceptée' : 
                        offer.status === 'rejected' ? 'Refusée' : 'En attente'}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{new Date(offer.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 bg-muted/20 p-3 rounded-md">
                      <div>
                        <p className="text-xs text-muted-foreground">Montant total</p>
                        <p className="font-medium">{formatCurrency(offer.amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Loyer mensuel</p>
                        <p className="font-medium text-primary">{formatCurrency(offer.monthly_payment)}/mois</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Équipement</p>
                      <p className="text-sm bg-muted/10 p-2 rounded-md">
                        {offer.equipment_description
                          ? offer.equipment_description.substring(0, 100) + (offer.equipment_description.length > 100 ? '...' : '')
                          : "Description non disponible"}
                      </p>
                    </div>
                    
                    <Button size="sm" className="w-full mt-2">
                      Voir les détails
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-medium">Aucune offre trouvée</h3>
              <p className="text-muted-foreground mt-2 mb-6">
                Vous n'avez pas encore d'offres actives.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </PageTransition>
  );
};

export default ClientOffers;
