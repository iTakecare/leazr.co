import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Settings,
  Users,
  Building2,
  CreditCard,
  BarChart3,
  Package,
  FileText,
  Calendar,
  Calculator,
  Brain,
  Headphones,
  Server,
  Monitor,
  Globe,
  Search,
  History
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { updateCompanyModules, getCompanyModuleHistory } from "@/services/companyModulesService";

interface Module {
  slug: string;
  name: string;
  description: string;
  icon: any;
  requiredPlan: string;
  status: 'stable' | 'beta' | 'deprecated';
  category: 'core' | 'business' | 'advanced';
}

interface Company {
  id: string;
  name: string;
  slug: string;
  plan: string;
  modules_enabled: string[];
  is_active: boolean;
}

interface ModuleHistory {
  id: string;
  created_at: string;
  plan: string;
  modules_enabled: string[];
  notes: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

const availableModules: Module[] = [
  { slug: 'dashboard', name: 'Tableau de bord', description: 'Vue d\'ensemble des KPI', icon: BarChart3, requiredPlan: 'starter', status: 'stable', category: 'core' },
  { slug: 'clients', name: 'Gestion Clients', description: 'CRM et gestion des clients', icon: Users, requiredPlan: 'starter', status: 'stable', category: 'core' },
  { slug: 'offers', name: 'Devis & Demandes', description: 'Création et gestion des devis', icon: FileText, requiredPlan: 'pro', status: 'stable', category: 'business' },
  { slug: 'leasing', name: 'Contrats Leasing', description: 'Gestion des contrats de leasing', icon: Building2, requiredPlan: 'pro', status: 'stable', category: 'business' },
  { slug: 'invoicing', name: 'Facturation', description: 'Gestion des factures', icon: CreditCard, requiredPlan: 'pro', status: 'stable', category: 'business' },
  { slug: 'catalog', name: 'Catalogue', description: 'Catalogue de produits', icon: Package, requiredPlan: 'starter', status: 'stable', category: 'core' },
  { slug: 'planning', name: 'Planning', description: 'Planification des interventions', icon: Calendar, requiredPlan: 'pro', status: 'beta', category: 'business' },
  { slug: 'chat', name: 'Chat Admin', description: 'Support client intégré', icon: Headphones, requiredPlan: 'enterprise', status: 'stable', category: 'advanced' },
  { slug: 'calculator', name: 'Calculateur', description: 'Outils de calcul avancés', icon: Calculator, requiredPlan: 'pro', status: 'beta', category: 'business' },
  { slug: 'ai_assistant', name: 'Assistant IA', description: 'Intelligence artificielle intégrée', icon: Brain, requiredPlan: 'enterprise', status: 'beta', category: 'advanced' },
  { slug: 'fleet_generator', name: 'Générateur de Parc', description: 'Génération automatique de parcs', icon: Server, requiredPlan: 'enterprise', status: 'beta', category: 'advanced' },
  { slug: 'equipment', name: 'Équipements', description: 'Gestion des équipements', icon: Monitor, requiredPlan: 'pro', status: 'stable', category: 'business' },
  { slug: 'public_catalog', name: 'Catalogue Public', description: 'Catalogue accessible publiquement', icon: Globe, requiredPlan: 'pro', status: 'stable', category: 'business' },
  { slug: 'support', name: 'SAV & Support', description: 'Service après-vente', icon: Settings, requiredPlan: 'pro', status: 'stable', category: 'business' },
];

const planHierarchy = ['starter', 'pro', 'enterprise'];

const SaaSModulesManager = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [moduleHistory, setModuleHistory] = useState<ModuleHistory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, slug, plan, modules_enabled, is_active')
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les entreprises"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchModuleHistory = async (companyId: string) => {
    const history = await getCompanyModuleHistory(companyId);
    setModuleHistory(history);
  };

  const handleCompanySelect = (company: Company) => {
    setSelectedCompany(company);
    setShowHistory(false);
    fetchModuleHistory(company.id);
  };

  const handleModuleToggle = async (moduleSlug: string, enabled: boolean) => {
    if (!selectedCompany) return;
    
    const currentModules = selectedCompany.modules_enabled || [];
    let newModules: string[];

    if (enabled) {
      newModules = [...currentModules, moduleSlug];
    } else {
      newModules = currentModules.filter(m => m !== moduleSlug);
    }

    setUpdating(true);
    try {
      const result = await updateCompanyModules(selectedCompany.id, newModules);
      
      if (result.success) {
        setSelectedCompany({
          ...selectedCompany,
          modules_enabled: result.modules_enabled || newModules
        });
        
        // Refresh companies list
        fetchCompanies();
        fetchModuleHistory(selectedCompany.id);
      }
    } catch (error) {
      console.error('Error updating modules:', error);
    } finally {
      setUpdating(false);
    }
  };

  const isModuleAvailable = (module: Module, plan: string) => {
    const planIndex = planHierarchy.indexOf(plan);
    const requiredIndex = planHierarchy.indexOf(module.requiredPlan);
    return planIndex >= requiredIndex;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'stable': return 'bg-green-50 text-green-700 border-green-200';
      case 'beta': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'deprecated': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'core': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'business': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'advanced': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.slug?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Modules</h2>
          <p className="text-muted-foreground">Configurez les modules disponibles pour chaque entreprise</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste des entreprises */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Entreprises
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredCompanies.map((company) => (
                  <div
                    key={company.id}
                    onClick={() => handleCompanySelect(company)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedCompany?.id === company.id
                        ? 'bg-primary/5 border-primary'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{company.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {company.slug || 'Pas de slug'}
                        </p>
                      </div>
                      <div className="ml-2 flex flex-col items-end gap-1">
                        <Badge variant="outline" className="text-xs">
                          {company.plan}
                        </Badge>
                        <Badge 
                          variant={company.is_active ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {company.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {company.modules_enabled?.length || 0} modules activés
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Configuration des modules */}
        <div className="lg:col-span-2">
          {selectedCompany ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Modules - {selectedCompany.name}
                    </CardTitle>
                    <CardDescription>
                      Plan: {selectedCompany.plan} • {selectedCompany.modules_enabled?.length || 0} modules activés
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHistory(!showHistory)}
                  >
                    <History className="h-4 w-4 mr-2" />
                    Historique
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showHistory ? (
                  <div className="space-y-4">
                    <h3 className="font-medium">Historique des modifications</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {moduleHistory.map((entry) => (
                        <div key={entry.id} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div className="text-sm">
                              <span className="font-medium">
                                {entry.profiles.first_name} {entry.profiles.last_name}
                              </span>
                              <span className="text-muted-foreground ml-2">
                                {new Date(entry.created_at).toLocaleDateString('fr-FR', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <Badge variant="outline">{entry.plan}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Modules: {entry.modules_enabled.join(', ')}
                          </div>
                          {entry.notes && (
                            <div className="text-sm text-muted-foreground mt-1">
                              Note: {entry.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {['core', 'business', 'advanced'].map((category) => {
                      const categoryModules = availableModules.filter(m => m.category === category);
                      
                      return (
                        <div key={category}>
                          <div className="flex items-center gap-2 mb-3">
                            <Badge className={getCategoryColor(category)}>
                              {category === 'core' ? 'Modules Essentiels' : 
                               category === 'business' ? 'Modules Business' : 'Modules Avancés'}
                            </Badge>
                          </div>
                          <div className="grid gap-3">
                            {categoryModules.map((module) => {
                              const IconComponent = module.icon;
                              const isEnabled = selectedCompany.modules_enabled?.includes(module.slug) || false;
                              const isAvailable = isModuleAvailable(module, selectedCompany.plan);

                              return (
                                <div 
                                  key={module.slug}
                                  className={`p-4 border rounded-lg ${
                                    !isAvailable ? 'opacity-50 bg-muted/20' : ''
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <IconComponent className="h-5 w-5 text-muted-foreground" />
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">{module.name}</span>
                                          <Badge 
                                            variant="outline" 
                                            className={`text-xs ${getStatusColor(module.status)}`}
                                          >
                                            {module.status}
                                          </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                          {module.description}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className="text-xs text-muted-foreground">
                                            Requis: {module.requiredPlan}
                                          </span>
                                          {!isAvailable && (
                                            <Badge variant="destructive" className="text-xs">
                                              Plan insuffisant
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <Switch
                                      checked={isEnabled}
                                      onCheckedChange={(checked) => handleModuleToggle(module.slug, checked)}
                                      disabled={!isAvailable || updating}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {category !== 'advanced' && <Separator className="my-4" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Sélectionnez une entreprise</h3>
                  <p className="text-muted-foreground">
                    Choisissez une entreprise dans la liste pour configurer ses modules
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default SaaSModulesManager;