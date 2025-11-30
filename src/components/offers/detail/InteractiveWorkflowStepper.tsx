
import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Circle, Clock, ArrowRight, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { updateOfferStatus } from "@/services/offers/offerStatus";
import { useAuth } from "@/context/AuthContext";
import { useWorkflowForOfferType } from "@/hooks/workflows/useWorkflows";
import type { OfferType } from "@/types/workflow";
import EmailConfirmationModal from "../EmailConfirmationModal";
import { sendLeasingAcceptanceEmail } from "@/services/offers/offerEmail";
import { getOfferById } from "@/services/offerService";

interface InteractiveWorkflowStepperProps {
  currentStatus: string;
  offerId: string;
  onStatusChange?: (status: string) => void;
  internalScore?: 'A' | 'B' | 'C' | null;
  leaserScore?: 'A' | 'B' | 'C' | null;
  onAnalysisClick?: (analysisType: 'internal' | 'leaser') => void;
  offer?: any;
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
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isEmailProcessing, setIsEmailProcessing] = useState(false);
  const [emailModalReason, setEmailModalReason] = useState("Validation de l'offre");
  const [offerDataForModal, setOfferDataForModal] = useState<any>(offer || null);

  function getIconComponent(iconName: string) {
    const iconMap: Record<string, any> = {
      Circle,
      Clock,
      CheckCircle,
      HelpCircle,
      ArrowRight
    };
    return iconMap[iconName] || Circle;
  }

  const offerType = (offer?.type || 'client_request') as OfferType;
  const companyId = offer?.company_id || user?.company;
  
  const { steps: workflowSteps, loading: workflowLoading } = useWorkflowForOfferType(
    companyId, 
    offerType
  );

  const steps = workflowSteps.map(step => ({
    key: step.step_key,
    label: step.step_label,
    icon: getIconComponent(step.icon_name || 'Circle'),
    description: step.step_description,
    order: step.step_order,
    isRequired: step.is_required,
    isVisible: step.is_visible,
    enables_scoring: step.enables_scoring,
    scoring_type: step.scoring_type
  })).filter(step => step.isVisible).sort((a, b) => a.order - b.order);

  const defaultSteps = [
    { key: 'draft', label: 'Brouillon', icon: Circle, order: 1, isRequired: true, isVisible: true, enables_scoring: false, scoring_type: null },
    { key: 'internal_review', label: 'Analyse interne', icon: HelpCircle, order: 2, isRequired: true, isVisible: true, enables_scoring: true, scoring_type: 'internal' as const },
    { key: 'sent', label: 'Offre envoyée', icon: Clock, order: 3, isRequired: true, isVisible: true, enables_scoring: false, scoring_type: null },
    { key: 'client_approved', label: 'Offre validée', icon: CheckCircle, order: 4, isRequired: true, isVisible: true, enables_scoring: false, scoring_type: null },
    { key: 'leaser_review', label: 'Analyse Leaser', icon: HelpCircle, order: 5, isRequired: true, isVisible: true, enables_scoring: true, scoring_type: 'leaser' as const },
    { key: 'validated', label: 'Contrat prêt', icon: CheckCircle, order: 6, isRequired: true, isVisible: true, enables_scoring: false, scoring_type: null }
  ];

  const activeSteps = workflowLoading || steps.length === 0 ? defaultSteps : steps;

  useEffect(() => {
    if (showEmailModal && (!offerDataForModal || !offerDataForModal?.company_id)) {
      (async () => {
        try {
          const data = await getOfferById(offerId);
          if (data) setOfferDataForModal(data);
        } catch (e) {
          console.error("Erreur lors du chargement de l'offre pour la modale:", e);
        }
      })();
    }
  }, [showEmailModal, offerId]);

  const getCurrentStepIndex = () => {
    const statusMapping: { [key: string]: string } = {
      'internal_approved': 'internal_review',
      'leaser_approved': 'leaser_review',
      'internal_docs_requested': 'internal_review',
      'leaser_docs_requested': 'leaser_review',
      'internal_rejected': 'internal_review',
      'leaser_rejected': 'leaser_review',
      'client_approved': 'client_approved',
      'offer_validation': 'validated',
      'validated': 'validated',
      'financed': 'validated',
      'draft': 'draft',
      'sent': 'sent'
    };
    
    const mappedStatus = statusMapping[currentStatus] || currentStatus;
    return activeSteps.findIndex(step => step.key === mappedStatus);
  };

  const handleStepClick = async (targetStatus: string, targetIndex: number) => {
    const currentIndex = getCurrentStepIndex();
    const targetStep = activeSteps[targetIndex];
    
    console.log("🔍 STEPPER DEBUG - Step clicked:", {
      targetStatus,
      targetIndex,
      currentIndex,
      currentStatus,
      hasAnalysisClick: !!onAnalysisClick,
      enables_scoring: targetStep?.enables_scoring,
      scoring_type: targetStep?.scoring_type
    });
    
    // Vérifier si l'étape a le scoring activé - uniquement si on avance ou reste sur place
    // Si on revient en arrière, on permet le changement de statut
    if (targetStep?.enables_scoring && onAnalysisClick && targetStep.scoring_type) {
      if (targetIndex >= currentIndex) {
        console.log("🎯 STEPPER DEBUG - Calling onAnalysisClick with:", targetStep.scoring_type);
        onAnalysisClick(targetStep.scoring_type as 'internal' | 'leaser');
        return;
      }
      // Si on revient en arrière (targetIndex < currentIndex), on continue vers la mise à jour du statut
      console.log("🔙 STEPPER DEBUG - Going back to step with scoring, allowing status change");
    }
    
    if (targetIndex > currentIndex + 1) {
      toast.error("Vous ne pouvez avancer que d'une étape à la fois");
      return;
    }

    if (targetStatus === currentStatus) {
      return;
    }

    if (targetStatus === 'validated' || targetStatus === 'offer_validation') {
      console.log("🔔 STEPPER - Interception immédiate: ouverture de la modale d'email", targetStatus);
      setEmailModalReason("Validation de l'offre");
      setShowEmailModal(true);
      return;
    }

    const finalStatuses = ['validated', 'offer_validation', 'financed'];
    const isFinalStatus = finalStatuses.includes(targetStatus);
    
    const confirmMessage = isFinalStatus
      ? `Confirmer la finalisation de l'offre ? Cela créera automatiquement un contrat.`
      : targetIndex > currentIndex 
        ? `Confirmer le passage à l'étape "${activeSteps[targetIndex].label}" ?`
        : `Confirmer le retour à l'étape "${activeSteps[targetIndex].label}" ?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setUpdating(true);

      const success = await updateOfferStatus(
        offerId,
        targetStatus,
        currentStatus,
        isFinalStatus
          ? `Finalisation manuelle - Conversion en contrat`
          : `Changement manuel depuis le stepper`
      );

      if (success) {
        if (onStatusChange) {
          onStatusChange(targetStatus);
        }

        if (isFinalStatus) {
          toast.success(`Offre finalisée ! Un contrat va être créé automatiquement.`);
        } else {
          toast.success(`Statut mis à jour vers "${activeSteps[targetIndex].label}"`);
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
    const status = activeSteps.find(s => s.key === statusId);
    return status ? status.label : statusId;
  };

  const getScoreForStep = (stepKey: string) => {
    if (stepKey === 'internal_review') {
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

  const handleSendEmailAndValidate = async (customContent?: string, includePdf?: boolean) => {
    setIsEmailProcessing(true);
    try {
      console.log("📧 STEPPER - Envoi email et validation de l'offre:", offerId);
      const success = await updateOfferStatus(
        offerId,
        'offer_validation',
        currentStatus,
        emailModalReason
      );
      if (!success) {
        toast.error("Échec de la validation de l'offre");
        return;
      }
      try {
        await sendLeasingAcceptanceEmail(offerId, customContent, includePdf ?? true);
        toast.success("Email envoyé et offre validée. Le contrat va être créé.");
      } catch (emailErr) {
        console.error("Erreur d'envoi email:", emailErr);
        toast.warning("Offre validée. L'email n'a pas pu être envoyé.");
      }
      setShowEmailModal(false);
      onStatusChange?.('offer_validation');
    } finally {
      setIsEmailProcessing(false);
    }
  };

  const handleValidateWithoutEmail = async () => {
    setIsEmailProcessing(true);
    try {
      console.log("✅ STEPPER - Validation sans email:", offerId);
      const success = await updateOfferStatus(
        offerId,
        'offer_validation',
        currentStatus,
        emailModalReason
      );
      if (success) {
        toast.success("Offre validée sans email. Le contrat va être créé.");
        setShowEmailModal(false);
        onStatusChange?.('offer_validation');
      } else {
        toast.error("Échec de la validation de l'offre");
      }
    } finally {
      setIsEmailProcessing(false);
    }
  };

  const currentIndex = getCurrentStepIndex();

  return (
    <>
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
          {activeSteps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentIndex;
            const isCompleted = index < currentIndex;
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
                  {index < activeSteps.length - 1 && (
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
                    className={`text-xs whitespace-nowrap px-2 py-1 text-black ${
                      step.key === 'validated' ? 'bg-orange-100 border-orange-200' : ''
                    }`}
                  >
                    {step.label}
                  </Badge>
                  
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
          {currentIndex === activeSteps.length - 2 && (
            <div className="mt-2 text-orange-600 font-medium">
              ⚠️ L'étape "Contrat prêt" convertira automatiquement l'offre en contrat
            </div>
          )}
        </div>
      </div>

      <EmailConfirmationModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        offerId={offerId}
        offerData={offerDataForModal || offer}
        onSendEmailAndValidate={handleSendEmailAndValidate}
        onValidateWithoutEmail={handleValidateWithoutEmail}
      />
    </>
  );
};

export default InteractiveWorkflowStepper;
