import React from "react";
import { Badge } from "@/components/ui/badge";
import { 
  Check, 
  ChevronRight, 
  ChevronDown,
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
import { useIsMobile } from "@/hooks/use-mobile";
import type { OfferType } from "@/types/workflow";

interface ClientWorkflowStepperProps {
  currentStatus: string;
  offerType?: string;
  workflowTemplateId?: string;
  companyId?: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  'draft': FileText,
  'sent': Send,
  'offer_send': Send,
  'internal_review': Search,
  'leaser_review': Building,
  'validated': CheckCircle,
  'offer_validation': CheckCircle,
  'invoicing': Receipt,
  'client_approved': CheckCircle,
  'leaser_approved': CheckCircle,
};

const STATUS_MAPPING: Record<string, string> = {
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
  'leaser_introduced': 'leaser_introduced',
};

const DEFAULT_STEPS = [
  { number: 1, key: 'draft', label: 'Brouillon', icon: FileText, order: 1, isVisible: true, scoring_type: null },
  { number: 2, key: 'internal_review', label: 'Analyse interne', icon: Search, order: 2, isVisible: true, scoring_type: 'internal' as const },
  { number: 3, key: 'sent', label: 'Offre envoyée', icon: Send, order: 3, isVisible: true, scoring_type: null },
  { number: 4, key: 'leaser_review', label: 'Analyse Leaser', icon: Building, order: 4, isVisible: true, scoring_type: 'leaser' as const },
  { number: 5, key: 'validated', label: 'Contrat prêt', icon: CheckCircle, order: 5, isVisible: true, scoring_type: null },
];

const ClientWorkflowStepper: React.FC<ClientWorkflowStepperProps> = ({ 
  currentStatus, 
  offerType = 'client_request',
  workflowTemplateId,
  companyId
}) => {
  const isMobile = useIsMobile();
  const { steps: templateSteps, loading: templateLoading } = useWorkflowSteps(workflowTemplateId);
  const { steps: defaultWorkflowSteps, loading: defaultLoading } = useWorkflowForOfferType(
    companyId, 
    offerType as OfferType
  );

  const workflowSteps = workflowTemplateId && templateSteps.length > 0 
    ? templateSteps 
    : defaultWorkflowSteps;
  
  const workflowLoading = workflowTemplateId ? templateLoading : defaultLoading;

  const steps = workflowSteps.map((step, idx) => ({
    number: idx + 1,
    key: step.step_key,
    label: step.step_label,
    icon: ICON_MAP[step.step_key] || Clock,
    order: step.step_order,
    isVisible: step.is_visible,
    scoring_type: step.scoring_type
  })).filter(step => step.isVisible).sort((a, b) => a.order - b.order);

  const activeSteps = workflowLoading || steps.length === 0 
    ? DEFAULT_STEPS 
    : steps.map((s, i) => ({ ...s, number: i + 1 }));

  const getCurrentStepIndex = () => {
    let index = activeSteps.findIndex(step => step.key === currentStatus);
    if (index === -1) {
      const mappedStatus = STATUS_MAPPING[currentStatus] || currentStatus;
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
      <div className="w-full bg-card rounded-lg border border-border p-4">
        <div className="animate-pulse h-20 bg-muted rounded"></div>
      </div>
    );
  }

  // ── Mobile: vertical stepper ──
  if (isMobile) {
    return (
      <div className="w-full bg-card rounded-lg border border-border p-3">
        <div className="flex items-center gap-2 mb-3">
          <GitBranch className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Suivi de votre demande</h3>
        </div>

        <div className="flex flex-col gap-0">
          {activeSteps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentIndex;
            const isCompleted = index < currentIndex;
            const isUpcoming = index > currentIndex;

            return (
              <React.Fragment key={step.key}>
                <div className="flex items-center gap-3">
                  {/* Circle / check */}
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      isCompleted && "bg-green-500",
                      isActive && "bg-orange-500 shadow-md",
                      isUpcoming && "bg-muted border border-border"
                    )}>
                      {isCompleted ? (
                        <Check className="w-4 h-4 text-white" />
                      ) : (
                        <Icon className={cn(
                          "w-4 h-4",
                          isActive && "text-white",
                          isUpcoming && "text-muted-foreground"
                        )} />
                      )}
                    </div>
                  </div>

                  {/* Label + badge */}
                  <div className="flex-1 flex items-center justify-between min-w-0 py-2">
                    <span className={cn(
                      "text-sm font-medium truncate",
                      isUpcoming && "text-muted-foreground"
                    )}>
                      {step.label}
                    </span>
                    <Badge 
                      variant="secondary"
                      className={cn(
                        "text-[10px] font-medium px-1.5 py-0 shrink-0 ml-2",
                        isCompleted && "bg-green-100 text-green-600 border-green-200",
                        isActive && "bg-orange-100 text-orange-600 border-orange-200",
                        isUpcoming && "bg-muted text-muted-foreground border-border"
                      )}
                    >
                      {isCompleted ? 'Terminée' : isActive ? 'En cours' : 'À venir'}
                    </Badge>
                  </div>
                </div>

                {/* Vertical connector */}
                {index < activeSteps.length - 1 && (
                  <div className="flex items-stretch ml-[15px]">
                    <div className={cn(
                      "w-0.5 h-3 rounded-full",
                      isCompleted ? "bg-green-400" : "bg-muted-foreground/20"
                    )} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Desktop: horizontal stepper ──
  return (
    <div className="w-full bg-card rounded-lg border border-border p-4">
      <div className="flex items-center gap-2 mb-4">
        <GitBranch className="w-4 h-4 text-primary" />
        <h3 className="text-base font-semibold">Suivi de votre demande</h3>
      </div>

      <div className="relative flex items-start gap-0 overflow-x-auto pt-3 pb-4 px-1 scrollbar-thin">
        {activeSteps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;
          const isUpcoming = index > currentIndex;

          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center relative min-w-[90px]">
                <div
                  className={cn(
                    "relative flex flex-col items-center p-2 rounded-xl border-2 transition-all min-w-[100px] min-h-[80px] justify-center",
                    isCompleted && "border-primary/40 bg-card",
                    isActive && "border-orange-400 shadow-lg bg-card",
                    isUpcoming && "border-muted bg-card"
                  )}
                >
                  {isCompleted ? (
                    <div className="absolute -top-2 -left-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm bg-green-500 text-white">
                      <Check className="w-3 h-3" />
                    </div>
                  ) : (
                    <div className={cn(
                      "absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm",
                      isActive && "bg-orange-500 text-white",
                      isUpcoming && "bg-muted text-muted-foreground border border-border"
                    )}>
                      {step.number}
                    </div>
                  )}

                  <div className={cn(
                    "p-2 rounded-lg",
                    isCompleted && "bg-primary/10",
                    isActive && "bg-orange-50",
                    isUpcoming && "bg-muted"
                  )}>
                    <Icon className={cn(
                      "w-5 h-5",
                      isCompleted && "text-primary",
                      isActive && "text-orange-500",
                      isUpcoming && "text-muted-foreground"
                    )} />
                  </div>
                </div>

                <span className={cn(
                  "mt-2 text-xs font-medium text-center max-w-[90px]",
                  isActive && "text-foreground",
                  isCompleted && "text-foreground",
                  isUpcoming && "text-muted-foreground"
                )}>
                  {step.label}
                </span>
                
                <Badge 
                  variant="secondary"
                  className={cn(
                    "mt-1.5 text-[10px] font-medium px-1.5 py-0",
                    isCompleted && "bg-green-100 text-green-600 border-green-200",
                    isActive && "bg-orange-100 text-orange-600 border-orange-200",
                    isUpcoming && "bg-muted text-muted-foreground border-border"
                  )}
                >
                  {isCompleted ? 'Terminée' : isActive ? 'En cours' : 'À venir'}
                </Badge>
              </div>

              {index < activeSteps.length - 1 && (
                <div className="flex items-center self-start mt-10 px-1">
                  <div className="w-6 border-t-2 border-dashed border-muted-foreground/30"></div>
                  <ChevronRight className="w-3 h-3 text-muted-foreground/30 -ml-1" />
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
