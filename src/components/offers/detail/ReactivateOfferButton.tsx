import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { RefreshCcw, FileEdit, Send, Search, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { updateOfferStatus } from "@/services/offers/offerStatus";

interface ReactivateOfferButtonProps {
  offerId: string;
  currentStatus: string;
  onStatusUpdated: () => void;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

const REACTIVATION_OPTIONS = [
  { 
    value: "draft", 
    label: "Brouillon", 
    description: "Recommencer depuis le début",
    icon: FileEdit 
  },
  { 
    value: "sent", 
    label: "Offre envoyée", 
    description: "Reprendre après l'envoi de l'offre",
    icon: Send 
  },
  { 
    value: "internal_review", 
    label: "Analyse interne", 
    description: "Reprendre l'analyse interne",
    icon: Search 
  },
];

const ReactivateOfferButton: React.FC<ReactivateOfferButtonProps> = ({
  offerId,
  currentStatus,
  onStatusUpdated,
  variant = "outline",
  size = "default"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("draft");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Only show for without_follow_up status
  if (currentStatus !== 'without_follow_up') {
    return null;
  }

  const handleReactivate = async () => {
    setIsSubmitting(true);

    try {
      // Update status
      const success = await updateOfferStatus(
        offerId,
        selectedStatus,
        currentStatus,
        "Dossier réactivé"
      );

      if (!success) {
        throw new Error("Échec de la réactivation");
      }

      // Reset Score D
      const { error: scoreError } = await supabase
        .from('offers')
        .update({ 
          internal_score: null,
          workflow_status: selectedStatus
        })
        .eq('id', offerId);

      if (scoreError) {
        console.error("Error resetting score:", scoreError);
      }

      toast.success("Dossier réactivé avec succès");
      onStatusUpdated();
      setIsOpen(false);
    } catch (error) {
      console.error("Error reactivating offer:", error);
      toast.error("Erreur lors de la réactivation");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button 
        variant={variant} 
        size={size}
        onClick={() => setIsOpen(true)}
        className="text-blue-600 border-blue-200 hover:bg-blue-50"
      >
        <RefreshCcw className="w-4 h-4 mr-2" />
        Réactiver le dossier
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCcw className="h-5 w-5 text-blue-600" />
              Réactiver le dossier
            </DialogTitle>
            <DialogDescription>
              Choisissez à quelle étape vous souhaitez reprendre ce dossier.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <RadioGroup value={selectedStatus} onValueChange={setSelectedStatus}>
              <div className="space-y-3">
                {REACTIVATION_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <div 
                      key={option.value}
                      className={`flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedStatus === option.value 
                          ? 'bg-blue-50 border-blue-300' 
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedStatus(option.value)}
                    >
                      <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-gray-500" />
                          <Label htmlFor={option.value} className="font-medium cursor-pointer">
                            {option.label}
                          </Label>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </RadioGroup>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>Le Score D sera réinitialisé</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button 
              onClick={handleReactivate} 
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-current rounded-full" />
                  Réactivation...
                </>
              ) : (
                <>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Réactiver
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReactivateOfferButton;
