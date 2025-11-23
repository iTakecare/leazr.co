import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Product } from "@/types/catalog";
import { Copy, Loader2 } from "lucide-react";

interface ProductDuplicationDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (options: {
    copyImages: boolean;
    copyUpsells: boolean;
    copyVariantPrices: boolean;
    nameSuffix: string;
  }) => void;
  isLoading?: boolean;
}

const ProductDuplicationDialog: React.FC<ProductDuplicationDialogProps> = ({
  product,
  open,
  onOpenChange,
  onConfirm,
  isLoading = false
}) => {
  const [copyImages, setCopyImages] = useState(true);
  const [copyUpsells, setCopyUpsells] = useState(true);
  const [copyVariantPrices, setCopyVariantPrices] = useState(true);
  const [nameSuffix, setNameSuffix] = useState("Copie");
  
  if (!product) return null;
  
  const previewName = `${product.name} (${nameSuffix})`;
  
  const handleConfirm = () => {
    onConfirm({
      copyImages,
      copyUpsells,
      copyVariantPrices,
      nameSuffix
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Dupliquer le produit
          </DialogTitle>
          <DialogDescription>
            Configurez les options de duplication pour "{product.name}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Name suffix */}
          <div className="space-y-2">
            <Label htmlFor="nameSuffix">Suffixe du nom</Label>
            <Input
              id="nameSuffix"
              value={nameSuffix}
              onChange={(e) => setNameSuffix(e.target.value)}
              placeholder="Copie"
            />
            <p className="text-sm text-muted-foreground">
              Aperçu : <span className="font-medium">{previewName}</span>
            </p>
          </div>
          
          {/* Options */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="copyImages"
                checked={copyImages}
                onCheckedChange={(checked) => setCopyImages(checked as boolean)}
              />
              <Label htmlFor="copyImages" className="cursor-pointer font-normal">
                Copier les images (fichiers physiques)
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="copyVariantPrices"
                checked={copyVariantPrices}
                onCheckedChange={(checked) => setCopyVariantPrices(checked as boolean)}
              />
              <Label htmlFor="copyVariantPrices" className="cursor-pointer font-normal">
                Copier les prix de variantes
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="copyUpsells"
                checked={copyUpsells}
                onCheckedChange={(checked) => setCopyUpsells(checked as boolean)}
              />
              <Label htmlFor="copyUpsells" className="cursor-pointer font-normal">
                Copier les upsells manuels
              </Label>
            </div>
          </div>
          
          {/* Info */}
          <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            <p>
              Le produit dupliqué sera indépendant de l'original. Un nouveau slug et SKU seront générés automatiquement.
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || !nameSuffix.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Duplication...
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Dupliquer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDuplicationDialog;
