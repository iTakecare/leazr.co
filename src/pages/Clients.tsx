
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, HeartHandshake, BadgePercent, Filter, UserSearch } from "lucide-react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { useClients } from "@/hooks/useClients";
import ClientsList from "@/components/crm/ClientsList";
import CreateClientDialog from "@/components/clients/CreateClientDialog";
import { forceRefreshCRMCache } from "@/utils/crmCacheUtils";
import AmbassadorsList from "@/components/crm/AmbassadorsList";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Clients = () => {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("clients");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { 
    clients, 
    allClients,
    isLoading, 
    error, 
    setSearchTerm: setClientSearchTerm, 
    selectedStatus, 
    setSelectedStatus,
    showAmbassadorClients,
    setShowAmbassadorClients,
    refreshClients
  } = useClients();
  
  const handleForceRefresh = () => {
    console.log("🔄 Forçage du rafraîchissement pour l'isolation CRM");
    forceRefreshCRMCache();
  };
  
  console.log(`Clients page rendering with ${clients.length} clients (loading: ${isLoading})`);
  
  useEffect(() => {
    setClientSearchTerm(searchTerm);
  }, [searchTerm, setClientSearchTerm]);

  useEffect(() => {
    setSelectedStatus(statusFilter);
  }, [statusFilter, setSelectedStatus]);
  
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

  const getStatusFilterLabel = () => {
    switch(statusFilter) {
      case 'active': return 'Clients actifs';
      case 'inactive': return 'Clients inactifs';
      case 'lead': return 'Prospects';
      case 'duplicate': return 'Clients en double';
      default: return 'Tous les clients';
    }
  };


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
                <h1 className="text-2xl font-bold mb-1">CRM</h1>
                <p className="text-muted-foreground">
                  Gérez vos clients et ambassadeurs
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid grid-cols-2 mb-4">
                    <TabsTrigger value="clients" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span className={isMobile ? "hidden" : ""}>Clients</span>
                    </TabsTrigger>
                    <TabsTrigger value="ambassadors" className="flex items-center gap-2">
                      <HeartHandshake className="h-4 w-4" />
                      <span className={isMobile ? "hidden" : ""}>Ambassadeurs</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="clients" className="mt-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <CardTitle className="text-xl">Clients</CardTitle>
                        <CardDescription>
                          Gérez vos clients
                        </CardDescription>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full sm:w-auto gap-2">
                              <Filter className="h-4 w-4" />
                              <span className="truncate">{getStatusFilterLabel()}</span>
                              <Badge variant="secondary" className="ml-1 text-xs">
                                {clients.length}
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
                              <DropdownMenuItem onClick={() => setStatusFilter('duplicate')}>
                                Clients en double
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <div className="relative flex-grow">
                            <UserSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              placeholder="Rechercher un client..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-9 w-full"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <CreateClientDialog onClientCreated={refreshClients} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="ambassadors" className="mt-0">
                    <div>
                      <CardTitle className="text-xl">Ambassadeurs</CardTitle>
                      <CardDescription>
                        Gérez vos ambassadeurs et suivez leurs performances
                      </CardDescription>
                    </div>
                  </TabsContent>
                  
                </Tabs>
              </CardHeader>
              <CardContent>
                {activeTab === "clients" && 
                  <ClientsList 
                    clients={clients} 
                    isLoading={isLoading} 
                    error={error} 
                    showAmbassadorClients={showAmbassadorClients}
                    onToggleAmbassadorClients={setShowAmbassadorClients}
                    refreshClients={refreshClients}
                    allClients={allClients}
                  />
                }
                {activeTab === "ambassadors" && <AmbassadorsList />}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </Container>
    </PageTransition>
  );
};

export default Clients;
