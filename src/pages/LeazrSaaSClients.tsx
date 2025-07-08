
import React, { useState, useMemo } from 'react';
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useSaaSData, CompanyData } from "@/hooks/useSaaSData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building, 
  Calendar, 
  CreditCard, 
  Users, 
  Search, 
  Eye, 
  Filter,
  Clock,
  CheckCircle,
  AlertTriangle,
  DollarSign
} from "lucide-react";
import SaaSClientDetailModal from "@/components/saas/SaaSClientDetailModal";

const LeazrSaaSClients = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { companies, loading } = useSaaSData();
  const [selectedClient, setSelectedClient] = useState<CompanyData | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'trial' | 'expired'>('all');

  // Vérifier si l'utilisateur est autorisé
  const isLeazrSaaSAdmin = user?.email === "ecommerce@itakecare.be";

  if (!isLeazrSaaSAdmin) {
    navigate("/dashboard");
    return null;
  }

  // Filtrer et trier les entreprises
  const filteredCompanies = useMemo(() => {
    return companies.filter(company => {
      const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (company.profile?.first_name + ' ' + company.profile?.last_name).toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || company.account_status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [companies, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = companies.length;
    const active = companies.filter(c => c.account_status === 'active').length;
    const trial = companies.filter(c => c.account_status === 'trial').length;
    const expired = companies.filter(c => c.account_status === 'expired').length;
    
    const planPrices = { starter: 49, pro: 149, business: 299 };
    const monthlyRevenue = companies.reduce((total, company) => {
      if (company.account_status === 'active') {
        return total + (planPrices[company.plan as keyof typeof planPrices] || 0);
      }
      return total;
    }, 0);

    return { total, active, trial, expired, monthlyRevenue };
  }, [companies]);

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "bg-green-100 text-green-800 border-green-300",
      trial: "bg-blue-100 text-blue-800 border-blue-300",
      expired: "bg-red-100 text-red-800 border-red-300",
      cancelled: "bg-gray-100 text-gray-800 border-gray-300"
    };
    return variants[status as keyof typeof variants] || variants.trial;
  };

  const getPlanBadge = (plan: string) => {
    const variants = {
      starter: "bg-gray-100 text-gray-800 border-gray-300",
      pro: "bg-purple-100 text-purple-800 border-purple-300",
      business: "bg-orange-100 text-orange-800 border-orange-300"
    };
    return variants[plan as keyof typeof variants] || variants.starter;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'trial': return <Clock className="h-4 w-4 text-blue-600" />;
      case 'expired': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const openClientDetail = (company: CompanyData) => {
    setSelectedClient(company);
    setIsDetailModalOpen(true);
  };

  const getTrialDaysRemaining = (trialEndDate?: string) => {
    if (!trialEndDate) return null;
    const now = new Date();
    const end = new Date(trialEndDate);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(diffDays, 0);
  };

  if (loading) {
    return (
      <PageTransition>
        <Container>
          <div className="py-4">
            <div className="flex justify-center items-center min-h-64">
              <div className="text-lg">Chargement des clients...</div>
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
            {/* En-tête avec statistiques */}
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-bold">Clients Leazr SaaS</h1>
                <p className="text-muted-foreground">
                  Gestion des entreprises clientes ({stats.total} clients)
                </p>
              </div>

              {/* Statistiques rapides */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total</p>
                        <p className="text-2xl font-bold">{stats.total}</p>
                      </div>
                      <Building className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Actifs</p>
                        <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                      </div>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Essais</p>
                        <p className="text-2xl font-bold text-blue-600">{stats.trial}</p>
                      </div>
                      <Clock className="h-4 w-4 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Expirés</p>
                        <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
                      </div>
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Revenus/mois</p>
                        <p className="text-2xl font-bold">{stats.monthlyRevenue.toLocaleString('fr-FR')}€</p>
                      </div>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Filtres et recherche */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Rechercher par nom d'entreprise ou admin..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)} className="w-full sm:w-auto">
                <TabsList className="grid grid-cols-4 w-full sm:w-auto">
                  <TabsTrigger value="all">Tous</TabsTrigger>
                  <TabsTrigger value="active">Actifs</TabsTrigger>
                  <TabsTrigger value="trial">Essais</TabsTrigger>
                  <TabsTrigger value="expired">Expirés</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Liste des clients */}
            <div className="grid gap-4">
              {filteredCompanies.map((company) => {
                const trialDays = getTrialDaysRemaining(company.trial_ends_at);
                const planPrices = { starter: 49, pro: 149, business: 299 };
                const monthlyRevenue = company.account_status === 'active' 
                  ? planPrices[company.plan as keyof typeof planPrices] || 0 
                  : 0;

                return (
                  <Card key={company.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            {getStatusIcon(company.account_status)}
                            <Building className="h-5 w-5" />
                            {company.name}
                          </CardTitle>
                          <CardDescription>
                            Admin: {company.profile?.first_name} {company.profile?.last_name}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Badge className={getStatusBadge(company.account_status)}>
                            {company.account_status === 'active' ? 'Actif' : 
                             company.account_status === 'trial' ? 'Essai' : 
                             company.account_status}
                          </Badge>
                          <Badge className={getPlanBadge(company.plan)}>
                            {company.plan}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>Créé le {new Date(company.created_at).toLocaleDateString('fr-FR')}</span>
                          </div>
                          
                          {company.trial_ends_at && trialDays !== null && (
                            <div className="flex items-center gap-2">
                              <Clock className={`h-4 w-4 ${trialDays <= 3 ? 'text-red-500' : 'text-blue-500'}`} />
                              <span className={trialDays <= 3 ? 'text-red-600 font-medium' : ''}>
                                {trialDays > 0 ? `${trialDays} jours restants` : 'Essai expiré'}
                              </span>
                            </div>
                          )}
                          
                          {company.modules_enabled && company.modules_enabled.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>{company.modules_enabled.length} modules actifs</span>
                            </div>
                          )}
                        </div>

                        {/* Revenus et actions */}
                        <div className="flex justify-between items-center pt-3 border-t">
                          <div className="flex items-center gap-4">
                            {monthlyRevenue > 0 && (
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium text-green-600">
                                  {monthlyRevenue}€/mois
                                </span>
                              </div>
                            )}
                            
                            {/* Indicateur d'urgence pour les essais qui expirent */}
                            {company.account_status === 'trial' && trialDays !== null && trialDays <= 3 && (
                              <Badge variant="destructive" className="text-xs">
                                {trialDays > 0 ? `Expire dans ${trialDays}j` : 'Expiré'}
                              </Badge>
                            )}
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openClientDetail(company)}
                            className="flex items-center gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            Voir détails
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              
              {filteredCompanies.length === 0 && !loading && (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center">
                      <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium">Aucun client trouvé</h3>
                      <p className="text-muted-foreground">
                        Aucun client ne correspond aux critères de recherche.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Modal de détail client */}
          <SaaSClientDetailModal
            client={selectedClient}
            isOpen={isDetailModalOpen}
            onClose={() => {
              setIsDetailModalOpen(false);
              setSelectedClient(null);
            }}
          />
        </motion.div>
      </Container>
    </PageTransition>
  );
};

export default LeazrSaaSClients;
