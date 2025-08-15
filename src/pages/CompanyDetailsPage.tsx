import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Building2, 
  Users, 
  Calendar,
  Activity,
  Settings,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Shield,
  Globe,
  Loader2
} from "lucide-react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { motion } from "framer-motion";
import { useCompanyDetails } from "@/hooks/useCompanyDetails";


const CompanyDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { companyDetails: company, loading, error } = useCompanyDetails(id || '');

  if (loading) {
    return (
      <PageTransition>
        <Container>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </Container>
      </PageTransition>
    );
  }

  if (error || !company) {
    return (
      <PageTransition>
        <Container>
          <div className="py-6">
            <Button onClick={() => navigate('/admin/leazr-saas-users')} className="mb-4">
              Retour à la liste
            </Button>
            <Card>
              <CardContent className="py-6">
                <p className="text-center text-muted-foreground">
                  {error || 'Entreprise non trouvée'}
                </p>
              </CardContent>
            </Card>
          </div>
        </Container>
      </PageTransition>
    );
  }

  const handleBack = () => {
    navigate('/admin/leazr-saas-users');
  };

  const getPlanBadge = (plan: string) => {
    const planConfig = {
      starter: { label: "Starter", variant: "secondary" as const },
      pro: { label: "Pro", variant: "default" as const },
      business: { label: "Business", variant: "default" as const },
      enterprise: { label: "Enterprise", variant: "default" as const },
    };
    
    const config = planConfig[plan as keyof typeof planConfig] || { label: plan, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: "Actif", variant: "default" as const },
      trial: { label: "Essai", variant: "secondary" as const },
      suspended: { label: "Suspendu", variant: "destructive" as const },
      expired: { label: "Expiré", variant: "outline" as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <PageTransition>
      <Container>
        <motion.div
          className="py-6 space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {/* Header avec navigation */}
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour aux entreprises
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-3">
              {company.logo_url && (
                <img 
                  src={company.logo_url} 
                  alt={`Logo ${company.name}`}
                  className="w-10 h-10 rounded object-cover"
                />
              )}
              <div>
                <h1 className="text-2xl font-bold">{company.name}</h1>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>ID: {company.id}</span>
                  <span>•</span>
                  <span>Créé le {formatDate(company.created_at)}</span>
                </div>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {getPlanBadge(company.plan)}
              {getStatusBadge(company.account_status)}
            </div>
          </div>

          {/* Actions rapides */}
          <div className="flex gap-2">
            <Button 
              onClick={() => navigate(`/admin/leazr-saas-users/company/${id}/subscription`)}
              className="flex items-center gap-2"
            >
              <CreditCard className="h-4 w-4" />
              Gérer l'abonnement
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate(`/admin/leazr-saas-users/company/${id}/actions`)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Actions
            </Button>
            <Button 
              variant="outline"
              className="flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              Contacter
            </Button>
          </div>

          {/* Statistiques principales */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Utilisateurs</p>
                    <p className="text-2xl font-bold">{company.user_count}</p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Clients</p>
                    <p className="text-2xl font-bold">{company.client_count}</p>
                  </div>
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Équipements</p>
                    <p className="text-2xl font-bold">{company.equipment_count}</p>
                  </div>
                  <Activity className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">CO2 économisé</p>
                    <p className="text-2xl font-bold">{company.co2_saved} kg</p>
                  </div>
                  <Shield className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contenu principal avec onglets */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
              <TabsTrigger value="subscription">Abonnement</TabsTrigger>
              <TabsTrigger value="configuration">Configuration</TabsTrigger>
              <TabsTrigger value="activity">Activité</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Informations de contact */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Contact Principal
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="font-medium">
                        {company.primary_admin.first_name} {company.primary_admin.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">Administrateur Principal</p>
                    </div>
                     {company.primary_admin?.email && (
                       <div className="flex items-center gap-2 text-sm">
                         <Mail className="h-4 w-4 text-muted-foreground" />
                         <span>{company.primary_admin.email}</span>
                       </div>
                     )}
                     {company.customizations?.company_phone && (
                       <div className="flex items-center gap-2 text-sm">
                         <Phone className="h-4 w-4 text-muted-foreground" />
                         <span>{company.customizations.company_phone}</span>
                       </div>
                     )}
                     {company.customizations?.company_address && (
                       <div className="flex items-center gap-2 text-sm">
                         <MapPin className="h-4 w-4 text-muted-foreground" />
                         <span>{company.customizations.company_address}</span>
                       </div>
                     )}
                     {company.customizations?.quote_request_url && (
                       <div className="flex items-center gap-2 text-sm">
                         <Globe className="h-4 w-4 text-muted-foreground" />
                         <a href={company.customizations.quote_request_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                           Site web
                         </a>
                       </div>
                     )}
                  </CardContent>
                </Card>

                {/* Informations de l'entreprise */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Informations Entreprise
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Nom</p>
                        <p>{company.name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Slug</p>
                        <p className="font-mono text-sm">{company.slug}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Date de création</p>
                        <p>{formatDate(company.created_at)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Revenus mensuels</p>
                        <p className="font-semibold text-green-600">{formatCurrency(company.monthly_revenue)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Modules activés */}
              <Card>
                <CardHeader>
                  <CardTitle>Modules Activés</CardTitle>
                  <CardDescription>
                    Fonctionnalités disponibles pour cette entreprise
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {company.modules_enabled.map((module) => (
                      <Badge key={module} variant="outline" className="capitalize">
                        {module}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="subscription">
              <Card>
                <CardHeader>
                  <CardTitle>Détails de l'Abonnement</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Plan actuel</p>
                      <div className="flex items-center gap-2 mt-1">
                        {getPlanBadge(company.plan)}
                        <span className="font-semibold">{formatCurrency(company.monthly_revenue)}/mois</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Statut</p>
                      <div className="mt-1">{getStatusBadge(company.account_status)}</div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Expire le</p>
                      <p className="mt-1">{company.subscription_ends_at ? formatDate(company.subscription_ends_at) : 'N/A'}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex gap-2">
                    <Button>Changer de plan</Button>
                    <Button variant="outline">Prolonger l'abonnement</Button>
                    <Button variant="outline">Voir la facturation</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="configuration">
              <Card>
                <CardHeader>
                  <CardTitle>Configuration de l'Entreprise</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                     <div>
                       <h4 className="font-medium mb-3">Couleurs de marque</h4>
                       <div className="flex gap-4">
                         {company.primary_color && (
                           <div className="flex items-center gap-2">
                             <div 
                               className="w-6 h-6 rounded border"
                               style={{ backgroundColor: company.primary_color }}
                             />
                             <span className="text-sm">Primaire: {company.primary_color}</span>
                           </div>
                         )}
                         {company.secondary_color && (
                           <div className="flex items-center gap-2">
                             <div 
                               className="w-6 h-6 rounded border"
                               style={{ backgroundColor: company.secondary_color }}
                             />
                             <span className="text-sm">Secondaire: {company.secondary_color}</span>
                           </div>
                         )}
                       </div>
                     </div>
                  <Separator />
                     <div>
                       <h4 className="font-medium mb-3">Domaine personnalisé</h4>
                       <p className="text-sm text-muted-foreground">
                         {company.slug ? `${company.slug}.leazr.co` : 'Non configuré'}
                       </p>
                     </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Activité Récente</CardTitle>
                  <CardDescription>
                    Dernières actions importantes de cette entreprise
                  </CardDescription>
                </CardHeader>
                 <CardContent>
                   <div className="space-y-4">
                     <div className="flex items-center gap-3 p-3 border rounded-lg">
                       <div className="w-2 h-2 bg-primary rounded-full" />
                       <div className="flex-1">
                         <p className="text-sm">Compte créé</p>
                         <p className="text-xs text-muted-foreground">{formatDate(company.created_at)}</p>
                       </div>
                       <Badge variant="outline" className="text-xs">
                         account
                       </Badge>
                     </div>
                     <div className="text-center py-4 text-muted-foreground text-sm">
                       L'historique détaillé des activités sera bientôt disponible
                     </div>
                   </div>
                 </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </Container>
    </PageTransition>
  );
};

export default CompanyDetailsPage;