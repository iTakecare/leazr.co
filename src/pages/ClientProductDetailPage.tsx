import React from 'react';
import WaveLoader from "@/components/ui/WaveLoader";
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import ClientProductDetail from '@/components/catalog/client/ClientProductDetail';
import { supabase } from '@/integrations/supabase/client';
import { useClientData } from '@/hooks/useClientData';
import {
  ClientPage,
  ClientCard,
  clientColors,
  ghostBtnStyle,
} from '@/components/client/clientUi';

/** Bouton "Retour au catalogue" stylé maquette navy. */
const BackButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button type="button" onClick={onClick} style={ghostBtnStyle}>
    <ArrowLeft size={15} />
    Retour au catalogue
  </button>
);

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

  // Show loading if any data is still loading or if clientData doesn't have an ID yet
  if (clientLoading || isLoadingCompany || !clientData?.id) {
    return (
      <ClientPage maxWidth={1180}>
        <ClientCard
          pad={48}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 360 }}
        >
          <WaveLoader message="Chargement du produit..." />
        </ClientCard>
      </ClientPage>
    );
  }

  if (companyError || !company) {
    return (
      <ClientPage maxWidth={1180}>
        <div style={{ marginBottom: 22 }}>
          <BackButton onClick={() => navigate('/client/products')} />
        </div>
        <ClientCard pad={36} style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <AlertCircle size={32} color={clientColors.orange} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: clientColors.ink }}>
            Erreur lors du chargement de l'entreprise
          </h3>
          {companyError && (
            <p style={{ fontSize: 13, color: clientColors.muted, margin: '8px 0 0' }}>
              {companyError.message}
            </p>
          )}
        </ClientCard>
      </ClientPage>
    );
  }

  if (!productId) {
    return (
      <ClientPage maxWidth={1180}>
        <div style={{ marginBottom: 22 }}>
          <BackButton onClick={() => navigate('/client/products')} />
        </div>
        <ClientCard pad={36} style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <AlertCircle size={32} color={clientColors.orange} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: clientColors.ink }}>
            ID du produit manquant
          </h3>
        </ClientCard>
      </ClientPage>
    );
  }

  return (
    <ClientPage maxWidth={1180}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 22,
        }}
      >
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: '-.02em',
            margin: 0,
            color: clientColors.ink,
          }}
        >
          Détail du produit
        </h1>
        <BackButton onClick={() => navigate('/client/products')} />
      </div>

      <ClientProductDetail
        companyId={company.id}
        companySlug={company.slug}
        productId={productId}
        clientId={clientData.id}
        company={company}
        onBackToCatalog={() => navigate('/client/products')}
      />
    </ClientPage>
  );
};

export default ClientProductDetailPage;
