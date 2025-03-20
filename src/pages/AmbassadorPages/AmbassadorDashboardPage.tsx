
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, User, Calendar, BarChart, FileText } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PageTransition from "@/components/layout/PageTransition";
import Container from "@/components/layout/Container";

const AmbassadorDashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const ambassadorId = user?.ambassador_id;
  
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

  useEffect(() => {
    if (!ambassadorId) return;

    const loadStats = async () => {
      setLoading(true);
      try {
        // Compter les clients
        const { count: clientsCount, error: clientsError } = await supabase
          .from("ambassador_clients")
          .select("client_id", { count: "exact" })
          .eq("ambassador_id", ambassadorId);

        if (clientsError) throw clientsError;

        // Obtenir le total des commissions
        const { data: commissions, error: commissionsError } = await supabase
          .from("ambassador_commissions")
          .select("amount")
          .eq("ambassador_id", ambassadorId);

        if (commissionsError) throw commissionsError;

        const totalCommissions = commissions.reduce(
          (sum, commission) => sum + (parseFloat(commission.amount) || 0),
          0
        );

        // Obtenir la dernière commission
        const { data: lastCommission, error: lastCommissionError } = await supabase
          .from("ambassador_commissions")
          .select("amount")
          .eq("ambassador_id", ambassadorId)
          .order("created_at", { ascending: false })
          .limit(1);

        if (lastCommissionError) throw lastCommissionError;
        
        // Compter les offres en cours
        const { data: pendingOffers, error: pendingOffersError } = await supabase
          .from("offers")
          .select("id", { count: "exact" })
          .eq("type", "ambassador_offer")
          .eq("user_id", user?.id)
          .not("workflow_status", "eq", "financed")
          .not("workflow_status", "eq", "rejected");
          
        if (pendingOffersError) throw pendingOffersError;
        
        // Compter les offres acceptées
        const { data: acceptedOffers, error: acceptedOffersError } = await supabase
          .from("offers")
          .select("id", { count: "exact" })
          .eq("type", "ambassador_offer")
          .eq("user_id", user?.id)
          .eq("workflow_status", "financed");
          
        if (acceptedOffersError) throw acceptedOffersError;
        
        // Récupérer les clients récents
        const { data: clients, error: recentClientsError } = await supabase
          .from("ambassador_clients")
          .select("clients(*)")
          .eq("ambassador_id", ambassadorId)
          .order("created_at", { ascending: false })
          .limit(5);
          
        if (recentClientsError) throw recentClientsError;
        
        // Récupérer les offres récentes
        const { data: offers, error: recentOffersError } = await supabase
          .from("offers")
          .select("*")
          .eq("type", "ambassador_offer")
          .eq("user_id", user?.id)
          .order("created_at", { ascending: false })
          .limit(5);
          
        if (recentOffersError) throw recentOffersError;

        setStats({
          clientsCount: clientsCount || 0,
          totalCommissions,
          lastCommissionAmount: lastCommission.length > 0 ? parseFloat(lastCommission[0].amount) : 0,
          pendingOffersCount: pendingOffers?.length || 0,
          acceptedOffersCount: acceptedOffers?.length || 0
        });
        
        setRecentClients(clients.map(item => item.clients));
        setRecentOffers(offers);
      } catch (error) {
        console.error("Erreur lors du chargement des statistiques:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [ambassadorId, user?.id]);

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
                      <div key={index} className="flex items-center justify-between border-b pb-2 last:border-0">
                        <div>
                          <p className="font-medium">{client.name}</p>
                          <p className="text-sm text-muted-foreground">{client.email}</p>
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
                  <Button className="w-full" onClick={() => navigate("/ambassador/clients/new")}>
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
                      <div key={index} className="flex items-center justify-between border-b pb-2 last:border-0">
                        <div>
                          <p className="font-medium">{offer.client_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(offer.monthly_payment)}/mois - {offer.workflow_status}
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
