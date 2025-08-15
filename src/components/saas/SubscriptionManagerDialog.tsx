import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreditCard, 
  Calendar, 
  TrendingUp, 
  Settings, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import CompanyModulesManager from './CompanyModulesManager';

interface SubscriptionManagerDialogProps {
  company: any;
  isOpen: boolean;
  onClose: () => void;
}

const SubscriptionManagerDialog: React.FC<SubscriptionManagerDialogProps> = ({
  company,
  isOpen,
  onClose
}) => {
  const [selectedPlan, setSelectedPlan] = useState(company?.plan || 'starter');
  const [isLoading, setIsLoading] = useState(false);

  if (!company) return null;

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: 29,
      features: ['5 utilisateurs', '100 clients', 'Support email']
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 99,
      features: ['25 utilisateurs', '1000 clients', 'Support prioritaire', 'API accès']
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 299,
      features: ['Utilisateurs illimités', 'Clients illimités', 'Support dédié', 'Intégrations avancées']
    }
  ];

  const handlePlanChange = async () => {
    setIsLoading(true);
    // Simulation d'un appel API
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false);
    console.log(`Plan changé de ${company.plan} vers ${selectedPlan} pour ${company.name}`);
    // TODO: Implémenter le changement de plan réel
  };

  const handleTrialExtension = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
    console.log(`Période d'essai prolongée pour ${company.name}`);
    // TODO: Implémenter la prolongation d'essai
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'trial':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'suspended':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      'active': 'Abonnement actif',
      'trial': 'Période d\'essai',
      'suspended': 'Suspendu',
      'cancelled': 'Annulé'
    };
    return labels[status as keyof typeof labels] || 'Statut inconnu';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <CreditCard className="h-5 w-5" />
            Gestion d'abonnement - {company.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
              <TabsTrigger value="plans">Plans & Tarifs</TabsTrigger>
              <TabsTrigger value="billing">Facturation</TabsTrigger>
              <TabsTrigger value="modules">Modules</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getStatusIcon(company.account_status)}
                    {getStatusLabel(company.account_status)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {company.plan?.charAt(0).toUpperCase() + company.plan?.slice(1) || 'Starter'}
                      </div>
                      <p className="text-sm text-muted-foreground">Plan actuel</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(99)} {/* TODO: Prix réel basé sur le plan */}
                      </div>
                      <p className="text-sm text-muted-foreground">Tarif mensuel</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {company.user_count || 0}
                      </div>
                      <p className="text-sm text-muted-foreground">Utilisateurs actifs</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {company.trial_ends_at ? 
                          Math.max(0, Math.ceil((new Date(company.trial_ends_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24))) :
                          'N/A'
                        }
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {company.trial_ends_at ? 'Jours d\'essai restants' : 'Pas d\'essai'}
                      </p>
                    </div>
                  </div>

                  {company.account_status === 'trial' && company.trial_ends_at && (
                    <Alert className="mt-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        La période d'essai expire le {formatDate(company.trial_ends_at)}. 
                        {new Date(company.trial_ends_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && (
                          <span className="font-semibold text-orange-600"> Action requise sous 7 jours.</span>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {company.account_status === 'trial' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Actions rapides</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button 
                      onClick={handleTrialExtension}
                      disabled={isLoading}
                      className="w-full"
                    >
                      {isLoading ? 'Traitement...' : 'Prolonger la période d\'essai (+7 jours)'}
                    </Button>
                    <Button variant="outline" className="w-full">
                      Convertir en abonnement payant
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="plans" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Changement de plan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Nouveau plan</label>
                    <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name} - {formatCurrency(plan.price)}/mois
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedPlan !== company.plan && (
                    <Alert>
                      <TrendingUp className="h-4 w-4" />
                      <AlertDescription>
                        Changement de plan de <strong>{company.plan}</strong> vers <strong>{selectedPlan}</strong>
                        <br />
                        <span className="text-sm text-muted-foreground">
                          Le changement sera effectif immédiatement avec calcul prorata.
                        </span>
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button 
                    onClick={handlePlanChange}
                    disabled={selectedPlan === company.plan || isLoading}
                    className="w-full"
                  >
                    {isLoading ? 'Application du changement...' : 'Appliquer le changement'}
                  </Button>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map((plan) => (
                  <Card key={plan.id} className={plan.id === company.plan ? 'ring-2 ring-primary' : ''}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {plan.name}
                        {plan.id === company.plan && (
                          <Badge>Actuel</Badge>
                        )}
                      </CardTitle>
                      <div className="text-2xl font-bold">{formatCurrency(plan.price)}<span className="text-sm font-normal">/mois</span></div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="billing" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Informations de facturation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">ID Client Stripe</label>
                      <p className="text-sm font-mono bg-muted px-2 py-1 rounded">
                        {company.stripe_customer_id || 'Non configuré'}
                      </p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">ID Abonnement Stripe</label>
                      <p className="text-sm font-mono bg-muted px-2 py-1 rounded">
                        {company.stripe_subscription_id || 'Non configuré'}
                      </p>
                    </div>

                    <div className="text-center py-8 text-muted-foreground">
                      <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Historique des factures</p>
                      <p className="text-sm">À implémenter avec l'API Stripe</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="modules" className="mt-4">
              <CompanyModulesManager 
                company={company} 
                onModulesChange={(modules) => {
                  // Optionnel: mettre à jour l'état local de l'entreprise
                  console.log('Modules mis à jour:', modules);
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionManagerDialog;