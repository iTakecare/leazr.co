import React from "react";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobileWorkflowStatusProps {
  status: string;
  scores?: {
    internal?: string | null;
    leaser?: string | null;
  };
  onClick?: () => void;
}

const getStatusConfig = (status: string) => {
  const statusMap: Record<string, { label: string; color: string; bgColor: string }> = {
    draft: { label: "Brouillon", color: "text-muted-foreground", bgColor: "bg-muted" },
    sent: { label: "Envoyée", color: "text-blue-700", bgColor: "bg-blue-100" },
    requested_info: { label: "Documents demandés", color: "text-orange-700", bgColor: "bg-orange-100" },
    info_received: { label: "Documents reçus", color: "text-cyan-700", bgColor: "bg-cyan-100" },
    internal_review: { label: "Analyse interne", color: "text-purple-700", bgColor: "bg-purple-100" },
    internal_approved: { label: "Validé en interne", color: "text-green-700", bgColor: "bg-green-100" },
    internal_docs_requested: { label: "Docs internes demandés", color: "text-amber-700", bgColor: "bg-amber-100" },
    leaser_review: { label: "Analyse leaser", color: "text-indigo-700", bgColor: "bg-indigo-100" },
    leaser_approved: { label: "Validé par leaser", color: "text-emerald-700", bgColor: "bg-emerald-100" },
    leaser_docs_requested: { label: "Docs leaser demandés", color: "text-yellow-700", bgColor: "bg-yellow-100" },
    offer_validation: { label: "Offre validée", color: "text-green-700", bgColor: "bg-green-100" },
    offer_accepted: { label: "Offre acceptée", color: "text-green-700", bgColor: "bg-green-100" },
    signed: { label: "Signée", color: "text-primary", bgColor: "bg-primary/10" },
    rejected: { label: "Refusée", color: "text-destructive", bgColor: "bg-destructive/10" },
    without_follow_up: { label: "Sans suite", color: "text-muted-foreground", bgColor: "bg-muted" },
    archived: { label: "Archivée", color: "text-muted-foreground", bgColor: "bg-muted" },
    invoicing: { label: "Facturation", color: "text-blue-700", bgColor: "bg-blue-100" },
  };

  return statusMap[status] || { label: status, color: "text-muted-foreground", bgColor: "bg-muted" };
};

const getScoreColor = (score: string) => {
  switch (score) {
    case 'A': return "bg-green-100 text-green-700 border-green-300";
    case 'B': return "bg-orange-100 text-orange-700 border-orange-300";
    case 'C': return "bg-red-100 text-red-700 border-red-300";
    case 'D': return "bg-gray-100 text-gray-700 border-gray-300";
    default: return "bg-muted text-muted-foreground";
  }
};

const MobileWorkflowStatus: React.FC<MobileWorkflowStatusProps> = ({
  status,
  scores,
  onClick,
}) => {
  const config = getStatusConfig(status);

  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Statut actuel</p>
            <Badge className={cn("font-medium", config.bgColor, config.color, "border-0")}>
              {config.label}
            </Badge>
          </div>
          
          {onClick && (
            <Button variant="ghost" size="sm" onClick={onClick} className="text-xs">
              Progression
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>

        {/* Scores si présents */}
        {(scores?.internal || scores?.leaser) && (
          <div className="mt-3 pt-3 border-t border-border flex gap-2">
            {scores.internal && (
              <Badge variant="outline" className={cn("text-xs", getScoreColor(scores.internal))}>
                Score interne: {scores.internal}
              </Badge>
            )}
            {scores.leaser && (
              <Badge variant="outline" className={cn("text-xs", getScoreColor(scores.leaser))}>
                Score leaser: {scores.leaser}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MobileWorkflowStatus;
