
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CompanyBrandingData {
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  logo_url?: string;
  favicon_url?: string;
  name?: string;
}

export const useCompanyBranding = () => {
  const [branding, setBranding] = useState<CompanyBrandingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadBranding = async () => {
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('primary_color, secondary_color, accent_color, logo_url, favicon_url, name')
          .limit(1)
          .single();

        if (error) {
          console.warn("Could not load company branding:", error.message);
          setBranding(null);
        } else {
          setBranding(data);
          
          // Appliquer les couleurs CSS personnalisées
          if (data.primary_color) {
            document.documentElement.style.setProperty('--primary', data.primary_color);
          }
          if (data.secondary_color) {
            document.documentElement.style.setProperty('--secondary', data.secondary_color);
          }
          if (data.accent_color) {
            document.documentElement.style.setProperty('--accent', data.accent_color);
          }
        }
      } catch (error) {
        console.warn("Exception loading company branding:", error);
        setBranding(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadBranding();
  }, []);

  return { branding, isLoading };
};

const CompanyBranding: React.FC = () => {
  useCompanyBranding();
  return null; // Ce composant n'affiche rien, il ne fait qu'appliquer le branding
};

export default CompanyBranding;
