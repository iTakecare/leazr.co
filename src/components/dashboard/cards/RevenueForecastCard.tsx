import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Euro } from "lucide-react";
import { RevenueForecast } from "@/services/commercialDashboardService";

interface RevenueForecastCardProps {
  forecast: RevenueForecast | null;
  isLoading: boolean;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " €";

export const RevenueForecastCard: React.FC<RevenueForecastCardProps> = ({ forecast, isLoading }) => {
  const maxWeighted = forecast
    ? Math.max(...forecast.stages.map(s => s.weightedMonthly), 1)
    : 1;

  return (
    <Card className="shadow-none border-slate-100">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-500" />
          Forecast pipeline (mensuel pondéré)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-8 bg-slate-100 animate-pulse rounded" />
            ))}
          </div>
        ) : !forecast || forecast.totalPipeline === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Aucune offre active en pipeline</p>
        ) : (
          <>
            {/* Summary KPIs */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-emerald-50 rounded-lg p-3 text-center">
                <p className="text-[10px] text-emerald-600 font-medium uppercase tracking-wide">MRR pondéré</p>
                <p className="text-lg font-bold text-emerald-700">{fmt(forecast.weightedForecast)}</p>
                <p className="text-[10px] text-emerald-500">/mois</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-[10px] text-blue-600 font-medium uppercase tracking-wide">ARR pondéré</p>
                <p className="text-lg font-bold text-blue-700">{fmt(forecast.forecastAnnual)}</p>
                <p className="text-[10px] text-blue-500">/an</p>
              </div>
            </div>

            {/* Pipeline total */}
            <p className="text-[11px] text-slate-400 mb-3">
              Pipeline brut : <strong className="text-slate-600">{fmt(forecast.totalPipeline)}/m</strong> —
              pondéré par probabilité de closing à chaque étape
            </p>

            {/* Stage breakdown */}
            <div className="space-y-1.5">
              {forecast.stages.filter(s => s.count > 0).map(stage => {
                const widthPct = maxWeighted > 0 ? Math.max((stage.weightedMonthly / maxWeighted) * 100, 3) : 3;
                return (
                  <div key={stage.id} className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 w-28 shrink-0 truncate">{stage.label}</span>
                    <div className="flex-1 relative h-6 bg-slate-100 rounded overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded transition-all duration-500"
                        style={{ width: `${widthPct}%`, backgroundColor: stage.color, opacity: 0.7 }}
                      />
                      <span className="absolute inset-0 flex items-center justify-between px-2 text-[11px] font-medium text-slate-700">
                        <span>{stage.count} dossier{stage.count > 1 ? "s" : ""}</span>
                        <span className="font-semibold">{fmt(stage.weightedMonthly)}</span>
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 w-8 text-right shrink-0">
                      {Math.round(stage.probability * 100)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default RevenueForecastCard;
