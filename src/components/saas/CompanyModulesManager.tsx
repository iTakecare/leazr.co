import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Settings,
  Users,
  CreditCard,
  BarChart3,
  FileText,
  Headphones,
  Monitor,
  Globe,
  TrendingUp,
  Brain,
  Server,
  Crown,
  Loader2
} from 'lucide-react';
import { updateCompanyModules } from '@/services/companyModulesService';

interface CompanyModulesManagerProps {
  company: any;
  onModulesChange?: (modules: string[]) => void;
}

const AVAILABLE_MODULES = [
  // Core modules
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Tableau de bord principal avec analytics',
    icon: BarChart3,
    category: 'core',
    requiredPlan: 'starter',
    price: 0
  },
  {
    id: 'clients',
    name: 'Gestion Clients',
    description: 'CRM et gestion des clients',
    icon: Users,
    category: 'core',
    requiredPlan: 'starter',
    price: 0
  },
  {
    id: 'contracts',
    name: 'Contrats',
    description: 'Gestion des contrats et documents',
    icon: FileText,
    category: 'core',
    requiredPlan: 'starter',
    price: 0
  },
  
  // Business modules
  {
    id: 'equipment',
    name: 'Équipements',
    description: 'Gestion du parc d\'équipements',
    icon: Monitor,
    category: 'business',
    requiredPlan: 'professional',
    price: 19
  },
  {
    id: 'public_catalog',
    name: 'Catalogue Public',
    description: 'Catalogue produits en ligne',
    icon: Globe,
    category: 'business',
    requiredPlan: 'professional',
    price: 29
  },
  {
    id: 'calculator',
    name: 'Calculateur',
    description: 'Calculateur de prix et devis',
    icon: TrendingUp,
    category: 'business',
    requiredPlan: 'professional',
    price: 15
  },
  
  // Advanced modules
  {
    id: 'ai_assistant',
    name: 'Assistant IA',
    description: 'Assistant intelligent pour l\'automatisation',
    icon: Brain,
    category: 'advanced',
    requiredPlan: 'enterprise',
    price: 49
  },
  {
    id: 'fleet_generator',
    name: 'Générateur de Parc',
    description: 'Génération automatique de parcs d\'équipements',
    icon: Server,
    category: 'advanced',
    requiredPlan: 'enterprise',
    price: 39
  },
  {
    id: 'support',
    name: 'SAV & Support',
    description: 'Module de support client avancé',
    icon: Headphones,
    category: 'business',
    requiredPlan: 'professional',
    price: 25
  }
];

const CompanyModulesManager: React.FC<CompanyModulesManagerProps> = ({
  company,
  onModulesChange
}) => {
  const [enabledModules, setEnabledModules] = useState<string[]>(company?.modules_enabled || []);
  const [isLoading, setIsLoading] = useState(false);
  const [updatingModule, setUpdatingModule] = useState<string | null>(null);

  useEffect(() => {
    setEnabledModules(company?.modules_enabled || []);
  }, [company?.modules_enabled]);

  const handleModuleToggle = async (moduleId: string, enabled: boolean) => {
    setUpdatingModule(moduleId);
    setIsLoading(true);

    try {
      const newModules = enabled 
        ? [...enabledModules, moduleId]
        : enabledModules.filter(m => m !== moduleId);

      const response = await updateCompanyModules(company.id, newModules);

      if (response.success) {
        setEnabledModules(newModules);
        onModulesChange?.(newModules);
        toast.success(`Module ${enabled ? 'activé' : 'désactivé'} avec succès`);
      } else {
        toast.error(response.message || 'Erreur lors de la mise à jour du module');
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du module:', error);
      toast.error('Erreur lors de la mise à jour du module');
    } finally {
      setIsLoading(false);
      setUpdatingModule(null);
    }
  };

  const isModuleAvailable = (module: any) => {
    const planHierarchy = { starter: 1, professional: 2, enterprise: 3 };
    const currentPlanLevel = planHierarchy[company.plan as keyof typeof planHierarchy] || 1;
    const requiredPlanLevel = planHierarchy[module.requiredPlan as keyof typeof planHierarchy] || 1;
    return currentPlanLevel >= requiredPlanLevel;
  };

  const getCategoryModules = (category: string) => {
    return AVAILABLE_MODULES.filter(module => module.category === category);
  };

  const getCategoryTitle = (category: string) => {
    const titles = {
      core: 'Modules Core',
      business: 'Modules Business',
      advanced: 'Modules Avancés'
    };
    return titles[category as keyof typeof titles] || category;
  };

  const getTotalModulePrice = () => {
    return AVAILABLE_MODULES
      .filter(module => enabledModules.includes(module.id))
      .reduce((total, module) => total + module.price, 0);
  };

  const renderModuleCard = (module: any) => {
    const isEnabled = enabledModules.includes(module.id);
    const isAvailable = isModuleAvailable(module);
    const isUpdating = updatingModule === module.id;
    const IconComponent = module.icon;

    return (
      <Card key={module.id} className={`transition-all ${!isAvailable ? 'opacity-60' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <IconComponent className="h-5 w-5 text-primary" />
              <div>
                <h4 className="font-medium">{module.name}</h4>
                <p className="text-sm text-muted-foreground">{module.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {module.price > 0 && (
                <Badge variant="secondary" className="text-xs">
                  +{module.price}€/mois
                </Badge>
              )}
              {!isAvailable && (
                <Badge variant="outline" className="text-xs">
                  <Crown className="h-3 w-3 mr-1" />
                  {module.requiredPlan}
                </Badge>
              )}
              <Switch
                checked={isEnabled}
                onCheckedChange={(checked) => handleModuleToggle(module.id, checked)}
                disabled={!isAvailable || isUpdating}
              />
              {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Résumé des modules actifs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Résumé des modules - {company.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {enabledModules.length}
              </div>
              <p className="text-sm text-muted-foreground">Modules actifs</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                +{getTotalModulePrice()}€
              </div>
              <p className="text-sm text-muted-foreground">Coût mensuel additionnel</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {company.plan?.charAt(0).toUpperCase() + company.plan?.slice(1)}
              </div>
              <p className="text-sm text-muted-foreground">Plan actuel</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modules par catégorie */}
      {['core', 'business', 'advanced'].map((category) => {
        const categoryModules = getCategoryModules(category);
        if (categoryModules.length === 0) return null;

        return (
          <div key={category}>
            <h3 className="text-lg font-semibold mb-4">{getCategoryTitle(category)}</h3>
            <div className="grid grid-cols-1 gap-3">
              {categoryModules.map(renderModuleCard)}
            </div>
            {category !== 'advanced' && <Separator className="my-6" />}
          </div>
        );
      })}

      {/* Actions rapides */}
      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            onClick={() => {
              const coreModules = AVAILABLE_MODULES
                .filter(m => m.category === 'core' && isModuleAvailable(m))
                .map(m => m.id);
              
              Promise.all(
                coreModules.map(moduleId => 
                  handleModuleToggle(moduleId, !enabledModules.includes(moduleId))
                )
              );
            }}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Traitement...' : 'Activer tous les modules Core'}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => {
              Promise.all(
                enabledModules.map(moduleId => 
                  handleModuleToggle(moduleId, false)
                )
              );
            }}
            disabled={isLoading || enabledModules.length === 0}
            className="w-full"
          >
            {isLoading ? 'Traitement...' : 'Désactiver tous les modules'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanyModulesManager;