
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Check, 
  Plus, 
  Edit, 
  Trash2, 
  Star,
  Users,
  Package,
  Zap
} from "lucide-react";

interface Plan {
  id: string;
  name: string;
  price: number;
  billingType: 'monthly' | 'yearly';
  description: string;
  features: string[];
  maxUsers: number;
  maxModules: number;
  popular: boolean;
  active: boolean;
  customizations: {
    support: string;
    storage: string;
    integrations: boolean;
    analytics: boolean;
    whitelabel: boolean;
  };
}

interface Module {
  id: string;
  name: string;
  description: string;
  priceStarter: number;
  pricePro: number;
  priceBusiness: number;
  isCore: boolean;
}

const SaaSPlansManager = () => {
  const [activeTab, setActiveTab] = useState<'plans' | 'modules'>('plans');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Plans d'abonnement
  const [plans, setPlans] = useState<Plan[]>([
    {
      id: '1',
      name: 'Starter',
      price: 49,
      billingType: 'monthly',
      description: 'Parfait pour débuter avec Leazr',
      features: [
        '1 module inclus',
        '1 utilisateur',
        'Support email',
        '1 GB de stockage',
        'Rapports de base'
      ],
      maxUsers: 1,
      maxModules: 1,
      popular: false,
      active: true,
      customizations: {
        support: 'Email',
        storage: '1 GB',
        integrations: false,
        analytics: false,
        whitelabel: false
      }
    },
    {
      id: '2',
      name: 'Pro',
      price: 149,
      billingType: 'monthly',
      description: 'Pour les équipes qui grandissent',
      features: [
        'Jusqu\'à 3 modules',
        '5 utilisateurs',
        'Support prioritaire',
        '10 GB de stockage',
        'Intégrations avancées',
        'Rapports détaillés'
      ],
      maxUsers: 5,
      maxModules: 3,
      popular: true,
      active: true,
      customizations: {
        support: 'Chat + Email',
        storage: '10 GB',
        integrations: true,
        analytics: true,
        whitelabel: false
      }
    },
    {
      id: '3',
      name: 'Business',
      price: 299,
      billingType: 'monthly',
      description: 'Pour les grandes organisations',
      features: [
        'Tous les modules',
        '10 utilisateurs',
        'Support dédié',
        '50 GB de stockage',
        'Personnalisation avancée',
        'White-label',
        'API complète'
      ],
      maxUsers: 10,
      maxModules: -1,
      popular: false,
      active: true,
      customizations: {
        support: 'Dédié',
        storage: '50 GB',
        integrations: true,
        analytics: true,
        whitelabel: true
      }
    }
  ]);

  // Modules disponibles
  const [modules] = useState<Module[]>([
    {
      id: '1',
      name: 'Calculateur Leasing',
      description: 'Outil de calcul et simulation de leasing',
      priceStarter: 0,
      pricePro: 0,
      priceBusiness: 0,
      isCore: true
    },
    {
      id: '2',
      name: 'Catalogue Produits',
      description: 'Gestion complète du catalogue produits',
      priceStarter: 0,
      pricePro: 0,
      priceBusiness: 0,
      isCore: true
    },
    {
      id: '3',
      name: 'CRM Client',
      description: 'Gestion de la relation client',
      priceStarter: 0,
      pricePro: 0,
      priceBusiness: 0,
      isCore: true
    },
    {
      id: '4',
      name: 'Assistant IA',
      description: 'Assistant intelligent pour optimiser les offres',
      priceStarter: 29,
      pricePro: 19,
      priceBusiness: 0,
      isCore: false
    },
    {
      id: '5',
      name: 'Générateur de Parc',
      description: 'Création automatique de parcs d\'équipements',
      priceStarter: 39,
      pricePro: 29,
      priceBusiness: 0,
      isCore: false
    },
    {
      id: '6',
      name: 'Contrats Avancés',
      description: 'Gestion complète des contrats et signatures',
      priceStarter: 49,
      pricePro: 39,
      priceBusiness: 0,
      isCore: false
    },
    {
      id: '7',
      name: 'SAV & Support',
      description: 'Module de support client intégré',
      priceStarter: 19,
      pricePro: 15,
      priceBusiness: 0,
      isCore: false
    }
  ]);

  const togglePlanStatus = (planId: string) => {
    setPlans(plans.map(plan => 
      plan.id === planId ? { ...plan, active: !plan.active } : plan
    ));
  };

  const togglePopular = (planId: string) => {
    setPlans(plans.map(plan => 
      plan.id === planId ? { ...plan, popular: !plan.popular } : plan
    ));
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Plans & Tarifs</h2>
          <p className="text-muted-foreground">Configuration des plans d'abonnement et modules</p>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <Button 
          variant={activeTab === 'plans' ? 'default' : 'ghost'} 
          size="sm"
          onClick={() => setActiveTab('plans')}
        >
          <Package className="h-4 w-4 mr-2" />
          Plans d'abonnement
        </Button>
        <Button 
          variant={activeTab === 'modules' ? 'default' : 'ghost'} 
          size="sm"
          onClick={() => setActiveTab('modules')}
        >
          <Zap className="h-4 w-4 mr-2" />
          Modules
        </Button>
      </div>

      {/* Plans d'abonnement */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className={`relative ${plan.popular ? 'ring-2 ring-purple-500' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-purple-500 text-white">
                      <Star className="h-3 w-3 mr-1" />
                      Plus populaire
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      <CardDescription className="mt-2">{plan.description}</CardDescription>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Switch 
                        checked={plan.active} 
                        onCheckedChange={() => togglePlanStatus(plan.id)}
                      />
                      <Label className="text-xs">Actif</Label>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold">{plan.price}€</span>
                      <span className="text-muted-foreground ml-1">/mois</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{plan.maxUsers} utilisateur{plan.maxUsers > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center">
                      <Package className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{plan.maxModules === -1 ? 'Illimité' : plan.maxModules} modules</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Fonctionnalités incluses:</Label>
                    <ul className="space-y-1">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm">
                          <Check className="h-3 w-3 mr-2 text-green-600" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm">Plan populaire</Label>
                      <Switch 
                        checked={plan.popular} 
                        onCheckedChange={() => togglePopular(plan.id)}
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit className="h-3 w-3 mr-1" />
                        Modifier
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Ajouter un nouveau plan</CardTitle>
              <CardDescription>Créer un plan d'abonnement personnalisé</CardDescription>
            </CardHeader>
            <CardContent>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau plan
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modules */}
      {activeTab === 'modules' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Modules disponibles</CardTitle>
              <CardDescription>Configuration des modules et de leur tarification par plan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {modules.map((module) => (
                  <div key={module.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div>
                          <h4 className="font-medium">{module.name}</h4>
                          <p className="text-sm text-muted-foreground">{module.description}</p>
                        </div>
                        {module.isCore && (
                          <Badge variant="secondary">Module principal</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Starter</div>
                          <div className="font-medium">
                            {module.priceStarter === 0 ? 'Inclus' : `+${module.priceStarter}€`}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Pro</div>
                          <div className="font-medium">
                            {module.pricePro === 0 ? 'Inclus' : `+${module.pricePro}€`}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Business</div>
                          <div className="font-medium">
                            {module.priceBusiness === 0 ? 'Inclus' : `+${module.priceBusiness}€`}
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Edit className="h-3 w-3 mr-1" />
                        Modifier
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ajouter un nouveau module</CardTitle>
              <CardDescription>Créer un module personnalisé avec tarification</CardDescription>
            </CardHeader>
            <CardContent>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau module
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SaaSPlansManager;
