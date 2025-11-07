import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Upload } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface PartnerLogo {
  id?: string;
  logo_name: string;
  logo_url: string;
  display_order: number;
  is_active: boolean;
}

export default function PartnerLogosSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [logos, setLogos] = useState<PartnerLogo[]>([]);

  useEffect(() => {
    fetchCompanyIdAndLogos();
  }, [user]);

  const fetchCompanyIdAndLogos = async () => {
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

      // Fetch existing logos
      const { data, error } = await supabase
        .from('company_partner_logos')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (data) {
        setLogos(data);
      }
    } catch (error) {
      console.error('Error fetching logos:', error);
      toast.error('Erreur lors du chargement des logos');
    }
  };

  const handleAddLogo = () => {
    setLogos([
      ...logos,
      {
        logo_name: '',
        logo_url: '',
        display_order: logos.length + 1,
        is_active: true,
      },
    ]);
  };

  const handleRemoveLogo = async (index: number) => {
    const logo = logos[index];
    
    if (logo.id) {
      try {
        const { error } = await supabase
          .from('company_partner_logos')
          .delete()
          .eq('id', logo.id);

        if (error) throw error;
        toast.success('Logo supprimé');
      } catch (error) {
        console.error('Error deleting logo:', error);
        toast.error('Erreur lors de la suppression');
        return;
      }
    }

    const updatedLogos = logos.filter((_, i) => i !== index);
    setLogos(updatedLogos);
  };

  const handleLogoChange = (index: number, field: keyof PartnerLogo, value: string | boolean) => {
    const updatedLogos = [...logos];
    updatedLogos[index] = { ...updatedLogos[index], [field]: value };
    setLogos(updatedLogos);
  };

  const handleUploadLogo = async (index: number, file: File) => {
    if (!companyId) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `company-${companyId}/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('company-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('company-assets')
        .getPublicUrl(data.path);

      handleLogoChange(index, 'logo_url', urlData.publicUrl);
      toast.success('Logo téléchargé');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleSave = async () => {
    if (!companyId) {
      toast.error('Entreprise non trouvée');
      return;
    }

    setLoading(true);
    try {
      // Delete all existing logos
      await supabase
        .from('company_partner_logos')
        .delete()
        .eq('company_id', companyId);

      // Insert new logos
      const logosToInsert = logos
        .filter(logo => logo.logo_name && logo.logo_url)
        .map((logo, index) => ({
          company_id: companyId,
          logo_name: logo.logo_name,
          logo_url: logo.logo_url,
          display_order: index + 1,
          is_active: logo.is_active,
        }));

      if (logosToInsert.length > 0) {
        const { error } = await supabase
          .from('company_partner_logos')
          .insert(logosToInsert);

        if (error) throw error;
      }

      toast.success('Logos enregistrés avec succès');
      fetchCompanyIdAndLogos();
    } catch (error) {
      console.error('Error saving logos:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
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
          <h1 className="text-3xl font-bold">Logos partenaires</h1>
          <p className="text-muted-foreground">
            Gérez les logos affichés dans la section "Ils nous font confiance"
          </p>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        {logos.map((logo, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex-1 space-y-4">
                  <div>
                    <Label htmlFor={`name-${index}`}>Nom du partenaire</Label>
                    <Input
                      id={`name-${index}`}
                      value={logo.logo_name}
                      onChange={(e) => handleLogoChange(index, 'logo_name', e.target.value)}
                      placeholder="Ex: Apple, Microsoft..."
                    />
                  </div>

                  <div>
                    <Label>Logo</Label>
                    <div className="flex items-center gap-4">
                      {logo.logo_url && (
                        <img
                          src={logo.logo_url}
                          alt={logo.logo_name}
                          className="w-20 h-12 object-contain border rounded"
                        />
                      )}
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadLogo(index, file);
                        }}
                      />
                    </div>
                  </div>
                </div>

                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleRemoveLogo(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {logos.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                Aucun logo partenaire configuré
              </p>
              <Button onClick={handleAddLogo}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un logo
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={handleAddLogo}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un logo
        </Button>

        <Button onClick={handleSave} disabled={loading}>
          <Upload className="h-4 w-4 mr-2" />
          {loading ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  );
}
