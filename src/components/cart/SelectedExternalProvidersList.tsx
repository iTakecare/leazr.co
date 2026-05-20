import React from 'react';
import { Trash2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/context/CartContext';
import { BILLING_PERIOD_LABELS } from '@/types/partner';
import { formatCurrency } from '@/utils/formatters';

interface Props {
  className?: string;
  // Display variant
  variant?: 'card' | 'inline';
}

const SelectedExternalProvidersList: React.FC<Props> = ({ className = '', variant = 'card' }) => {
  const {
    externalProviderProducts,
    removeExternalProviderProduct,
    updateExternalProviderProductQuantity,
  } = useCart();

  if (externalProviderProducts.length === 0) return null;

  const groupedByProvider = externalProviderProducts.reduce((acc, item) => {
    if (!acc[item.provider_id]) acc[item.provider_id] = [];
    acc[item.provider_id].push(item);
    return acc;
  }, {} as Record<string, typeof externalProviderProducts>);

  const wrapperClass = variant === 'card' ? 'bg-card rounded-lg border p-6' : '';

  return (
    <div className={`${wrapperClass} ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-base font-semibold">Services partenaires sélectionnés</h3>
        <Badge variant="outline" className="text-xs">
          {externalProviderProducts.length} service{externalProviderProducts.length > 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="flex items-start gap-2 text-xs text-muted-foreground mb-4 p-2 rounded bg-muted/40">
        <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
        <p>Ces services sont facturés directement par chaque prestataire et ne sont pas inclus dans votre loyer mensuel.</p>
      </div>

      <div className="space-y-3">
        {Object.entries(groupedByProvider).map(([providerId, products]) => {
          const provider = products[0];
          return (
            <div key={providerId} className="border rounded-md p-3">
              <div className="flex items-center gap-2 mb-2">
                {provider.provider_logo_url && (
                  <img
                    src={provider.provider_logo_url}
                    alt={provider.provider_name}
                    className="h-6 w-6 rounded object-contain"
                  />
                )}
                <p className="font-medium text-sm">{provider.provider_name}</p>
              </div>
              <div className="space-y-2">
                {products.map((p) => (
                  <div key={p.product_id} className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{p.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(p.price_htva)} HTVA{' '}
                        <span>({BILLING_PERIOD_LABELS[p.billing_period] || p.billing_period})</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded-l"
                        onClick={() => updateExternalProviderProductQuantity(p.product_id, p.quantity - 1)}
                        type="button"
                      >
                        -
                      </button>
                      <span className="w-8 h-6 flex items-center justify-center border-t border-b border-gray-300">
                        {p.quantity}
                      </span>
                      <button
                        className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded-r"
                        onClick={() => updateExternalProviderProductQuantity(p.product_id, p.quantity + 1)}
                        type="button"
                      >
                        +
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeExternalProviderProduct(p.product_id)}
                        type="button"
                        className="h-7 w-7 ml-1 text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SelectedExternalProvidersList;
