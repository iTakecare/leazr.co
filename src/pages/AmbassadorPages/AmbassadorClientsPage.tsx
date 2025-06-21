
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Users, Loader2 } from "lucide-react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { motion } from "framer-motion";
import { useAmbassadorClients } from "@/hooks/useAmbassadorClients";
import CreateClientDialog from "@/components/clients/CreateClientDialog";
import ClientList from "@/components/clients/ClientList";
import { toast } from "sonner";
import { CreateClientData } from "@/types/client";

const AmbassadorClientsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { 
    clients, 
    isLoading, 
    error, 
    loadClients, 
    createClientAsAmbassador, 
    deleteClient 
  } = useAmbassadorClients();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  };

  // Filtrer les clients selon le terme de recherche
  const filteredClients = clients.filter((client) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      client.name?.toLowerCase().includes(searchLower) ||
      client.email?.toLowerCase().includes(searchLower) ||
      client.company?.toLowerCase().includes(searchLower)
    );
  });

  const handleCreateClient = async (clientData: CreateClientData): Promise<boolean> => {
    try {
      const success = await createClientAsAmbassador(clientData);
      if (success) {
        toast.success("Client créé avec succès");
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error creating client:", error);
      toast.error("Erreur lors de la création du client");
      return false;
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    try {
      await deleteClient(clientId);
    } catch (error) {
      console.error("Error deleting client:", error);
    }
  };

  const handleEditClient = (clientId: string) => {
    // Redirection vers la page d'édition
    window.location.href = `/ambassador/clients/edit/${clientId}`;
  };

  const handleViewClient = (clientId: string) => {
    // Redirection vers la page de détail
    window.location.href = `/ambassador/clients/${clientId}`;
  };

  if (error) {
    return (
      <PageTransition>
        <Container>
          <div className="py-8 text-center">
            <div className="text-red-600 mb-4">
              <h2 className="text-xl font-semibold">Erreur</h2>
              <p>{error}</p>
            </div>
            <Button onClick={loadClients}>
              Réessayer
            </Button>
          </div>
        </Container>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <Container>
        <motion.div
          className="py-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold mb-1">Mes Clients</h1>
                <p className="text-muted-foreground">
                  Gérez vos clients et prospects
                </p>
              </div>
              <CreateClientDialog 
                onClientCreated={handleCreateClient}
                trigger={
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nouveau client
                  </Button>
                }
              />
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border shadow-sm">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Clients ({filteredClients.length})
                    </CardTitle>
                    <CardDescription>
                      Liste de vos clients assignés
                    </CardDescription>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher un client..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-full sm:w-80"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Chargement des clients...</span>
                  </div>
                ) : filteredClients.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {searchTerm ? "Aucun client trouvé" : "Aucun client"}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm 
                        ? "Essayez de modifier votre recherche" 
                        : "Commencez par ajouter votre premier client"
                      }
                    </p>
                    {!searchTerm && (
                      <CreateClientDialog 
                        onClientCreated={handleCreateClient}
                        trigger={
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Ajouter un client
                          </Button>
                        }
                      />
                    )}
                  </div>
                ) : (
                  <ClientList
                    clients={filteredClients}
                    onDeleteClient={handleDeleteClient}
                    onEditClient={handleEditClient}
                    onViewClient={handleViewClient}
                  />
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </Container>
    </PageTransition>
  );
};

export default AmbassadorClientsPage;
