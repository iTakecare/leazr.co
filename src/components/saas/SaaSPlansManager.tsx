import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { useModules, useSaaSData } from "@/hooks/useSaaSData";

interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  maxUsers: number;
  maxModules: number;
  popular: boolean;
}

const SaaSPlansManager = () => {
  const [activeTab, setActiveTab] = useState<'plans' | 'modules'>('plans');
  const { modules, loading: modulesLoading } = useModules();
  const { companies } = useSaaSData();

  // Plans basés sur les vraies données Supabase
  const plans: Plan[] = [
    {
      id: 'starter',
      name: 'Starter',
      price: 49,
      description: 'Parfait pour débuter avec Leazr',
      features: [
        'Modules principaux inclus',
        '1 utilisateur',
        'Support email',
        '1 GB de stockage',
        'Rapports de base'
      ],
      maxUsers: 1,
      maxModules: 1,
      popular: false
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 149,
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
      popular: true
    },
    {
      id: 'business',
      name: 'Business',
      price: 299,
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
      popular: false
    }
  ];

  // Calculer les statistiques d'utilisation des plans
  const planStats = plans.map(plan => {
    const count = companies.filter(c => c.plan === plan.id).length;
    const activeCount = companies.filter(c => c.plan === plan.id && c.account_status === 'active').length;
    return {
      ...plan,
      totalUsers: count,
      activeUsers: activeCount,
      revenue: activeCount * plan.price
    };
  });

  if (modulesLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">Chargement des données...</div>
      </div>
    );
  }

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
            {planStats.map((plan) => (
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
                  </div>
                  <div className="mt-4">
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold">{plan.price}€</span>
                      <span className="text-muted-foreground ml-1">/mois</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Statistiques d'utilisation */}
                  <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
                    <div className="text-center">
                      <div className="text-lg font-bold">{plan.totalUsers}</div>
                      <div className="text-xs text-muted-foreground">Clients totaux</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">{plan.activeUsers}</div>
                      <div className="text-xs text-muted-foreground">Abonnés actifs</div>
                    </div>
                  </div>

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

                  <div className="pt-4 border-t">
                    <div className="text-center">
                      <div className="text-sm font-medium">Revenus mensuels</div>
                      <div className="text-lg font-bold text-green-600">{plan.revenue.toLocaleString('fr-FR')}€</div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit className="h-3 w-3 mr-1" />
                      Modifier
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Résumé des revenus */}
          <Card>
            <CardHeader>
              <CardTitle>Résumé financier</CardTitle>
              <CardDescription>Revenus par plan d'abonnement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {planStats.reduce((sum, plan) => sum + plan.revenue, 0).toLocaleString('fr-FR')}€
                  </div>
                  <div className="text-sm text-muted-foreground">Revenus totaux/mois</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {planStats.reduce((sum, plan) => sum + plan.activeUsers, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Abonnés actifs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {planStats.reduce((sum, plan) => sum + plan.totalUsers, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Clients totaux</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {((planStats.reduce((sum, plan) => sum + plan.activeUsers, 0) / 
                       planStats.reduce((sum, plan) => sum + plan.totalUsers, 0)) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Taux de conversion</div>
                </div>
              </div>
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
                          {module.features && module.features.length > 0 && (
                            <div className="mt-2">
                              <div className="text-xs text-muted-foreground">Fonctionnalités:</div>
                              <div className="text-xs">
                                {module.features.slice(0, 3).join(', ')}
                                {module.features.length > 3 && '...'}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          {module.is_core && (
                            <Badge variant="secondary">Module principal</Badge>
                          )}
                          {module.category && (
                            <Badge variant="outline">{module.category}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {module.price === 0 || module.is_core ? 'Inclus' : `${module.price}€/mois`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {module.is_core ? 'Dans tous les plans' : 'Module additionnel'}
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