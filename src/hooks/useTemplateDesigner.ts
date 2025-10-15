import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export interface TemplateDesign {
  sections: {
    logo: { enabled: boolean; position: 'left' | 'center' | 'right'; size: number };
    header: { enabled: boolean; title: string; subtitle?: string };
    clientInfo: { enabled: boolean; fields: string[] };
    equipmentTable: { enabled: boolean; columns: string[] };
    summary: { enabled: boolean; showMonthly: boolean; showTotal: boolean };
    footer: { enabled: boolean; text: string };
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
  };
  fonts: {
    title: { size: number; weight: 'normal' | 'bold' };
    heading: { size: number; weight: 'normal' | 'bold' };
    body: { size: number; weight: 'normal' | 'bold' };
  };
  layout: {
    pageMargin: number;
    sectionSpacing: number;
    borderRadius: number;
  };
}

const defaultDesign: TemplateDesign = {
  sections: {
    logo: { enabled: true, position: 'left', size: 120 },
    header: { enabled: true, title: 'Offre Commerciale', subtitle: '' },
    clientInfo: { enabled: true, fields: ['name', 'company', 'email', 'phone', 'address'] },
    equipmentTable: { enabled: true, columns: ['title', 'quantity', 'price', 'total'] },
    summary: { enabled: true, showMonthly: true, showTotal: true },
    footer: { enabled: true, text: 'Offre valable 30 jours' },
  },
  colors: {
    primary: '#3b82f6',
    secondary: '#64748b',
    accent: '#8b5cf6',
    text: '#1e293b',
    background: '#ffffff',
  },
  fonts: {
    title: { size: 24, weight: 'bold' },
    heading: { size: 16, weight: 'bold' },
    body: { size: 10, weight: 'normal' },
  },
  layout: {
    pageMargin: 40,
    sectionSpacing: 20,
    borderRadius: 4,
  },
};

export const useTemplateDesigner = () => {
  const { user } = useAuth();
  const [design, setDesign] = useState<TemplateDesign>(defaultDesign);
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    const loadCompanyData = async () => {
      if (!user?.id) return;

      try {
        // Get user's company_id from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();

        if (!profile?.company_id) return;
        
        setCompanyId(profile.company_id);

        // Get company's template design
        const { data: company } = await supabase
          .from('companies')
          .select('template_design')
          .eq('id', profile.company_id)
          .single();

        if (company?.template_design) {
          setDesign(company.template_design as TemplateDesign);
        }
      } catch (error) {
        console.error('Error loading company data:', error);
      }
    };

    loadCompanyData();
  }, [user]);

  const saveDesign = async (newDesign: TemplateDesign) => {
    if (!companyId) {
      toast.error('Entreprise non trouvée');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({ template_design: newDesign })
        .eq('id', companyId);

      if (error) throw error;

      setDesign(newDesign);
      toast.success('Design sauvegardé avec succès');
    } catch (error: any) {
      console.error('Error saving template design:', error);
      toast.error('Erreur lors de la sauvegarde du design');
    } finally {
      setLoading(false);
    }
  };

  return {
    design,
    setDesign,
    saveDesign,
    loading,
  };
};
