import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Users, Building, Globe, Palette, Activity, DollarSign, Leaf } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';

interface CompanyDetailsDialogProps {
  company: any;
  isOpen: boolean;
  onClose: () => void;
}

const CompanyDetailsDialog: React.FC<CompanyDetailsDialogProps> = ({
  company,
  isOpen,
  onClose
}) => {
  if (!company) return null;

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'trial': { label: 'Période d\'essai', variant: 'secondary' as const },
      'active': { label: 'Actif', variant: 'default' as const },
      'suspended': { label: 'Suspendu', variant: 'destructive' as const },
      'cancelled': { label: 'Annulé', variant: 'outline' as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPlanBadge = (plan: string) => {
    const planColors = {
      'starter': 'bg-blue-100 text-blue-800',
      'professional': 'bg-purple-100 text-purple-800',
      'enterprise': 'bg-orange-100 text-orange-800'
    };
    
    return (
      <Badge className={planColors[plan as keyof typeof planColors] || planColors.starter}>
        {plan?.charAt(0).toUpperCase() + plan?.slice(1) || 'Starter'}
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {company.logo_url && (
              <img 
                src={company.logo_url} 
                alt={company.name}
                className="w-8 h-8 rounded object-cover"
              />
            )}
            <span>{company.name}</span>
            {getStatusBadge(company.account_status)}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
              <TabsTrigger value="subscription">Abonnement</TabsTrigger>
              <TabsTrigger value="users">Utilisateurs</TabsTrigger>
              <TabsTrigger value="activity">Activité</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Informations générales
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Nom</label>
                      <p className="text-sm">{company.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Slug</label>
                      <p className="text-sm font-mono bg-muted px-2 py-1 rounded">{company.slug || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Créée le</label>
                      <p className="text-sm">{formatDate(company.created_at)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Administrateur principal</label>
                      <p className="text-sm">
                        {company.primary_admin ? 
                          `${company.primary_admin.first_name} ${company.primary_admin.last_name}` : 
                          'N/A'
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {company.primary_admin?.email || 'Email non disponible'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Personnalisation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Couleur primaire</label>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: company.primary_color || '#3b82f6' }}
                        />
                        <span className="text-sm font-mono">{company.primary_color || '#3b82f6'}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Couleur secondaire</label>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: company.secondary_color || '#64748b' }}
                        />
                        <span className="text-sm font-mono">{company.secondary_color || '#64748b'}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Domaine personnalisé</label>
                      <p className="text-sm">{company.custom_domain || 'Non configuré'}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="text-center">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-primary">{company.user_count || 0}</div>
                    <p className="text-xs text-muted-foreground">Utilisateurs</p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">{company.clients_count || 0}</div>
                    <p className="text-xs text-muted-foreground">Clients</p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-blue-600">{company.devices_count || 0}</div>
                    <p className="text-xs text-muted-foreground">Équipements</p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-emerald-600">{company.co2_saved || 0}kg</div>
                    <p className="text-xs text-muted-foreground">CO2 économisé</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="subscription" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Détails de l'abonnement
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Plan actuel</label>
                      <div className="mt-1">
                        {getPlanBadge(company.plan)}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Statut</label>
                      <div className="mt-1">
                        {getStatusBadge(company.account_status)}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Période d'essai</label>
                      <p className="text-sm">
                        {company.trial_ends_at ? 
                          `Expire le ${formatDate(company.trial_ends_at)}` : 
                          'Aucune'
                        }
                      </p>
                    </div>
                  </div>

                  {company.subscription_ends_at && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Fin d'abonnement</label>
                      <p className="text-sm">{formatDate(company.subscription_ends_at)}</p>
                    </div>
                  )}

                  {company.stripe_customer_id && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">ID Client Stripe</label>
                      <p className="text-sm font-mono bg-muted px-2 py-1 rounded">
                        {company.stripe_customer_id}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Gestion des utilisateurs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Fonctionnalité de gestion des utilisateurs</p>
                    <p className="text-sm">À implémenter</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Activité récente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Journal d'activité</p>
                    <p className="text-sm">À implémenter</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompanyDetailsDialog;