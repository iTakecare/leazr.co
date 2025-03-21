import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAmbassadorById, getAmbassadorStats, Ambassador } from "@/services/ambassadorService";
import { Loader2, ChevronLeft, Plus, User, Calendar, BarChart } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { useAuth } from "@/context/AuthContext";
import PageTransition from "@/components/layout/PageTransition";
import Container from "@/components/layout/Container";

const AmbassadorDashboard = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ambassador, setAmbassador] = useState<Ambassador | null>(null);
  const [stats, setStats] = useState({
    clientsCount: 0,
    totalCommissions: 0,
    lastCommissionAmount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const loadAmbassadorData = async () => {
      setLoading(true);
      try {
        const ambassadorData = await getAmbassadorById(id);
        if (ambassadorData) {
          setAmbassador(ambassadorData);
          const statsData = await getAmbassadorStats(id);
          setStats(statsData);
        }
      } catch (error) {
        console.error('Error loading ambassador data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAmbassadorData();
  }, [id]);

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

  if (!ambassador) {
    return (
      <PageTransition>
        <Container>
          <div className="h-screen flex flex-col items-center justify-center">
            <h1 className="text-2xl font-bold mb-4">Ambassadeur non trouvé</h1>
            <Button onClick={() => navigate("/")}>Retour à l'accueil</Button>
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
              <Button
                variant="ghost"
                size="sm"
                className="mb-2"
                onClick={() => navigate(-1)}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>
              <h1 className="text-3xl font-bold">
                {greeting()}, {ambassador.name}
              </h1>
              <p className="text-muted-foreground">Votre tableau de bord ambassadeur</p>
            </div>
            <Button onClick={() => navigate("/ambassador/clients/create")}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un client
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
                  <BarChart className="h-4 w-4 inline mr-2" />
                  Commissions totales
                </CardDescription>
                <CardTitle className="text-3xl">
                  {formatCurrency(stats.totalCommissions)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Somme des commissions perçues
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>
                  <Calendar className="h-4 w-4 inline mr-2" />
                  Dernière commission
                </CardDescription>
                <CardTitle className="text-3xl">
                  {formatCurrency(stats.lastCommissionAmount)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Montant de la dernière commission
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Mes clients</CardTitle>
                <CardDescription>
                  Liste des clients que vous avez amenés
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full" 
                  onClick={() => navigate(`/ambassador/clients`)}
                >
                  Voir tous mes clients
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Mes commissions</CardTitle>
                <CardDescription>
                  Historique de vos commissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full" 
                  onClick={() => navigate(`/ambassador/commissions`)}
                >
                  Voir toutes mes commissions
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>
    </PageTransition>
  );
};

export default AmbassadorDashboard;
