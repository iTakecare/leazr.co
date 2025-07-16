import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ExternalLink, Plus, RefreshCw, AlertCircle, TestTube, CheckCircle, XCircle } from 'lucide-react';

interface SubdomainLog {
  id: string;
  company_id: string;
  subdomain: string;
  status: 'pending' | 'success' | 'failed';
  cloudflare_record_id?: string;
  error_message?: string;
  retry_count: number;
  created_at: string;
  updated_at: string;
  companies?: {
    name: string;
  };
}

interface CompanyDomain {
  id: string;
  company_id: string;
  domain: string;
  subdomain: string;
  is_active: boolean;
  is_primary: boolean;
  cloudflare_status?: 'exists' | 'missing' | 'unknown';
  companies?: {
    name: string;
  };
}

export const CloudflareSubdomainManager = () => {
  const [domains, setDomains] = useState<CompanyDomain[]>([]);
  const [logs, setLogs] = useState<SubdomainLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newSubdomain, setNewSubdomain] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [companies, setCompanies] = useState<any[]>([]);
  const [testingAuth, setTestingAuth] = useState(false);
  const [authTestResult, setAuthTestResult] = useState<any>(null);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load companies
      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');

      if (companiesData) {
        setCompanies(companiesData);
      }

      // Load domains with Cloudflare status check
      const { data: domainsData } = await supabase
        .from('company_domains')
        .select(`
          *,
          companies:company_id (name)
        `)
        .order('created_at', { ascending: false });

      if (domainsData) {
        // Check Cloudflare status for each domain
        const domainsWithStatus = await Promise.all(
          domainsData.map(async (domain) => {
            const cloudflareStatus = await checkCloudflareStatus(domain.subdomain);
            return { ...domain, cloudflare_status: cloudflareStatus };
          })
        );
        setDomains(domainsWithStatus);
      }

      // Load logs
      const { data: logsData } = await supabase
        .from('cloudflare_subdomain_logs')
        .select(`
          *,
          companies:company_id (name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (logsData) {
        setLogs(logsData);
      }

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const checkCloudflareStatus = async (subdomain: string): Promise<'exists' | 'missing' | 'unknown'> => {
    try {
      const response = await fetch(`https://${subdomain}.leazr.co`, { 
        method: 'HEAD',
        mode: 'no-cors'
      });
      return 'exists';
    } catch (error) {
      // If we get a network error, it likely means the subdomain doesn't exist in Cloudflare
      return 'missing';
    }
  };

  const createInCloudflare = async (domain: CompanyDomain) => {
    try {
      const company = companies.find(c => c.id === domain.company_id);
      if (!company) {
        toast.error('Entreprise non trouvée');
        return;
      }

      const { error } = await supabase.functions.invoke('create-cloudflare-subdomain', {
        body: {
          companyId: domain.company_id,
          companyName: company.name,
          subdomain: domain.subdomain
        }
      });

      if (error) {
        throw error;
      }

      toast.success('Sous-domaine créé dans Cloudflare avec succès');
      loadData(); // Refresh to update status

    } catch (error) {
      console.error('Error creating in Cloudflare:', error);
      toast.error('Erreur lors de la création dans Cloudflare');
    }
  };

  const createSubdomain = async () => {
    if (!selectedCompanyId || !newSubdomain) {
      toast.error('Veuillez sélectionner une entreprise et saisir un sous-domaine');
      return;
    }

    try {
      setCreating(true);

      const company = companies.find(c => c.id === selectedCompanyId);
      if (!company) {
        toast.error('Entreprise non trouvée');
        return;
      }

      const { error } = await supabase.functions.invoke('create-cloudflare-subdomain', {
        body: {
          companyId: selectedCompanyId,
          companyName: company.name,
          subdomain: newSubdomain
        }
      });

      if (error) {
        throw error;
      }

      toast.success('Sous-domaine créé avec succès');
      setNewSubdomain('');
      setSelectedCompanyId('');
      loadData();

    } catch (error) {
      console.error('Error creating subdomain:', error);
      toast.error('Erreur lors de la création du sous-domaine');
    } finally {
      setCreating(false);
    }
  };

  const retrySubdomain = async (log: SubdomainLog) => {
    try {
      const company = companies.find(c => c.id === log.company_id);
      if (!company) {
        toast.error('Entreprise non trouvée');
        return;
      }

      const { error } = await supabase.functions.invoke('create-cloudflare-subdomain', {
        body: {
          companyId: log.company_id,
          companyName: company.name,
          subdomain: log.subdomain
        }
      });

      if (error) {
        throw error;
      }

      toast.success('Nouvelle tentative réussie');
      loadData();

    } catch (error) {
      console.error('Error retrying subdomain:', error);
      toast.error('Erreur lors de la nouvelle tentative');
    }
  };

  const testCloudflareAuth = async () => {
    try {
      setTestingAuth(true);
      setAuthTestResult(null);

      const { data, error } = await supabase.functions.invoke('create-cloudflare-subdomain', {
        body: {
          companyId: 'test',
          companyName: 'Test',
          testAuth: true
        }
      });

      if (error) {
        throw error;
      }

      setAuthTestResult(data);
      
      if (data.success) {
        toast.success('Test d\'authentification réussi');
      } else {
        toast.error(`Test d\'authentification échoué: ${data.message}`);
      }

    } catch (error) {
      console.error('Error testing auth:', error);
      setAuthTestResult({
        success: false,
        message: error.message || 'Erreur lors du test',
        details: error
      });
      toast.error('Erreur lors du test d\'authentification');
    } finally {
      setTestingAuth(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500">Succès</Badge>;
      case 'failed':
        return <Badge variant="destructive">Échec</Badge>;
      case 'pending':
        return <Badge variant="secondary">En attente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <div className="flex justify-center p-8">Chargement...</div>;
  }

  return (
      <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestion des sous-domaines Cloudflare</h1>
        <div className="flex gap-2">
          <Button onClick={testCloudflareAuth} variant="outline" size="sm" disabled={testingAuth}>
            <TestTube className="w-4 h-4 mr-2" />
            {testingAuth ? 'Test en cours...' : 'Tester Config'}
          </Button>
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Auth test result */}
      {authTestResult && (
        <Card className={authTestResult.success ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}>
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              {authTestResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-medium text-sm">
                  {authTestResult.success ? 'Configuration Cloudflare OK' : 'Erreur de configuration Cloudflare'}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {authTestResult.message}
                </div>
                {authTestResult.details && (
                  <details className="mt-2">
                    <summary className="text-xs cursor-pointer hover:underline">Détails techniques</summary>
                    <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                      {JSON.stringify(authTestResult.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create new subdomain */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Créer un nouveau sous-domaine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium">Entreprise</label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Sélectionner une entreprise</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium">Sous-domaine</label>
              <Input
                value={newSubdomain}
                onChange={(e) => setNewSubdomain(e.target.value)}
                placeholder="Ex: client1"
              />
            </div>
            <Button onClick={createSubdomain} disabled={creating}>
              {creating ? 'Création...' : 'Créer'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active domains */}
      <Card>
        <CardHeader>
          <CardTitle>Domaines actifs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {domains.map((domain) => (
              <div key={domain.id} className="flex justify-between items-center p-4 border rounded-lg">
                <div>
                  <div className="font-medium">
                    {domain.subdomain}.{domain.domain}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {domain.companies?.name}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={domain.is_active ? "default" : "secondary"}>
                    {domain.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                  {domain.is_primary && (
                    <Badge variant="outline">Principal</Badge>
                  )}
                  {domain.cloudflare_status === 'missing' ? (
                    <Badge variant="destructive">DNS manquant</Badge>
                  ) : domain.cloudflare_status === 'exists' ? (
                    <Badge variant="default" className="bg-green-500">DNS OK</Badge>
                  ) : (
                    <Badge variant="secondary">DNS inconnu</Badge>
                  )}
                  {domain.cloudflare_status === 'missing' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => createInCloudflare(domain)}
                      className="text-blue-600 border-blue-600 hover:bg-blue-50"
                    >
                      Créer DNS
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`https://${domain.subdomain}.${domain.domain}`, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Creation logs */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des créations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {logs.map((log) => (
              <div key={log.id} className="flex justify-between items-center p-4 border rounded-lg">
                <div>
                  <div className="font-medium">
                    {log.subdomain}.leazr.co
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {log.companies?.name}
                  </div>
                  {log.error_message && (
                    <div className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {log.error_message}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(log.created_at).toLocaleString()}
                    {log.retry_count > 0 && ` • ${log.retry_count} tentatives`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(log.status)}
                  {(log.status === 'failed' || log.status === 'pending') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => retrySubdomain(log)}
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      {log.status === 'pending' ? 'Forcer' : 'Réessayer'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};