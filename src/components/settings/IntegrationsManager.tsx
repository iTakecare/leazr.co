import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Settings, ExternalLink, Zap, Building2, Calculator } from 'lucide-react';
import BillitIntegrationSettings from './BillitIntegrationSettings';

interface Integration {
  id: string;
  name: string;
  description: string;
  logo: React.ReactNode;
  status: 'active' | 'inactive' | 'available';
  category: string;
  comingSoon?: boolean;
}

const integrations: Integration[] = [
  {
    id: 'billit',
    name: 'Billit',
    description: 'Automatisez votre facturation et synchronisez vos données comptables',
    logo: <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">B</div>,
    status: 'available',
    category: 'Facturation'
  },
  {
    id: 'odoo',
    name: 'Odoo',
    description: 'ERP complet pour la gestion d\'entreprise et CRM',
    logo: <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">O</div>,
    status: 'inactive',
    category: 'ERP',
    comingSoon: true
  },
  {
    id: 'cegid',
    name: 'Cegid',
    description: 'Solution comptable et de gestion intégrée',
    logo: <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">C</div>,
    status: 'inactive',
    category: 'Comptabilité',
    comingSoon: true
  },
  {
    id: 'sage',
    name: 'Sage',
    description: 'Logiciel de comptabilité et paie pour entreprises',
    logo: <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">S</div>,
    status: 'inactive',
    category: 'Comptabilité',
    comingSoon: true
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    description: 'Comptabilité simplifiée pour PME',
    logo: <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">Q</div>,
    status: 'inactive',
    category: 'Comptabilité',
    comingSoon: true
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'CRM et gestion de la relation client',
    logo: <div className="w-8 h-8 bg-blue-400 rounded-lg flex items-center justify-center text-white font-bold text-sm">SF</div>,
    status: 'inactive',
    category: 'CRM',
    comingSoon: true
  }
];

const getStatusBadge = (status: string, comingSoon?: boolean) => {
  if (comingSoon) {
    return <Badge variant="secondary">Bientôt disponible</Badge>;
  }
  
  switch (status) {
    case 'active':
      return <Badge className="bg-green-100 text-green-800">Activée</Badge>;
    case 'available':
      return <Badge variant="outline">Disponible</Badge>;
    case 'inactive':
    default:
      return <Badge variant="secondary">Non configurée</Badge>;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'active':
      return <Zap className="h-4 w-4 text-green-600" />;
    case 'available':
      return <Settings className="h-4 w-4 text-blue-600" />;
    case 'inactive':
    default:
      return <Settings className="h-4 w-4 text-gray-400" />;
  }
};

const IntegrationsManager = () => {
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);

  const handleConfigureIntegration = (integrationId: string) => {
    setSelectedIntegration(integrationId);
    setIsConfigDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsConfigDialogOpen(false);
    setSelectedIntegration(null);
  };

  const categories = [...new Set(integrations.map(int => int.category))];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Intégrations</h2>
        <p className="text-muted-foreground">
          Connectez votre système à des services externes pour automatiser vos processus métier.
        </p>
      </div>

      {categories.map(category => (
        <div key={category} className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">{category}</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.filter(int => int.category === category).map((integration) => (
              <Card key={integration.id} className="relative hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {integration.logo}
                      <div>
                        <CardTitle className="text-base">{integration.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusIcon(integration.status)}
                          {getStatusBadge(integration.status, integration.comingSoon)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <CardDescription className="text-sm mb-4">
                    {integration.description}
                  </CardDescription>
                  
                  <div className="flex gap-2">
                    <Button
                      variant={integration.comingSoon ? "secondary" : "outline"}
                      size="sm"
                      className="flex-1"
                      onClick={() => !integration.comingSoon && handleConfigureIntegration(integration.id)}
                      disabled={integration.comingSoon}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      {integration.comingSoon ? 'Bientôt' : 'Configurer'}
                    </Button>
                    
                    {!integration.comingSoon && (
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {/* Dialog de configuration */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Configuration - {integrations.find(int => int.id === selectedIntegration)?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4">
            {selectedIntegration === 'billit' && (
              <BillitIntegrationSettings />
            )}
            
            {selectedIntegration && selectedIntegration !== 'billit' && (
              <div className="text-center py-8">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Configuration à venir</h3>
                <p className="text-muted-foreground">
                  La configuration pour {integrations.find(int => int.id === selectedIntegration)?.name} sera disponible prochainement.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntegrationsManager;