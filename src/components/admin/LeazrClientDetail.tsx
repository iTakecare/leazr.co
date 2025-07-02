import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import UnifiedClientView from "@/components/clients/UnifiedClientView";
import { getClientById } from "@/services/clientService";
import { Client } from "@/types/client";

interface LeazrClientDetailProps {
  clientId: string;
  onBack: () => void;
}

const LeazrClientDetail: React.FC<LeazrClientDetailProps> = ({
  clientId,
  onBack
}) => {
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClient = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const clientData = await getClientById(clientId);
        if (clientData) {
          setClient(clientData);
        } else {
          setError("Client introuvable");
        }
      } catch (error) {
        console.error("Erreur lors du chargement du client:", error);
        setError("Erreur lors du chargement du client");
      } finally {
        setIsLoading(false);
      }
    };

    fetchClient();
  }, [clientId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement des détails...</p>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="text-center py-8 space-y-4">
        <p className="text-muted-foreground">{error || "Client introuvable"}</p>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
      </div>

      <UnifiedClientView 
        client={client} 
        onClientUpdate={(updatedClient) => {
          setClient(updatedClient);
        }}
      />
    </div>
  );
};

export default LeazrClientDetail;