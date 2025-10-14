import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRefreshableCompanyData } from './useRefreshableCompanyData';

interface PdfCustomizations {
  showLogo?: boolean;
  showFooter?: boolean;
  primaryColor?: string;
  secondaryColor?: string;
}

export const useCompanyTemplateSettings = () => {
  const { company, refresh } = useRefreshableCompanyData();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [defaultTemplateId, setDefaultTemplateId] = useState<string>('classic-business');
  const [customizations, setCustomizations] = useState<PdfCustomizations>({
    showLogo: true,
    showFooter: true,
  });

  useEffect(() => {
    if (company) {
      // @ts-ignore - default_pdf_template_id exists after migration
      setDefaultTemplateId(company.default_pdf_template_id || 'classic-business');
      // @ts-ignore - default_pdf_customizations exists after migration
      const savedCustomizations = company.default_pdf_customizations || {};
      setCustomizations({
        showLogo: savedCustomizations.showLogo ?? true,
        showFooter: savedCustomizations.showFooter ?? true,
        primaryColor: savedCustomizations.primaryColor || company.primary_color,
        secondaryColor: savedCustomizations.secondaryColor || company.secondary_color,
      });
    }
  }, [company]);

  const saveSettings = async (
    templateId: string,
    newCustomizations: PdfCustomizations
  ) => {
    if (!company) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          default_pdf_template_id: templateId,
          default_pdf_customizations: newCustomizations,
        })
        .eq('id', company.id);

      if (error) throw error;

      setDefaultTemplateId(templateId);
      setCustomizations(newCustomizations);
      
      toast({
        title: 'Paramètres sauvegardés',
        description: 'Vos préférences de templates PDF ont été enregistrées.',
      });

      await refresh();
    } catch (error) {
      console.error('Error saving template settings:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder les paramètres.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    defaultTemplateId,
    customizations,
    saveSettings,
    loading,
    company,
  };
};
