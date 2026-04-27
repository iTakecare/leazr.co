import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, AlertCircle, Loader2, RefreshCw, ShieldCheck, Building2, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { KYC_SCORE_COLORS, KYC_SCORE_LABELS, KycScoreLetter } from "@/services/clients/clientKycScore";

interface AISummary {
  situation: string;
  risk_level: "faible" | "moyen" | "élevé";
  risk_reason: string;
  key_points: string[];
  next_action: string;
  recommendation: string;
}

interface OfferKycContext {
  score: KycScoreLetter | null;
  score_reasons: string[];
  entity_type: string | null;
  legal_form: string | null;
  company_creation_date: string | null;
  company_age_months: number | null;
  business_sector: string | null;
  warnings: string[];
  validated_at: string | null;
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
  const [kyc, setKyc] = useState<OfferKycContext | null>(null);
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
    setKyc(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-offer-summary", {
        body: { offer_id: offerId },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      setSummary(data.summary);
      setKyc(data.kyc ?? null);
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
          {/* KYC client : sous-carte affichée tout en haut si on a au moins le score ou des données société */}
          {kyc && (kyc.score || kyc.legal_form || kyc.company_creation_date) && (
            <KycInlineCard kyc={kyc} />
          )}

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

const ENTITY_TYPE_LABELS: Record<string, string> = {
  societe: "Société",
  independant: "Indépendant",
  asbl: "ASBL",
  autre: "Autre",
};

const KycInlineCard: React.FC<{ kyc: OfferKycContext }> = ({ kyc }) => {
  const colors = kyc.score ? KYC_SCORE_COLORS[kyc.score] : null;

  const formatCreation = () => {
    if (!kyc.company_creation_date) return null;
    try {
      const d = new Date(kyc.company_creation_date).toLocaleDateString("fr-BE");
      const months = kyc.company_age_months;
      return months !== null ? `${d} (${months} mois)` : d;
    } catch {
      return kyc.company_creation_date;
    }
  };

  return (
    <div className={cn(
      "rounded-lg border p-3 flex flex-col sm:flex-row gap-3 items-start",
      colors ? `${colors.bg} ${colors.border}` : "bg-slate-50 border-slate-200"
    )}>
      {/* Score badge à gauche */}
      {kyc.score && colors ? (
        <div className={cn(
          "flex-shrink-0 rounded-md border-2 w-14 h-14 flex flex-col items-center justify-center",
          colors.border, colors.bg
        )}>
          <div className={cn("text-2xl font-extrabold leading-none", colors.text)}>{kyc.score}</div>
          <div className={cn("text-[8px] font-medium uppercase mt-0.5", colors.text)}>KYC</div>
        </div>
      ) : (
        <div className="flex-shrink-0 rounded-md border-2 border-slate-200 bg-slate-50 w-14 h-14 flex flex-col items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-slate-400" />
          <div className="text-[8px] font-medium uppercase text-slate-400 mt-0.5">N/A</div>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("text-sm font-semibold", colors?.text ?? "text-slate-700")}>
            {kyc.score ? KYC_SCORE_LABELS[kyc.score] : "Score KYC non calculé"}
          </span>
          {kyc.legal_form && (
            <Badge variant="outline" className="text-[10px] py-0 h-4">
              {kyc.legal_form}
            </Badge>
          )}
          {kyc.entity_type && (
            <Badge variant="outline" className="text-[10px] py-0 h-4">
              {ENTITY_TYPE_LABELS[kyc.entity_type] ?? kyc.entity_type}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs">
          {formatCreation() && (
            <div className={cn("flex items-center gap-1", colors?.text ?? "text-slate-600")}>
              <CalendarClock className="h-3 w-3" />
              <span>Créée: {formatCreation()}</span>
            </div>
          )}
          {kyc.business_sector && (
            <div className={cn("flex items-center gap-1 truncate", colors?.text ?? "text-slate-600")}>
              <Building2 className="h-3 w-3 flex-shrink-0" />
              <span className="truncate" title={kyc.business_sector}>{kyc.business_sector}</span>
            </div>
          )}
        </div>

        {kyc.score_reasons && kyc.score_reasons.length > 0 && (
          <ul className={cn("text-[11px] mt-2 list-disc pl-4 space-y-0.5", colors?.text ?? "text-slate-600")}>
            {kyc.score_reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        )}

        {kyc.warnings && kyc.warnings.length > 0 && (
          <div className="mt-2 flex items-start gap-1 text-[11px] text-red-700">
            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>{kyc.warnings.join(" · ")}</span>
          </div>
        )}

        {!kyc.validated_at && (
          <div className="text-[10px] italic mt-2 text-slate-500">
            Aucun KYC validé pour ce client — lance-le depuis sa fiche pour fiabiliser cette analyse.
          </div>
        )}
      </div>
    </div>
  );
};

export default OfferAISummary;
