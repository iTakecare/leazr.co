
import { useState, useEffect } from "react";
import { getClients, deleteClient } from "@/services/clientService";
import { Client } from "@/types/client";
import { toast } from "sonner";

export const useClients = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    setLoadingError(null);
    
    try {
      const clientsData = await getClients();
      
      if (Array.isArray(clientsData)) {
        // Filtre pour exclure les clients qui appartiennent à un ambassadeur (ceux qui ont un lien dans ambassador_clients)
        // Ces clients seront visibles uniquement dans l'interface de l'ambassadeur
        const regularClients = clientsData.filter(client => client.is_ambassador_client !== true);
        setClients(regularClients);
      } else {
        console.error("Clients data is not an array:", clientsData);
        setLoadingError("Format de données incorrect");
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
      setLoadingError("Impossible de charger les clients");
      toast.error("Erreur lors du chargement des clients");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce client ?")) {
      const success = await deleteClient(clientId);
      if (success) {
        toast.success("Le client a été supprimé avec succès");
        // Mise à jour locale pour éviter de refaire un appel réseau
        setClients(clients.filter(client => client.id !== clientId));
      } else {
        toast.error("Erreur lors de la suppression du client");
      }
    }
  };

  const filteredClients = clients.filter((client) => {
    // Filtre par terme de recherche
    const matchesSearch = 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (client.company && client.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (client.vat_number && client.vat_number.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Filtre par statut
    const matchesStatus = statusFilter === "all" || client.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return {
    clients,
    filteredClients,
    loading,
    loadingError,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    fetchClients,
    handleDeleteClient
  };
};
