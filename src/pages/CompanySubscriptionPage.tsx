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
  Clock
} from "lucide-react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { motion } from "framer-motion";

// Mock data
const mockSubscriptionData = {
  company: {
    id: '1',
    name: 'TechCorp Solutions',
    plan: 'business',
    account_status: 'active',
    monthly_price: 299,
    subscription_ends_at: '2024-12-31T23:59:59Z',
    trial_ends_at: null,
    created_at: '2024-01-15T10:00:00Z'
  },
  billing_history: [
    { id: '1', date: '2024-01-15', amount: 299, status: 'paid', invoice_url: '#' },
    { id: '2', date: '2023-12-15', amount: 299, status: 'paid', invoice_url: '#' },
    { id: '3', date: '2023-11-15', amount: 299, status: 'paid', invoice_url: '#' },
  ],
  available_plans: [
    { id: 'starter', name: 'Starter', price: 49, features: ['5 utilisateurs', 'CRM de base'] },
    { id: 'pro', name: 'Pro', price: 149, features: ['20 utilisateurs', 'CRM avancé', 'Analytics'] },
    { id: 'business', name: 'Business', price: 299, features: ['50 utilisateurs', 'Toutes fonctionnalités'] },
    { id: 'enterprise', name: 'Enterprise', price: 599, features: ['Utilisateurs illimités', 'Support dédié'] }
  ],
  modules: [
    { id: 'crm', name: 'CRM Avancé', price: 29, enabled: true },
    { id: 'analytics', name: 'Analytics', price: 39, enabled: true },
    { id: 'automation', name: 'Automation', price: 49, enabled: false },
    { id: 'api', name: 'API Access', price: 19, enabled: false }
  ]
};

const CompanySubscriptionPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState(mockSubscriptionData.company.plan);
  
  const subscription = mockSubscriptionData;

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
    console.log('Changement de plan vers:', selectedPlan);
    // TODO: Implement API call
  };

  const handleModuleToggle = async (moduleId: string) => {
    console.log('Toggle module:', moduleId);
    // TODO: Implement API call
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
              <p className="text-muted-foreground">{subscription.company.name}</p>
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
                  <p className="text-xl font-bold capitalize">{subscription.company.plan}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Prix mensuel</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(subscription.company.monthly_price)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Statut</p>
                  <Badge variant="default">Actif</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fin d'abonnement</p>
                  <p className="text-lg font-semibold">{formatDate(subscription.company.subscription_ends_at)}</p>
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
                        {subscription.available_plans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name} - {formatCurrency(plan.price)}/mois
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Plans disponibles */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {subscription.available_plans.map((plan) => (
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
                    <Button onClick={handlePlanChange} disabled={selectedPlan === subscription.company.plan}>
                      Appliquer le changement
                    </Button>
                    {selectedPlan !== subscription.company.plan && (
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
                    {subscription.modules.map((module) => (
                      <div key={module.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{module.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(module.price)}/mois par module
                          </p>
                        </div>
                        <Switch 
                          checked={module.enabled} 
                          onCheckedChange={() => handleModuleToggle(module.id)}
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
                    {subscription.billing_history.map((bill) => (
                      <div key={bill.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-medium">{formatDate(bill.date)}</p>
                            <p className="text-sm text-muted-foreground">Facture #{bill.id}</p>
                          </div>
                          <div>
                            <p className="font-semibold">{formatCurrency(bill.amount)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(bill.status)}
                          <Button variant="outline" size="sm">
                            Télécharger
                          </Button>
                        </div>
                      </div>
                    ))}
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
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      Cette entreprise n'est actuellement pas en période d'essai.
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