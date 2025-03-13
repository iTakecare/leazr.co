
import React from "react";
import { useNavigate } from "react-router-dom";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Plus, UserSearch, Building2, Phone, Mail, Filter } from "lucide-react";
import { motion } from "framer-motion";
import { useClients } from "@/hooks/useClients";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ClientList from "@/components/clients/ClientList";
import ClientsLoading from "@/components/clients/ClientsLoading";
import ClientsError from "@/components/clients/ClientsError";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

const Clients = () => {
  const navigate = useNavigate();
  const {
    filteredClients,
    loading,
    loadingError,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    fetchClients,
    handleDeleteClient
  } = useClients();

  // Animation variants
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

  // Get status filter label
  const getStatusFilterLabel = () => {
    switch(statusFilter) {
      case 'active': return 'Clients actifs';
      case 'inactive': return 'Clients inactifs';
      case 'lead': return 'Prospects';
      default: return 'Tous les clients';
    }
  };

  // Display loading state
  if (loading) {
    return <ClientsLoading />;
  }

  // Display error state if there are no clients
  if (loadingError && filteredClients.length === 0) {
    return <ClientsError errorMessage={loadingError} onRetry={fetchClients} />;
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
                <h1 className="text-2xl font-bold mb-1">Gestion des clients</h1>
                <p className="text-muted-foreground">
                  {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} au total
                </p>
              </div>
              <Button onClick={() => navigate('/clients/create')} className="gap-2">
                <Plus className="h-4 w-4" />
                Nouveau client
              </Button>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle>Liste des clients</CardTitle>
                    <CardDescription>
                      {filteredClients.length} client(s) trouvé(s)
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="gap-2">
                          <Filter className="h-4 w-4" />
                          {getStatusFilterLabel()}
                          <Badge variant="secondary" className="ml-1 text-xs">
                            {statusFilter === 'all' ? filteredClients.length : filteredClients.length}
                          </Badge>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56">
                        <DropdownMenuLabel>Filtrer par statut</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                          <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                            Tous les clients
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setStatusFilter('active')}>
                            Clients actifs
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setStatusFilter('inactive')}>
                            Clients inactifs
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setStatusFilter('lead')}>
                            Prospects
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <div className="relative">
                      <UserSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher un client..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 w-full md:w-[300px]"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ClientList 
                  clients={filteredClients} 
                  onDeleteClient={handleDeleteClient} 
                  onEditClient={(id) => navigate(`/clients/edit/${id}`)}
                  onViewClient={(id) => navigate(`/clients/${id}`)}
                />
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </Container>
    </PageTransition>
  );
};

export default Clients;
