import React from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ShieldCheck } from "lucide-react";
import { KYC_SCORE_COLORS, KYC_SCORE_LABELS, KycScoreLetter } from "@/services/clients/clientKycScore";

interface KycScoreHeaderBadgeProps {
  letter: KycScoreLetter;
  reasons: string[];
}

export const KycScoreHeaderBadge: React.FC<KycScoreHeaderBadgeProps> = ({ letter, reasons }) => {
  const colors = KYC_SCORE_COLORS[letter];
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`${colors.bg} ${colors.text} ${colors.border} border font-semibold flex items-center gap-1 cursor-help`}
          >
            <ShieldCheck className="h-3 w-3" />
            Score KYC : {letter}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-sm">
          <div className="space-y-1">
            <div className="font-semibold">{KYC_SCORE_LABELS[letter]}</div>
            {reasons.length > 0 ? (
              <ul className="text-xs list-disc pl-4 space-y-0.5">
                {reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            ) : (
              <div className="text-xs italic">Aucune raison fournie</div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
