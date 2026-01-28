import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getClientById } from "@/services/clientService";
import { Client } from "@/types/client";
import { ChevronLeft, AlertCircle, Loader2, UserPlus, Edit2, X } from "lucide-react";
import UnifiedClientView from "@/components/clients/UnifiedClientView";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AmbassadorSelector from "@/components/ui/AmbassadorSelector";
import { getClientAmbassador, updateClientAmbassador } from "@/services/ambassador/ambassadorClients";

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { navigateToAdmin } = useRoleNavigation();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentAmbassadorId, setCurrentAmbassadorId] = useState<string | null>(null);
  const [currentAmbassadorName, setCurrentAmbassadorName] = useState<string | null>(null);
  const [showAmbassadorSelector, setShowAmbassadorSelector] = useState(false);
  const [loadingAmbassador, setLoadingAmbassador] = useState(false);

  // Check if we should start in edit mode
  const shouldStartInEditMode = searchParams.get('edit') === 'true';
  
  // Check if coming from an offer
  const fromOffer = searchParams.get('from') === 'offer';
  const sourceOfferId = searchParams.get('offerId');

  const fetchClient = async () => {
    if (!id) {
      console.error("ClientDetail - No ID provided");
      setError("ID de client manquant");
      toast.error("ID de client manquant");
      navigateToAdmin("clients");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log("ClientDetail - Fetching client with ID:", id);
      const clientData = await getClientById(id);
      console.log("ClientDetail - Client data received:", clientData);
      
      if (!clientData) {
        console.error("ClientDetail - Client not found for ID:", id);
        setError("Client introuvable");
        toast.error("Client introuvable");
        return;
      }
      
      console.log("ClientDetail - Client loaded successfully:", clientData);
      setClient(clientData);
    } catch (error) {
      console.error("ClientDetail - Error fetching client:", error);
      setError("Erreur lors du chargement du client");
      toast.error("Erreur lors du chargement du client");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClient();
  }, [id]);

  useEffect(() => {
    const loadAmbassador = async () => {
      if (!id) return;
      
      setLoadingAmbassador(true);
      try {
        const ambassador = await getClientAmbassador(id);
        if (ambassador) {
          setCurrentAmbassadorId(ambassador.id);
          setCurrentAmbassadorName(ambassador.name);
        }
      } catch (error) {
        console.error('Erreur lors du chargement de l\'ambassadeur:', error);
      } finally {
        setLoadingAmbassador(false);
      }
    };
    
    loadAmbassador();
  }, [id]);

  const handleAmbassadorChange = async (ambassadorId: string | null, ambassadorName?: string) => {
    if (!id) return;
    
    setLoadingAmbassador(true);
    try {
      await updateClientAmbassador(id, ambassadorId);
      setCurrentAmbassadorId(ambassadorId);
      setCurrentAmbassadorName(ambassadorName || null);
      toast.success(
        ambassadorId 
          ? 'Ambassadeur attribué avec succès' 
          : 'Ambassadeur retiré avec succès'
      );
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'ambassadeur:', error);
      toast.error('Erreur lors de la mise à jour de l\'ambassadeur');
    } finally {
      setLoadingAmbassador(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <span className="ml-3 text-lg">Chargement...</span>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="rounded-full bg-destructive/10 w-16 h-16 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <div className="text-xl font-semibold text-center max-w-md">
          {error || "Client introuvable"}
        </div>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Le client demandé n'existe pas ou a été supprimé.
        </p>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => navigateToAdmin("clients")}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Retour à la liste
          </Button>
          {id && (
            <Button onClick={() => fetchClient()}>
              Réessayer
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-6 flex gap-2">
        {fromOffer && sourceOfferId ? (
          <>
            <Button 
              variant="default" 
              onClick={() => navigateToAdmin(`offers/${sourceOfferId}`)}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Retour à la demande
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigateToAdmin("clients")}
            >
              Voir tous les clients
            </Button>
          </>
        ) : (
          <Button 
            variant="outline" 
            onClick={() => navigateToAdmin("clients")}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Retour à la liste
          </Button>
        )}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Ambassadeur
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingAmbassador ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement...
            </div>
          ) : currentAmbassadorId && currentAmbassadorName ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  {currentAmbassadorName}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAmbassadorSelector(true)}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Changer
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAmbassadorChange(null)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Retirer
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAmbassadorSelector(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Attribuer un ambassadeur
            </Button>
          )}
        </CardContent>
      </Card>

      <UnifiedClientView 
        client={client} 
        onClientUpdate={(updatedClient) => {
          setClient(updatedClient);
          toast.success("Client mis à jour avec succès");
          // Remove edit parameter from URL after successful save
          if (searchParams.get('edit') === 'true') {
            setSearchParams({});
          }
        }}
        initialEditMode={shouldStartInEditMode}
      />

      <AmbassadorSelector
        isOpen={showAmbassadorSelector}
        onClose={() => setShowAmbassadorSelector(false)}
        onSelectAmbassador={(ambassador) => {
          handleAmbassadorChange(ambassador.id, ambassador.name);
          setShowAmbassadorSelector(false);
        }}
        selectedAmbassadorId={currentAmbassadorId || undefined}
      />
    </div>
  );
}