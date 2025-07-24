
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  Users, 
  CreditCard, 
  TrendingUp,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  LifeBuoy
} from "lucide-react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useSaaSData, useRecentActivity } from "@/hooks/useSaaSData";

const LeazrSaaSDashboard = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Vérifier si l'utilisateur est autorisé
  const isLeazrSaaSAdmin = user?.email === "ecommerce@itakecare.be";
  
  // Récupérer les vraies données SaaS
  const { metrics: dashboardData, loading: dataLoading } = useSaaSData();
  const recentActivity = useRecentActivity();

  // Si l'authentification est en cours, afficher le loading
  if (authLoading) {
    return (
      <PageTransition>
        <Container>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Vérification des autorisations...</p>
            </div>
          </div>
        </Container>
      </PageTransition>
    );
  }

  // Si l'utilisateur n'est pas autorisé après authentification
  if (user && !isLeazrSaaSAdmin) {
    navigate("/dashboard");
    return null;
  }

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


  if (dataLoading) {
    return (
      <PageTransition>
        <Container>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Chargement du dashboard SaaS...</p>
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
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold mb-1">Dashboard SaaS Leazr</h1>
                <p className="text-muted-foreground">
                  Gestion complète de la plateforme SaaS et des abonnements clients
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-purple-100 text-purple-800">
                  Admin SaaS
                </Badge>
              </div>
            </div>
          </motion.div>

          {/* Métriques principales */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clients totaux</CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.totalClients}</div>
                <p className="text-xs text-green-600 mt-1">
                  +{dashboardData.newClientsThisMonth} ce mois-ci
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Abonnements actifs</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.activeSubscriptions}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {((dashboardData.activeSubscriptions / dashboardData.totalClients) * 100).toFixed(1)}% du total
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenus mensuels</CardTitle>
                <DollarSign className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.monthlyRevenue.toLocaleString('fr-FR')}€</div>
                <p className="text-xs text-green-600 mt-1">
                  +12% vs mois précédent
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tickets support</CardTitle>
                <LifeBuoy className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.openTickets}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {dashboardData.supportTickets} tickets au total
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Actions rapides */}
          <motion.div variants={itemVariants} className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Actions rapides</CardTitle>
                <CardDescription>
                  Gestion quotidienne de la plateforme SaaS
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button 
                    className="h-20 flex-col gap-2"
                    onClick={() => navigate('/admin/leazr-saas-clients')}
                  >
                    <Users className="h-6 w-6" />
                    Gérer les clients
                  </Button>
                  <Button 
                    variant="outline"
                    className="h-20 flex-col gap-2"
                    onClick={() => navigate('/admin/leazr-saas-subscriptions')}
                  >
                    <CreditCard className="h-6 w-6" />
                    Abonnements
                  </Button>
                  <Button 
                    variant="outline"
                    className="h-20 flex-col gap-2"
                    onClick={() => navigate('/admin/leazr-saas-support')}
                  >
                    <LifeBuoy className="h-6 w-6" />
                    Support client
                  </Button>
                  <Button 
                    variant="outline"
                    className="h-20 flex-col gap-2"
                    onClick={() => navigate('/admin/leazr-saas-plans')}
                  >
                    <BarChart3 className="h-6 w-6" />
                    Plans & tarifs
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Activité récente et métriques */}
          <motion.div variants={itemVariants}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Activité récente */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Activité récente</CardTitle>
                    <CardDescription>
                      Dernières actions sur la plateforme
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentActivity && recentActivity.length > 0 ? recentActivity.map((activity, index) => (
                        <div key={index} className="flex items-center space-x-4 p-3 rounded-lg border">
                          <div className={`w-3 h-3 rounded-full ${
                            activity.status === 'success' ? 'bg-green-500' : 
                            activity.status === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                          }`}></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{activity.message}</p>
                            <p className="text-xs text-muted-foreground">{activity.time}</p>
                          </div>
                        </div>
                      )) : (
                        <div className="text-center py-4 text-muted-foreground">
                          Aucune activité récente
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Métriques de performance */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Métriques clés</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Taux de conversion</span>
                        <span className="text-sm font-bold text-green-600">{dashboardData.conversionRate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: `${dashboardData.conversionRate}%` }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Taux de churn</span>
                        <span className="text-sm font-bold text-orange-600">{dashboardData.churnRate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-orange-600 h-2 rounded-full" style={{ width: `${dashboardData.churnRate}%` }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Satisfaction client</span>
                        <span className="text-sm font-bold text-blue-600">{dashboardData.satisfactionRate}/5</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${(dashboardData.satisfactionRate / 5) * 100}%` }}></div>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">ARR</div>
                        <div className="text-lg font-semibold">{(dashboardData.monthlyRevenue * 12).toLocaleString('fr-FR')}€</div>
                        <div className="text-xs text-muted-foreground">Annual Recurring Revenue</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </Container>
    </PageTransition>
  );
};

export default LeazrSaaSDashboard;
