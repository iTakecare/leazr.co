
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import CompactInternalOfferToggle from "./CompactInternalOfferToggle";
import AmbassadorButton from "./AmbassadorButton";
import LeaserButton from "./LeaserButton";
import { Leaser } from "@/types/equipment";
import { AmbassadorSelectorAmbassador } from "@/components/ui/AmbassadorSelector";

interface OfferConfigurationProps {
  isInternalOffer: boolean;
  setIsInternalOffer: (value: boolean) => void;
  selectedAmbassador: AmbassadorSelectorAmbassador | null;
  onOpenAmbassadorSelector: () => void;
  selectedLeaser: Leaser | null;
  onOpenLeaserSelector: () => void;
}

const OfferConfiguration: React.FC<OfferConfigurationProps> = ({
  isInternalOffer,
  setIsInternalOffer,
  selectedAmbassador,
  onOpenAmbassadorSelector,
  selectedLeaser,
  onOpenLeaserSelector
}) => {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4 text-primary" />
          Configuration de l'offre
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Type d'offre */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">
              Type d'offre
            </label>
            <CompactInternalOfferToggle
              isInternalOffer={isInternalOffer}
              setIsInternalOffer={setIsInternalOffer}
            />
            {!isInternalOffer && (
              <p className="text-xs text-muted-foreground">
                Commission calculée pour l'ambassadeur
              </p>
            )}
          </div>

          {/* Sélection ambassadeur (si offre ambassadeur) */}
          {!isInternalOffer && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Ambassadeur
              </label>
              <AmbassadorButton
                selectedAmbassador={selectedAmbassador}
                onOpen={onOpenAmbassadorSelector}
              />
              {!selectedAmbassador && (
                <p className="text-xs text-red-500">
                  Sélection obligatoire
                </p>
              )}
            </div>
          )}

          {/* Prestataire de leasing */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">
              Prestataire de leasing
            </label>
            <LeaserButton 
              selectedLeaser={selectedLeaser} 
              onOpen={onOpenLeaserSelector}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OfferConfiguration;
