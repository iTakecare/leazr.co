import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, ArrowDown } from "lucide-react";
import { FunnelStage } from "@/services/commercialDashboardService";
import { cn } from "@/lib/utils";

interface ConversionFunnelCardProps {
  stages: FunnelStage[];
  isLoading: boolean;
}

export const ConversionFunnelCard: React.FC<ConversionFunnelCardProps> = ({ stages, isLoading }) => {
  const maxCount = Math.max(...stages.map(s => s.count), 1);
  const total = stages.reduce((sum, s) => sum + s.count, 0);

  return (
    <Card className="shadow-none border-slate-100">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-violet-500" />
          Entonnoir de conversion
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {total} dossiers actifs
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
              <div key={i} className="h-8 bg-slate-100 animate-pulse rounded" />
            ))}
          </div>
        ) : total === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun dossier actif
          </p>
        ) : (
          <div className="space-y-1.5">
            {stages.map((stage, idx) => {
              const widthPct = maxCount > 0 ? Math.max((stage.count / maxCount) * 100, 4) : 4;
              return (
                <div key={stage.id}>
                  {/* Conversion arrow between stages */}
                  {idx > 0 && stages[idx - 1].count > 0 && (
                    <div className="flex items-center gap-2 py-0.5 pl-2">
                      <ArrowDown className="h-3 w-3 text-slate-300 shrink-0" />
                      {stage.conversionFromPrev !== null ? (
                        <span className={cn(
                          "text-[10px] font-medium",
                          stage.conversionFromPrev >= 50 ? "text-emerald-600" :
                          stage.conversionFromPrev >= 25 ? "text-amber-600" : "text-red-500"
                        )}>
                          {stage.conversionFromPrev}% conversion
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-300">—</span>
                      )}
                    </div>
                  )}

                  {/* Stage bar */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 w-28 shrink-0 truncate">
                      {stage.label}
                    </span>
                    <div className="flex-1 relative h-6 bg-slate-100 rounded overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded transition-all duration-500"
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: stage.color,
                          opacity: 0.75,
                        }}
                      />
                      <span className="absolute inset-0 flex items-center px-2 text-[11px] font-semibold text-slate-700">
                        {stage.count}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConversionFunnelCard;
