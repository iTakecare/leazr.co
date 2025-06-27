
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
import { getAmbassadorClients } from "@/services/ambassador/ambassadorClients";

const AmbassadorDashboardPage = () => {
  console.log("🏠 AmbassadorDashboardPage - Component mounted");
  
  const navigate = useNavigate();
  const { user } = useAuth();
  
  console.log("🏠 AmbassadorDashboardPage - User:", user ? { id: user.id, email: user.email } : 'No user');
  
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
  const [ambassadorId, setAmbassadorId] = useState<string | null>(null);

  // Fonction pour trouver l'ID de l'ambassadeur
  const findAmbassadorId = async () => {
    console.log("🔍 Finding ambassador ID for user:", user?.id);
    
    if (!user?.id) {
      console.log("❌ No user ID provided");
      return null;
    }
    
    try {
      console.log("🔍 Searching ambassador for user_id:", user.id);
      
      // Rechercher par user_id
      const { data: ambassadorData, error } = await supabase
        .from("ambassadors")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      
      console.log("🔍 Ambassador search result:", { ambassadorData, error });
      
      if (error) {
        console.error("❌ Error searching ambassador:", error);
        return null;
      }
      
      if (ambassadorData?.id) {
        console.log("✅ Ambassador found:", ambassadorData.id);
        return ambassadorData.id;
      }
      
      console.log("❌ No ambassador found for this user");
      return null;
    } catch (error) {
      console.error("💥 Exception finding ambassador:", error);
      return null;
    }
  };

  const loadStats = async () => {
    console.log("📊 Loading stats...");
    setLoading(true);
    
    try {
      const foundAmbassadorId = await findAmbassadorId();
      
      if (!foundAmbassadorId) {
        console.warn("⚠️ No ambassador ID found");
        toast.error("Profil ambassadeur non trouvé. Veuillez contacter l'administrateur.");
        setLoading(false);
        return;
      }

      setAmbassadorId(foundAmbassadorId);
      console.log(`📊 Loading stats for ambassador ${foundAmbassadorId}`);
      
      // Utiliser la fonction sécurisée pour récupérer les clients
      console.log("👥 Fetching clients...");
      const clientsData = await getAmbassadorClients(user?.id);
      const clientsCount = clientsData?.length || 0;
      console.log(`👥 Found ${clientsCount} clients`);
      
      // Récupérer les offres depuis la table offers
      console.log("📋 Fetching offers...");
      const { data: offersData, error: offersError } = await supabase
        .from("offers")
        .select("commission, created_at, workflow_status, client_name, monthly_payment, id")
        .eq("ambassador_id", foundAmbassadorId)
        .eq("type", "ambassador_offer");

      console.log("📋 Offers result:", { offersData, offersError });

      if (offersError) {
        console.error("❌ Error fetching offers:", offersError);
      }
      
      let totalCommissions = 0;
      let lastCommissionAmount = 0;
      let pendingOffersCount = 0;
      let acceptedOffersCount = 0;
      
      if (offersData && offersData.length > 0) {
        console.log(`📋 Processing ${offersData.length} offers`);
        
        // Calculer les commissions
        const commissionsData = offersData.filter(offer => offer.commission && offer.commission > 0);
        totalCommissions = commissionsData.reduce(
          (sum, offer) => sum + (parseFloat(offer.commission) || 0),
          0
        );
        
        // Trouver la commission la plus récente
        if (commissionsData.length > 0) {
          const sortedCommissions = [...commissionsData].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          lastCommissionAmount = parseFloat(sortedCommissions[0].commission) || 0;
        }
        
        // Compter les offres par statut
        pendingOffersCount = offersData.filter(offer => 
          offer.workflow_status && 
          !['financed', 'rejected'].includes(offer.workflow_status)
        ).length;
        
        acceptedOffersCount = offersData.filter(offer => 
          offer.workflow_status === 'financed'
        ).length;
        
        console.log(`📊 Stats calculated:`, {
          totalCommissions,
          pendingOffersCount,
          acceptedOffersCount,
          clientsCount
        });
      }

      setStats({
        clientsCount,
        totalCommissions,
        lastCommissionAmount,
        pendingOffersCount,
        acceptedOffersCount
      });
      
      // Préparer les clients récents
      const processedClients = clientsData?.slice(0, 5) || [];
      setRecentClients(processedClients);
      
      // Préparer les offres récentes
      const recentOffersData = offersData?.slice(0, 5) || [];
      setRecentOffers(recentOffersData);
      
      console.log("✅ Stats loading completed");
      
    } catch (error) {
      console.error("💥 Error loading stats:", error);
      toast.error("Impossible de charger les données du tableau de bord");
    } finally {
      console.log("📊 Setting loading to false");
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("🔄 useEffect triggered, user:", user?.id);
    if (user?.id) {
      loadStats();
    } else {
      console.log("⏳ Waiting for user authentication...");
    }
  }, [user?.id]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 18) return "Bon après-midi";
    return "Bonsoir";
  };

  console.log("🏠 AmbassadorDashboardPage - About to render, loading:", loading, "user:", !!user);

  if (loading) {
    console.log("🔄 Rendering loading state");
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

  console.log("🏠 Rendering main dashboard content");

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
