import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import OfferScoringInterface from "./OfferScoringInterface";

interface ScoringModalProps {
  isOpen: boolean;
  onClose: () => void;
  offerId: string;
  currentStatus: string;
  analysisType: "internal" | "leaser";
  onScoreAssigned: (score: 'A' | 'B' | 'C', reason?: string) => Promise<void>;
  isLoading: boolean;
}

const ScoringModal: React.FC<ScoringModalProps> = ({
  isOpen,
  onClose,
  offerId,
  currentStatus,
  analysisType,
  onScoreAssigned,
  isLoading
}) => {
  const handleScoreAssigned = async (score: 'A' | 'B' | 'C', reason?: string) => {
    await onScoreAssigned(score, reason);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {analysisType === "internal" ? "Analyse interne" : "Analyse Leaser"}
          </DialogTitle>
        </DialogHeader>
        <OfferScoringInterface
          offerId={offerId}
          currentStatus={currentStatus}
          analysisType={analysisType}
          onScoreAssigned={handleScoreAssigned}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ScoringModal;