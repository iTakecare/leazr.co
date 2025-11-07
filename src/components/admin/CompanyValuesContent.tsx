import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface CompanyValue {
  id: string;
  value_key: string;
  title: string;
  description: string;
  icon_url?: string;
  display_order: number;
}

interface CompanyValuesContentProps {
  embedded?: boolean;
  onSaveSuccess?: () => void;
}

export function CompanyValuesContent({ embedded = false, onSaveSuccess }: CompanyValuesContentProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState<CompanyValue[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    fetchCompanyIdAndValues();
  }, [user]);

  const fetchCompanyIdAndValues = async () => {
    if (!user?.id) return;

    try {
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

      const { data, error } = await supabase
        .from('company_values')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setValues(data);
      } else {
        setValues([
          {
            id: '',
            value_key: 'evolution',
            title: 'Evolution.',
            description: 'Nous croyons en l\'évolution continue, tant pour nos clients que pour notre équipe.',
            display_order: 1,
          },
          {
            id: '',
            value_key: 'confiance',
            title: 'Confiance.',
            description: 'La confiance est au cœur de nos relations. Nous construisons des partenariats durables.',
            display_order: 2,
          },
          {
            id: '',
            value_key: 'entraide',
            title: 'Entraide.',
            description: 'L\'entraide fait partie de notre ADN. Ensemble nous sommes plus forts.',
            display_order: 3,
          },
        ]);
      }
    } catch (error) {
      console.error('Error fetching values:', error);
      toast.error('Erreur lors du chargement des valeurs');
    }
  };

  const handleSave = async () => {
    if (!companyId) {
      toast.error('Entreprise non trouvée');
      return;
    }

    setLoading(true);
    try {
      await supabase
        .from('company_values')
        .delete()
        .eq('company_id', companyId);

      const valuesToInsert = values.map(v => ({
        company_id: companyId,
        value_key: v.value_key,
        title: v.title,
        description: v.description,
        icon_url: v.icon_url,
        display_order: v.display_order,
        is_active: true,
      }));

      const { error } = await supabase
        .from('company_values')
        .insert(valuesToInsert);

      if (error) throw error;

      toast.success('Valeurs enregistrées avec succès');
      fetchCompanyIdAndValues();
      onSaveSuccess?.();
    } catch (error) {
      console.error('Error saving values:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (index: number, field: keyof CompanyValue, value: string) => {
    const updatedValues = [...values];
    updatedValues[index] = { ...updatedValues[index], [field]: value };
    setValues(updatedValues);
  };

  const handleUploadIcon = async (index: number, file: File) => {
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

      handleValueChange(index, 'icon_url', urlData.publicUrl);
      toast.success('Image téléchargée');
    } catch (error) {
      console.error('Error uploading icon:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Valeurs de l'entreprise</h3>
          <p className="text-sm text-muted-foreground">
            Définissez les valeurs affichées dans vos offres PDF
          </p>
        </div>
      )}

      {values.map((value, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle>Valeur {index + 1}</CardTitle>
            <CardDescription>
              Définissez le titre et la description de cette valeur
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor={`title-${index}`}>Titre</Label>
              <Input
                id={`title-${index}`}
                value={value.title}
                onChange={(e) => handleValueChange(index, 'title', e.target.value)}
                placeholder="Ex: Evolution."
              />
            </div>

            <div>
              <Label htmlFor={`description-${index}`}>Description</Label>
              <Textarea
                id={`description-${index}`}
                value={value.description}
                onChange={(e) => handleValueChange(index, 'description', e.target.value)}
                placeholder="Décrivez cette valeur..."
                rows={4}
              />
            </div>

            <div>
              <Label>Icône (optionnel)</Label>
              <div className="flex items-center gap-4">
                {value.icon_url && (
                  <img
                    src={value.icon_url}
                    alt={value.title}
                    className="w-16 h-16 object-cover rounded-full"
                  />
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadIcon(index, file);
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  );
}
