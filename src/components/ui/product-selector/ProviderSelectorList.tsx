import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Headphones, Plus, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fetchExternalProviders, fetchProviderProducts } from "@/services/externalProviderService";
import { BILLING_PERIOD_LABELS } from "@/types/partner";
import { formatCurrency } from "@/utils/formatters";

export interface SelectableExternalService {
  provider_id: string;
  provider_name: string;
  provider_logo_url?: string;
  product_id: string;
  product_name: string;
  description?: string;
  tagline?: string;
  spec?: string;
  footnote?: string;
  price_htva: number;
  billing_period: "monthly" | "yearly" | "one_time" | string;
  quantity: number;
}

interface ProviderSelectorListProps {
  companyId: string;
  onSelectExternalService: (service: SelectableExternalService) => void;
}

const ProviderSelectorList: React.FC<ProviderSelectorListProps> = ({
  companyId,
  onSelectExternalService,
}) => {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ["external-providers-for-offer", companyId],
    queryFn: () => fetchExternalProviders(companyId),
    enabled: !!companyId,
  });

  const activeProviders = providers.filter((p) => p.is_active);

  const filtered = activeProviders.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  if (isLoading) {
    return <div className="p-6 text-center text-sm text-muted-foreground">Chargement...</div>;
  }

  if (activeProviders.length === 0) {
    return (
      <div className="p-6">
        <Alert>
          <AlertDescription className="text-sm">
            Aucun prestataire externe configuré. Ajoutez-les dans{" "}
            <strong>Gestion du catalogue → Prestataires externes</strong>.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <Input
          placeholder="Rechercher un prestataire..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Les services sélectionnés apparaissent sur l'offre mais{" "}
          <strong>ne sont pas inclus</strong> dans le total à financer — ils sont facturés
          directement par chaque prestataire.
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {filtered.map((provider) => (
            <ProviderCard
              key={provider.id}
              providerId={provider.id}
              providerName={provider.name}
              providerLogo={provider.logo_url}
              providerWebsite={provider.website_url}
              providerDescription={provider.description}
              expanded={!!expanded[provider.id]}
              onToggle={() => toggle(provider.id)}
              onSelectExternalService={onSelectExternalService}
            />
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aucun prestataire ne correspond à "{search}".
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

interface ProviderCardProps {
  providerId: string;
  providerName: string;
  providerLogo?: string;
  providerWebsite?: string;
  providerDescription?: string;
  expanded: boolean;
  onToggle: () => void;
  onSelectExternalService: (service: SelectableExternalService) => void;
}

const ProviderCard: React.FC<ProviderCardProps> = ({
  providerId,
  providerName,
  providerLogo,
  providerWebsite,
  providerDescription,
  expanded,
  onToggle,
  onSelectExternalService,
}) => {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["external-provider-products", providerId],
    queryFn: () => fetchProviderProducts(providerId),
    enabled: expanded,
  });

  const activeProducts = products.filter((p) => p.is_active);

  return (
    <Card>
      <CardHeader className="py-3 cursor-pointer" onClick={onToggle}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {providerLogo ? (
              <img
                src={providerLogo}
                alt={providerName}
                className="h-10 w-10 rounded object-contain border bg-white p-0.5"
              />
            ) : (
              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                <Headphones className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold truncate">{providerName}</p>
                {providerWebsite && (
                  <a
                    href={providerWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              {providerDescription && (
                <p className="text-xs text-muted-foreground line-clamp-1">{providerDescription}</p>
              )}
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0" />
          )}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          {isLoading ? (
            <p className="text-xs text-muted-foreground py-2">Chargement...</p>
          ) : activeProducts.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Aucun service actif pour ce prestataire.</p>
          ) : (
            <div className="space-y-2">
              {activeProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between gap-3 p-2 rounded-md border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    {product.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{product.description}</p>
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
                  <Button
                    size="sm"
                    onClick={() =>
                      onSelectExternalService({
                        provider_id: providerId,
                        provider_name: providerName,
                        provider_logo_url: providerLogo,
                        product_id: product.id,
                        product_name: product.name,
                        description: product.description,
                        tagline: product.tagline,
                        spec: product.spec,
                        footnote: product.footnote,
                        price_htva: product.price_htva,
                        billing_period: product.billing_period,
                        quantity: 1,
                      })
                    }
                  >
                    <Plus className="h-4 w-4 mr-1" /> Ajouter
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default ProviderSelectorList;
