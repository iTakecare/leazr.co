import React, { useState } from 'react';
import WaveLoader from "@/components/ui/WaveLoader";
import { useClientData } from '@/hooks/useClientData';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ClientCatalogAnonymous from '@/components/catalog/client/ClientCatalogAnonymous';
import { Loader2, AlertCircle, Crown, Sparkles } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { useRoleNavigation } from '@/hooks/useRoleNavigation';
import UsageConfiguratorDialog from '@/components/offer/UsageConfiguratorDialog';
import type { EquipmentSuggestion } from '@/services/offers/suggestEquipmentFromUsage';
import type { Product } from '@/types/catalog';

// Durée de location par défaut pour les articles ajoutés au panier via l'assistant.
const DEFAULT_CART_DURATION = 36;

const ClientCatalogPage: React.FC = () => {
  const { clientData, loading: clientLoading, error: clientError } = useClientData();
  const { addToCart } = useCart();
  const { navigateToClient } = useRoleNavigation();
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // L'assistant pousse les produits suggérés dans le panier, exactement comme si
  // le client les avait choisis lui-même, puis l'emmène vers son panier pour la commande.
  const handleWizardSuggestions = (suggestions: EquipmentSuggestion[]) => {
    suggestions.forEach((s) => {
      const product = {
        id: s.product_id,
        name: s.name,
        brand: s.brand,
        category: s.category,
        description: '',
        price: s.price,
        monthly_price: s.monthly_price,
        image_url: s.image_url || undefined,
        active: true,
      } as unknown as Product;
      addToCart({ product, quantity: s.quantity, duration: DEFAULT_CART_DURATION });
    });
    navigateToClient('panier');
  };

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
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <WaveLoader message="Chargement du catalogue..." />
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

      {/* Assistant de configuration — réservé aux clients connectés (pas le catalogue public) */}
      {clientData && (
        <>
          <div className="fixed bottom-6 right-6 z-40">
            <Button
              size="lg"
              className="shadow-lg"
              onClick={() => setIsWizardOpen(true)}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Configurer avec l'assistant
            </Button>
          </div>
          <UsageConfiguratorDialog
            open={isWizardOpen}
            onOpenChange={setIsWizardOpen}
            companyId={company?.id}
            onConfirm={handleWizardSuggestions}
          />
        </>
      )}

      <ClientCatalogAnonymous company={company} clientData={clientData} />
    </div>
  );
};

export default ClientCatalogPage;