import React from 'react';
import { useRoleNavigation } from '@/hooks/useRoleNavigation';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/utils/formatters';
import { getProductPrice } from '@/utils/productPricing';
import { Trash2, ShoppingBag, ArrowRight, ArrowLeft, Minus, Plus } from 'lucide-react';
import {
  clientColors,
  CLIENT_GRADIENT,
  ClientPage,
  ClientPageHeader,
  ClientCard,
  primaryBtnStyle,
  ghostBtnStyle,
  ClientEmptyState,
} from '@/components/client/clientUi';

const ClientCartPage: React.FC = () => {
  const { items, removeFromCart, updateQuantity, cartTotal } = useCart();
  const { navigateToClient } = useRoleNavigation();

  const handleRemoveItem = (productId: string) => {
    removeFromCart(productId);
  };

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity >= 1) {
      updateQuantity(productId, newQuantity);
    }
  };

  return (
    <ClientPage maxWidth={1040}>
      <ClientPageHeader
        title="Mon panier"
        subtitle={
          items.length > 0
            ? `${items.length} article${items.length > 1 ? 's' : ''} dans votre panier`
            : 'Votre sélection d’équipements à louer'
        }
        action={
          <button
            type="button"
            style={ghostBtnStyle}
            onClick={() => navigateToClient('products')}
          >
            <ArrowLeft size={15} />
            Continuer mes achats
          </button>
        }
      />

      {items.length === 0 ? (
        <ClientEmptyState
          icon={<ShoppingBag size={40} color={clientColors.faint} />}
          title="Votre panier est vide"
          description="Parcourez notre catalogue pour trouver des équipements à louer."
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
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1fr) 320px',
            gap: 22,
            alignItems: 'start',
          }}
          className="cart-grid"
        >
          {/* Liste des articles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {items.map((item) => {
              const monthly = getProductPrice(item.product, item.selectedOptions).monthlyPrice;
              return (
                <ClientCard key={item.product.id} pad={16}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div
                      style={{
                        width: 84,
                        height: 84,
                        flexShrink: 0,
                        borderRadius: 12,
                        background: '#fff',
                        border: `1px solid ${clientColors.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      <img
                        src={item.product.image_url || '/placeholder.svg'}
                        alt={item.product.name}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }}
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 12,
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <h3
                            style={{
                              fontSize: 14.5,
                              fontWeight: 700,
                              color: clientColors.ink,
                              margin: 0,
                            }}
                          >
                            {item.product.name}
                          </h3>
                          <p style={{ fontSize: 12.5, color: clientColors.muted, margin: '3px 0 0' }}>
                            {item.product.brand && `${item.product.brand} • `}
                            {item.duration} mois
                          </p>
                          {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                            <div style={{ marginTop: 4, fontSize: 11.5, color: clientColors.faint }}>
                              {Object.entries(item.selectedOptions).map(([key, value], index, arr) => (
                                <span key={key}>
                                  {key}: {value}
                                  {index < arr.length - 1 ? ' | ' : ''}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p
                            style={{
                              fontSize: 14.5,
                              fontWeight: 800,
                              color: clientColors.indigo,
                              margin: 0,
                            }}
                          >
                            {formatCurrency(monthly)}
                            <span style={{ fontSize: 11.5, fontWeight: 600, color: clientColors.muted }}>
                              {' '}/ mois
                            </span>
                          </p>
                          {/* Contrôle quantité */}
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              marginTop: 8,
                              border: `1px solid ${clientColors.border}`,
                              borderRadius: 10,
                              overflow: 'hidden',
                            }}
                          >
                            <button
                              type="button"
                              aria-label="Diminuer la quantité"
                              onClick={() => handleQuantityChange(item.product.id, item.quantity - 1)}
                              style={{
                                width: 30,
                                height: 30,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: 0,
                                background: '#fff',
                                cursor: 'pointer',
                                color: clientColors.muted,
                              }}
                            >
                              <Minus size={14} />
                            </button>
                            <span
                              style={{
                                width: 36,
                                height: 30,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 13,
                                fontWeight: 700,
                                color: clientColors.ink,
                                borderLeft: `1px solid ${clientColors.border}`,
                                borderRight: `1px solid ${clientColors.border}`,
                              }}
                            >
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              aria-label="Augmenter la quantité"
                              onClick={() => handleQuantityChange(item.product.id, item.quantity + 1)}
                              style={{
                                width: 30,
                                height: 30,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: 0,
                                background: '#fff',
                                cursor: 'pointer',
                                color: clientColors.muted,
                              }}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: 12,
                          paddingTop: 12,
                          borderTop: `1px solid ${clientColors.borderSoft}`,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.product.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            border: 0,
                            background: 'transparent',
                            cursor: 'pointer',
                            fontSize: 12.5,
                            fontWeight: 600,
                            color: '#DC2626',
                            padding: 0,
                          }}
                        >
                          <Trash2 size={14} />
                          Supprimer
                        </button>
                        <p style={{ fontSize: 12.5, color: clientColors.muted, margin: 0 }}>
                          Sous-total :{' '}
                          <span style={{ fontWeight: 700, color: clientColors.ink }}>
                            {formatCurrency(monthly * item.quantity)}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </ClientCard>
              );
            })}
          </div>

          {/* Récapitulatif sticky */}
          <ClientCard pad={20} style={{ position: 'sticky', top: 20 }}>
            <h2
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: clientColors.ink,
                margin: '0 0 14px',
              }}
            >
              Récapitulatif
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Row label="Sous-total mensuel" value={formatCurrency(cartTotal)} />
              <Row label="Frais de livraison" value="Gratuit" />
              <div style={{ height: 1, background: clientColors.border, margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: clientColors.ink }}>
                  Total mensuel estimé
                </span>
                <span style={{ fontSize: 18, fontWeight: 800, color: clientColors.indigo }}>
                  {formatCurrency(cartTotal)}
                </span>
              </div>
              <p style={{ fontSize: 11.5, color: clientColors.faint, margin: '2px 0 0' }}>
                Prix HT pour une durée de 36 mois. Engagement ferme.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigateToClient('panier/demande')}
              style={{ ...primaryBtnStyle, width: '100%', height: 44, marginTop: 18 }}
            >
              Envoyer la demande
              <ArrowRight size={16} />
            </button>
          </ClientCard>
        </div>
      )}

      <style>{`
        @media (max-width: 860px) {
          .cart-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </ClientPage>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
    <span style={{ fontSize: 13, color: clientColors.muted }}>{label}</span>
    <span style={{ fontSize: 13, fontWeight: 600, color: clientColors.ink }}>{value}</span>
  </div>
);

export default ClientCartPage;
