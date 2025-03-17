
import React, { useState, useEffect } from 'react';
import AmbassadorsList from "@/components/crm/AmbassadorsList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, HeartHandshake, BadgePercent, Filter, UserSearch, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PartnersList from "@/components/crm/PartnersList";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { getAmbassadors } from "@/services/ambassadorService";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const AmbassadorsListPage = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("ambassadors");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [ambassadorCount, setAmbassadorCount] = useState<number>(0);
  
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
  
  useEffect(() => {
    const fetchAmbassadorCount = async () => {
      try {
        const ambassadors = await getAmbassadors();
        
        // Count ambassadors based on the current filter
        if (statusFilter === 'all') {
          setAmbassadorCount(ambassadors.length);
        } else {
          const filtered = ambassadors.filter(amb => amb.status === statusFilter);
          setAmbassadorCount(filtered.length);
        }
      } catch (error) {
        console.error("Error fetching ambassador count:", error);
        setAmbassadorCount(0);
      }
    };
    
    fetchAmbassadorCount();
  }, [statusFilter]);
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Handle navigation based on tab selection
    if (value === "clients") {
      navigate("/clients");
    } else if (value === "partners") {
      navigate("/partners");
    } else if (value === "ambassadors") {
      navigate("/ambassadors");
    }
  };

  const getStatusFilterLabel = () => {
    switch(statusFilter) {
      case 'active': return 'Ambassadeurs actifs';
      case 'inactive': return 'Ambassadeurs inactifs';
      case 'lead': return 'Prospects';
      default: return 'Tous les ambassadeurs';
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
                      <span>Clients</span>
                    </TabsTrigger>
                    <TabsTrigger value="ambassadors" className="flex items-center gap-2">
                      <HeartHandshake className="h-4 w-4" />
                      <span>Ambassadeurs</span>
                    </TabsTrigger>
                    <TabsTrigger value="partners" className="flex items-center gap-2">
                      <BadgePercent className="h-4 w-4" />
                      <span>Partenaires</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="ambassadors" className="mt-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <CardTitle className="text-xl">Ambassadeurs</CardTitle>
                        <CardDescription>
                          Gérez vos ambassadeurs et suivez leurs performances
                        </CardDescription>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full sm:w-auto gap-2">
                              <Filter className="h-4 w-4" />
                              <span className="truncate">{getStatusFilterLabel()}</span>
                              <Badge variant="secondary" className="ml-1 text-xs">
                                {ambassadorCount}
                              </Badge>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-56">
                            <DropdownMenuLabel>Filtrer par statut</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                              <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                                Tous les ambassadeurs
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setStatusFilter('active')}>
                                Ambassadeurs actifs
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setStatusFilter('inactive')}>
                                Ambassadeurs inactifs
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setStatusFilter('lead')}>
                                Prospects
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <div className="relative flex-grow">
                            <UserSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              placeholder="Rechercher un ambassadeur..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-9 w-full"
                            />
                          </div>
                          <Button 
                            onClick={() => navigate('/ambassadors/create')} 
                            variant="default" 
                            size="sm" 
                            className="sm:ml-2 gap-1"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Nouvel ambassadeur</span>
                          </Button>
                        </div>
                      </div>
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
                  
                  <TabsContent value="clients" className="mt-0">
                    <div>
                      <CardTitle className="text-xl">Clients</CardTitle>
                      <CardDescription>
                        Gérez vos clients
                      </CardDescription>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardHeader>
              <CardContent>
                {activeTab === "ambassadors" && <AmbassadorsList searchTerm={searchTerm} statusFilter={statusFilter} />}
                {activeTab === "partners" && <PartnersList />}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </Container>
    </PageTransition>
  );
};

export default AmbassadorsListPage;
