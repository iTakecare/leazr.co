import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Check, 
  ChevronRight, 
  ArrowRight,
  ArrowLeft,
  FileText,
  Search,
  Send,
  CheckCircle,
  Clock,
  Building,
  Receipt,
  GitBranch,
  ClipboardList,
  FilePen
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { updateOfferStatus } from "@/services/offers/offerStatus";
import { useAuth } from "@/context/AuthContext";
import { useWorkflowForOfferType } from "@/hooks/workflows/useWorkflows";
import { useWorkflowSteps } from "@/hooks/workflows/useWorkflowSteps";
import type { OfferType } from "@/types/workflow";
import EmailConfirmationModal from "../EmailConfirmationModal";
import { sendLeasingAcceptanceEmail } from "@/services/offers/offerEmail";
import { getOfferById } from "@/services/offerService";

interface WinBrokerWorkflowStepperProps {
  currentStatus: string;
  offerId: string;
  onStatusChange?: (status: string) => void;
  internalScore?: 'A' | 'B' | 'C' | null;
  leaserScore?: 'A' | 'B' | 'C' | null;
  onAnalysisClick?: (analysisType: 'internal' | 'leaser') => void;
  offer?: any;
}

const WinBrokerWorkflowStepper: React.FC<WinBrokerWorkflowStepperProps> = ({ 
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

  const offerType = (offer?.type || 'client_request') as OfferType;
  const companyId = offer?.company_id || user?.company;
  const isPurchase = offer?.is_purchase === true;
  const workflowTemplateId = offer?.workflow_template_id;
  
  const { steps: templateSteps, loading: templateLoading } = useWorkflowSteps(workflowTemplateId);
  const { steps: defaultWorkflowSteps, loading: defaultLoading } = useWorkflowForOfferType(
    companyId, 
    offerType,
    isPurchase
  );

  const workflowSteps = workflowTemplateId && templateSteps.length > 0 
    ? templateSteps 
    : defaultWorkflowSteps;
  
  const workflowLoading = workflowTemplateId ? templateLoading : defaultLoading;

  // Get icon for step
  const getStepIcon = (stepKey: string, iconName?: string) => {
    const iconMap: Record<string, React.ElementType> = {
      'draft': FileText,
      'sent': Send,
      'offer_send': Send,
      'internal_review': Search,
      'leaser_review': Building,
      'validated': CheckCircle,
      'offer_validation': CheckCircle,
      'invoicing': Receipt,
      'client_approved': CheckCircle,
      'leaser_approved': CheckCircle
    };
    return iconMap[stepKey] || Clock;
  };

  const steps = workflowSteps.map((step, idx) => ({
    number: idx + 1,
    key: step.step_key,
    label: step.step_label,
    icon: getStepIcon(step.step_key, step.icon_name),
    description: step.step_description,
    order: step.step_order,
    isRequired: step.is_required,
    isVisible: step.is_visible,
    enables_scoring: step.enables_scoring,
    scoring_type: step.scoring_type
  })).filter(step => step.isVisible).sort((a, b) => a.order - b.order);

  const defaultSteps = [
    { number: 1, key: 'draft', label: 'Brouillon', icon: FileText, order: 1, isRequired: true, isVisible: true, enables_scoring: false, scoring_type: null },
    { number: 2, key: 'internal_review', label: 'Analyse interne', icon: Search, order: 2, isRequired: true, isVisible: true, enables_scoring: true, scoring_type: 'internal' as const },
    { number: 3, key: 'sent', label: 'Offre envoyée', icon: Send, order: 3, isRequired: true, isVisible: true, enables_scoring: false, scoring_type: null },
    { number: 4, key: 'leaser_review', label: 'Analyse Leaser', icon: Building, order: 4, isRequired: true, isVisible: true, enables_scoring: true, scoring_type: 'leaser' as const },
    { number: 5, key: 'validated', label: 'Contrat prêt', icon: CheckCircle, order: 5, isRequired: true, isVisible: true, enables_scoring: false, scoring_type: null }
  ];

  const activeSteps = workflowLoading || steps.length === 0 ? defaultSteps : steps.map((s, i) => ({ ...s, number: i + 1 }));

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
    let index = activeSteps.findIndex(step => step.key === currentStatus);
    
    if (index === -1) {
      const statusMapping: { [key: string]: string } = {
        'internal_approved': 'internal_review',
        'internal_docs_requested': 'internal_review',
        'internal_rejected': 'internal_review',
        'internal_scoring': 'internal_review',
        'leaser_approved': 'leaser_review',
        'leaser_docs_requested': 'leaser_review',
        'leaser_rejected': 'leaser_review',
        'leaser_scoring': 'leaser_review',
        'leaser_sent': 'leaser_review',
        'leaser_accepted': 'validated',
        'Scoring_review': 'leaser_review',
        'offer_send': 'sent',
        'offer_sent': 'sent',
        'client_approved': 'client_approved',
        'offer_accepted': 'validated',
        'offer_validation': 'validated',
        'validated': 'validated',
        'financed': 'validated',
        'invoicing': 'invoicing',
        'draft': 'draft',
        'sent': 'sent',
        'leaser_introduced': 'leaser_review'
      };
      
      const mappedStatus = statusMapping[currentStatus] || currentStatus;
      index = activeSteps.findIndex(step => step.key === mappedStatus);
    }
    
    if (index === -1) {
      index = activeSteps.findIndex(step => 
        step.key.includes(currentStatus) || currentStatus.includes(step.key)
      );
    }
    
    if (index === -1) {
      if (currentStatus.includes('internal')) {
        index = activeSteps.findIndex(step => step.scoring_type === 'internal');
      } else if (currentStatus.includes('leaser')) {
        index = activeSteps.findIndex(step => step.scoring_type === 'leaser');
      }
    }
    
    return index >= 0 ? index : 0;
  };

  const handleStepClick = async (targetStatus: string, targetIndex: number) => {
    const currentIndex = getCurrentStepIndex();
    const targetStep = activeSteps[targetIndex];
    
    if (targetStep?.enables_scoring && onAnalysisClick && targetStep.scoring_type) {
      if (targetIndex >= currentIndex) {
        onAnalysisClick(targetStep.scoring_type as 'internal' | 'leaser');
        return;
      }
    }
    
    if (targetIndex > currentIndex + 1) {
      toast.error("Vous ne pouvez avancer que d'une étape à la fois");
      return;
    }

    if (targetStatus === currentStatus) {
      return;
    }

    if (targetStatus === 'validated' || targetStatus === 'offer_validation') {
      setEmailModalReason("Validation de l'offre");
      setShowEmailModal(true);
      return;
    }

    const finalStatuses = ['validated', 'offer_validation', 'financed'];
    const isInvoicingPurchase = targetStatus === 'invoicing' && isPurchase;
    const isFinalStatus = finalStatuses.includes(targetStatus) || isInvoicingPurchase;
    
    const confirmMessage = isFinalStatus
      ? isPurchase 
        ? `Confirmer la finalisation de l'offre ? Cela créera automatiquement une facture.`
        : `Confirmer la finalisation de l'offre ? Cela créera automatiquement un contrat.`
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
          ? isPurchase 
            ? `Finalisation manuelle - Conversion en facture`
            : `Finalisation manuelle - Conversion en contrat`
          : `Changement manuel depuis le stepper`
      );

      if (success) {
        if (onStatusChange) {
          onStatusChange(targetStatus);
        }

        if (targetStatus === 'invoicing' && isPurchase && offer?.company_id) {
          try {
            const { generateInvoiceFromPurchaseOffer } = await import('@/services/invoiceService');
            const invoice = await generateInvoiceFromPurchaseOffer(offerId, offer.company_id);
            toast.success('Facture brouillon créée avec succès');
          } catch (invoiceError) {
            console.error("⚠️ Erreur création facture depuis stepper:", invoiceError);
            toast.warning('Statut mis à jour mais erreur lors de la création de la facture brouillon');
          }
        } else if (isFinalStatus) {
          toast.success(isPurchase 
            ? `Offre finalisée ! Une facture va être créée automatiquement.`
            : `Offre finalisée ! Un contrat va être créé automatiquement.`
          );
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
      case 'A': return 'bg-primary/10 text-primary border-primary/20';
      case 'B': return 'bg-warning/10 text-warning border-warning/20';
      case 'C': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return '';
    }
  };

  const handleSendEmailAndValidate = async (customContent?: string, includePdf?: boolean) => {
    setIsEmailProcessing(true);
    try {
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
  const nextStep = activeSteps[currentIndex + 1];
  const workflowName = workflowTemplateId && templateSteps.length > 0 
    ? templateSteps[0]?.template_name || "Workflow personnalisé"
    : "Standard";

  if (workflowLoading) {
    return (
      <div className="w-full bg-card rounded-lg border border-border p-6 mb-6">
        <div className="animate-pulse h-24 bg-muted rounded"></div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full bg-card rounded-lg border border-border p-6 mb-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <GitBranch className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Progression du workflow</h3>
          <span className="text-sm text-muted-foreground">• {workflowName}</span>
          {updating && (
            <div className="ml-auto flex items-center gap-2 text-sm text-primary">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              Mise à jour...
            </div>
          )}
        </div>

        {/* Stepper horizontal - WinBroker style */}
        <div className="relative flex items-start justify-start gap-0 overflow-x-auto pb-24">
          {activeSteps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentIndex;
            const isCompleted = index < currentIndex;
            const isUpcoming = index > currentIndex;
            const canClick = !updating && (index <= currentIndex + 1 || index < currentIndex);
            const score = getScoreForStep(step.key);
            const waitingDocs = isWaitingForDocuments(step.key);
            const prevStep = index > 0 ? activeSteps[index - 1] : null;

            return (
              <React.Fragment key={step.key}>
                {/* Step column */}
                <div className="flex flex-col items-center relative min-w-[120px]">
                  {/* Step box - WinBroker style with colors */}
                  <button
                    onClick={() => canClick && handleStepClick(step.key, index)}
                    disabled={!canClick || updating}
                    className={cn(
                      "relative flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all min-w-[120px] min-h-[100px]",
                      isCompleted && "border-primary/40 bg-primary/5",
                      isActive && "border-primary shadow-lg ring-2 ring-primary/20 bg-primary/5",
                      isUpcoming && "border-gray-200 bg-white",
                      canClick && !updating && "cursor-pointer hover:shadow-md hover:border-primary/50",
                      (!canClick || updating) && "cursor-not-allowed opacity-70"
                    )}
                  >
                    {/* Badge position - checkmark LEFT for completed, number RIGHT for active/upcoming */}
                    {isCompleted ? (
                      <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm bg-primary text-primary-foreground">
                        <Check className="w-3 h-3" />
                      </div>
                    ) : (
                      <div className={cn(
                        "absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm",
                        isActive && "bg-primary text-primary-foreground",
                        isUpcoming && "bg-gray-100 text-gray-500 border border-gray-200"
                      )}>
                        {step.number}
                      </div>
                    )}

                    {/* Large icon */}
                    <Icon className={cn(
                      "w-8 h-8",
                      isCompleted && "text-primary",
                      isActive && "text-primary",
                      isUpcoming && "text-gray-400"
                    )} />

                    {/* Score badge inside box */}
                    {score && (
                      <Badge 
                        variant="outline" 
                        className={cn("mt-2 text-xs", getScoreBadgeColor(score))}
                      >
                        Score {score}
                      </Badge>
                    )}

                    {/* Waiting docs badge inside box */}
                    {waitingDocs && (
                      <Badge 
                        variant="outline" 
                        className="mt-2 text-xs bg-warning/10 text-warning border-warning/20"
                      >
                        En attente
                      </Badge>
                    )}
                  </button>

                  {/* Step label */}
                  <span className={cn(
                    "mt-3 text-sm font-medium text-center max-w-[120px]",
                    isActive && "text-foreground",
                    isCompleted && "text-foreground",
                    isUpcoming && "text-muted-foreground"
                  )}>
                    {step.label}
                  </span>
                  
                  {/* Status badge - WinBroker colors */}
                  <Badge 
                    variant="secondary"
                    className={cn(
                      "mt-2 text-xs font-medium",
                      isCompleted && "bg-green-100 text-green-600 border-green-200",
                      isActive && "bg-primary text-primary-foreground",
                      isUpcoming && "bg-green-50 text-green-600 border-green-100"
                    )}
                  >
                    {isCompleted ? 'Terminée' : isActive ? 'En cours' : 'À venir'}
                  </Badge>

                  {/* Return link for completed steps - WinBroker style */}
                  {isCompleted && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStepClick(step.key, index);
                      }}
                      className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
                      disabled={updating}
                    >
                      <ArrowLeft className="w-3 h-3" />
                      Retour à {step.label}
                    </button>
                  )}

                  {/* Action popup for active step - exact WinBroker style */}
                  {isActive && (
                    <div className="absolute top-full mt-4 left-1/2 -translate-x-1/2 bg-white border-2 border-gray-100 rounded-xl shadow-2xl min-w-[220px] z-20 overflow-hidden">
                      {/* Analysis/Document request button */}
                      {step.enables_scoring && onAnalysisClick && step.scoring_type && (
                        <button 
                          className="w-full flex items-center gap-3 px-4 py-3.5 text-sm hover:bg-gray-50 border-b border-gray-100 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAnalysisClick(step.scoring_type as 'internal' | 'leaser');
                          }}
                        >
                          <ClipboardList className="w-5 h-5 text-gray-500" />
                          <span className="font-medium">
                            {step.scoring_type === 'internal' ? 'Analyse Interne' : 
                             step.scoring_type === 'leaser' ? 'Analyse Leaser' : 
                             'Demander documents'}
                          </span>
                        </button>
                      )}

                      {/* Next step button - prominent */}
                      {nextStep && (
                        <button 
                          className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStepClick(nextStep.key, currentIndex + 1);
                          }}
                          disabled={updating}
                        >
                          <span>Vers {nextStep.label}</span>
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                        </button>
                      )}

                      {/* If no next step - Final step indicator */}
                      {!nextStep && (
                        <div className="w-full flex items-center gap-2 px-4 py-3.5 text-sm text-primary bg-primary/5 font-medium">
                          <CheckCircle className="w-4 h-4" />
                          <span>Étape finale</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Arrow connector between steps */}
                {index < activeSteps.length - 1 && (
                  <div className="flex items-center self-start mt-10 px-1 text-muted-foreground/40">
                    <span className="text-lg font-light">—</span>
                    <ChevronRight className="w-4 h-4 -ml-1" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Email Modal */}
      {offerDataForModal && (
        <EmailConfirmationModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          offerId={offerId}
          offerData={offerDataForModal}
          onSendEmailAndValidate={handleSendEmailAndValidate}
          onValidateWithoutEmail={handleValidateWithoutEmail}
        />
      )}
    </>
  );
};

export default WinBrokerWorkflowStepper;
