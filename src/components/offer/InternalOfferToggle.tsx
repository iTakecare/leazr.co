
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Building } from "lucide-react";

interface InternalOfferToggleProps {
  isInternalOffer: boolean;
  setIsInternalOffer: (value: boolean) => void;
  userName?: string;
}

const InternalOfferToggle: React.FC<InternalOfferToggleProps> = ({
  isInternalOffer,
  setIsInternalOffer,
  userName
}) => {
  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building className="h-5 w-5 text-primary" />
            <div className="flex flex-col">
              <Label htmlFor="internal-offer-toggle" className="text-sm font-medium">
                Type d'offre
              </Label>
              <span className="text-xs text-muted-foreground">
                {isInternalOffer 
                  ? "Offre interne (aucune commission)" 
                  : `Offre ambassadeur${userName ? ` - ${userName}` : ""}`
                }
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {isInternalOffer ? "Interne" : "Ambassadeur"}
            </span>
            <Switch
              id="internal-offer-toggle"
              checked={isInternalOffer}
              onCheckedChange={setIsInternalOffer}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InternalOfferToggle;
