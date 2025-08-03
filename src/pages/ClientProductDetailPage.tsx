import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ClientProductDetail from '@/components/catalog/client/ClientProductDetail';
import { supabase } from '@/integrations/supabase/client';
import { useClientData } from '@/hooks/useClientData';

const ClientProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { clientData, loading: clientLoading } = useClientData();

  // Fetch company data based on the authenticated client's company
  const { data: company, isLoading: isLoadingCompany, error: companyError } = useQuery({
    queryKey: ['client-company', clientData?.id],
    queryFn: async () => {
      if (!clientData?.id) return null;
      
      // Get the company ID from the client's data or use a default approach
      // This assumes there's a way to get the company from the client context
      // You might need to adjust this based on your actual data structure
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .limit(1)
        .single();
      
      if (error) {
        console.error('Error fetching company:', error);
        throw error;
      }
      
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
              <p className="text-muted-foreground">Chargement du produit...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (companyError || !company) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold">Détail du produit</h1>
            <Button variant="outline" size="sm" onClick={() => navigate('/client/products')}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Retour au catalogue
            </Button>
          </div>
          
          <Alert variant="destructive" className="max-w-lg mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erreur lors du chargement de l'entreprise.
              {companyError && (
                <>
                  <br />
                  <small>Erreur: {companyError.message}</small>
                </>
              )}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!productId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive" className="max-w-lg mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              ID du produit manquant.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Détail du produit</h1>
          <Button variant="outline" size="sm" onClick={() => navigate('/client/products')}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Retour au catalogue
          </Button>
        </div>
        
        <ClientProductDetail
          companyId={company.id}
          companySlug={company.slug}
          productId={productId}
          clientId={clientData?.id || ''}
          company={company}
          onBackToCatalog={() => navigate('/client/products')}
        />
      </div>
    </div>
  );
};

export default ClientProductDetailPage;