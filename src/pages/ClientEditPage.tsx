
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getClientById } from "@/services/clientService";
import { Client } from "@/types/client";
import ClientEditDialog from "@/components/clients/ClientEditDialog";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";

const ClientEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("ClientEditPage - ID from params:", id);
    
    if (!id) {
      console.error("ClientEditPage - No ID provided");
      toast.error("ID de client manquant");
      navigate("/clients");
      return;
    }

    const fetchClient = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("ClientEditPage - Fetching client with ID:", id);
        
        const clientData = await getClientById(id);
        console.log("ClientEditPage - Client data received:", clientData);

        if (!clientData) {
          console.error("ClientEditPage - Client not found for ID:", id);
          setError("Client introuvable");
          toast.error("Client introuvable");
          return;
        }

        setClient(clientData);
        console.log("ClientEditPage - Client set successfully:", clientData);
      } catch (error) {
        console.error('ClientEditPage - Error fetching client:', error);
        setError("Erreur lors du chargement des données client");
        toast.error("Erreur lors du chargement des données client");
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
  }, [id, navigate]);

  const handleClientUpdated = (updatedClient?: Client) => {
    console.log("ClientEditPage - Client updated:", updatedClient);
    if (updatedClient) {
      setClient(updatedClient);
      toast.success("Client mis à jour avec succès");
    }
    navigate(`/clients/${id}`);
  };

  const handleCancel = () => {
    console.log("ClientEditPage - Cancel edit, navigating back to client detail");
    navigate(`/clients/${id}`);
  };

  if (loading) {
    return (
      <PageTransition>
        <Container>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Chargement...</span>
          </div>
        </Container>
      </PageTransition>
    );
  }

  if (error || !client) {
    return (
      <PageTransition>
        <Container>
          <div className="text-center py-12">
            <div className="rounded-full bg-destructive/10 w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <span className="text-destructive text-3xl">!</span>
            </div>
            <h2 className="text-xl font-semibold mb-4">{error || "Client introuvable"}</h2>
            <div className="space-x-2">
              <Button variant="outline" onClick={() => navigate("/clients")}>
                Retour à la liste des clients
              </Button>
              {id && (
                <Button onClick={() => window.location.reload()}>
                  Réessayer
                </Button>
              )}
            </div>
          </div>
        </Container>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <Container>
        <div className="py-6">
          <div className="flex items-center mb-6">
            <Button
              variant="ghost"
              onClick={handleCancel}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <h1 className="text-2xl font-bold">Modifier le client</h1>
          </div>

          <ClientEditDialog
            client={client}
            open={true}
            onOpenChange={(open) => {
              if (!open) {
                handleCancel();
              }
            }}
            onClientUpdated={handleClientUpdated}
          />
        </div>
      </Container>
    </PageTransition>
  );
};

export default ClientEditPage;
