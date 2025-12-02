import React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
      <ToggleGroup 
        type="single" 
        value={isPurchase ? "purchase" : "leasing"}
        onValueChange={(value) => {
          if (value) setIsPurchase(value === "purchase");
        }}
        disabled={disabled}
        className="justify-start border rounded-lg p-1 bg-muted/50"
      >
        <ToggleGroupItem 
          value="leasing" 
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-all",
            !isPurchase 
              ? "!bg-blue-600 !text-white shadow-md" 
              : "bg-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <CreditCard className="h-4 w-4" />
          Leasing
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="purchase" 
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-all",
            isPurchase 
              ? "!bg-green-600 !text-white shadow-md" 
              : "bg-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <ShoppingCart className="h-4 w-4" />
          Achat
        </ToggleGroupItem>
      </ToggleGroup>
      
      {isPurchase && (
        <p className="text-xs text-muted-foreground">
          Vente directe sans financement
        </p>
      )}
    </div>
  );
};

export default PurchaseToggle;
