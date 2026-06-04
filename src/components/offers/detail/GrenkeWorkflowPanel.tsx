// Grenke workflow panel (Phase 3c.3) — shown right under the workflow stepper
// for offers whose leaser is Grenke. Surfaces the Grenke submission state as
// a badge, a manual "Refresh status" button (calls grenke-api get_status),
// and the submit action (via the existing payload preview modal) when the
// offer hasn't been submitted yet.

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Send, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import GrenkePayloadPreviewButton from "./GrenkePayloadPreviewButton";
import GrenkeESignaturePanel from "./GrenkeESignaturePanel";
import GrenkeAttachDocuments from "./GrenkeAttachDocuments";
import { updateOfferStatus } from "@/services/offers/offerStatus";

const GRENKE_LEASER_UUID = "d60b86d7-a129-4a17-a877-e8e5caa66949";

interface GrenkeWorkflowPanelProps {
  offerId: string;
  leaserId: string | null | undefined;
  onRefresh?: () => void;
  // Called after a successful Grenke submission so the workflow can advance to
  // the "Introduit leaser" step in the same click (merging the two actions).
  onSubmitted?: () => void | Promise<void>;
  // Called after the DocuSign e-signature has been sent, so the workflow can
  // mark the leaser result as Score A and open the validation modal that
  // creates the Leazr contract (step "attente signature") in the same flow.
  onEsignatureSent?: () => void | Promise<void>;
}

// Map a Grenke state to a French label + visual style.
const STATE_META: Record<string, { label: string; tone: "pending" | "progress" | "ok" | "ko" }> = {
  RequestToGrenke: { label: "Soumis à Grenke", tone: "pending" },
  MissingInfo: { label: "Infos manquantes", tone: "progress" },
  ApplicationReceived: { label: "En cours d'analyse", tone: "progress" },
  GuaranteeRequired: { label: "Garantie requise", tone: "progress" },
  ReadyToSign: { label: "Prêt à signer", tone: "ok" },
  ContractPrinted: { label: "Contrat imprimé", tone: "ok" },
  ContractPrintedBeforeStatement: { label: "Contrat imprimé", tone: "ok" },
  AwaitingCustomerSignature: { label: "Attente signature client", tone: "progress" },
  AwaitingPartnerSignature: { label: "Attente signature partenaire", tone: "progress" },
  AwaitingSigningAppSignature: { label: "Attente e-signature", tone: "progress" },
  AwaitingDeliveryConfirmation: { label: "Attente confirmation livraison", tone: "progress" },
  StartingESignature: { label: "E-signature démarrée", tone: "progress" },
  Contracted: { label: "Contrat actif ✅", tone: "ok" },
  Declined: { label: "Refusé ❌", tone: "ko" },
  Cancelled: { label: "Annulé", tone: "ko" },
  None: { label: "—", tone: "pending" },
};

function toneClasses(tone: "pending" | "progress" | "ok" | "ko"): string {
  switch (tone) {
    case "ok": return "bg-green-500/15 text-green-700 border-green-500/30";
    case "ko": return "bg-red-500/15 text-red-700 border-red-500/30";
    case "progress": return "bg-amber-500/15 text-amber-700 border-amber-500/30";
    default: return "bg-blue-500/15 text-blue-700 border-blue-500/30";
  }
}

function ToneIcon({ tone }: { tone: "pending" | "progress" | "ok" | "ko" }) {
  if (tone === "ok") return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (tone === "ko") return <XCircle className="h-3.5 w-3.5" />;
  if (tone === "progress") return <Clock className="h-3.5 w-3.5" />;
  return <Send className="h-3.5 w-3.5" />;
}

