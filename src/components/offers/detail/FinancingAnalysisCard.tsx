import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ShieldCheck, RefreshCw, Sparkles, AlertTriangle, TrendingUp,
  CheckCircle2, XCircle, Landmark, Scale,
} from 'lucide-react';
import {
  AiRecommendation, CreditReportSummary, FinancingExposure,
  fetchCreditReport, getClientRiskInfo, getFinancingExposure,
  getLatestCreditReport, runAiRecommendation, updateClientOutstandingLimit,
} from '@/services/financingAnalysisService';
import { formatCurrency } from '@/utils/formatters';

interface FinancingAnalysisCardProps {
  offer: {
    id: string;
    client_id?: string | null;
    financing_partner_id?: string | null;
    financing_ai_recommendation?: AiRecommendation | null;
    amount?: number;
  };
}

const scoreBadge = (score: string) => {
  switch (score) {
    case 'A': return 'bg-green-100 text-green-800 border-green-300';
    case 'B': return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'C': return 'bg-red-100 text-red-800 border-red-300';
    default: return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

/**
 * Panneau d'analyse pour les demandes de financement (module financeur Winlease) :
 * rapport de crédit Creditsafe, KYC interne, encours vs limites, recommandation IA.
 * La décision elle-même passe par le workflow de scoring existant (stepper/ScoringModal).
 */
const FinancingAnalysisCard: React.FC<FinancingAnalysisCardProps> = ({ offer }) => {
  const [creditReport, setCreditReport] = useState<CreditReportSummary | null>(null);
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [exposure, setExposure] = useState<FinancingExposure | null>(null);
  const [recommendation, setRecommendation] = useState<AiRecommendation | null>(
    (offer.financing_ai_recommendation as AiRecommendation) || null
  );
  const [fetchingReport, setFetchingReport] = useState(false);
  const [runningAi, setRunningAi] = useState(false);
  const [limitDraft, setLimitDraft] = useState<string>('');
  const [savingLimit, setSavingLimit] = useState(false);

  useEffect(() => {
    if (!offer.client_id) return;
    getLatestCreditReport(offer.client_id)
      .then((r) => r && setCreditReport({
        id: r.id,
        fetched_at: r.created_at,
        company_name: r.company_name,
        credit_score: r.credit_score,
        credit_score_description: r.rating_description,
        credit_limit: r.credit_limit,
      }))
      .catch(() => {});
    getClientRiskInfo(offer.client_id)
      .then((c) => {
        setClientInfo(c);
        setLimitDraft(c?.outstanding_limit != null ? String(c.outstanding_limit) : '');
      })
      .catch(() => {});
    getFinancingExposure(offer.client_id, offer.financing_partner_id || null)
      .then(setExposure)
      .catch(() => {});
  }, [offer.client_id, offer.financing_partner_id]);

  const handleFetchReport = async () => {
    try {
      setFetchingReport(true);
      const res = await fetchCreditReport(offer.id);
      if (res.success && res.report) {
        setCreditReport(res.report);
        toast.success('Rapport de crédit récupéré');
      } else if (res.not_configured) {
        toast.warning("Intégration Graydon-CreditSafe non configurée — renseignez les credentials dans Paramètres → Intégrations");
      } else {
        toast.error(res.error || 'Erreur lors de la récupération du rapport');
      }
    } finally {
      setFetchingReport(false);
    }
  };

  const handleRunAi = async () => {
    try {
      setRunningAi(true);
      const res = await runAiRecommendation(offer.id);
      if (res.success && res.recommendation) {
        setRecommendation(res.recommendation);
        toast.success(`Recommandation IA : score ${res.recommendation.suggested_score}`);
      } else {
        toast.error(res.error || "Erreur lors de l'analyse IA");
      }
    } finally {
      setRunningAi(false);
    }
  };

  const saveLimit = async () => {
    if (!offer.client_id) return;
    try {
      setSavingLimit(true);
      const value = limitDraft.trim() === '' ? null : Number(limitDraft);
      await updateClientOutstandingLimit(offer.client_id, value);
      setClientInfo((c: any) => ({ ...c, outstanding_limit: value }));
      toast.success('Limite d\'encours mise à jour');
    } catch (e: any) {
      toast.error(`Erreur : ${e.message}`);
    } finally {
      setSavingLimit(false);
    }
  };

  const clientLimit = clientInfo?.outstanding_limit != null ? Number(clientInfo.outstanding_limit) : null;
  const projected = (exposure?.client_outstanding || 0) + Number(offer.amount || 0);
  const limitExceeded = clientLimit != null && projected > clientLimit;

  return (
    <Card className="border-indigo-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-indigo-600" />
          Analyse financeur
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* ── Rapport de crédit ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Landmark className="h-4 w-4 text-muted-foreground" /> Solvabilité (Graydon-CreditSafe)
            </p>
            <Button variant="outline" size="sm" onClick={handleFetchReport} disabled={fetchingReport}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${fetchingReport ? 'animate-spin' : ''}`} />
              {creditReport ? 'Actualiser' : 'Interroger'}
            </Button>
          </div>
          {creditReport ? (
            <div className="grid grid-cols-3 gap-3 text-sm bg-muted/40 rounded-md p-3">
              <div>
                <p className="text-xs text-muted-foreground">Score</p>
                <p className="font-semibold">{creditReport.credit_score || '—'}</p>
                {creditReport.credit_score_description && (
                  <p className="text-xs text-muted-foreground">{creditReport.credit_score_description}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Limite de crédit conseillée</p>
                <p className="font-semibold">
                  {creditReport.credit_limit != null ? formatCurrency(creditReport.credit_limit) : '—'}
                </p>
                {creditReport.credit_limit != null && offer.amount != null && Number(offer.amount) > Number(creditReport.credit_limit) && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Montant demandé supérieur
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rapport du</p>
                <p className="font-semibold">{new Date(creditReport.fetched_at).toLocaleDateString('fr-BE')}</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Aucun rapport de crédit — interrogez Creditsafe via le n° TVA du client.
            </p>
          )}
        </div>

        {/* ── KYC interne ── */}
        <div className="space-y-1">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <Scale className="h-4 w-4 text-muted-foreground" /> KYC interne
          </p>
          {clientInfo ? (
            <div className="flex items-center gap-3 text-sm">
              {clientInfo.kyc_score ? (
                <Badge variant="outline" className={scoreBadge(clientInfo.kyc_score)}>
                  Score KYC {clientInfo.kyc_score}
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">Pas encore de score KYC (fiche client → section KYC)</span>
              )}
              {clientInfo.company_creation_date && (
                <span className="text-xs text-muted-foreground">
                  Société créée le {new Date(clientInfo.company_creation_date).toLocaleDateString('fr-BE')}
                </span>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Client non chargé</p>
          )}
        </div>

        {/* ── Encours ── */}
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-muted-foreground" /> Encours
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className={`rounded-md p-3 ${limitExceeded ? 'bg-red-50 border border-red-200' : 'bg-muted/40'}`}>
              <p className="text-xs text-muted-foreground">Client final</p>
              <p className="font-semibold">
                {formatCurrency(exposure?.client_outstanding || 0)}
                <span className="text-xs font-normal text-muted-foreground"> accepté ({exposure?.client_accepted_count || 0} dossier{(exposure?.client_accepted_count || 0) > 1 ? 's' : ''})</span>
              </p>
              <p className="text-xs mt-1">
                + cette demande = <span className={limitExceeded ? 'text-red-600 font-semibold' : 'font-medium'}>{formatCurrency(projected)}</span>
                {clientLimit != null && <> / limite {formatCurrency(clientLimit)}</>}
              </p>
              {limitExceeded && (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                  <AlertTriangle className="h-3 w-3" /> Limite d'encours dépassée
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Input
                  type="number" step="1000" placeholder="Limite (€)"
                  className="h-7 text-xs w-28"
                  value={limitDraft}
                  onChange={(e) => setLimitDraft(e.target.value)}
                />
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={saveLimit} disabled={savingLimit}>
                  OK
                </Button>
              </div>
            </div>
            <div className="rounded-md p-3 bg-muted/40">
              <p className="text-xs text-muted-foreground">Partenaire apporteur</p>
              {offer.financing_partner_id ? (
                <p className="font-semibold">
                  {formatCurrency(exposure?.partner_outstanding || 0)}
                  <span className="text-xs font-normal text-muted-foreground"> accepté ({exposure?.partner_accepted_count || 0})</span>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Demande sans partenaire</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Recommandation IA ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-muted-foreground" /> Recommandation IA
            </p>
            <Button variant="outline" size="sm" onClick={handleRunAi} disabled={runningAi}>
              <Sparkles className={`h-3.5 w-3.5 mr-1 ${runningAi ? 'animate-pulse' : ''}`} />
              {runningAi ? 'Analyse en cours…' : recommendation ? 'Relancer l\'analyse' : 'Analyser le dossier'}
            </Button>
          </div>
          {recommendation ? (
            <div className="rounded-md border p-3 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`${scoreBadge(recommendation.suggested_score)} text-base px-2.5`}>
                  {recommendation.suggested_score}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Confiance {recommendation.confidence === 'high' ? 'élevée' : recommendation.confidence === 'medium' ? 'moyenne' : 'faible'}
                  {recommendation.generated_at && ` — ${new Date(recommendation.generated_at).toLocaleString('fr-BE')}`}
                </span>
              </div>
              <p className="whitespace-pre-wrap">{recommendation.rationale}</p>
              {recommendation.red_flags?.length > 0 && (
                <ul className="space-y-0.5">
                  {recommendation.red_flags.map((f, i) => (
                    <li key={i} className="text-xs text-red-700 flex items-start gap-1">
                      <XCircle className="h-3 w-3 mt-0.5 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              )}
              {recommendation.positive_signals?.length > 0 && (
                <ul className="space-y-0.5">
                  {recommendation.positive_signals.map((f, i) => (
                    <li key={i} className="text-xs text-green-700 flex items-start gap-1">
                      <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              )}
              {recommendation.conditions?.length > 0 && (
                <div className="text-xs">
                  <p className="font-medium text-amber-700">Conditions suggérées :</p>
                  <ul className="list-disc list-inside text-amber-800">
                    {recommendation.conditions.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              L'IA synthétise crédit, KYC, encours et cohérence du dossier en une recommandation A/B/C/D motivée.
            </p>
          )}
        </div>

        <p className="text-xs text-muted-foreground border-t pt-2">
          La décision (acceptation / demande de documents / refus motivé) se prend via le workflow
          d'analyse ci-dessus — les emails partent au client avec le partenaire en copie.
        </p>
      </CardContent>
    </Card>
  );
};

export default FinancingAnalysisCard;
