import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Settings, ExternalLink, Zap, Building2, Calculator, FileText, Users, CreditCard, Shield, Mail, Database } from 'lucide-react';
import BillitIntegrationSettings from './BillitIntegrationSettings';
import CompanyWebIntegrationSettings from './CompanyWebIntegrationSettings';

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
    logoUrl: 'https://www.billit.eu/media/zyrdvyth/billit_logo.png',
    status: 'available',
    category: 'Facturation'
  },
  
  // ERP
  {
    id: 'odoo',
    name: 'Odoo',
    description: 'ERP complet pour la gestion d\'entreprise et CRM',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a7/Odoo_Official_Logo.png',
    status: 'inactive',
    category: 'ERP',
    comingSoon: true
  },
  {
    id: 'microsoft-dynamics',
    name: 'Microsoft Dynamics 365',
    description: 'Suite ERP et CRM intégrée de Microsoft',
    logoUrl: 'https://logo.clearbit.com/microsoft.com',
    status: 'inactive',
    category: 'ERP',
    comingSoon: true
  },
  {
    id: 'sap',
    name: 'SAP Business One',
    description: 'ERP pour petites et moyennes entreprises',
    logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT0jOSrHlXnK_ohV9pqRJVAeA3-Ts3D0TuOwA&s',
    status: 'inactive',
    category: 'ERP',
    comingSoon: true
  },
  {
    id: 'teamleader',
    name: 'Teamleader',
    description: 'CRM, facturation et gestion de projets pour PME (très populaire en Belgique)',
    logoUrl: 'https://logo.clearbit.com/teamleader.eu',
    status: 'inactive',
    category: 'ERP',
    comingSoon: true
  },
  {
    id: 'horus',
    name: 'Horus',
    description: 'Logiciel comptable innovant pour fiduciaires et entreprises',
    logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQIUNkdJWoL7UaRtVwYEOj4Bpgkw4NPQ8WbkQ&s',
    status: 'inactive',
    category: 'ERP',
    comingSoon: true
  },
  {
    id: 'axonaut',
    name: 'Axonaut',
    description: 'Logiciel de gestion d\'entreprise français tout-en-un (CRM, facturation, devis)',
    logoUrl: 'https://axonaut.com/content/uploaded_images/_e04c-ca62-113b-af2a-fb34/axonaut-logopng.webp',
    status: 'inactive',
    category: 'ERP',
    comingSoon: true
  },
  
  // Comptabilité
  {
    id: 'cegid',
    name: 'Cegid',
    description: 'Logiciel de facturation et gestion commerciale',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/63/Cegid_logo_20182.png',
    status: 'inactive',
    category: 'Facturation',
    comingSoon: true
  },
  {
    id: 'sage',
    name: 'Sage',
    description: 'Logiciel de comptabilité et paie pour entreprises',
    logoUrl: '/lovable-uploads/80687613-504c-4f0a-bc2a-bd3c6eda03cc.png',
    status: 'inactive',
    category: 'Comptabilité',
    comingSoon: true
  },
  {
    id: 'sage-bob',
    name: 'Sage BOB',
    description: 'Solution comptable très populaire en Belgique et Luxembourg',
    logoUrl: '/lovable-uploads/80687613-504c-4f0a-bc2a-bd3c6eda03cc.png',
    status: 'inactive',
    category: 'Comptabilité',
    comingSoon: true
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    description: 'Comptabilité simplifiée pour PME',
    logoUrl: '/lovable-uploads/4e8b6089-26ce-40c6-8a44-46a8d28cc2cb.png',
    status: 'inactive',
    category: 'Comptabilité',
    comingSoon: true
  },
  {
    id: 'yuki',
    name: 'Yuki',
    description: 'Logiciel de comptabilité en ligne populaire en Belgique et Pays-Bas',
    logoUrl: 'https://www.bouwsoft.be/sites/default/files/styles/logo/public/uploads/images/logo-yuki.png?itok=m1ZZcqa8',
    status: 'inactive',
    category: 'Comptabilité',
    comingSoon: true
  },
  {
    id: 'ebp',
    name: 'EBP',
    description: 'Logiciels de gestion français très populaires auprès des PME',
    logoUrl: 'https://logo.clearbit.com/ebp.com',
    status: 'inactive',
    category: 'Comptabilité',
    comingSoon: true
  },
  {
    id: 'ciel',
    name: 'Ciel',
    description: 'Solutions de comptabilité et paie françaises',
    logoUrl: 'https://logo.clearbit.com/sage.com',
    status: 'inactive',
    category: 'Comptabilité',
    comingSoon: true
  },
  {
    id: 'exact',
    name: 'Exact',
    description: 'Solutions ERP et comptables populaires en Belgique',
    logoUrl: 'https://logo.clearbit.com/exact.com',
    status: 'inactive',
    category: 'Comptabilité',
    comingSoon: true
  },
  {
    id: 'pennylane',
    name: 'Pennylane',
    description: 'Comptabilité automatisée nouvelle génération',
    logoUrl: 'https://logo.clearbit.com/pennylane.com',
    status: 'inactive',
    category: 'Comptabilité',
    comingSoon: true
  },
  
  // Leasing
  {
    id: 'grenke',
    name: 'Grenke',
    description: 'Solutions de location financière pour équipements IT et professionnels',
    logoUrl: 'https://ad498fde-39d4-4047-b0b8-05fb528da9c9.supabase.co/storage/v1/object/public/leaser-logos/aa3535be-654f-4770-8d28-2397939fcb5c.png',
    status: 'inactive',
    category: 'Leasing',
    comingSoon: true
  },
  {
    id: 'atlance',
    name: 'Atlance',
    description: 'Spécialisé dans le leasing ICT et équipements numériques (Belgique, Pays-Bas, France)',
    logoUrl: 'https://ad498fde-39d4-4047-b0b8-05fb528da9c9.supabase.co/storage/v1/object/public/leaser-logos/2f7890fe-8be1-4435-ae4e-1a6717064066.gif',
    status: 'inactive',
    category: 'Leasing',
    comingSoon: true
  },
  {
    id: 'locam',
    name: 'Locam',
    description: 'Solutions de location et financement d\'équipements professionnels',
    logoUrl: 'https://logo.clearbit.com/locam.fr',
    status: 'inactive',
    category: 'Leasing',
    comingSoon: true
  },
  {
    id: 'bnp-paribas-leasing',
    name: 'BNP Paribas Leasing Solutions',
    description: 'Solutions de financement et leasing sur mesure pour entreprises',
    logoUrl: 'https://logo.clearbit.com/bnpparibas.com',
    status: 'inactive',
    category: 'Leasing',
    comingSoon: true
  },
  {
    id: 'bpce-equipment',
    name: 'BPCE Equipment Solutions',
    description: 'Financement locatif d\'équipements industriels (ex-SGEF)',
    logoUrl: 'https://logo.clearbit.com/groupebpce.fr',
    status: 'inactive',
    category: 'Leasing',
    comingSoon: true
  },
  {
    id: 'nbb-lease',
    name: 'NBB Lease',
    description: 'Acteur indépendant français du financement locatif (groupe Leasecom)',
    logoUrl: 'https://www.nbb-lease.fr/favicon.ico',
    status: 'inactive',
    category: 'Leasing',
    comingSoon: true
  },
  {
    id: 'leasecom',
    name: 'Leasecom',
    description: 'Créateur du Leasing Circulaire, location financière évolutive et responsable',
    logoUrl: 'https://www.leasecom.fr/favicon.ico',
    status: 'inactive',
    category: 'Leasing',
    comingSoon: true
  },
  {
    id: 'nanceo',
    name: 'Nanceo',
    description: 'Place de marché dédiée au financement des ventes B2B en leasing',
    logoUrl: 'https://logo.clearbit.com/nanceo.fr',
    status: 'inactive',
    category: 'Leasing',
    comingSoon: true
  },
  {
    id: 'lease-material',
    name: 'Lease Material',
    description: 'Spécialisé dans le financement locatif d\'équipements et matériels',
    logoUrl: 'https://leasematerial.com/favicon.ico',
    status: 'inactive',
    category: 'Leasing',
    comingSoon: true
  },
  {
    id: 'inextens',
    name: 'Inextens',
    description: 'Gestion comptable et administrative française',
    logoUrl: 'https://logo.clearbit.com/inextens.fr',
    status: 'inactive',
    category: 'Comptabilité',
    comingSoon: true
  },
  
  // CRM
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'CRM et gestion de la relation client',
    logoUrl: '/lovable-uploads/191b6bd3-c372-4888-82b7-3ce6e54d97b5.png',
    status: 'inactive',
    category: 'CRM',
    comingSoon: true
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'CRM et marketing automation',
    logoUrl: 'https://logo.clearbit.com/hubspot.com',
    status: 'inactive',
    category: 'CRM',
    comingSoon: true
  },
  {
    id: 'pipedrive',
    name: 'Pipedrive',
    description: 'CRM simple et efficace pour équipes commerciales',
    logoUrl: 'https://logo.clearbit.com/pipedrive.com',
    status: 'inactive',
    category: 'CRM',
    comingSoon: true
  },
  {
    id: 'zoho',
    name: 'Zoho CRM',
    description: 'Suite CRM complète pour entreprises',
    logoUrl: 'https://logo.clearbit.com/zoho.com',
    status: 'inactive',
    category: 'CRM',
    comingSoon: true
  },
  
  // Vérification d'entreprises
  {
    id: 'graydon-creditsafe',
    name: 'Graydon-CreditSafe',
    description: 'Vérification de solvabilité et données d\'entreprises (Belgique/France)',
    logoUrl: 'https://logo.clearbit.com/creditsafe.com',
    status: 'inactive',
    category: 'Vérification',
    comingSoon: true
  },
  {
    id: 'companyweb',
    name: 'Companyweb',
    description: 'Informations commerciales et analyse de fiabilité (Belgique)',
    logoUrl: 'https://logo.clearbit.com/companyweb.be',
    status: 'available',
    category: 'Vérification'
  },
  
  // RH & Paie
  {
    id: 'lucca',
    name: 'Lucca',
    description: 'SIRH français pour gestion des talents et paie',
    logoUrl: 'https://logo.clearbit.com/lucca.fr',
    status: 'inactive',
    category: 'RH & Paie',
    comingSoon: true
  },
  {
    id: 'silae',
    name: 'Silae',
    description: 'Solution de paie française populaire',
    logoUrl: 'https://logo.clearbit.com/silae.fr',
    status: 'inactive',
    category: 'RH & Paie',
    comingSoon: true
  },
  {
    id: 'payfit',
    name: 'PayFit',
    description: 'Gestion de paie simplifiée pour PME',
    logoUrl: 'https://logo.clearbit.com/payfit.com',
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

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Facturation':
      return <FileText className="h-6 w-6 text-blue-600" />;
    case 'ERP':
      return <Building2 className="h-6 w-6 text-purple-600" />;
    case 'Comptabilité':
      return <Calculator className="h-6 w-6 text-green-600" />;
    case 'CRM':
      return <Users className="h-6 w-6 text-orange-600" />;
    case 'Vérification':
      return <Shield className="h-6 w-6 text-indigo-600" />;
    case 'Leasing':
      return <CreditCard className="h-6 w-6 text-emerald-600" />;
    case 'RH & Paie':
      return <CreditCard className="h-6 w-6 text-pink-600" />;
    default:
      return <Database className="h-6 w-6 text-gray-600" />;
  }
};

