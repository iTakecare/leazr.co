
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
    <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-background h-10">
      <Building className="h-4 w-4 text-primary flex-shrink-0" />
      <div className="flex flex-col flex-1 min-w-0">
        <Label htmlFor="compact-internal-toggle" className="text-xs font-medium leading-tight">
          {isInternalOffer ? "Interne" : "Ambassadeur"}
        </Label>
      </div>
      <Switch
        id="compact-internal-toggle"
        checked={isInternalOffer}
        onCheckedChange={setIsInternalOffer}
        className="flex-shrink-0"
      />
    </div>
  );
};

export default CompactInternalOfferToggle;
