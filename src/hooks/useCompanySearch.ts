import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CompanySearchParams {
  query: string;
  country: string;
  searchType: 'name' | 'vat' | 'siren' | 'siret';
  limit?: number;
}

interface CompanyResult {
  name: string;
  country?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  vat_number?: string;
  siren?: string;
  siret?: string;
  sector?: string;
  legal_form?: string;
  creation_date?: string;
  employee_count?: string;
  source: string;
  confidence: number;
}

interface CompanySearchResponse {
  success: boolean;
  results: CompanyResult[];
  source: 'api' | 'cache';
  cached: boolean;
  count: number;
  error?: string;
}

export const useCompanySearch = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchCompanies = async (params: CompanySearchParams): Promise<CompanyResult[]> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Recherche entreprise avec params:', params);

      const { data, error: funcError } = await supabase.functions.invoke('company-search', {
        body: params
      });

      if (funcError) {
        throw new Error(funcError.message || 'Erreur lors de la recherche');
      }

      const response: CompanySearchResponse = data;

      if (!response.success) {
        throw new Error(response.error || 'Erreur inconnue lors de la recherche');
      }

      console.log(`Recherche terminée: ${response.count} résultats (${response.cached ? 'cache' : 'API'})`);
      
      return response.results || [];

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de recherche d\'entreprise';
      console.error('Erreur useCompanySearch:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return {
    searchCompanies,
    isLoading,
    error,
    clearError
  };
};