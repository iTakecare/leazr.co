
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Ambassador, getAmbassadorById } from "@/services/ambassadorService";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, ArrowLeft, UserPlus, MapPin, Building2 } from "lucide-react";
import { toast } from "sonner";
import PageTransition from "@/components/layout/PageTransition";
import Container from "@/components/layout/Container";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CommissionLevel, 
  getCommissionLevelWithRates, 
  getCommissionLevels
} from "@/services/commissionService";
import ContactInfoSection from "@/components/crm/detail/sections/ContactInfoSection";
import CompanyInfoSection from "@/components/crm/detail/sections/CompanyInfoSection";
import StatsSummary from "@/components/crm/detail/sections/StatsSummary";
import NotesSection from "@/components/crm/detail/sections/NotesSection";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { formatDateToFrench } from "@/utils/formatters";
import AmbassadorUserAccount from "@/components/ambassadors/AmbassadorUserAccount";
import { getAmbassadorClients } from "@/services/ambassadorClientService";
import AmbassadorCommissionsTable from "@/components/ambassadors/AmbassadorCommissionsTable";
import { Client } from "@/types/client";

const AmbassadorDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ambassador, setAmbassador] = useState<Ambassador | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("overview");
  const [commissionLevel, setCommissionLevel] = useState<CommissionLevel | null>(null);
  const [commissionLevels, setCommissionLevels] = useState<CommissionLevel[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [commissionLoading, setCommissionLoading] = useState(false);

  const fetchAmbassador = async () => {
    if (!id) {
      toast.error("ID d'ambassadeur manquant");
      navigate("/ambassadors");
      return;
    }

    try {
      setLoading(true);
      const data = await getAmbassadorById(id);
      if (!data) {
        setError("Ambassadeur introuvable");
        toast.error("Ambassadeur introuvable");
        setTimeout(() => navigate("/ambassadors"), 2000);
        return;
      }
      
      console.log("Ambassador data loaded:", data);
      setAmbassador(data);
      
      // Load commission level
      if (data.commission_level_id) {
        loadCommissionLevel(data.commission_level_id);
      } else {
        setCommissionLevel(null);
      }
      
      loadCommissionLevels();
      fetchAmbassadorClients(id);
    } catch (error: any) {
      console.error("Erreur lors du chargement de l'ambassadeur:", error);
      
      if (error.message && error.message.includes("invalid input syntax for type uuid")) {
        setError("L'identifiant fourni n'est pas valide");
        toast.error("ID d'ambassadeur invalide");
      } else {
        setError("Erreur lors du chargement de l'ambassadeur");
        toast.error("Erreur lors du chargement de l'ambassadeur");
      }
      
      setTimeout(() => navigate("/ambassadors"), 2000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAmbassador();
  }, [id, navigate]);

  const fetchAmbassadorClients = async (ambassadorId: string) => {
    try {
      setClientsLoading(true);
      const clientsData = await getAmbassadorClients(ambassadorId);
      console.log("Ambassador clients loaded:", clientsData);
      setClients(clientsData);
    } catch (error) {
      console.error("Error fetching ambassador clients:", error);
    } finally {
      setClientsLoading(false);
    }
  };

  const loadCommissionLevels = async () => {
    try {
      const levels = await getCommissionLevels("ambassador");
      setCommissionLevels(levels);
    } catch (error) {
      console.error("Error loading commission levels:", error);
    }
  };

  const loadCommissionLevel = async (levelId: string) => {
    setCommissionLoading(true);
    try {
      const level = await getCommissionLevelWithRates(levelId);
      setCommissionLevel(level);
    } catch (error) {
      console.error("Error loading commission level:", error);
    } finally {
      setCommissionLoading(false);
    }
  };

  // Fonction pour gérer l'édition de l'ambassadeur
  const handleEdit = () => {
    if (ambassador && ambassador.id) {
      console.log("Navigating to edit page for ambassador:", ambassador.id);
      navigate(`/ambassadors/${ambassador.id}/edit`);
    }
  };

  // Fonction pour gérer la création d'une offre
  const handleCreateOffer = () => {
    navigate(`/ambassadors/${id}/create-offer`);
  };

  if (loading) {
    return (
      <PageTransition>
        <Container>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Chargement des données...</span>
          </div>
        </Container>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <Container>
          <div className="p-4 text-center max-w-md mx-auto mt-12">
            <div className="rounded-full bg-destructive/10 w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <span className="text-destructive text-3xl">!</span>
            </div>
            <h1 className="text-xl font-bold mb-2">Erreur</h1>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button 
              className="px-4 py-2" 
              onClick={() => navigate("/ambassadors")}
            >
              Retour à la liste
            </Button>
          </div>
        </Container>
      </PageTransition>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <PageTransition>
      <Container>
        <div className="flex justify-between items-center mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/ambassadors")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Retour aux ambassadeurs
          </Button>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleEdit}
              className="flex items-center gap-2"
            >
              Modifier l'ambassadeur
            </Button>
            
            <Button 
              onClick={handleCreateOffer}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Créer une offre
            </Button>
          </div>
        </div>
        
        {ambassador && (
          <div className="mt-4">
            <div className="flex items-start gap-4 mb-6">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary text-white text-xl">
                  {getInitials(ambassador.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">{ambassador.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant={ambassador.status === "active" ? "default" : "secondary"}
                  >
                    {ambassador.status === "active" ? "Actif" : "Inactif"}
                  </Badge>
                  {ambassador.region && (
                    <span className="flex items-center text-xs gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {ambassador.region}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card className="md:col-span-2 shadow-md border-none bg-gradient-to-br from-card to-background">
                <CardContent className="pt-6">
                  <Tabs value={tab} onValueChange={setTab}>
                    <TabsList className="mb-4 grid w-full grid-cols-3">
                      <TabsTrigger value="overview">Aperçu</TabsTrigger>
                      <TabsTrigger value="clients">Clients</TabsTrigger>
                      <TabsTrigger value="commissions">Commissions</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview">
                      <div className="space-y-6">
                        <ContactInfoSection 
                          email={ambassador.email} 
                          phone={ambassador.phone} 
                        />

                        <CompanyInfoSection 
                          company={ambassador.company}
                          vat_number={ambassador.vat_number}
                          address={ambassador.address}
                          postal_code={ambassador.postal_code}
                          city={ambassador.city}
                          country={ambassador.country}
                        />

                        <StatsSummary 
                          clientsCount={ambassador.clients_count || 0}
                          commissionsTotal={ambassador.commissions_total || 0}
                        />

                        <NotesSection notes={ambassador.notes} />
                      </div>
                    </TabsContent>

                    <TabsContent value="clients">
                      <div className="space-y-4">
                        <h2 className="text-lg font-semibold">Clients de {ambassador.name}</h2>
                        
                        {clientsLoading ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <span className="ml-2">Chargement des clients...</span>
                          </div>
                        ) : clients.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Client</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead>Date</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {clients.map((client) => (
                                <TableRow key={client.id}>
                                  <TableCell>
                                    <div className="font-medium">{client.name}</div>
                                    {client.company && (
                                      <div className="flex items-center text-xs text-muted-foreground">
                                        <Building2 className="h-3 w-3 mr-1" />
                                        {client.company}
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={client.status === 'active' ? 'default' : 'secondary'} className={
                                      client.status === 'active' 
                                        ? "bg-green-100 text-green-800 hover:bg-green-100" 
                                        : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                                    }>
                                      {client.status === 'active' ? 'Actif' : 'Inactif'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {formatDateToFrench(new Date(client.created_at || Date.now()))}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-center py-8 bg-gray-50 rounded-md">
                            <p className="text-muted-foreground">Aucun client n'est attribué</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="commissions">
                      <div className="space-y-4">
                        <h2 className="text-lg font-semibold">Commissions - {ambassador.name}</h2>
                        <AmbassadorCommissionsTable ambassadorId={id} />
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
              
              <Card className="shadow-md border-none bg-gradient-to-br from-card to-background">
                <CardContent className="pt-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-primary" />
                    Compte utilisateur
                  </h2>
                  <AmbassadorUserAccount 
                    ambassador={ambassador}
                    onAccountCreated={fetchAmbassador}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </Container>
    </PageTransition>
  );
};

export default AmbassadorDetail;
