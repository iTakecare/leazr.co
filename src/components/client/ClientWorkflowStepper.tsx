import React from "react";
import { Badge } from "@/components/ui/badge";
import { 
  Check, 
  ChevronRight, 
  FileText, 
  Search, 
  Send, 
  CheckCircle, 
  Clock, 
  Building, 
  Receipt, 
  GitBranch 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkflowForOfferType } from "@/hooks/workflows/useWorkflows";
import { useWorkflowSteps } from "@/hooks/workflows/useWorkflowSteps";
import type { OfferType } from "@/types/workflow";

interface ClientWorkflowStepperProps {
  currentStatus: string;
  offerType?: string;
  workflowTemplateId?: string;
  companyId?: string;
}

const ClientWorkflowStepper: React.FC<ClientWorkflowStepperProps> = ({ 
  currentStatus, 
  offerType = 'client_request',
  workflowTemplateId,
  companyId
}) => {
  const { steps: templateSteps, loading: templateLoading } = useWorkflowSteps(workflowTemplateId);
  const { steps: defaultWorkflowSteps, loading: defaultLoading } = useWorkflowForOfferType(
    companyId, 
    offerType as OfferType
  );

  const workflowSteps = workflowTemplateId && templateSteps.length > 0 
    ? templateSteps 
    : defaultWorkflowSteps;
  
  const workflowLoading = workflowTemplateId ? templateLoading : defaultLoading;

  const getStepIcon = (stepKey: string) => {
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
    icon: getStepIcon(step.step_key),
    order: step.step_order,
    isVisible: step.is_visible,
    scoring_type: step.scoring_type
  })).filter(step => step.isVisible).sort((a, b) => a.order - b.order);

  const defaultSteps = [
    { number: 1, key: 'draft', label: 'Brouillon', icon: FileText, order: 1, isVisible: true, scoring_type: null },
    { number: 2, key: 'internal_review', label: 'Analyse interne', icon: Search, order: 2, isVisible: true, scoring_type: 'internal' as const },
    { number: 3, key: 'sent', label: 'Offre envoyée', icon: Send, order: 3, isVisible: true, scoring_type: null },
    { number: 4, key: 'leaser_review', label: 'Analyse Leaser', icon: Building, order: 4, isVisible: true, scoring_type: 'leaser' as const },
    { number: 5, key: 'validated', label: 'Contrat prêt', icon: CheckCircle, order: 5, isVisible: true, scoring_type: null }
  ];

  const activeSteps = workflowLoading || steps.length === 0 ? defaultSteps : steps.map((s, i) => ({ ...s, number: i + 1 }));

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
        'leaser_sent': 'leaser_introduced',
        'leaser_accepted': 'leaser_review',
        'Scoring_review': 'leaser_review',
        'score_leaser': 'leaser_review',
        'accepted': 'leaser_review',
        'offer_send': 'offer_send',
        'offer_sent': 'offer_send',
        'client_approved': 'client_approved',
        'offer_accepted': 'offer_accepted',
        'offer_validation': 'validated',
        'validated': 'validated',
        'contract_ready': 'validated',
        'contrat_pret': 'validated',
        'financed': 'validated',
        'invoicing': 'invoicing',
        'draft': 'draft',
        'sent': 'offer_send',
        'leaser_introduced': 'leaser_introduced'
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

  const currentIndex = getCurrentStepIndex();

  if (workflowLoading) {
    return (
      <div className="w-full bg-card rounded-lg border border-border p-6">
        <div className="animate-pulse h-24 bg-muted rounded"></div>
      </div>
    );
  }

  return (
    <div className="w-full bg-card rounded-lg border border-border p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <GitBranch className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Suivi de votre demande</h3>
      </div>

      {/* Stepper horizontal */}
      <div className="relative flex items-start justify-center gap-0 overflow-x-auto pt-4 pb-6">
        {activeSteps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;
          const isUpcoming = index > currentIndex;

          return (
            <React.Fragment key={step.key}>
              {/* Step column */}
              <div className="flex flex-col items-center relative min-w-[120px]">
                {/* Step box - read-only, no click */}
                <div
                  className={cn(
                    "relative flex flex-col items-center p-4 rounded-xl border-2 transition-all min-w-[140px] min-h-[120px] justify-center",
                    isCompleted && "border-primary/40 bg-card",
                    isActive && "border-orange-400 shadow-lg bg-card",
                    isUpcoming && "border-muted bg-card"
                  )}
                >
                  {/* Badge position */}
                  {isCompleted ? (
                    <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm bg-green-500 text-white">
                      <Check className="w-3 h-3" />
                    </div>
                  ) : (
                    <div className={cn(
                      "absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm",
                      isActive && "bg-orange-500 text-white",
                      isUpcoming && "bg-muted text-muted-foreground border border-border"
                    )}>
                      {step.number}
                    </div>
                  )}

                  {/* Icon */}
                  <div className={cn(
                    "p-3 rounded-lg",
                    isCompleted && "bg-primary/10",
                    isActive && "bg-orange-50",
                    isUpcoming && "bg-muted"
                  )}>
                    <Icon className={cn(
                      "w-8 h-8",
                      isCompleted && "text-primary",
                      isActive && "text-orange-500",
                      isUpcoming && "text-muted-foreground"
                    )} />
                  </div>
                </div>

                {/* Step label */}
                <span className={cn(
                  "mt-3 text-sm font-medium text-center max-w-[120px]",
                  isActive && "text-foreground",
                  isCompleted && "text-foreground",
                  isUpcoming && "text-muted-foreground"
                )}>
                  {step.label}
                </span>
                
                {/* Status badge */}
                <Badge 
                  variant="secondary"
                  className={cn(
                    "mt-2 text-xs font-medium",
                    isCompleted && "bg-green-100 text-green-600 border-green-200",
                    isActive && "bg-orange-100 text-orange-600 border-orange-200",
                    isUpcoming && "bg-muted text-muted-foreground border-border"
                  )}
                >
                  {isCompleted ? 'Terminée' : isActive ? 'En cours' : 'À venir'}
                </Badge>
              </div>

              {/* Dashed arrow connector */}
              {index < activeSteps.length - 1 && (
                <div className="flex items-center self-start mt-14 px-2">
                  <div className="w-8 border-t-2 border-dashed border-muted-foreground/30"></div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/30 -ml-1" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default ClientWorkflowStepper;
