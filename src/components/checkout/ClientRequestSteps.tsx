import React from 'react';
import { useRoleNavigation } from '@/hooks/useRoleNavigation';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import {
  clientColors,
  ClientPage,
  ClientPageHeader,
  ClientEmptyState,
  primaryBtnStyle,
  ghostBtnStyle,
} from '@/components/client/clientUi';
import ClientRequestSummary from './ClientRequestSummary';

const ClientRequestSteps: React.FC = () => {
  const { navigateToClient } = useRoleNavigation();
  const { items } = useCart();

  // Redirect if cart is empty
  React.useEffect(() => {
    if (items.length === 0) {
      navigateToClient('panier');
    }
  }, [items, navigateToClient]);

  if (items.length === 0) {
    return (
      <ClientPage maxWidth={1040}>
        <ClientEmptyState
          icon={<ShoppingBag size={40} color={clientColors.faint} />}
          title="Votre panier est vide"
          description="Vous devez ajouter des produits à votre panier avant de faire une demande."
          action={
            <button
              type="button"
              style={primaryBtnStyle}
              onClick={() => navigateToClient('products')}
            >
              Voir le catalogue
            </button>
          }
        />
      </ClientPage>
    );
  }

  return (
    <ClientPage maxWidth={1040}>
      <ClientPageHeader
        title="Finaliser ma demande"
        subtitle="Vérifiez votre sélection et complétez les informations avant l’envoi."
        action={
          <button
            type="button"
            style={ghostBtnStyle}
            onClick={() => navigateToClient('panier')}
          >
            <ArrowLeft size={15} />
            Retour au panier
          </button>
        }
      />

      <ClientRequestSummary />
    </ClientPage>
  );
};

export default ClientRequestSteps;
