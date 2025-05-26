
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Users, 
  CreditCard, 
  Ticket, 
  Search, 
  Plus,
  Filter,
  Download,
  Settings
} from "lucide-react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { motion } from "framer-motion";
import LeazrClientsList from "@/components/admin/LeazrClientsList";
import LeazrClientDetail from "@/components/admin/LeazrClientDetail";
import LeazrSubscriptionManagement from "@/components/admin/LeazrSubscriptionManagement";
import LeazrSupportTickets from "@/components/admin/LeazrSupportTickets";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LeazrClients = () => {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("clients");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

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

  const handleClientSelect = (clientId: string) => {
    setSelectedClient(clientId);
    setActiveTab("detail");
  };

  const getStatusFilterLabel = () => {
    switch(statusFilter) {
      case 'active': return 'Clients actifs';
      case 'trial': return 'En période d\'essai';
      case 'expired': return 'Abonnements expirés';
      case 'cancelled': return 'Annulés';
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
                <h1 className="text-2xl font-bold mb-1">Gestion Clients Leazr.co</h1>
                <p className="text-muted-foreground">
                  Administrez vos entreprises clientes, leurs abonnements et le support
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exporter
                </Button>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau client
                </Button>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid grid-cols-4 mb-4">
                    <TabsTrigger value="clients" className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span className={isMobile ? "hidden" : ""}>Clients</span>
                    </TabsTrigger>
                    <TabsTrigger value="subscriptions" className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      <span className={isMobile ? "hidden" : ""}>Abonnements</span>
                    </TabsTrigger>
                    <TabsTrigger value="support" className="flex items-center gap-2">
                      <Ticket className="h-4 w-4" />
                      <span className={isMobile ? "hidden" : ""}>Support</span>
                    </TabsTrigger>
                    <TabsTrigger value="detail" className="flex items-center gap-2" disabled={!selectedClient}>
                      <Settings className="h-4 w-4" />
                      <span className={isMobile ? "hidden" : ""}>Détail</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="clients" className="mt-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <CardTitle className="text-xl">Entreprises Clientes</CardTitle>
                        <CardDescription>
                          Gérez vos clients entreprises et leurs informations
                        </CardDescription>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full sm:w-auto gap-2">
                              <Filter className="h-4 w-4" />
                              <span className="truncate">{getStatusFilterLabel()}</span>
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
                              <DropdownMenuItem onClick={() => setStatusFilter('trial')}>
                                En période d'essai
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setStatusFilter('expired')}>
                                Abonnements expirés
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setStatusFilter('cancelled')}>
                                Annulés
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <div className="relative flex-grow">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Rechercher une entreprise..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="subscriptions" className="mt-0">
                    <div>
                      <CardTitle className="text-xl">Gestion des Abonnements</CardTitle>
                      <CardDescription>
                        Suivez et gérez les abonnements de vos clients
                      </CardDescription>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="support" className="mt-0">
                    <div>
                      <CardTitle className="text-xl">Tickets de Support</CardTitle>
                      <CardDescription>
                        Gérez les demandes de support de vos clients
                      </CardDescription>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="detail" className="mt-0">
                    <div>
                      <CardTitle className="text-xl">Détail Client</CardTitle>
                      <CardDescription>
                        Informations détaillées et gestion du client
                      </CardDescription>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardHeader>
              <CardContent>
                {activeTab === "clients" && (
                  <LeazrClientsList 
                    searchTerm={searchTerm} 
                    statusFilter={statusFilter}
                    onClientSelect={handleClientSelect}
                  />
                )}
                {activeTab === "subscriptions" && <LeazrSubscriptionManagement />}
                {activeTab === "support" && <LeazrSupportTickets />}
                {activeTab === "detail" && selectedClient && (
                  <LeazrClientDetail 
                    clientId={selectedClient}
                    onBack={() => setActiveTab("clients")}
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

export default LeazrClients;
