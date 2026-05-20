import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Check, ExternalLink, Info } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { fetchCatalogExternalProviders } from '@/services/externalProviderService';
import { useCart } from '@/context/CartContext';
import { BILLING_PERIOD_LABELS } from '@/types/partner';
import { formatCurrency } from '@/utils/formatters';

interface ExternalProviderUpsellProps {
  companyId: string;
  className?: string;
}

const ExternalProviderUpsell: React.FC<ExternalProviderUpsellProps> = ({ companyId, className }) => {
  const { externalProviderProducts, addExternalProviderProduct, removeExternalProviderProduct } = useCart();

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['catalog-external-providers', companyId],
    queryFn: () => fetchCatalogExternalProviders(companyId),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });

  const isSelected = (productId: string) =>
    externalProviderProducts.some((p) => p.product_id === productId);

  if (isLoading || providers.length === 0) {
    return null;
  }

  // Only show providers that actually have at least one active product
  const visibleProviders = providers.filter((p) => p.products.length > 0);
  if (visibleProviders.length === 0) return null;

  return (
    <section className={className}>
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Services partenaires disponibles</h2>
        <p className="text-sm text-muted-foreground">
          Ajoutez à votre demande des services proposés par nos prestataires partenaires.
        </p>
      </div>

      <Alert className="mb-4">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Les services partenaires sont facturés directement par chaque prestataire et ne sont pas inclus
          dans votre loyer mensuel.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleProviders.map((provider) => (
          <Card key={provider.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                {provider.logo_url ? (
                  <img
                    src={provider.logo_url}
                    alt={provider.name}
                    className="h-12 w-12 rounded object-contain border bg-white"
                  />
                ) : (
                  <div className="h-12 w-12 rounded bg-muted flex items-center justify-center text-sm font-semibold">
                    {provider.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{provider.name}</h3>
                    {provider.website_url && (
                      <a
                        href={provider.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                        title="Site web"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  {provider.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {provider.description}
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {provider.products.map((product) => {
                  const selected = isSelected(product.id);
                  return (
                    <div
                      key={product.id}
                      className={`flex items-center justify-between gap-3 p-3 rounded-md border ${
                        selected ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{product.name}</p>
                        {product.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {product.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-semibold">
                            {formatCurrency(product.price_htva)} HTVA
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {BILLING_PERIOD_LABELS[product.billing_period] || product.billing_period}
                          </Badge>
                        </div>
                      </div>
                      {selected ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeExternalProviderProduct(product.id)}
                        >
                          <Check className="h-4 w-4 mr-1" /> Ajouté
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() =>
                            addExternalProviderProduct({
                              provider_id: provider.id,
                              provider_name: provider.name,
                              provider_logo_url: provider.logo_url,
                              product_id: product.id,
                              product_name: product.name,
                              price_htva: product.price_htva,
                              billing_period: product.billing_period,
                              quantity: 1,
                            })
                          }
                        >
                          <Plus className="h-4 w-4 mr-1" /> Ajouter
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default ExternalProviderUpsell;
