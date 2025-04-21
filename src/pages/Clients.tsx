import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, HeartHandshake, BadgePercent, Filter, UserSearch, Plus, Search, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { useClients } from "@/hooks/useClients";
import ClientsList from "@/components/crm/ClientsList";
import ClientSearchById from "@/components/crm/ClientSearchById";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const Clients = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("clients");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  const { 
    clients, 
    isLoading, 
    error, 
    searchTerm: clientSearchTerm, 
    setSearchTerm: setClientSearchTerm, 
    selectedStatus, 
    setSelectedStatus,
    showAmbassadorClients,
    setShowAmbassadorClients,
    totalClientsCount,
    searchClientById
  } = useClients();
  
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
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    if (value === "clients") {
      navigate("/clients");
    } else if (value === "partners") {
      navigate("/partners");
    } else if (value === "ambassadors") {
      navigate("/ambassadors");
    }
  };

  const handleAddClient = () => {
    navigate("/clients/create");
  };

  const handleClientFound = (clientId: string) => {
    // Optionally navigate to the client details page or prepare for view
    console.log(`Client found with ID: ${clientId}`);
  };

  const getStatusFilterLabel = () => {
    switch(statusFilter) {
      case 'active': return 'Clients actifs';
      case 'inactive': return 'Clients inactifs';
      case 'lead': return 'Prospects';
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
                  Gérez vos clients, ambassadeurs et partenaires
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <Tabs defaultValue={activeTab} onValueChange={handleTabChange} className="w-full">
                  <TabsList className="grid grid-cols-3 mb-4">
                    <TabsTrigger value="clients" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span className={isMobile ? "hidden" : ""}>Clients</span>
                    </TabsTrigger>
                    <TabsTrigger value="ambassadors" className="flex items-center gap-2">
                      <HeartHandshake className="h-4 w-4" />
                      <span className={isMobile ? "hidden" : ""}>Ambassadeurs</span>
                    </TabsTrigger>
                    <TabsTrigger value="partners" className="flex items-center gap-2">
                      <BadgePercent className="h-4 w-4" />
                      <span className={isMobile ? "hidden" : ""}>Partenaires</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="clients" className="mt-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <CardTitle className="text-xl">Clients</CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          Gérez vos clients
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="max-w-xs">
                                  <p>Vous voyez {showAmbassadorClients ? "les clients d'ambassadeurs" : "les clients standard"}</p>
                                  <p className="mt-1 text-xs">Total: {clients.length} clients</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
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
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}>
                              <Search className="mr-2 h-4 w-4" />
                              Recherche avancée
                            </DropdownMenuItem>
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
                          <Button 
                            onClick={handleAddClient} 
                            variant="default" 
                            size="sm" 
                            className="sm:ml-2 gap-1"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span className={isMobile ? "" : ""}>Nouveau client</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {showAdvancedSearch && (
                      <div className="mt-4 p-4 border rounded-md bg-slate-50 dark:bg-slate-900">
                        <h3 className="text-sm font-medium mb-2">Recherche par ID</h3>
                        <ClientSearchById 
                          onClientFound={handleClientFound} 
                          onToggleAmbassadorClients={setShowAmbassadorClients}
                        />
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="ambassadors" className="mt-0">
                    <div>
                      <CardTitle className="text-xl">Ambassadeurs</CardTitle>
                      <CardDescription>
                        Gérez vos ambassadeurs et suivez leurs performances
                      </CardDescription>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="partners" className="mt-0">
                    <div>
                      <CardTitle className="text-xl">Partenaires</CardTitle>
                      <CardDescription>
                        Gérez vos relations partenaires
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
                    totalClientsCount={totalClientsCount}
                  />
                }
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </Container>
    </PageTransition>
  );
};

export default Clients;
