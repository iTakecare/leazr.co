
import React from 'react';
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useSaaSData } from "@/hooks/useSaaSData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building, Calendar, CreditCard, TrendingUp } from "lucide-react";

const LeazrSaaSSubscriptions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { companies, metrics, loading } = useSaaSData();

  // Vérifier si l'utilisateur est autorisé
  const isLeazrSaaSAdmin = user?.email === "ecommerce@itakecare.be";

  if (!isLeazrSaaSAdmin) {
    navigate("/dashboard");
    return null;
  }

  const planPrices = { starter: 49, pro: 149, business: 299 };

  if (loading) {
    return (
      <PageTransition>
        <Container>
          <div className="py-4">
            <div className="flex justify-center items-center min-h-64">
              <div className="text-lg">Chargement des abonnements...</div>
            </div>
          </div>
        </Container>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <Container>
        <motion.div
          className="py-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Abonnements SaaS</h1>
              <p className="text-muted-foreground">
                Gestion des abonnements et revenus ({metrics.monthlyRevenue.toLocaleString('fr-FR')}€/mois)
              </p>
            </div>

            {/* Métriques des abonnements */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total abonnements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.activeSubscriptions}</div>
                  <p className="text-xs text-muted-foreground">
                    sur {metrics.totalClients} clients
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Revenus mensuels</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.monthlyRevenue.toLocaleString('fr-FR')}€</div>
                  <p className="text-xs text-green-600">
                    +12% vs mois précédent
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Taux de conversion</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {((metrics.activeSubscriptions / metrics.totalClients) * 100).toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Essai → Abonnement
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Churn rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.churnRate}%</div>
                  <p className="text-xs text-muted-foreground">
                    Mensuel
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Liste des abonnements */}
            <div className="grid gap-4">
              {companies.filter(c => c.account_status === 'active').map((company) => (
                <Card key={company.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Building className="h-5 w-5" />
                          {company.name}
                        </CardTitle>
                        <CardDescription>
                          Plan {company.plan} - {planPrices[company.plan as keyof typeof planPrices]}€/mois
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Badge className="bg-green-100 text-green-800">
                          Actif
                        </Badge>
                        <Badge variant="outline">
                          {company.plan}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Abonné depuis {new Date(company.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                      {company.subscription_ends_at && (
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <span>Expire le {new Date(company.subscription_ends_at).toLocaleDateString('fr-FR')}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span>{planPrices[company.plan as keyof typeof planPrices]}€/mois</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </motion.div>
      </Container>
    </PageTransition>
  );
};

export default LeazrSaaSSubscriptions;