export default function GrenkeWorkflowPanel({ offerId, leaserId, onRefresh, onSubmitted, onEsignatureSent }: GrenkeWorkflowPanelProps) {
  const [state, setState] = useState<{
    grenke_state: string | null;
    grenke_financing_id: string | null;
    grenke_submitted_at: string | null;
    grenke_state_updated_at: string | null;
    grenke_last_error: unknown;
    workflow_status: string | null;
    converted_to_contract: boolean | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [submissions, setSubmissions] = useState<Array<{
    id: string; financing_id: string | null; request_id: string | null;
    state: string | null; submitted_at: string | null; is_active: boolean;
  }>>([]);

  const isGrenke = leaserId === GRENKE_LEASER_UUID;

  const loadSubmissions = async () => {
    try {
      const { data } = await supabase.functions.invoke("grenke-api", {
        body: { action: "get_grenke_submissions", environment: "production", offer_id: offerId },
      });
      const body = (data ?? null) as { submissions?: typeof submissions } | null;
      setSubmissions(body?.submissions ?? []);
    } catch { /* non-fatal */ }
  };

  const load = async () => {
    const { data } = await supabase
      .from("offers")
      .select("grenke_state, grenke_financing_id, grenke_submitted_at, grenke_state_updated_at, grenke_last_error, workflow_status, converted_to_contract")
      .eq("id", offerId)
      .maybeSingle();
    setState(data as never);
    setLoading(false);
    void loadSubmissions();
  };

  // Phase 3c.2 — one-click finalize when Grenke has contracted. Reuses the
  // existing, battle-tested updateOfferStatus → createContractFromOffer flow
  // (setting a final status auto-creates the Leazr contract). We deliberately
  // keep a human in the loop rather than auto-creating contracts unattended.
  const handleFinalize = async () => {
    const ok = window.confirm(
      "Grenke a accepté le dossier (Contracted).\n\n" +
      "Finaliser l'offre va créer le contrat Leazr correspondant.\n\nContinuer ?",
    );
    if (!ok) return;
    try {
      setFinalizing(true);
      const success = await updateOfferStatus(offerId, "financed", state?.workflow_status ?? null);
      if (success) {
        toast.success("Offre finalisée — contrat créé.");
        await load();
        onRefresh?.();
      } else {
        toast.error("La finalisation a échoué.");
      }
    } catch (e) {
      console.error("[GrenkeWorkflowPanel] finalize error:", e);
      toast.error("Erreur inattendue pendant la finalisation");
    } finally {
      setFinalizing(false);
    }
  };

  useEffect(() => {
    if (isGrenke) void load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerId, leaserId]);

  if (!isGrenke || loading) return null;

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const { data, error } = await supabase.functions.invoke("grenke-api", {
        body: { action: "get_status", environment: "production", offer_id: offerId },
      });
      let body = (data ?? null) as { success?: boolean; grenke_state?: string; error?: string; message?: string } | null;
      if (error) {
        const ctx = (error as unknown as { context?: Response }).context;
        if (ctx?.json) { try { body = await ctx.json(); } catch { /* */ } }
      }
      if (body?.success) {
        toast.success(`Statut Grenke : ${body.grenke_state ?? "—"}`);
        await load();
        onRefresh?.();
      } else {
        toast.error(`Refresh échoué : ${body?.message ?? body?.error ?? "erreur"}`);
      }
    } catch (e) {
      console.error("[GrenkeWorkflowPanel] refresh error:", e);
      toast.error("Erreur inattendue");
    } finally {
      setRefreshing(false);
    }
  };

  const submitted = !!state?.grenke_financing_id;
  const grenkeState = state?.grenke_state ?? null;
  const meta = grenkeState ? (STATE_META[grenkeState] ?? { label: grenkeState, tone: "progress" as const }) : null;
  const fmtDate = (s?: string | null) =>
    s ? new Date(s).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <div className="mt-2 pt-4 border-t border-border">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Grenke</span>
          {meta ? (
            <Badge variant="outline" className={`gap-1 ${toneClasses(meta.tone)}`}>
              <ToneIcon tone={meta.tone} />
              {meta.label}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground gap-1">
              <Send className="h-3.5 w-3.5" /> Pas encore soumis
            </Badge>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {!submitted && (
            // Submit flow lives in the payload preview modal (validates first).
            // On success we reload our own state AND advance the workflow step.
            <GrenkePayloadPreviewButton
              offerId={offerId}
              leaserId={leaserId}
              onSubmitted={async () => { await load(); await onSubmitted?.(); onRefresh?.(); }}
            />
          )}
          {submitted && (
            <>
              <GrenkeAttachDocuments offerId={offerId} />
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-1.5">
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                Rafraîchir le statut
              </Button>
              {(grenkeState === "Declined" || grenkeState === "Cancelled") && (
                // Re-analysis after a refusal — creates a new dossier, archives
                // the refused one into the history.
                <GrenkePayloadPreviewButton
                  offerId={offerId}
                  leaserId={leaserId}
                  resubmit
                  onSubmitted={async () => { await load(); await onSubmitted?.(); onRefresh?.(); }}
                />
              )}
            </>
          )}
          {grenkeState === "Contracted" && !state?.converted_to_contract && (
            <Button size="sm" onClick={handleFinalize} disabled={finalizing} className="gap-1.5 bg-green-600 hover:bg-green-700 text-white">
              {finalizing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Finaliser → créer le contrat
            </Button>
          )}
        </div>
      </div>

      {submitted && (
        <div className="mt-2 text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-0.5">
          <span>Soumis le {fmtDate(state?.grenke_submitted_at)}</span>
          <span>Dernière maj statut {fmtDate(state?.grenke_state_updated_at)}</span>
          {state?.grenke_financing_id && (
            <span>ID&nbsp;<code className="bg-muted px-1 rounded">{state.grenke_financing_id.slice(0, 8)}…</code></span>
          )}
        </div>
      )}

      {/* Grenke submission history (shown when there's more than one dossier — e.g.
          a refused request then a re-analysis under a new number). */}
      {submissions.length > 1 && (
        <div className="mt-2 text-xs">
          <div className="text-muted-foreground mb-1">Historique Grenke</div>
          <ul className="space-y-0.5">
            {submissions.map((s) => (
              <li key={s.id} className="flex items-center gap-2">
                <code className="bg-muted px-1 rounded">{s.request_id ?? s.financing_id?.slice(0, 8) ?? "—"}</code>
                <span>{(s.state && STATE_META[s.state]?.label) || s.state || "—"}</span>
                <span className="text-muted-foreground">{fmtDate(s.submitted_at)}</span>
                {s.is_active && <Badge variant="outline" className="text-[10px] text-green-700 border-green-300">actif</Badge>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {state?.grenke_last_error != null && (
        <div className="mt-2 flex items-start gap-1.5 text-xs text-red-600">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5" />
          <span>Dernière erreur Grenke enregistrée — voir le détail dans le payload / les logs.</span>
        </div>
      )}

      {/* Phase 4 — e-signature DocuSign when Grenke is ReadyToSign */}
      {grenkeState === "ReadyToSign" && (
        <GrenkeESignaturePanel
          offerId={offerId}
          onSent={async () => { await load(); onRefresh?.(); await onEsignatureSent?.(); }}
        />
      )}
    </div>
  );
}
