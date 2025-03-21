
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, User, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { useIsMobile } from "@/hooks/use-mobile";

const AmbassadorClientsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);

  const fetchClients = async () => {
    if (!user?.ambassador_id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching clients for ambassador ID:", user.ambassador_id);
      
      // Récupérer tous les clients liés à cet ambassadeur
      const { data: ambassadorClients, error: clientsError } = await supabase
        .from("ambassador_clients")
        .select("client_id, clients(*)")
        .eq("ambassador_id", user.ambassador_id);
        
      if (clientsError) {
        console.error("Error fetching ambassador clients:", clientsError);
        throw clientsError;
      }
      
      console.log("Ambassador clients raw data:", ambassadorClients);
      
      // Transformer les données pour obtenir seulement les informations des clients
      const clientsData = ambassadorClients.map(item => item.clients);
      console.log("Processed clients data:", clientsData);
      
      setClients(clientsData);
      setFilteredClients(clientsData);
    } catch (err) {
      console.error("Erreur lors du chargement des clients:", err);
      setError("Impossible de charger les clients");
      toast.error("Erreur lors du chargement des clients");
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchClients();
  }, [user?.ambassador_id]);
  
  // Filtrage des clients
  useEffect(() => {
    if (!clients.length) return;
    
    if (searchTerm) {
      const filtered = clients.filter(client => 
        (client.name && client.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (client.company && client.company.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredClients(filtered);
    } else {
      setFilteredClients(clients);
    }
  }, [searchTerm, clients]);
  
  const handleCreateOffer = (clientId) => {
    navigate(`/ambassador/create-offer/${clientId}`);
  };
  
  const handleAddClient = () => {
    // Rediriger vers la page de création de client standard
    navigate("/clients/create");
  };
  
  const handleRefresh = () => {
    fetchClients();
    toast.success("Liste des clients actualisée");
  };
  
  const renderClientCards = () => {
    if (filteredClients.length === 0) {
      return (
        <div className="text-center p-10">
          <User className="h-10 w-10 mx-auto text-gray-300 mb-2" />
          <p className="text-muted-foreground">Aucun client trouvé</p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 gap-4">
        {filteredClients.map((client) => (
          <Card key={client.id} className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">{client.name}</h3>
                <p className="text-sm text-muted-foreground">{client.email}</p>
                {client.company && (
                  <p className="text-sm">{client.company}</p>
                )}
              </div>
              <Button size="sm" onClick={() => handleCreateOffer(client.id)}>
                <Plus className="h-4 w-4 mr-1" /> Offre
              </Button>
            </div>
          </Card>
        ))}
      </div>
    );
  };
  
  const renderClientTable = () => {
    return (
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Entreprise</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.length > 0 ? (
              filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.email}</TableCell>
                  <TableCell>{client.company || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={() => handleCreateOffer(client.id)}>
                      <Plus className="h-4 w-4 mr-1" /> Créer une offre
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24">
                  <User className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                  <p className="text-muted-foreground">Aucun client trouvé</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  if (loading) {
    return (
      <PageTransition>
        <Container>
          <div className="h-screen flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        </Container>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <Container>
        <div className="p-4 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Mes clients</h1>
              <p className="text-muted-foreground">
                Gérez les clients que vous avez amenés
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleRefresh}>
                <Loader2 className="mr-2 h-4 w-4" />
                Actualiser
              </Button>
              <Button onClick={handleAddClient}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un client
              </Button>
            </div>
          </div>
          
          <div className="flex justify-between items-center mb-6">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un client..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {isMobile ? renderClientCards() : renderClientTable()}
        </div>
      </Container>
    </PageTransition>
  );
};

export default AmbassadorClientsPage;
