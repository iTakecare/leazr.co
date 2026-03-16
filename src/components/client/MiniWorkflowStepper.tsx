import React from "react";
import { CheckCircle2, CircleDot, Circle } from "lucide-react";
import { useWorkflowForOfferType } from "@/hooks/workflows/useWorkflows";
import { useWorkflowSteps } from "@/hooks/workflows/useWorkflowSteps";
import { useIsMobile } from "@/hooks/use-mobile";
import type { OfferType } from "@/types/workflow";

interface MiniWorkflowStepperProps {
  currentStatus: string;
  offerType?: string;
  workflowTemplateId?: string;
  companyId?: string;
}

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
  'accepted': 'leaser_review',
  'offer_sent': 'offer_send',
  'sent': 'offer_send',
  'client_approved': 'client_approved',
  'offer_accepted': 'offer_accepted',
  'offer_validation': 'validated',
  'validated': 'validated',
  'contract_ready': 'validated',
  'contrat_pret': 'validated',
  'financed': 'validated',
  'contract_sent': 'validated',
  'contract_signed': 'validated',
};

const MiniWorkflowStepper: React.FC<MiniWorkflowStepperProps> = ({
  currentStatus,
  offerType = 'client_request',
  workflowTemplateId,
  companyId,
}) => {
  const isMobile = useIsMobile();
  const { steps: templateSteps, loading: templateLoading } = useWorkflowSteps(workflowTemplateId);
  const { steps: defaultSteps, loading: defaultLoading } = useWorkflowForOfferType(
    companyId,
    offerType as OfferType
  );

  const workflowSteps = workflowTemplateId && templateSteps.length > 0 ? templateSteps : defaultSteps;
  const loading = workflowTemplateId ? templateLoading : defaultLoading;

  const steps = workflowSteps
    .filter(s => s.is_visible)
    .sort((a, b) => a.step_order - b.step_order);

  const getCurrentIndex = () => {
    let idx = steps.findIndex(s => s.step_key === currentStatus);
    if (idx === -1) {
      const mapped = STATUS_MAPPING[currentStatus];
      if (mapped) idx = steps.findIndex(s => s.step_key === mapped);
    }
    if (idx === -1) {
      idx = steps.findIndex(s => s.step_key.includes(currentStatus) || currentStatus.includes(s.step_key));
    }
    if (idx === -1 && currentStatus.includes('internal')) {
      idx = steps.findIndex(s => s.scoring_type === 'internal');
    } else if (idx === -1 && currentStatus.includes('leaser')) {
      idx = steps.findIndex(s => s.scoring_type === 'leaser');
    }
    return idx >= 0 ? idx : 0;
  };

  if (loading || steps.length === 0) {
    return <div className="h-6 bg-muted/30 rounded animate-pulse" />;
  }

  const currentIdx = getCurrentIndex();

  // ── Mobile: compact progress bar with current label ──
  if (isMobile) {
    const progress = steps.length > 1 ? (currentIdx / (steps.length - 1)) * 100 : 100;
    const currentStep = steps[currentIdx];

    return (
      <div className="space-y-1.5">
        {/* Progress bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${Math.max(progress, 8)}%` }}
          />
        </div>
        {/* Label row */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-primary truncate">
            {currentStep?.step_label}
          </span>
          <span className="text-[10px] text-muted-foreground shrink-0 ml-1">
            {currentIdx + 1}/{steps.length}
          </span>
        </div>
      </div>
    );
  }

  // ── Desktop: inline dot stepper ──
  return (
    <div className="flex items-center gap-0.5 overflow-x-auto pb-1">
      {steps.map((step, i) => {
        const isDone = i < currentIdx;
        const isActive = i === currentIdx;
        const isUpcoming = i > currentIdx;
        return (
          <React.Fragment key={step.step_key}>
            <div className="flex flex-col items-center gap-1.5 min-w-[55px] flex-shrink-0">
              {isDone ? (
                <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                </div>
              ) : isActive ? (
                <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center animate-pulse">
                  <CircleDot className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/20 flex items-center justify-center">
                  <Circle className="h-2.5 w-2.5 text-muted-foreground/30" />
                </div>
              )}
              <span className={`text-[8px] leading-tight text-center ${isUpcoming ? "text-muted-foreground/40" : isDone ? "text-emerald-600 font-medium" : "text-primary font-semibold"}`}>
                {step.step_label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 flex-1 min-w-[8px] rounded-full -mt-4 ${isDone ? "bg-emerald-400" : "bg-muted-foreground/15"}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default MiniWorkflowStepper;
