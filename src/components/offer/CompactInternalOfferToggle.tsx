
import React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Building } from "lucide-react";

interface CompactInternalOfferToggleProps {
  isInternalOffer: boolean;
  setIsInternalOffer: (value: boolean) => void;
}

const CompactInternalOfferToggle: React.FC<CompactInternalOfferToggleProps> = ({
  isInternalOffer,
  setIsInternalOffer
}) => {
  return (
    <div className="flex items-center gap-3 px-3 py-2 border rounded-lg bg-background">
      <Building className="h-4 w-4 text-primary" />
      <div className="flex flex-col">
        <Label htmlFor="compact-internal-toggle" className="text-xs font-medium">
          Type d'offre
        </Label>
        <span className="text-xs text-muted-foreground">
          {isInternalOffer ? "Interne" : "Ambassadeur"}
        </span>
      </div>
      <Switch
        id="compact-internal-toggle"
        checked={isInternalOffer}
        onCheckedChange={setIsInternalOffer}
        size="sm"
      />
    </div>
  );
};

export default CompactInternalOfferToggle;
