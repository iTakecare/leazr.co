import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ShoppingCart, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface PurchaseToggleProps {
  isPurchase: boolean;
  setIsPurchase: (value: boolean) => void;
  disabled?: boolean;
}

const PurchaseToggle: React.FC<PurchaseToggleProps> = ({
  isPurchase,
  setIsPurchase,
  disabled = false
}) => {
  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center space-x-3">
        <Checkbox
          id="isPurchase"
          checked={isPurchase}
          onCheckedChange={(checked) => setIsPurchase(!!checked)}
          disabled={disabled}
          className="h-5 w-5"
        />
        <Label 
          htmlFor="isPurchase" 
          className={cn(
            "cursor-pointer flex items-center gap-2 text-sm font-medium",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {isPurchase ? (
            <>
              <ShoppingCart className="h-4 w-4 text-primary" />
              Achat direct
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              Leasing
            </>
          )}
        </Label>
      </div>
      {isPurchase && (
        <p className="text-xs text-muted-foreground ml-8">
          Vente directe sans financement
        </p>
      )}
    </div>
  );
};

export default PurchaseToggle;
