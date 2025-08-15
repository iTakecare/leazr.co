import React from 'react';
import { useClientData } from '@/hooks/useClientData';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ClientCatalogAnonymous from '@/components/catalog/client/ClientCatalogAnonymous';
import { Loader2, AlertCircle, Crown } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

const ClientCatalogPage: React.FC = () => {
  const { clientData, loading: clientLoading, error: clientError } = useClientData();

  // Fetch company data for authenticated users (clients or admins)
  const { data: company, isLoading: isLoadingCompany, error: companyError } = useQuery({
    queryKey: ['user-company', clientData?.id],
    queryFn: async () => {
      if (clientData?.id) {
        // User is a client - get their company via client relationship
        console.log('🏢 CLIENT CATALOG - Fetching company for client:', clientData.id);
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
      } else {
        // No client data but user might be an admin - get their company directly
        console.log('🏢 CLIENT CATALOG - No client data, checking for admin company');
        const { data: adminCompanyId, error: adminError } = await supabase
          .rpc('get_user_company_id');
        
        if (adminError || !adminCompanyId) {
          console.error('Error getting admin company:', adminError);
          throw new Error('Aucune entreprise trouvée pour cet utilisateur');
        }
        
        const { data: adminCompany, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', adminCompanyId)
          .single();
        
        if (companyError) {
          console.error('Error fetching admin company:', companyError);
          throw companyError;
        }
        
        console.log('🏢 CLIENT CATALOG - Company loaded for admin:', adminCompany?.name);
        return adminCompany;
      }
    },
    enabled: !clientLoading, // Enable when client loading is done
  });

  const isAdmin = !clientData && company;

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
  console.log('🏢 CLIENT CATALOG - Client has custom catalog:', clientData?.has_custom_catalog);
  console.log('🏢 CLIENT CATALOG - Is admin preview:', isAdmin);

  return (
    <div className="relative">
      {isAdmin && (
        <div className="fixed top-4 right-4 z-50">
          <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/20">
            <Crown className="h-3 w-3 mr-1" />
            Prévisualisation Admin
          </Badge>
        </div>
      )}
      <ClientCatalogAnonymous company={company} clientData={clientData} />
    </div>
  );
};

export default ClientCatalogPage;