import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Globe, Plus, ExternalLink, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ClientSubdomainManagerProps {
  clientId: string;
  companyName?: string;
}

interface CompanyDomain {
  id: string;
  domain: string;
  subdomain: string;
  is_active: boolean;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

const ClientSubdomainManager: React.FC<ClientSubdomainManagerProps> = ({
  clientId,
  companyName
}) => {
  const [domains, setDomains] = useState<CompanyDomain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newSubdomain, setNewSubdomain] = useState("");

  useEffect(() => {
    fetchClientDomains();
  }, [clientId]);

  const fetchClientDomains = async () => {
    try {
      // Récupérer l'entreprise du client
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('company_id')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;

      if (client?.company_id) {
        // Récupérer les domaines de l'entreprise
        const { data: domainsData, error: domainsError } = await supabase
          .from('company_domains')
          .select('*')
          .eq('company_id', client.company_id)
          .order('created_at', { ascending: false });

        if (domainsError) throw domainsError;
        setDomains(domainsData || []);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des domaines:", error);
      toast.error("Impossible de charger les domaines");
    } finally {
      setIsLoading(false);
    }
  };

  const generateSubdomainSuggestion = () => {
    if (companyName) {
      // Nettoyer le nom de l'entreprise pour créer un sous-domaine valide
      const suggestion = companyName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 20);
      setNewSubdomain(suggestion);
    }
  };

  const createSubdomain = async () => {
    if (!newSubdomain.trim()) {
      toast.error("Veuillez saisir un sous-domaine");
      return;
    }

    setIsCreating(true);
    try {
      // Appeler l'edge function pour créer le sous-domaine
      const { data, error } = await supabase.functions.invoke('create-cloudflare-subdomain', {
        body: {
          subdomain: newSubdomain.trim(),
          clientId: clientId
        }
      });

      if (error) throw error;

      toast.success("Sous-domaine créé avec succès");
      setNewSubdomain("");
      fetchClientDomains();
    } catch (error) {
      console.error("Erreur lors de la création:", error);
      toast.error("Erreur lors de la création du sous-domaine");
    } finally {
      setIsCreating(false);
    }
  };

  const testSubdomain = (subdomain: string) => {
    const url = `https://${subdomain}.leazr.co`;
    window.open(url, '_blank');
  };

  const getStatusBadge = (domain: CompanyDomain) => {
    if (domain.is_active) {
      return <Badge className="bg-green-100 text-green-800">Actif</Badge>;
    } else {
      return <Badge variant="secondary">En attente</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Configuration du domaine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Chargement...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Configuration du domaine
        </CardTitle>
        <CardDescription>
          Gérez le sous-domaine associé à ce client
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Domaines existants */}
        {domains.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Domaines configurés :</h4>
            {domains.map((domain) => (
              <div key={domain.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium">{domain.subdomain}.{domain.domain}</p>
                    <p className="text-sm text-muted-foreground">
                      Créé le {new Date(domain.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {getStatusBadge(domain)}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testSubdomain(domain.subdomain)}
                    disabled={!domain.is_active}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Tester
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 border-2 border-dashed border-muted rounded-lg">
            <Globe className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Aucun domaine configuré</p>
          </div>
        )}

        {/* Création d'un nouveau sous-domaine */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-3">Créer un nouveau sous-domaine :</h4>
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="subdomain">Sous-domaine</Label>
                <div className="flex mt-1">
                  <Input
                    id="subdomain"
                    value={newSubdomain}
                    onChange={(e) => setNewSubdomain(e.target.value)}
                    placeholder="monentreprise"
                    className="rounded-r-none"
                  />
                  <div className="px-3 py-2 bg-muted border border-l-0 rounded-r-md text-sm">
                    .leazr.co
                  </div>
                </div>
              </div>
              <div className="flex items-end gap-2">
                <Button
                  variant="outline"
                  onClick={generateSubdomainSuggestion}
                  disabled={!companyName}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  onClick={createSubdomain}
                  disabled={isCreating || !newSubdomain.trim()}
                >
                  {isCreating ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Créer
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Le sous-domaine doit contenir uniquement des lettres, chiffres et tirets
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientSubdomainManager;