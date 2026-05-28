import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Trash2, Package, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ProviderSelectorList, {
  SelectableExternalService,
} from "@/components/ui/product-selector/ProviderSelectorList";
import {
  fetchOfferPromoProducts,
  addOfferPromoProduct,
  deleteOfferPromoProduct,
} from "@/services/externalProviderService";
import { BILLING_PERIOD_LABELS } from "@/types/partner";
import { formatCurrency } from "@/utils/formatters";
import type { OfferPromoProduct } from "@/types/partner";

interface AddPromoProductsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  /** Managed mode: persists/lists/removes directly in DB for an existing offer. */
  offerId?: string;
  /** Controlled mode (create-offer flow): selections kept in parent local state. */
  onSelect?: (service: SelectableExternalService) => void;
}

const AddPromoProductsModal: React.FC<AddPromoProductsModalProps> = ({
  open,
  onOpenChange,
  companyId,
  offerId,
  onSelect,
}) => {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const managed = !!offerId;
  const queryKey = ["offer-promo-products", offerId];

  const { data: products = [] } = useQuery({
    queryKey,
    queryFn: () => fetchOfferPromoProducts(offerId!),
    enabled: managed && open,
  });

  const handleSelect = async (service: SelectableExternalService) => {
    if (managed) {
      try {
        await addOfferPromoProduct(offerId!, service, products.length);
        queryClient.invalidateQueries({ queryKey });
        toast.success(`"${service.product_name}" ajouté à la carte promo`);
      } catch (e: any) {
        console.error("Erreur ajout produit promo:", e);
        toast.error(e?.message || "Erreur lors de l'ajout du produit promo");
      }
      return;
    }
    onSelect?.(service);
    toast.success(`"${service.product_name}" ajouté à la carte promo`);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteOfferPromoProduct(id);
      queryClient.invalidateQueries({ queryKey });
      toast.success("Produit retiré de la carte promo");
    } catch (e: any) {
      console.error("Erreur suppression produit promo:", e);
      toast.error(e?.message || "Erreur lors de la suppression");
    } finally {
      setDeletingId(null);
    }
  };

  const grouped = products.reduce<Record<string, OfferPromoProduct[]>>((acc, p) => {
    if (!acc[p.provider_name]) acc[p.provider_name] = [];
    acc[p.provider_name].push(p);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 max-h-[85vh] flex flex-col">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Carte promo — Avez-vous pensé à... ?
          </DialogTitle>
          <DialogDescription>
            Sélectionnez des produits de prestataires externes à présenter en suggestion
            promotionnelle. Ils apparaissent sur le PDF mais ne sont pas inclus dans la mensualité.
          </DialogDescription>
        </DialogHeader>

        {/* Produits déjà ajoutés (mode géré uniquement) */}
        {managed && products.length > 0 && (
          <div className="px-4 py-3 border-b bg-amber-50/50 space-y-3 max-h-[30vh] overflow-y-auto">
            {Object.entries(grouped).map(([providerName, items]) => {
              const logo = items[0]?.provider_logo_url;
              return (
                <div key={providerName}>
                  <div className="flex items-center gap-2 mb-1">
                    {logo ? (
                      <img
                        src={logo}
                        alt={providerName}
                        className="h-6 w-6 rounded object-contain border bg-white p-0.5"
                      />
                    ) : (
                      <Package className="h-4 w-4 text-amber-600" />
                    )}
                    <span className="text-sm font-semibold">{providerName}</span>
                  </div>
                  {items.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-3 pl-8 py-1">
                      <div className="min-w-0">
                        <span className="text-sm">{p.product_name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {formatCurrency(p.price_htva)} HTVA{" "}
                          {BILLING_PERIOD_LABELS[p.billing_period] || p.billing_period}
                          {p.quantity > 1 ? ` ×${p.quantity}` : ""}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 shrink-0"
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
                  ))}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex-1 min-h-0">
          <ProviderSelectorList companyId={companyId} onSelectExternalService={handleSelect} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddPromoProductsModal;