const getIntegrationIcon = (integration: Integration) => {
  // Pour certaines intégrations spécifiques, on peut retourner des icônes personnalisées
  switch (integration.id) {
    case 'billit':
      return <FileText className="h-6 w-6 text-blue-600" />;
    case 'microsoft-dynamics':
      return <Building2 className="h-6 w-6 text-blue-600" />;
    case 'salesforce':
      return <Users className="h-6 w-6 text-blue-500" />;
    case 'odoo':
      return <Building2 className="h-6 w-6 text-purple-600" />;
    case 'sage':
    case 'sage-bob':
      return <Calculator className="h-6 w-6 text-green-600" />;
    case 'quickbooks':
      return <Calculator className="h-6 w-6 text-blue-500" />;
    case 'teamleader':
      return <Users className="h-6 w-6 text-teal-600" />;
    case 'graydon-creditsafe':
    case 'companyweb':
      return <Shield className="h-6 w-6 text-indigo-600" />;
    default:
      return getCategoryIcon(integration.category);
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
                              // Image failed to load, show fallback icon
                              const img = e.target as HTMLImageElement;
                              img.style.display = 'none';
                              const fallback = img.nextElementSibling as HTMLElement;
                              if (fallback) {
                                fallback.style.display = 'flex';
                              }
                            }}
                          />
                          <div className="w-8 h-8 flex items-center justify-center absolute top-0 left-0" style={{ display: 'none' }}>
                            {getIntegrationIcon(integration)}
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
            
            {selectedIntegration === 'companyweb' && (
              <CompanyWebIntegrationSettings />
            )}
            
            {selectedIntegration && selectedIntegration !== 'billit' && selectedIntegration !== 'companyweb' && (
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