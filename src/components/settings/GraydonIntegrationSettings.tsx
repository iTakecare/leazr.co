import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserCompanyId } from '@/services/multiTenantService';
import { getGraydonConfig } from '@/services/financingAnalysisService';

const INTEGRATION_TYPE = 'graydon_creditsafe';

/**
 * Credentials Creditsafe Connect (Graydon-CreditSafe) du tenant, utilisés par
 * l'edge function graydon-api pour les rapports de solvabilité du module financeur.
 */
const GraydonIntegrationSettings: React.FC = () => {
  const [rowId, setRowId] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const companyId = await getCurrentUserCompanyId();
        const { data } = await supabase
          .from('company_integrations')
          .select('id, api_credentials, is_enabled')
          .eq('company_id', companyId)
          .eq('integration_type', INTEGRATION_TYPE)
          .maybeSingle();
        if (data) {
          setRowId(data.id);
          const creds = data.api_credentials as any;
          setUsername(creds?.username || '');
          setPassword(creds?.password || '');
          setEnabled(data.is_enabled);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    try {
      setSaving(true);
      const companyId = await getCurrentUserCompanyId();
      const payload = {
        company_id: companyId,
        integration_type: INTEGRATION_TYPE,
        api_credentials: { username, password },
        is_enabled: enabled,
        settings: {},
      };
      if (rowId) {
        const { error } = await supabase
          .from('company_integrations')
          .update({ api_credentials: payload.api_credentials, is_enabled: enabled })
          .eq('id', rowId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('company_integrations')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        setRowId(data.id);
      }
      toast.success('Credentials Graydon-CreditSafe enregistrés');
    } catch (e: any) {
      toast.error(`Erreur : ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    try {
      setTesting(true);
      const cfg = await getGraydonConfig();
      if (cfg.configured) {
        toast.success(`Intégration configurée (source : ${cfg.source === 'env' ? 'variables plateforme' : 'credentials société'})`);
      } else {
        toast.warning('Aucun credential actif détecté — enregistrez puis réessayez');
      }
    } catch (e: any) {
      toast.error(`Erreur : ${e.message}`);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground py-6 text-center">Chargement…</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-5 w-5 text-indigo-600" /> Graydon-CreditSafe (Creditsafe Connect)
        </CardTitle>
        <CardDescription>
          Rapports de solvabilité (score, limite de crédit conseillée) utilisés dans l'analyse
          des demandes de financement. Renseignez les identifiants API Creditsafe Connect.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Nom d'utilisateur API</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
          </div>
          <div>
            <Label>Mot de passe API</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Label>Intégration active</Label>
        </div>
        <div className="flex gap-2">
          <Button onClick={save} disabled={saving || !username || !password}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
          <Button variant="outline" onClick={test} disabled={testing}>
            <CheckCircle2 className="h-4 w-4 mr-1" /> {testing ? 'Test…' : 'Tester la configuration'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default GraydonIntegrationSettings;
