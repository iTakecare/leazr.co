
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, User, Calendar, BarChart, FileText, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PageTransition from "@/components/layout/PageTransition";
import Container from "@/components/layout/Container";
import { toast } from "sonner";
import AmbassadorErrorHandler from "@/components/ambassador/AmbassadorErrorHandler";

const AmbassadorDashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Utiliser un état pour stocker l'ID d'ambassadeur trouvé par la recherche alternative
  const [resolvedAmbassadorId, setResolvedAmbassadorId] = useState<string | null>(user?.ambassador_id || null);
  
  const [stats, setStats] = useState({
    clientsCount: 0,
    totalCommissions: 0,
    lastCommissionAmount: 0,
    pendingOffersCount: 0,
    acceptedOffersCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentClients, setRecentClients] = useState([]);
  const [recentOffers, setRecentOffers] = useState([]);
  const [error, setError] = useState(null);

  // Fonction pour rechercher l'ID de l'ambassadeur par email si non trouvé dans le profil utilisateur
  const findAmbassadorId = async () => {
    if (user?.ambassador_id) {
      setResolvedAmbassadorId(user.ambassador_id);
      return user.ambassador_id;
    }
    
    if (!user?.email) return null;
    
    try {
      console.log("Recherche d'un ambassadeur associé à l'email:", user.email);
      
      const { data, error } = await supabase
        .from("ambassadors")
        .select("id")
        .eq("email", user.email)
        .maybeSingle();
      
      if (error) {
        console.error("Erreur lors de la recherche de l'ambassadeur:", error);
        return null;
      }
      
      if (data && data.id) {
        console.log("Ambassadeur trouvé par email:", data.id);
        setResolvedAmbassadorId(data.id);
        return data.id;
      }
      
      return null;
    } catch (error) {
      console.error("Exception lors de la recherche de l'ambassadeur:", error);
      return null;
    }
  };

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const ambassadorId = resolvedAmbassadorId || await findAmbassadorId();
      
      if (!ambassadorId) {
        console.warn("Aucun ID d'ambassadeur trouvé dans le profil utilisateur ou par email");
        setError("Identifiant d'ambassadeur non trouvé");
        setLoading(false);
        return;
      }

      console.log(`Chargement des statistiques pour l'ambassadeur ${ambassadorId}`);
      
      // Direct query to count ambassador clients
      const { data: clientsData, error: clientsError } = await supabase
        .from("ambassador_clients")
        .select("client_id")
        .eq("ambassador_id", ambassadorId);

      if (clientsError) throw clientsError;
      
      const clientsCount = clientsData?.length || 0;
      console.log(`Found ${clientsCount} clients for ambassador ${ambassadorId}`);
      
      // Get commissions directly from the offers table
      let totalCommissions = 0;
      let lastCommissionAmount = 0;
      
      try {
        // Get all offers with commissions for this ambassador
        const { data: commissionsData, error: commissionsError } = await supabase
          .from("offers")
          .select("commission, created_at")
          .eq("ambassador_id", ambassadorId)
          .not("commission", "is", null)
          .gt("commission", 0);

        if (!commissionsError && commissionsData && commissionsData.length > 0) {
          // Calculate total commissions
          totalCommissions = commissionsData.reduce(
            (sum, offer) => sum + (parseFloat(offer.commission) || 0),
            0
          );
          
          // Find the most recent commission
          const sortedCommissions = [...commissionsData].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          
          if (sortedCommissions.length > 0) {
            lastCommissionAmount = parseFloat(sortedCommissions[0].commission) || 0;
          }
          
          console.log(`Loaded ${commissionsData.length} commissions, total: ${totalCommissions}`);
        } else {
          console.log('No commissions found for ambassador in offers table');
          
          // Fallback: get data from ambassadors table
          const { data: ambassador } = await supabase
            .from("ambassadors")
            .select("commissions_total, last_commission")
            .eq("id", ambassadorId)
            .single();
            
          if (ambassador) {
            totalCommissions = parseFloat(ambassador.commissions_total) || 0;
            lastCommissionAmount = parseFloat(ambassador.last_commission) || 0;
          }
        }
      } catch (commissionError) {
        console.error("Error fetching commission data:", commissionError);
        // Continue execution, just with zero values for commissions
      }
      
      // Count pending offers
      const { data: pendingOffers, error: pendingOffersError } = await supabase
        .from("offers")
        .select("id")
        .eq("type", "ambassador_offer")
        .eq("ambassador_id", ambassadorId)
        .not("workflow_status", "eq", "financed")
        .not("workflow_status", "eq", "rejected");
        
      if (pendingOffersError) throw pendingOffersError;
      
      // Count accepted offers
      const { data: acceptedOffers, error: acceptedOffersError } = await supabase
        .from("offers")
        .select("id")
        .eq("type", "ambassador_offer")
        .eq("ambassador_id", ambassadorId)
        .eq("workflow_status", "financed");
        
      if (acceptedOffersError) throw acceptedOffersError;
      
      // Get recent clients
      const { data: clients, error: recentClientsError } = await supabase
        .from("ambassador_clients")
        .select(`
          id,
          client_id,
          clients:client_id(*)
        `)
        .eq("ambassador_id", ambassadorId)
        .order("created_at", { ascending: false })
        .limit(5);
        
      if (recentClientsError) throw recentClientsError;
      
      // Get recent offers
      const { data: offers, error: recentOffersError } = await supabase
        .from("offers")
        .select("*")
        .eq("type", "ambassador_offer")
        .eq("ambassador_id", ambassadorId)
        .order("created_at", { ascending: false })
        .limit(5);
        
      if (recentOffersError) throw recentOffersError;

      setStats({
        clientsCount,
        totalCommissions,
        lastCommissionAmount,
        pendingOffersCount: pendingOffers?.length || 0,
        acceptedOffersCount: acceptedOffers?.length || 0
      });
      
      // Process clients data to get the actual client objects
      const processedClients = clients
        ?.filter(item => item.clients) // Filter out any null client references
        .map(item => item.clients) || [];
      
      console.log("Processed clients:", processedClients);
      setRecentClients(processedClients);
      setRecentOffers(offers || []);
    } catch (error) {
      console.error("Erreur lors du chargement des statistiques:", error);
      setError("Impossible de charger les données du tableau de bord");
      toast.error("Impossible de charger les données du tableau de bord");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [resolvedAmbassadorId]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 18) return "Bon après-midi";
    return "Bonsoir";
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

  if (error) {
    return (
      <PageTransition>
        <Container>
          <div className="p-6">
            <div className="mb-8">
              <h1 className="text-3xl font-bold">
                {greeting()}, {user?.first_name || user?.email}
              </h1>
              <p className="text-muted-foreground">Votre tableau de bord ambassadeur</p>
            </div>
            
            <AmbassadorErrorHandler 
              message={`Erreur: ${error}. Veuillez réessayer plus tard ou contacter l'assistance.`}
              onRetry={() => {
                findAmbassadorId().then(() => loadStats());
              }}
              showDiagnosticInfo={true}
            />
          </div>
        </Container>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <Container>
        <div className="p-6">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">
                {greeting()}, {user?.first_name || user?.email}
              </h1>
              <p className="text-muted-foreground">Votre tableau de bord ambassadeur</p>
            </div>
            <Button onClick={() => loadStats()} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" /> Actualiser
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>
                  <User className="h-4 w-4 inline mr-2" />
                  Clients
                </CardDescription>
                <CardTitle className="text-3xl">{stats.clientsCount}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Total de clients amenés
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>
                  <FileText className="h-4 w-4 inline mr-2" />
                  Offres
                </CardDescription>
                <CardTitle className="text-3xl">
                  {stats.pendingOffersCount}/{stats.pendingOffersCount + stats.acceptedOffersCount}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Offres en cours/total
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>
                  <BarChart className="h-4 w-4 inline mr-2" />
                  Commissions
                </CardDescription>
                <CardTitle className="text-3xl">
                  {formatCurrency(stats.totalCommissions)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Commissions gagnées
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Clients récents</CardTitle>
                  <CardDescription>
                    Les derniers clients que vous avez ajoutés
                  </CardDescription>
                </div>
                <Button 
                  variant="outline"
                  onClick={() => navigate("/ambassador/clients")}
                >
                  Voir tout
                </Button>
              </CardHeader>
              <CardContent>
                {recentClients.length > 0 ? (
                  <div className="space-y-4">
                    {recentClients.map((client, index) => (
                      <div key={client.id || index} className="flex items-center justify-between border-b pb-2 last:border-0">
                        <div>
                          <p className="font-medium">{client.name}</p>
                          <p className="text-sm text-muted-foreground">{client.email || client.company || "Pas d'information"}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => navigate(`/ambassador/clients/${client.id}`)}
                        >
                          Détails
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-4 text-muted-foreground">
                    Aucun client récent
                  </p>
                )}
                <div className="mt-6">
                  <Button className="w-full" onClick={() => navigate("/ambassador/clients/create")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter un client
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Offres récentes</CardTitle>
                  <CardDescription>
                    Les dernières offres que vous avez créées
                  </CardDescription>
                </div>
                <Button 
                  variant="outline"
                  onClick={() => navigate("/ambassador/offers")}
                >
                  Voir tout
                </Button>
              </CardHeader>
              <CardContent>
                {recentOffers.length > 0 ? (
                  <div className="space-y-4">
                    {recentOffers.map((offer, index) => (
                      <div key={offer.id || index} className="flex items-center justify-between border-b pb-2 last:border-0">
                        <div>
                          <p className="font-medium">{offer.client_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(offer.monthly_payment)}/mois - {offer.workflow_status || 'En cours'}
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => navigate(`/ambassador/offers/${offer.id}`)}
                        >
                          Détails
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-4 text-muted-foreground">
                    Aucune offre récente
                  </p>
                )}
                <div className="mt-6">
                  <Button className="w-full" onClick={() => navigate("/ambassador/create-offer")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Créer une offre
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>
    </PageTransition>
  );
};

export default AmbassadorDashboardPage;
