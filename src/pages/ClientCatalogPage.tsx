import React from 'react';
import { useClientData } from '@/hooks/useClientData';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PublicCatalogAnonymous from '@/pages/PublicCatalogAnonymous';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const ClientCatalogPage: React.FC = () => {
  const { clientData, loading: clientLoading, error: clientError } = useClientData();

  // Fetch company data for the authenticated client
  const { data: company, isLoading: isLoadingCompany, error: companyError } = useQuery({
    queryKey: ['client-company', clientData?.id],
    queryFn: async () => {
      if (!clientData?.id) return null;
      
      // Get the first company - adjust this logic based on your business rules
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .limit(1)
        .single();
      
      if (error) {
        console.error('Error fetching company for client:', error);
        throw error;
      }
      
      console.log('🏢 CLIENT CATALOG - Company loaded for client:', data?.name);
      return data;
    },
    enabled: !!clientData?.id && !clientLoading,
  });

  if (clientLoading || isLoadingCompany) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Chargement du catalogue...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (clientError || companyError || !company) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive" className="max-w-lg mx-auto mt-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {clientError || 'Erreur lors du chargement du catalogue.'}
              {companyError && (
                <>
                  <br />
                  <small>Erreur entreprise: {companyError.message}</small>
                </>
              )}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  console.log('🏢 CLIENT CATALOG - Rendering catalog for company:', company.name);

  // Use the existing PublicCatalogAnonymous but with company context
  return <PublicCatalogAnonymous company={company} />;
};

export default ClientCatalogPage;