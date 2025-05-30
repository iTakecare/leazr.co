
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Client } from "@/types/client";
import ClientEditDialog from "@/components/clients/ClientEditDialog";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";

const ClientEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      toast.error("ID de client manquant");
      navigate("/clients");
      return;
    }

    const fetchClient = async () => {
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          console.error('Erreur lors de la récupération du client:', error);
          toast.error("Erreur lors du chargement des données client");
          navigate("/clients");
          return;
        }

        setClient(data);
      } catch (error) {
        console.error('Erreur:', error);
        toast.error("Une erreur est survenue");
        navigate("/clients");
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
  }, [id, navigate]);

  const handleClientUpdated = (updatedClient?: Client) => {
    if (updatedClient) {
      setClient(updatedClient);
      toast.success("Client mis à jour avec succès");
    }
    navigate(`/clients/${id}`);
  };

  if (loading) {
    return (
      <PageTransition>
        <Container>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Chargement...</span>
          </div>
        </Container>
      </PageTransition>
    );
  }

  if (!client) {
    return (
      <PageTransition>
        <Container>
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-4">Client introuvable</h2>
            <Button onClick={() => navigate("/clients")}>
              Retour à la liste des clients
            </Button>
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
              onClick={() => navigate(`/clients/${id}`)}
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
                navigate(`/clients/${id}`);
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
