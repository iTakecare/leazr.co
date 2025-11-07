import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Save } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function CompanyMetricsSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({
    client_satisfaction_percent: 99.3,
    devices_count: 0,
    co2_saved_kg: 0,
  });

  useEffect(() => {
    fetchCompanyIdAndMetrics();
  }, [user]);

  const fetchCompanyIdAndMetrics = async () => {
    if (!user?.id) return;

    try {
      // Get company ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        toast.error('Entreprise non trouvée');
        return;
      }

      setCompanyId(profile.company_id);

      // Fetch existing metrics
      const { data, error } = await supabase
        .from('company_metrics')
        .select('*')
        .eq('company_id', profile.company_id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setMetrics({
          client_satisfaction_percent: data.client_satisfaction_percent || 99.3,
          devices_count: data.devices_count || 0,
          co2_saved_kg: data.co2_saved_kg || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
      toast.error('Erreur lors du chargement des métriques');
    }
  };

  const handleSave = async () => {
    if (!companyId) {
      toast.error('Entreprise non trouvée');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('company_metrics')
        .upsert({
          company_id: companyId,
          client_satisfaction_percent: metrics.client_satisfaction_percent,
          devices_count: metrics.devices_count,
          co2_saved_kg: metrics.co2_saved_kg,
        });

      if (error) throw error;

      toast.success('Métriques enregistrées avec succès');
    } catch (error) {
      console.error('Error saving metrics:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin/settings')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Métriques de l'entreprise</h1>
          <p className="text-muted-foreground">
            Gérez les indicateurs affichés dans vos PDFs
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Indicateurs clés</CardTitle>
          <CardDescription>
            Ces métriques seront affichées sur la page "Nos valeurs" des PDFs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="satisfaction">Satisfaction client (%)</Label>
            <Input
              id="satisfaction"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={metrics.client_satisfaction_percent}
              onChange={(e) =>
                setMetrics({
                  ...metrics,
                  client_satisfaction_percent: parseFloat(e.target.value),
                })
              }
            />
            <p className="text-sm text-muted-foreground mt-1">
              Exemple: 99.3 s'affichera comme "99,3% de clients satisfaits"
            </p>
          </div>

          <div>
            <Label htmlFor="devices">Nombre d'appareils gérés</Label>
            <Input
              id="devices"
              type="number"
              min="0"
              value={metrics.devices_count}
              onChange={(e) =>
                setMetrics({
                  ...metrics,
                  devices_count: parseInt(e.target.value),
                })
              }
            />
            <p className="text-sm text-muted-foreground mt-1">
              Nombre total d'appareils que vous gérez
            </p>
          </div>

          <div>
            <Label htmlFor="co2">CO₂ économisé (kg)</Label>
            <Input
              id="co2"
              type="number"
              min="0"
              value={metrics.co2_saved_kg}
              onChange={(e) =>
                setMetrics({
                  ...metrics,
                  co2_saved_kg: parseFloat(e.target.value),
                })
              }
            />
            <p className="text-sm text-muted-foreground mt-1">
              Quantité de CO₂ économisée grâce à vos solutions (en kg)
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
