
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Pencil, Trash } from "lucide-react";
import { getClientById, deleteClient } from "@/services/clientService";
import { Client } from "@/types/client";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from 'lucide-react';
import ClientCleanupButton from "@/components/clients/ClientCleanupButton";

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'active': return "default";
    case 'inactive': return "secondary";
    case 'pending': return "outline";
    case 'duplicate': return "destructive";
    default: return "default";
  }
};

const ClientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClient = async () => {
      if (!id) {
        setError("Client ID is missing.");
        setLoading(false);
        return;
      }

      try {
        const clientData = await getClientById(id);
        if (clientData) {
          setClient(clientData);
        } else {
          setError("Client not found.");
        }
      } catch (e) {
        setError("Failed to fetch client.");
        console.error("Error fetching client:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
  }, [id]);

  const handleDeleteClick = async () => {
    if (!id) {
      toast.error("Client ID is missing.");
      return;
    }

    if (window.confirm("Are you sure you want to delete this client?")) {
      try {
        setLoading(true);
        await deleteClient(id);
        toast.success("Client deleted successfully.");
        navigate('/clients');
      } catch (e) {
        toast.error("Failed to delete client.");
        console.error("Error deleting client:", e);
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return <div>Loading client details...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <Info className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-3xl font-bold">{client?.name || 'Détail du client'}</h1>
          {client?.status && <Badge variant={getStatusVariant(client.status)}>{client.status}</Badge>}
        </div>
        <div className="flex space-x-2">
          <Button asChild variant="outline">
            <Link to={`/clients/edit/${id}`}>
              <Pencil className="h-4 w-4 mr-2" />
              Modifier
            </Link>
          </Button>
          <ClientCleanupButton />
          <Button variant="destructive" onClick={handleDeleteClick}>
            <Trash className="h-4 w-4 mr-2" />
            Supprimer
          </Button>
        </div>
      </div>

      {client && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Informations du client</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div><strong>Nom:</strong> {client.name}</div>
              <div><strong>Email:</strong> {client.email}</div>
              <div><strong>Entreprise:</strong> {client.company}</div>
              <div><strong>Téléphone:</strong> {client.phone}</div>
              <div><strong>Adresse:</strong> {client.address}</div>
              <div><strong>Ville:</strong> {client.city}</div>
              <div><strong>Code Postal:</strong> {client.postal_code}</div>
              <div><strong>Pays:</strong> {client.country}</div>
              <div><strong>Numéro de TVA:</strong> {client.vat_number}</div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Collaborateurs</h2>
            {client.collaborators && client.collaborators.length > 0 ? (
              <ul className="list-disc list-inside mt-2">
                {client.collaborators.map(collaborator => (
                  <li key={collaborator.id}>
                    {collaborator.name} ({collaborator.email}) - {collaborator.role}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Aucun collaborateur associé à ce client.</p>
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold">Notes</h2>
            <p>{client.notes || 'Aucune note disponible.'}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDetail;
