import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getClientById } from "@/services/clientService";
import { Client } from "@/types/client";
import { ChevronLeft, AlertCircle, Loader2 } from "lucide-react";
import UnifiedClientView from "@/components/clients/UnifiedClientView";

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClient = async () => {
    if (!id) {
      console.error("ClientDetail - No ID provided");
      setError("ID de client manquant");
      toast.error("ID de client manquant");
      navigate("/clients");
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
  }, [id, navigate]);

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
          <Button variant="outline" onClick={() => navigate("/clients")}>
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
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate("/clients")} className="flex items-center">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Retour à la liste
        </Button>
      </div>

      <UnifiedClientView 
        client={client} 
        onClientUpdate={(updatedClient) => {
          setClient(updatedClient);
          toast.success("Client mis à jour avec succès");
        }}
      />
    </div>
  );
}