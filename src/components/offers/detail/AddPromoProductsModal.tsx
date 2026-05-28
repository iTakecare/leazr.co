import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import ProviderSelectorList, {
  SelectableExternalService,
} from "@/components/ui/product-selector/ProviderSelectorList";

interface AddPromoProductsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSelect: (service: SelectableExternalService) => void;
}

const AddPromoProductsModal: React.FC<AddPromoProductsModalProps> = ({
  open,
  onOpenChange,
  companyId,
  onSelect,
}) => {
  const handleSelect = (service: SelectableExternalService) => {
    onSelect(service);
    toast.success(`"${service.product_name}" ajouté à la carte promo`);
  };

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
        <div className="flex-1 min-h-0">
          <ProviderSelectorList companyId={companyId} onSelectExternalService={handleSelect} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddPromoProductsModal;
