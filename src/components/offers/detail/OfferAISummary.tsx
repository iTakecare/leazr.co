import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AISummary {
  situation: string;
  risk_level: "faible" | "moyen" | "élevé";
  risk_reason: string;
  key_points: string[];
  next_action: string;
  recommendation: string;
}

interface OfferAISummaryProps {
  offerId: string;
}

const RISK_CONFIG = {
  faible: {
    label: "Risque faible",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
    iconCls: "text-emerald-500",
    borderCls: "border-l-emerald-400",
  },
  moyen: {
    label: "Risque moyen",
    cls: "bg-amber-100 text-amber-700 border-amber-200",
    icon: AlertTriangle,
    iconCls: "text-amber-500",
    borderCls: "border-l-amber-400",
  },
  élevé: {
    label: "Risque élevé",
    cls: "bg-red-100 text-red-700 border-red-200",
    icon: AlertCircle,
    iconCls: "text-red-500",
    borderCls: "border-l-red-400",
  },
} as const;

export const OfferAISummary: React.FC<OfferAISummaryProps> = ({ offerId }) => {
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const hasFetched = useRef(false);

  // Auto-generate on mount
  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      generate();
    }
  }, [offerId]);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-offer-summary", {
        body: { offer_id: offerId },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      setSummary(data.summary);
      setExpanded(true);
    } catch (err: any) {
      setError(err.message ?? "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const riskConfig = summary ? RISK_CONFIG[summary.risk_level] ?? RISK_CONFIG["moyen"] : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-50 to-purple-50 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-violet-100 rounded-lg">
            <Sparkles className="h-3.5 w-3.5 text-violet-600" />
          </div>
          <span className="text-sm font-semibold text-slate-800">Résumé IA du dossier</span>
          {riskConfig && (
            <Badge
              variant="outline"
              className={cn("text-[11px] px-2 py-0.5 font-medium border", riskConfig.cls)}
            >
              {riskConfig.label}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {summary && (
            <Button
              variant="ghost"
              size="sm"
              onClick={generate}
              disabled={loading}
              className="h-7 px-2 text-xs text-slate-500 hover:text-violet-600"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Actualiser
            </Button>
          )}
          {summary && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((v) => !v)}
              className="h-7 w-7 p-0 text-slate-400"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
          {!summary && !loading && (
            <Button
              size="sm"
              onClick={generate}
              className="h-7 text-xs bg-violet-600 hover:bg-violet-700 text-white px-3"
            >
              <Sparkles className="h-3 w-3 mr-1.5" />
              Générer
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
          Analyse en cours…
        </div>
      )}

      {error && (
        <div className="px-4 py-3 text-sm text-red-600 bg-red-50 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <Button
            variant="ghost"
            size="sm"
            onClick={generate}
            className="ml-auto h-6 text-xs text-red-600 hover:text-red-700"
          >
            Réessayer
          </Button>
        </div>
      )}

      {!summary && !loading && !error && (
        <div className="px-4 py-3 text-center text-xs text-slate-400">
          Prêt à analyser…
        </div>
      )}

      {summary && expanded && (
        <div className={cn("border-l-4 mx-4 my-4 pl-3 space-y-3", riskConfig?.borderCls ?? "border-l-slate-300")}>
          {/* Situation */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Situation</p>
            <p className="text-sm text-slate-700 leading-relaxed">{summary.situation}</p>
          </div>

          {/* Risk reason */}
          <div className="flex items-start gap-2">
            {riskConfig && (
              <riskConfig.icon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", riskConfig.iconCls)} />
            )}
            <p className="text-xs text-slate-500 italic">{summary.risk_reason}</p>
          </div>

          {/* Key points */}
          {summary.key_points?.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Points clés</p>
              <ul className="space-y-1">
                {summary.key_points.map((pt, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="text-violet-400 font-bold mt-0.5">·</span>
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Next action */}
          <div className="bg-violet-50 rounded-lg px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-500 mb-1">Action recommandée</p>
            <p className="text-sm font-medium text-slate-700">{summary.next_action}</p>
          </div>

          {/* Recommendation */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Recommandation</p>
            <p className="text-sm text-slate-600 leading-relaxed">{summary.recommendation}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfferAISummary;
