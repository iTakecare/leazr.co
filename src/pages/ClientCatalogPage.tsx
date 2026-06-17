import React, { useState } from 'react';
import { useClientData } from '@/hooks/useClientData';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ClientCatalogAnonymous from '@/components/catalog/client/ClientCatalogAnonymous';
import { AlertCircle, Crown, Sparkles, Leaf } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useRoleNavigation } from '@/hooks/useRoleNavigation';
import UsageConfiguratorDialog from '@/components/offer/UsageConfiguratorDialog';
import type { EquipmentSuggestion } from '@/services/offers/suggestEquipmentFromUsage';
import type { Product } from '@/types/catalog';
import {
  clientColors,
  CLIENT_GRADIENT,
  ClientPage,
  ClientPageHeader,
  ClientCard,
  ClientEmptyState,
  primaryBtnStyle,
} from '@/components/client/clientUi';

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
      <ClientPage maxWidth={1240}>
        <ClientPageHeader
          title="Catalogue"
          subtitle="Composez votre demande de leasing. Matériel reconditionné & neuf, impact CO₂ affiché."
        />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 14,
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <ClientCard key={i} pad={0} style={{ overflow: 'hidden' }}>
              <div
                className="animate-pulse"
                style={{ height: 120, background: clientColors.surface }}
              />
              <div style={{ padding: 14 }}>
                <div
                  className="animate-pulse"
                  style={{ height: 10, width: '40%', borderRadius: 6, background: clientColors.borderSoft }}
                />
                <div
                  className="animate-pulse"
                  style={{ height: 13, width: '80%', borderRadius: 6, background: clientColors.borderSoft, marginTop: 10 }}
                />
                <div
                  className="animate-pulse"
                  style={{ height: 18, width: '50%', borderRadius: 6, background: clientColors.borderSoft, marginTop: 14 }}
                />
              </div>
            </ClientCard>
          ))}
        </div>
      </ClientPage>
    );
  }

  if (clientError || companyError || !company) {
    return (
      <ClientPage maxWidth={1240}>
        <ClientPageHeader
          title="Catalogue"
          subtitle="Composez votre demande de leasing. Matériel reconditionné & neuf, impact CO₂ affiché."
        />
        <ClientEmptyState
          icon={<AlertCircle size={34} style={{ color: clientColors.faint }} />}
          title="Catalogue indisponible"
          description={
            clientError
              ? String(clientError)
              : companyError
                ? `Erreur entreprise : ${companyError.message}`
                : 'Erreur lors du chargement du catalogue.'
          }
        />
      </ClientPage>
    );
  }

  console.log('🏢 CLIENT CATALOG - Rendering catalog for company:', company.name);
  console.log('🏢 CLIENT CATALOG - Client has custom catalog:', clientData?.has_custom_catalog);
  console.log('🏢 CLIENT CATALOG - Is admin preview:', isAdmin);

  return (
    <div className="relative">
      {isAdmin && (
        <div className="fixed top-4 right-4 z-50">
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              fontWeight: 700,
              padding: '5px 11px',
              borderRadius: 20,
              background: '#E8EBFD',
              color: clientColors.indigo,
              border: `1px solid ${clientColors.indigo}22`,
            }}
          >
            <Crown size={13} />
            Prévisualisation Admin
          </span>
        </div>
      )}

      <ClientPage maxWidth={1240} style={{ paddingBottom: 96 }}>
        <ClientPageHeader
          title="Catalogue"
          subtitle="Composez votre demande de leasing. Matériel reconditionné & neuf, impact CO₂ affiché."
          action={
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 700,
                padding: '6px 12px',
                borderRadius: 20,
                background: '#E7F6F0',
                border: '1px solid #C7EBDA',
                color: '#047857',
              }}
            >
              <Leaf size={13} />
              Leasing circulaire
            </span>
          }
        />

        {/* Grille produits / panier — logique existante préservée (filtres, navigation, panier). */}
        <ClientCatalogAnonymous company={company} clientData={clientData} />
      </ClientPage>

      {/* Assistant de configuration — réservé aux clients connectés (pas le catalogue public) */}
      {clientData && (
        <>
          <button
            type="button"
            onClick={() => setIsWizardOpen(true)}
            className="fixed bottom-6 right-6 z-40 transition-transform hover:-translate-y-0.5"
            style={{ ...primaryBtnStyle, height: 48, padding: '0 20px', borderRadius: 14, background: CLIENT_GRADIENT }}
          >
            <Sparkles size={16} />
            Configurer avec l'assistant
          </button>
          <UsageConfiguratorDialog
            open={isWizardOpen}
            onOpenChange={setIsWizardOpen}
            companyId={company?.id}
            onConfirm={handleWizardSuggestions}
          />
        </>
      )}
    </div>
  );
};

export default ClientCatalogPage;