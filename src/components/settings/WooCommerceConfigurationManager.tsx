import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, TestTube, ExternalLink, RefreshCw, AlertTriangle } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { diagnoseAuthSession, fixAuthTransmission } from '@/utils/authDiagnostic';

interface WooCommerceConfig {
  id: string;
  name: string;
  site_url: string;
  consumer_key: string;
  consumer_secret: string;
  company_id: string;
  created_at: string;
  updated_at: string;
}

const WooCommerceConfigurationManager = () => {
  const [configs, setConfigs] = useState<WooCommerceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<WooCommerceConfig | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    site_url: '',
    consumer_key: '',
    consumer_secret: ''
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    try {
      console.log('🔬 DIAGNOSTIC AUTH - Début du chargement des configurations WooCommerce...');
      
      // Exécuter un diagnostic complet de l'authentification
      const diagnostic = await diagnoseAuthSession();
      console.log('🔬 Résultat diagnostic complet:', diagnostic);

      // Si diagnostic échoue, essayer de corriger
      if (!diagnostic.success) {
        console.log('🔧 Tentative de correction automatique...');
        const fixResult = await fixAuthTransmission();
        console.log('🔧 Résultat correction:', fixResult);
        
        if (!fixResult.success) {
          throw new Error('Problème d\'authentification détecté: ' + (fixResult.error || 'Token invalide'));
        }
      }

      // Charger les configurations
      const { data, error } = await supabase
        .from('woocommerce_configs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('🔬 Erreur Supabase lors du chargement:', error);
        
        // Si l'erreur est liée à RLS, essayer de diagnostiquer plus en détail
        if (error.message?.includes('RLS') || error.message?.includes('policy')) {
          console.log('🔧 Erreur RLS détectée - tentative de correction...');
          const fixResult = await fixAuthTransmission();
          if (fixResult.success) {
            // Re-essayer la requête après correction
            const { data: retryData, error: retryError } = await supabase
              .from('woocommerce_configs')
              .select('*')
              .order('created_at', { ascending: false });
              
            if (!retryError) {
              setConfigs(retryData || []);
              return;
            }
          }
        }
        
        throw error;
      }
      
      console.log('🔬 Configurations chargées:', data);
      setConfigs(data || []);
    } catch (error) {
      console.error('🔬 Erreur lors du chargement des configurations:', error);
      toast.error('Impossible de charger les configurations WooCommerce: ' + (error.message || 'Erreur inconnue'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Vérifier la duplication
      if (!editingConfig) {
        const existing = configs.find(c => c.site_url === formData.site_url);
        if (existing) {
          toast.error('Une configuration existe déjà pour cette URL');
          setSaving(false);
          return;
        }
      }

      const configData = {
        name: formData.name || `Boutique ${formData.site_url.replace(/https?:\/\//, '')}`,
        site_url: formData.site_url,
        consumer_key: formData.consumer_key,
        consumer_secret: formData.consumer_secret,
        ...(editingConfig ? { id: editingConfig.id } : {})
      };

      console.log('Sauvegarde de la configuration:', configData);

      const { error } = editingConfig
        ? await supabase
            .from('woocommerce_configs')
            .update(configData)
            .eq('id', editingConfig.id)
        : await supabase
            .from('woocommerce_configs')
            .insert([configData]);

      if (error) {
        console.error('Erreur Supabase lors de la sauvegarde:', error);
        throw error;
      }

      toast.success(editingConfig ? 'Configuration mise à jour' : 'Configuration ajoutée');
      setIsDialogOpen(false);
      resetForm();
      loadConfigurations();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde: ' + (error.message || 'Erreur inconnue'));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (config: WooCommerceConfig) => {
    setEditingConfig(config);
    setFormData({
      name: config.name || '',
      site_url: config.site_url,
      consumer_key: config.consumer_key,
      consumer_secret: config.consumer_secret
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette configuration ?')) return;

    try {
      const { error } = await supabase
        .from('woocommerce_configs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Configuration supprimée');
      loadConfigurations();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const testConnection = async (config: WooCommerceConfig) => {
    setTesting(config.id);
    try {
      const { data, error } = await supabase.functions.invoke('woocommerce-import', {
        body: {
          action: 'test-connection',
          configId: config.id
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Connexion WooCommerce réussie');
      } else {
        toast.error('Échec de la connexion: ' + (data.error || 'Erreur inconnue'));
      }
    } catch (error) {
      console.error('Erreur lors du test de connexion:', error);
      toast.error('Erreur lors du test de connexion');
    } finally {
      setTesting(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      site_url: '',
      consumer_key: '',
      consumer_secret: ''
    });
    setEditingConfig(null);
  };

  const handleOpenDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Configurations WooCommerce</h3>
          <p className="text-sm text-muted-foreground">
            Gérez vos connexions aux boutiques WooCommerce
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => navigate('/admin/catalog')}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Import Catalogue
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenDialog} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingConfig ? 'Modifier' : 'Ajouter'} une configuration WooCommerce
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nom de la configuration</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Ma boutique principale"
                  />
                </div>
                <div>
                  <Label htmlFor="site_url">URL du site</Label>
                  <Input
                    id="site_url"
                    value={formData.site_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, site_url: e.target.value }))}
                    placeholder="https://monsite.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="consumer_key">Consumer Key</Label>
                  <Input
                    id="consumer_key"
                    value={formData.consumer_key}
                    onChange={(e) => setFormData(prev => ({ ...prev, consumer_key: e.target.value }))}
                    placeholder="ck_..."
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="consumer_secret">Consumer Secret</Label>
                  <Input
                    id="consumer_secret"
                    type="password"
                    value={formData.consumer_secret}
                    onChange={(e) => setFormData(prev => ({ ...prev, consumer_secret: e.target.value }))}
                    placeholder="cs_..."
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Sauvegarde...' : editingConfig ? 'Modifier' : 'Ajouter'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {configs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-muted-foreground mb-4">Aucune configuration WooCommerce</p>
            <Button onClick={handleOpenDialog} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Ajouter votre première boutique
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {configs.map((config) => (
            <Card key={config.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <CardTitle className="text-base">{config.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <span>{config.site_url}</span>
                        <Badge variant="outline" className="text-xs">
                          Configurée
                        </Badge>
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testConnection(config)}
                      disabled={testing === config.id}
                      className="flex items-center gap-1"
                    >
                      <TestTube className="h-3 w-3" />
                      {testing === config.id ? 'Test...' : 'Tester'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(config)}
                      className="flex items-center gap-1"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(config.id)}
                      className="flex items-center gap-1 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-sm text-muted-foreground">
                  <p>Créée le {new Date(config.created_at).toLocaleDateString()}</p>
                  <p>Dernière modification: {new Date(config.updated_at).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default WooCommerceConfigurationManager;