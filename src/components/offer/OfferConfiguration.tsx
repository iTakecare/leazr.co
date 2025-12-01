
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import CompactInternalOfferToggle from "./CompactInternalOfferToggle";
import AmbassadorButton from "./AmbassadorButton";
import LeaserButton from "./LeaserButton";
import DurationButton from "./DurationButton";
import { FileFeeConfiguration } from "./FileFeeConfiguration";
import PurchaseToggle from "./PurchaseToggle";
import { Leaser } from "@/types/equipment";
import { AmbassadorSelectorAmbassador } from "@/components/ui/AmbassadorSelector";

interface OfferConfigurationProps {
  isInternalOffer: boolean;
  setIsInternalOffer: (value: boolean) => void;
  selectedAmbassador: AmbassadorSelectorAmbassador | null;
  onOpenAmbassadorSelector: () => void;
  selectedLeaser: Leaser | null;
  onOpenLeaserSelector: () => void;
  selectedDuration: number;
  onDurationChange: (duration: number) => void;
  fileFeeEnabled?: boolean;
  fileFeeAmount?: number;
  onFileFeeEnabledChange?: (enabled: boolean) => void;
  onFileFeeAmountChange?: (amount: number) => void;
  // Nouvelles props pour le mode achat
  isPurchase?: boolean;
  setIsPurchase?: (value: boolean) => void;
}

const OfferConfiguration: React.FC<OfferConfigurationProps> = ({
  isInternalOffer,
  setIsInternalOffer,
  selectedAmbassador,
  onOpenAmbassadorSelector,
  selectedLeaser,
  onOpenLeaserSelector,
  selectedDuration,
  onDurationChange,
  fileFeeEnabled,
  fileFeeAmount,
  onFileFeeEnabledChange,
  onFileFeeAmountChange,
  isPurchase = false,
  setIsPurchase
}) => {
  const showFileFeeConfig = fileFeeEnabled !== undefined && 
                            fileFeeAmount !== undefined && 
                            onFileFeeEnabledChange && 
                            onFileFeeAmountChange;

  const showPurchaseToggle = setIsPurchase !== undefined;

  // Calculer le nombre de colonnes dynamiquement
  const getGridCols = () => {
    let cols = 2; // Type d'offre + au moins un autre
    if (!isInternalOffer) cols++; // Ambassadeur
    if (!isPurchase) cols += 2; // Prestataire + Durée (seulement en mode leasing)
    if (showFileFeeConfig && !isPurchase) cols++; // Frais de dossier (seulement en mode leasing)
    return Math.min(cols, 6);
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4 text-primary" />
          Configuration de l'offre
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${getGridCols()} gap-3`}>
          {/* Mode Achat/Leasing */}
          {showPurchaseToggle && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Mode de vente
              </label>
              <PurchaseToggle
                isPurchase={isPurchase}
                setIsPurchase={setIsPurchase}
              />
            </div>
          )}

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

          {/* Prestataire de leasing (seulement en mode leasing) */}
          {!isPurchase && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Prestataire de leasing
              </label>
              <LeaserButton 
                selectedLeaser={selectedLeaser} 
                onOpen={onOpenLeaserSelector}
              />
            </div>
          )}

          {/* Durée de financement (seulement en mode leasing) */}
          {!isPurchase && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Durée de financement
              </label>
              <DurationButton
                selectedDuration={selectedDuration}
                onDurationChange={onDurationChange}
                leaser={selectedLeaser}
              />
              {!selectedLeaser && (
                <p className="text-xs text-muted-foreground">
                  Sélectionnez d'abord un prestataire
                </p>
              )}
            </div>
          )}

          {/* Frais de dossier (optionnel, seulement en mode leasing) */}
          {showFileFeeConfig && !isPurchase && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Montant frais de dossier (HTVA)
              </label>
              <FileFeeConfiguration
                fileFeeEnabled={fileFeeEnabled}
                fileFeeAmount={fileFeeAmount}
                onFileFeeEnabledChange={onFileFeeEnabledChange}
                onFileFeeAmountChange={onFileFeeAmountChange}
              />
            </div>
          )}
        </div>

        {/* Message informatif pour le mode achat */}
        {isPurchase && (
          <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <p className="text-sm text-primary font-medium">
              Mode Achat Direct
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Cette offre sera une vente directe sans financement. Le client paiera le montant total en une fois.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OfferConfiguration;
