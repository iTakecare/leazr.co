import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Plus, Trash2, Package, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  fetchOfferPromoProducts,
  addOfferPromoProduct,
  deleteOfferPromoProduct,
} from "@/services/externalProviderService";
import { BILLING_PERIOD_LABELS } from "@/types/partner";
import { formatCurrency } from "@/utils/formatters";
import type { OfferPromoProduct } from "@/types/partner";
import AddPromoProductsModal from "./AddPromoProductsModal";
import type { SelectableExternalService } from "@/components/ui/product-selector/ProviderSelectorList";

interface PromoProductsSectionProps {
  offerId: string;
  companyId: string;
}

const PromoProductsSection: React.FC<PromoProductsSectionProps> = ({ offerId, companyId }) => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const queryKey = ["offer-promo-products", offerId];

  const { data: products = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchOfferPromoProducts(offerId),
    enabled: !!offerId,
  });

  const handleSelect = async (service: SelectableExternalService) => {
    try {
      await addOfferPromoProduct(offerId, service, products.length);
      queryClient.invalidateQueries({ queryKey });
    } catch (e: any) {
      console.error("Erreur ajout produit promo:", e);
      toast.error(e?.message || "Erreur lors de l'ajout du produit promo");
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteOfferPromoProduct(id);
      toast.success("Produit retiré de la carte promo");
      queryClient.invalidateQueries({ queryKey });
    } catch (e: any) {
      console.error("Erreur suppression produit promo:", e);
      toast.error(e?.message || "Erreur lors de la suppression");
    } finally {
      setDeletingId(null);
    }
  };

  // Group by provider
  const grouped = products.reduce<Record<string, OfferPromoProduct[]>>((acc, p) => {
    if (!acc[p.provider_name]) acc[p.provider_name] = [];
    acc[p.provider_name].push(p);
    return acc;
  }, {});

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Carte promo — Avez-vous pensé à... ?
            {products.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {products.length}
              </Badge>
            )}
            <Button
              size="sm"
              variant="outline"
              className="ml-auto"
              onClick={() => setModalOpen(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Ajouter
            </Button>
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Suggestions promotionnelles de prestataires externes affichées sur le PDF — non
            incluses dans la mensualité.
          </p>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Chargement...
            </div>
          ) : products.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              Aucun produit promo. Cliquez sur « Ajouter » pour en sélectionner.
            </p>
          ) : (
            Object.entries(grouped).map(([providerName, items]) => {
              const logo = items[0]?.provider_logo_url;
              return (
                <div key={providerName} className="border rounded-md p-3">
                  <div className="flex items-center gap-3 mb-2">
                    {logo ? (
                      <img
                        src={logo}
                        alt={providerName}
                        className="h-8 w-8 rounded object-contain border bg-white p-0.5"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded bg-amber-50 flex items-center justify-center">
                        <Package className="h-4 w-4 text-amber-600" />
                      </div>
                    )}
                    <p className="text-sm font-semibold">{providerName}</p>
                  </div>
                  <div className="divide-y divide-border">
                    {items.map((p) => (
                      <div
                        key={p.id}
                        className="py-2 first:pt-0 last:pb-0 flex items-start justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{p.product_name}</p>
                          {p.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="text-sm font-semibold">
                              {formatCurrency(p.price_htva)} HTVA{" "}
                              <span className="text-xs font-normal text-muted-foreground">
                                {BILLING_PERIOD_LABELS[p.billing_period] || p.billing_period}
                              </span>
                            </p>
                            {p.quantity > 1 && (
                              <p className="text-xs text-muted-foreground">x{p.quantity}</p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            disabled={deletingId === p.id}
                            onClick={() => handleDelete(p.id)}
                          >
                            {deletingId === p.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-destructive" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <AddPromoProductsModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        companyId={companyId}
        onSelect={handleSelect}
      />
    </>
  );
};

export default PromoProductsSection;
