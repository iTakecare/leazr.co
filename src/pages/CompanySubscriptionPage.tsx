import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  ArrowLeft, 
  CreditCard,
  Calendar,
  DollarSign,
  FileText,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Loader2
} from "lucide-react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { motion } from "framer-motion";
import { useCompanyDetails } from "@/hooks/useCompanyDetails";
import { updateCompanyModules, updateCompanyPlan } from "@/services/companyModulesService";

const available_plans = [
  { id: 'starter', name: 'Starter', price: 49, features: ['5 utilisateurs', 'CRM de base'] },
  { id: 'pro', name: 'Pro', price: 149, features: ['20 utilisateurs', 'CRM avancé', 'Analytics'] },
  { id: 'business', name: 'Business', price: 299, features: ['50 utilisateurs', 'Toutes fonctionnalités'] },
  { id: 'enterprise', name: 'Enterprise', price: 599, features: ['Utilisateurs illimités', 'Support dédié'] }
];

const available_modules = [
  { id: 'crm', name: 'CRM Avancé', price: 29 },
  { id: 'analytics', name: 'Analytics', price: 39 },
  { id: 'automation', name: 'Automation', price: 49 },
  { id: 'api', name: 'API Access', price: 19 }
];

const CompanySubscriptionPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { companyDetails: company, loading, error, refetch } = useCompanyDetails(id || '');
  const [selectedPlan, setSelectedPlan] = useState(company?.plan || 'starter');
  const [isUpdating, setIsUpdating] = useState(false);

  React.useEffect(() => {
    if (company?.plan) {
      setSelectedPlan(company.plan);
    }
  }, [company?.plan]);

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
    navigate(`/admin/leazr-saas-users/company/${id}/details`);
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

  const getStatusBadge = (status: string) => {
    const config = {
      paid: { icon: CheckCircle, label: "Payé", variant: "default" as const, color: "text-green-600" },
      pending: { icon: Clock, label: "En attente", variant: "secondary" as const, color: "text-orange-600" },
      failed: { icon: XCircle, label: "Échoué", variant: "destructive" as const, color: "text-red-600" },
    };
    
    const { icon: Icon, label, variant, color } = config[status as keyof typeof config] || config.pending;
    
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${color}`} />
        {label}
      </Badge>
    );
  };

  const handlePlanChange = async () => {
    if (!company || isUpdating) return;

    setIsUpdating(true);
    try {
      const currentModules = company.modules_enabled || [];
      const result = await updateCompanyPlan(company.id, selectedPlan, currentModules);
      
      if (result.success) {
        await refetch();
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleModuleToggle = async (moduleId: string) => {
    if (!company || isUpdating) return;

    setIsUpdating(true);
    try {
      const currentModules = company.modules_enabled || [];
      const isEnabled = currentModules.includes(moduleId);
      
      let newModules: string[];
      if (isEnabled) {
        newModules = currentModules.filter(m => m !== moduleId);
      } else {
        newModules = [...currentModules, moduleId];
      }

      const result = await updateCompanyModules(company.id, newModules);
      
      if (result.success) {
        await refetch();
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <PageTransition>
      <Container>
        <motion.div
          className="py-6 space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour aux détails
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div>
              <h1 className="text-2xl font-bold">Gestion de l'Abonnement</h1>
              <p className="text-muted-foreground">{company.name}</p>
            </div>
          </div>

          {/* Vue d'ensemble de l'abonnement actuel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Abonnement Actuel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Plan</p>
                  <p className="text-xl font-bold capitalize">{company.plan}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Prix mensuel</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(company.monthly_revenue)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Statut</p>
                  <Badge variant={company.account_status === 'active' ? 'default' : 'secondary'}>
                    {company.account_status === 'active' ? 'Actif' : company.account_status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fin d'abonnement</p>
                  <p className="text-lg font-semibold">
                    {company.subscription_ends_at ? formatDate(company.subscription_ends_at) : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Onglets de gestion */}
          <Tabs defaultValue="plan" className="space-y-6">
            <TabsList>
              <TabsTrigger value="plan">Changement de Plan</TabsTrigger>
              <TabsTrigger value="modules">Modules</TabsTrigger>
              <TabsTrigger value="billing">Facturation</TabsTrigger>
              <TabsTrigger value="trial">Période d'Essai</TabsTrigger>
            </TabsList>

            {/* Changement de plan */}
            <TabsContent value="plan" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Changer de Plan</CardTitle>
                  <CardDescription>
                    Modifiez le plan d'abonnement de l'entreprise. Les changements prendront effet immédiatement.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label>Nouveau plan</Label>
                    <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {available_plans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name} - {formatCurrency(plan.price)}/mois
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Plans disponibles */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {available_plans.map((plan) => (
                      <Card key={plan.id} className={selectedPlan === plan.id ? "border-primary" : ""}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">{plan.name}</CardTitle>
                          <p className="text-2xl font-bold">{formatCurrency(plan.price)}<span className="text-sm font-normal text-muted-foreground">/mois</span></p>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {plan.features.map((feature, index) => (
                            <p key={index} className="text-sm text-muted-foreground">• {feature}</p>
                          ))}
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handlePlanChange} disabled={selectedPlan === company.plan || isUpdating}>
                      {isUpdating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Mise à jour...
                        </>
                      ) : (
                        'Appliquer le changement'
                      )}
                    </Button>
                    {selectedPlan !== company.plan && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <AlertTriangle className="h-4 w-4" />
                        Le changement sera appliqué immédiatement avec calcul prorata
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Gestion des modules */}
            <TabsContent value="modules" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Modules et Extensions</CardTitle>
                  <CardDescription>
                    Activez ou désactivez des modules spécifiques pour personnaliser l'expérience
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {available_modules.map((module) => (
                      <div key={module.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{module.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(module.price)}/mois par module
                          </p>
                        </div>
                        <Switch 
                          checked={company.modules_enabled.includes(module.id)} 
                          onCheckedChange={() => handleModuleToggle(module.id)}
                          disabled={isUpdating}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Historique de facturation */}
            <TabsContent value="billing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Historique de Facturation
                  </CardTitle>
                  <CardDescription>
                    Historique des paiements et factures
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Historique de facturation non disponible</p>
                      <p className="text-sm mt-1">Cette fonctionnalité sera bientôt disponible avec l'intégration Stripe</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions de facturation */}
              <Card>
                <CardHeader>
                  <CardTitle>Actions de Facturation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button variant="outline">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Générer facture proforma
                    </Button>
                    <Button variant="outline">
                      <Calendar className="h-4 w-4 mr-2" />
                      Modifier cycle de facturation
                    </Button>
                    <Button variant="outline">
                      <Settings className="h-4 w-4 mr-2" />
                      Paramètres de paiement
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Gestion de période d'essai */}
            <TabsContent value="trial" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Gestion de la Période d'Essai</CardTitle>
                  <CardDescription>
                    Actions spéciales pour les comptes en période d'essai
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className={`p-4 border rounded-lg ${company.trial_ends_at ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
                    <p className={`text-sm ${company.trial_ends_at ? 'text-amber-800' : 'text-blue-800'}`}>
                      {company.trial_ends_at 
                        ? `Période d'essai active jusqu'au ${formatDate(company.trial_ends_at)}`
                        : "Cette entreprise n'est actuellement pas en période d'essai."
                      }
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label>Accorder une période d'essai</Label>
                      <div className="flex gap-2 mt-1">
                        <Input type="number" placeholder="Nombre de jours" className="w-32" />
                        <Button variant="outline">Appliquer</Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        L'entreprise aura accès à toutes les fonctionnalités pendant cette période
                      </p>
                    </div>
                    
                    <div>
                      <Button variant="outline">
                        Convertir en abonnement payant
                      </Button>
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

export default CompanySubscriptionPage;