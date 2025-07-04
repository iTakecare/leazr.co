import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Settings, ExternalLink, Zap, Building2 } from 'lucide-react';
import BillitIntegrationSettings from './BillitIntegrationSettings';

interface Integration {
  id: string;
  name: string;
  description: string;
  logoUrl: string;
  status: 'active' | 'inactive' | 'available';
  category: string;
  comingSoon?: boolean;
}

const integrations: Integration[] = [
  // Facturation
  {
    id: 'billit',
    name: 'Billit',
    description: 'Automatisez votre facturation et synchronisez vos données comptables',
    logoUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/billit.svg',
    status: 'available',
    category: 'Facturation'
  },
  
  // ERP
  {
    id: 'odoo',
    name: 'Odoo',
    description: 'ERP complet pour la gestion d\'entreprise et CRM',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/50/Odoo_logo.svg',
    status: 'inactive',
    category: 'ERP',
    comingSoon: true
  },
  {
    id: 'microsoft-dynamics',
    name: 'Microsoft Dynamics 365',
    description: 'Suite ERP et CRM intégrée de Microsoft',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/96/Microsoft_logo_%282012%29.svg',
    status: 'inactive',
    category: 'ERP',
    comingSoon: true
  },
  {
    id: 'sap',
    name: 'SAP Business One',
    description: 'ERP pour petites et moyennes entreprises',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/59/SAP_2011_logo.svg',
    status: 'inactive',
    category: 'ERP',
    comingSoon: true
  },
  {
    id: 'teamleader',
    name: 'Teamleader',
    description: 'CRM, facturation et gestion de projets pour PME (très populaire en Belgique)',
    logoUrl: '/lovable-uploads/52ac938f-82c5-49f9-907b-41009e38278b.png',
    status: 'inactive',
    category: 'ERP',
    comingSoon: true
  },
  {
    id: 'horus',
    name: 'Horus',
    description: 'Logiciel comptable innovant pour fiduciaires et entreprises',
    logoUrl: 'https://www.horussoftware.be/themes/horus/assets/images/logo.png',
    status: 'inactive',
    category: 'ERP',
    comingSoon: true
  },
  
  // Comptabilité
  {
    id: 'cegid',
    name: 'Cegid',
    description: 'Solution comptable et de gestion intégrée',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/fr/7/7e/Logo_Cegid.svg',
    status: 'inactive',
    category: 'Comptabilité',
    comingSoon: true
  },
  {
    id: 'sage',
    name: 'Sage',
    description: 'Logiciel de comptabilité et paie pour entreprises',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/0/0c/Sage_Group_logo.svg',
    status: 'inactive',
    category: 'Comptabilité',
    comingSoon: true
  },
  {
    id: 'sage-bob',
    name: 'Sage BOB',
    description: 'Solution comptable très populaire en Belgique et Luxembourg',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/0/0c/Sage_Group_logo.svg',
    status: 'inactive',
    category: 'Comptabilité',
    comingSoon: true
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    description: 'Comptabilité simplifiée pour PME',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/QuickBooks_logo.svg',
    status: 'inactive',
    category: 'Comptabilité',
    comingSoon: true
  },
  {
    id: 'yuki',
    name: 'Yuki',
    description: 'Logiciel de comptabilité en ligne populaire en Belgique et Pays-Bas',
    logoUrl: 'https://www.yuki.nl/wp-content/uploads/2020/02/Yuki-logo.svg',
    status: 'inactive',
    category: 'Comptabilité',
    comingSoon: true
  },
  {
    id: 'ebp',
    name: 'EBP',
    description: 'Logiciels de gestion français très populaires auprès des PME',
    logoUrl: 'https://www.ebp.com/themes/ebp/assets/img/logo-ebp.svg',
    status: 'inactive',
    category: 'Comptabilité',
    comingSoon: true
  },
  {
    id: 'ciel',
    name: 'Ciel',
    description: 'Solutions de comptabilité et paie françaises',
    logoUrl: 'https://www.ciel.com/wp-content/themes/ciel/img/logo-ciel.svg',
    status: 'inactive',
    category: 'Comptabilité',
    comingSoon: true
  },
  {
    id: 'exact',
    name: 'Exact',
    description: 'Solutions ERP et comptables populaires en Belgique',
    logoUrl: 'https://www.exact.com/images/logos/exact-logo.svg',
    status: 'inactive',
    category: 'Comptabilité',
    comingSoon: true
  },
  {
    id: 'pennylane',
    name: 'Pennylane',
    description: 'Comptabilité automatisée nouvelle génération',
    logoUrl: 'https://pennylane.com/assets/images/logo.svg',
    status: 'inactive',
    category: 'Comptabilité',
    comingSoon: true
  },
  {
    id: 'inextens',
    name: 'Inextens',
    description: 'Gestion comptable et administrative française',
    logoUrl: 'https://www.inextens.fr/assets/img/logo-inextens.svg',
    status: 'inactive',
    category: 'Comptabilité',
    comingSoon: true
  },
  
  // CRM
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'CRM et gestion de la relation client',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f9/Salesforce.com_logo.svg',
    status: 'inactive',
    category: 'CRM',
    comingSoon: true
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'CRM et marketing automation',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/HubSpot_Logo.svg',
    status: 'inactive',
    category: 'CRM',
    comingSoon: true
  },
  {
    id: 'pipedrive',
    name: 'Pipedrive',
    description: 'CRM simple et efficace pour équipes commerciales',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/84/Pipedrive_logo.svg',
    status: 'inactive',
    category: 'CRM',
    comingSoon: true
  },
  {
    id: 'zoho',
    name: 'Zoho CRM',
    description: 'Suite CRM complète pour entreprises',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3a/Zoho_logo.svg',
    status: 'inactive',
    category: 'CRM',
    comingSoon: true
  },
  
  // Vérification d'entreprises
  {
    id: 'graydon-creditsafe',
    name: 'Graydon-CreditSafe',
    description: 'Vérification de solvabilité et données d\'entreprises (Belgique/France)',
    logoUrl: '/lovable-uploads/1aa14a0c-93f6-43b7-acbc-d219bbd9c46e.png',
    status: 'inactive',
    category: 'Vérification',
    comingSoon: true
  },
  {
    id: 'companyweb',
    name: 'Companyweb',
    description: 'Informations commerciales et analyse de fiabilité (Belgique)',
    logoUrl: '/lovable-uploads/325be1db-cf46-4253-90e1-4c26f02b267b.png',
    status: 'inactive',
    category: 'Vérification',
    comingSoon: true
  },
  
  // RH & Paie
  {
    id: 'lucca',
    name: 'Lucca',
    description: 'SIRH français pour gestion des talents et paie',
    logoUrl: 'https://www.lucca.fr/wp-content/themes/lucca/assets/images/logo-lucca.svg',
    status: 'inactive',
    category: 'RH & Paie',
    comingSoon: true
  },
  {
    id: 'silae',
    name: 'Silae',
    description: 'Solution de paie française populaire',
    logoUrl: 'https://www.silae.fr/assets/img/logo-silae.svg',
    status: 'inactive',
    category: 'RH & Paie',
    comingSoon: true
  },
  {
    id: 'payfit',
    name: 'PayFit',
    description: 'Gestion de paie simplifiée pour PME',
    logoUrl: '/lovable-uploads/56939bad-b11e-421e-8dca-13f8a485973b.png',
    status: 'inactive',
    category: 'RH & Paie',
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
                       <div className="w-8 h-8 flex items-center justify-center relative">
                          <img 
                            src={integration.logoUrl} 
                            alt={`${integration.name} logo`} 
                            className="w-8 h-8 object-contain"
                            onError={(e) => {
                              // Si le logo ne se charge pas, afficher un fallback textuel
                              const img = e.target as HTMLImageElement;
                              img.style.display = 'none';
                              const fallback = img.nextElementSibling as HTMLElement;
                              if (fallback) {
                                fallback.style.display = 'flex';
                              }
                            }}
                          />
                          <div 
                            className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-muted-foreground font-bold text-xs absolute top-0 left-0" 
                            style={{ display: 'none' }}
                          >
                            {integration.name.substring(0, 2).toUpperCase()}
                          </div>
                        </div>
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