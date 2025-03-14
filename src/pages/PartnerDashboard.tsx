
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Award, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { toast } from "sonner";
import PartnerOffersTable from "@/components/partners/PartnerOffersTable";
import PartnerCommissionsTable from "@/components/partners/PartnerCommissionsTable";

const PartnerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOffers: 0,
    pendingOffers: 0,
    approvedOffers: 0,
    rejectedOffers: 0,
    totalCommission: 0,
    unpaidCommission: 0,
    paidCommission: 0
  });
  const [activeTab, setActiveTab] = useState("offers");

  useEffect(() => {
    const fetchPartnerStats = async () => {
      try {
        setIsLoading(true);
        if (!user) return;

        // Fetch partner offers
        const { data: offers, error: offersError } = await supabase
          .from('offers')
          .select('id, status, workflow_status, monthly_payment, commission, amount')
          .eq('user_id', user.id)
          .eq('type', 'partner_offer');

        if (offersError) throw offersError;

        // Calculate stats
        const totalOffers = offers?.length || 0;
        const pendingOffers = offers?.filter(o => o.status === 'pending').length || 0;
        const approvedOffers = offers?.filter(o => o.status === 'accepted').length || 0;
        const rejectedOffers = offers?.filter(o => o.status === 'rejected').length || 0;
        
        // Calculate commissions
        let totalCommission = 0;
        let unpaidCommission = 0;
        let paidCommission = 0;
        
        if (offers) {
          for (const offer of offers) {
            if (offer.commission) {
              totalCommission += Number(offer.commission);
              
              // For this example, let's consider commissions for accepted offers as unpaid
              // and others as pending (not counted)
              if (offer.status === 'accepted') {
                unpaidCommission += Number(offer.commission);
              }
              
              // In reality, you'd track paid status in a separate table
            }
          }
        }

        setStats({
          totalOffers,
          pendingOffers,
          approvedOffers,
          rejectedOffers,
          totalCommission,
          unpaidCommission,
          paidCommission
        });
      } catch (error) {
        console.error("Error fetching partner stats:", error);
        toast.error("Erreur lors du chargement des données");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPartnerStats();
  }, [user]);

  return (
    <PageTransition>
      <Container>
        <div className="py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Tableau de bord Commercial</h1>
              <p className="text-muted-foreground mt-1">
                Suivez vos offres et commissions en temps réel
              </p>
            </div>
            <Button 
              className="mt-4 md:mt-0" 
              onClick={() => navigate("/partner/create-offer")}
            >
              <Plus className="mr-2 h-4 w-4" /> Nouvelle offre
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Offres totales</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalOffers}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Offres en attente</CardTitle>
                <AlertCircle className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingOffers}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Offres validées</CardTitle>
                <FileText className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.approvedOffers}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Commission totale</CardTitle>
                <Award className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalCommission)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Non payée: {formatCurrency(stats.unpaidCommission)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="offers" className="w-full" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="offers">Mes offres</TabsTrigger>
              <TabsTrigger value="commissions">Mes commissions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="offers" className="mt-0">
              <PartnerOffersTable />
            </TabsContent>
            
            <TabsContent value="commissions" className="mt-0">
              <PartnerCommissionsTable />
            </TabsContent>
          </Tabs>
        </div>
      </Container>
    </PageTransition>
  );
};

export default PartnerDashboard;
