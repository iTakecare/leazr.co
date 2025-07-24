import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { usePackCreator } from "@/hooks/packs/usePackCreator";
import { ProductPack } from "@/types/pack";
import { PackGeneralInfo } from "./PackGeneralInfo";
import { PackProductSelection } from "./PackProductSelection";
import { PackPriceConfiguration } from "./PackPriceConfiguration";
import { PackPreview } from "./PackPreview";

interface PackCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPack?: ProductPack | null;
}

const STEPS = [
  { 
    id: 0, 
    title: "Informations générales", 
    description: "Nom, description et paramètres du pack" 
  },
  { 
    id: 1, 
    title: "Sélection des produits", 
    description: "Choisissez les produits à inclure dans le pack" 
  },
  { 
    id: 2, 
    title: "Configuration des prix", 
    description: "Définissez les prix et marges" 
  },
  { 
    id: 3, 
    title: "Prévisualisation", 
    description: "Vérifiez et validez le pack" 
  },
];

export const PackCreator = ({ open, onOpenChange, editingPack }: PackCreatorProps) => {
  const {
    currentStep,
    packData,
    packItems,
    calculations,
    createPackMutation,
    updatePackMutation,
    addPackItem,
    updatePackItem,
    removePackItem,
    reorderPackItems,
    updatePackData,
    updateCalculations,
    nextStep,
    prevStep,
    goToStep,
    resetForm,
    canGoNext,
    canSubmit,
    isEditing,
  } = usePackCreator(editingPack);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open && !isEditing) {
      resetForm();
    }
  }, [open, isEditing, resetForm]);

  // Update calculations when items change
  useEffect(() => {
    updateCalculations();
  }, [packItems, updateCalculations]);

  const handleSubmit = async () => {
    if (!canSubmit()) return;

    try {
      if (isEditing) {
        await updatePackMutation.mutateAsync();
      } else {
        await createPackMutation.mutateAsync(packData);
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving pack:", error);
    }
  };

  const handleNext = () => {
    if (canGoNext()) {
      nextStep();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      prevStep();
    }
  };

  const isLastStep = currentStep === STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <PackGeneralInfo
            packData={packData}
            onUpdate={updatePackData}
          />
        );
      case 1:
        return (
          <PackProductSelection
            packItems={packItems}
            onAddItem={addPackItem}
            onUpdateItem={updatePackItem}
            onRemoveItem={removePackItem}
            onReorderItems={reorderPackItems}
          />
        );
      case 2:
        return (
          <PackPriceConfiguration
            packItems={packItems}
            calculations={calculations}
            onUpdateItem={updatePackItem}
            onUpdateCalculations={updateCalculations}
          />
        );
      case 3:
        return (
          <PackPreview
            packData={packData}
            packItems={packItems}
            calculations={calculations}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>
            {isEditing ? "Modifier le pack" : "Créer un nouveau pack"}
          </DialogTitle>
        </DialogHeader>

        {/* Steps Navigation */}
        <div className="flex items-center gap-2 py-4 border-b shrink-0">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center gap-2">
              <Button
                variant={currentStep === step.id ? "default" : currentStep > step.id ? "secondary" : "outline"}
                size="sm"
                onClick={() => goToStep(step.id)}
                className="gap-2"
                disabled={!canGoNext() && index > currentStep}
              >
                {currentStep > step.id ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span>{step.id + 1}</span>
                )}
                {step.title}
              </Button>
              {index < STEPS.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>

        {/* Step Description */}
        <div className="text-sm text-muted-foreground shrink-0">
          {STEPS[currentStep].description}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto py-4">
          {renderStepContent()}
        </div>

        {/* Summary Badge */}
        {packItems.length > 0 && (
          <div className="flex items-center gap-4 py-2 border-t shrink-0">
            <Badge variant="outline" className="gap-1">
              {packItems.length} produit{packItems.length > 1 ? 's' : ''}
            </Badge>
            <Badge variant="outline" className="gap-1">
              {calculations.total_quantity} article{calculations.total_quantity > 1 ? 's' : ''}
            </Badge>
            <Badge variant="outline" className="gap-1">
              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(calculations.total_monthly_price)}
            </Badge>
            <Badge variant="outline" className="gap-1">
              Marge: {calculations.average_margin_percentage.toFixed(1)}%
            </Badge>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-4 pt-4 border-t shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={isFirstStep}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </Button>

            {isLastStep ? (
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit() || createPackMutation.isPending || updatePackMutation.isPending}
                className="gap-2"
              >
                {createPackMutation.isPending || updatePackMutation.isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {isEditing ? "Mettre à jour" : "Créer le pack"}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!canGoNext()}
                className="gap-2"
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};