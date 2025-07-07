
import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Circle, Clock, ArrowRight, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { updateOfferStatus } from "@/services/offers/offerStatus";
import { useAuth } from "@/context/AuthContext";

interface InteractiveWorkflowStepperProps {
  currentStatus: string;
  offerId: string;
  onStatusChange?: (status: string) => void;
  internalScore?: 'A' | 'B' | 'C' | null;
  leaserScore?: 'A' | 'B' | 'C' | null;
  onAnalysisClick?: (analysisType: 'internal' | 'leaser') => void;
  offer?: any; // Pour accéder aux scores depuis la base de données
}

const InteractiveWorkflowStepper: React.FC<InteractiveWorkflowStepperProps> = ({ 
  currentStatus, 
  offerId,
  onStatusChange,
  internalScore,
  leaserScore,
  onAnalysisClick,
  offer
}) => {
  const { user } = useAuth();
  const [updating, setUpdating] = useState(false);

  const steps = [
    { key: 'draft', label: 'Brouillon', icon: Circle },
    { key: 'internal_review', label: 'Analyse interne', icon: HelpCircle },
    { key: 'sent', label: 'Offre envoyée', icon: Clock },
    { key: 'client_approved', label: 'Offre validée', icon: CheckCircle },
    { key: 'leaser_review', label: 'Analyse Leaser', icon: HelpCircle },
    { key: 'financed', label: 'Contrat prêt', icon: CheckCircle }
  ];

  const getCurrentStepIndex = () => {
    // Mapper les statuts d'approbation vers les étapes correspondantes
    const statusMapping: { [key: string]: string } = {
      'internal_approved': 'internal_review',
      'leaser_approved': 'leaser_review',
      'internal_docs_requested': 'internal_review',
      'leaser_docs_requested': 'leaser_review',
      'internal_rejected': 'internal_review',
      'leaser_rejected': 'leaser_review',
      'client_approved': 'client_approved',
      'validated': 'financed',
      'financed': 'financed',
      'draft': 'draft',
      'sent': 'sent'
    };
    
    const mappedStatus = statusMapping[currentStatus] || currentStatus;
    return steps.findIndex(step => step.key === mappedStatus);
  };

  const handleStepClick = async (targetStatus: string, targetIndex: number) => {
    const currentIndex = getCurrentStepIndex();
    
    // Gérer les clics sur les étapes d'analyse pour ouvrir la modale
    if ((targetStatus === 'internal_review' || targetStatus === 'leaser_review') && onAnalysisClick) {
      const analysisType = targetStatus === 'internal_review' ? 'internal' : 'leaser';
      onAnalysisClick(analysisType);
      return;
    }
    
    // Ne permettre que d'avancer d'une étape à la fois ou de revenir en arrière
    if (targetIndex > currentIndex + 1) {
      toast.error("Vous ne pouvez avancer que d'une étape à la fois");
      return;
    }

    if (targetStatus === currentStatus) {
      return; // Pas de changement nécessaire
    }

    // Confirmation spéciale pour la finalisation (conversion en contrat)
    const confirmMessage = targetStatus === 'financed' 
      ? `Confirmer la finalisation de l'offre ? Cela créera automatiquement un contrat.`
      : targetIndex > currentIndex 
        ? `Confirmer le passage à l'étape "${steps[targetIndex].label}" ?`
        : `Confirmer le retour à l'étape "${steps[targetIndex].label}" ?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setUpdating(true);

      // Utiliser le service updateOfferStatus qui contient la logique de conversion automatique
      const success = await updateOfferStatus(
        offerId,
        targetStatus,
        currentStatus,
        targetStatus === 'financed' 
          ? `Finalisation manuelle - Conversion en contrat`
          : `Changement manuel depuis le stepper`
      );

      if (success) {
        if (onStatusChange) {
          onStatusChange(targetStatus);
        }

        // Message de succès spécial pour la finalisation
        if (targetStatus === 'financed') {
          toast.success(`Offre finalisée ! Un contrat va être créé automatiquement.`);
        } else {
          toast.success(`Statut mis à jour vers "${steps[targetIndex].label}"`);
        }
      } else {
        toast.error("Erreur lors du changement de statut");
      }
    } catch (error) {
      console.error("Erreur lors du changement de statut:", error);
      toast.error("Erreur lors du changement de statut");
    } finally {
      setUpdating(false);
    }
  };

  const getStatusLabel = (statusId: string) => {
    const status = steps.find(s => s.key === statusId);
    return status ? status.label : statusId;
  };

  const getScoreForStep = (stepKey: string) => {
    if (stepKey === 'internal_review') {
      // Priorité aux scores de la DB, sinon fallback sur les props
      return offer?.internal_score || internalScore;
    }
    if (stepKey === 'leaser_review') {
      return offer?.leaser_score || leaserScore;
    }
    return null;
  };

  const isWaitingForDocuments = (stepKey: string) => {
    if (stepKey === 'internal_review') return currentStatus === 'internal_docs_requested';
    if (stepKey === 'leaser_review') return currentStatus === 'leaser_docs_requested';
    return false;
  };

  const getScoreBadgeColor = (score: 'A' | 'B' | 'C') => {
    switch (score) {
      case 'A': return 'bg-green-100 text-green-800 border-green-200';
      case 'B': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'C': return 'bg-red-100 text-red-800 border-red-200';
      default: return '';
    }
  };

  const currentIndex = getCurrentStepIndex();

  return (
    <div className="w-full bg-white rounded-lg border p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Progression de l'offre</h3>
        {updating && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            Mise à jour...
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;
          const isUpcoming = index > currentIndex;
          const canClick = !updating && (index <= currentIndex + 1 || index < currentIndex);

          return (
            <div key={step.key} className="flex flex-col items-center flex-1">
              <div className="flex items-center w-full">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`w-12 h-12 rounded-full p-0 border-2 ${
                    isCompleted 
                      ? 'bg-green-500 border-green-500 text-white hover:bg-green-600' 
                      : isActive 
                        ? 'bg-blue-500 border-blue-500 text-white hover:bg-blue-600'
                        : canClick
                          ? 'bg-gray-100 border-gray-300 text-gray-400 hover:bg-gray-200'
                          : 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed'
                  } ${canClick ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  onClick={() => canClick && handleStepClick(step.key, index)}
                  disabled={!canClick || updating}
                >
                  <Icon className="w-5 h-5" />
                </Button>
                {index < steps.length - 1 && (
                  <div 
                    className={`flex-1 h-0.5 mx-2 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
              <div className="mt-2 text-center space-y-1">
                 <Badge 
                  variant={isActive ? 'default' : isCompleted ? 'secondary' : 'outline'}
                   className={`text-xs whitespace-nowrap px-2 py-1 ${
                     step.key === 'financed' ? 'bg-orange-100 text-orange-800 border-orange-200' : ''
                   }`}
                >
                  {step.label}
                </Badge>
                
                {/* Badge de score pour les étapes d'analyse */}
                {(step.key === 'internal_review' || step.key === 'leaser_review') && getScoreForStep(step.key) && (
                  <div className="flex justify-center">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getScoreBadgeColor(getScoreForStep(step.key)!)}`}
                    >
                      Score {getScoreForStep(step.key)}
                    </Badge>
                  </div>
                )}
                
                {/* Badge "Attente d'informations" pour les étapes en attente de documents */}
                {(step.key === 'internal_review' || step.key === 'leaser_review') && isWaitingForDocuments(step.key) && (
                  <div className="flex justify-center mt-1">
                    <Badge 
                      variant="outline" 
                      className="text-xs bg-amber-50 text-amber-700 border-amber-200"
                    >
                      Attente d'info
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 text-center text-sm text-gray-500">
        Cliquez sur une étape pour modifier le statut
        {currentIndex === steps.length - 2 && (
          <div className="mt-2 text-orange-600 font-medium">
            ⚠️ L'étape "Contrat prêt" convertira automatiquement l'offre en contrat
          </div>
        )}
      </div>
    </div>
  );
};

export default InteractiveWorkflowStepper;
