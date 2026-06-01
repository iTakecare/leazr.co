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

const GRENKE_LEASER_UUID = "d60b86d7-a129-4a17-a877-e8e5caa66949";

interface GrenkeWorkflowPanelProps {
  offerId: string;
  leaserId: string | null | undefined;
  onRefresh?: () => void;
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

export default function GrenkeWorkflowPanel({ offerId, leaserId, onRefresh }: GrenkeWorkflowPanelProps) {
  const [state, setState] = useState<{
    grenke_state: string | null;
    grenke_financing_id: string | null;
    grenke_submitted_at: string | null;
    grenke_state_updated_at: string | null;
    grenke_last_error: unknown;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isGrenke = leaserId === GRENKE_LEASER_UUID;

  const load = async () => {
    const { data } = await supabase
      .from("offers")
      .select("grenke_state, grenke_financing_id, grenke_submitted_at, grenke_state_updated_at, grenke_last_error")
      .eq("id", offerId)
      .maybeSingle();
    setState(data as never);
    setLoading(false);
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
    <div className="rounded-lg border bg-muted/20 p-3 mb-4">
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
            <GrenkePayloadPreviewButton offerId={offerId} leaserId={leaserId} />
          )}
          {submitted && (
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Rafraîchir le statut
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

      {state?.grenke_last_error != null && (
        <div className="mt-2 flex items-start gap-1.5 text-xs text-red-600">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5" />
          <span>Dernière erreur Grenke enregistrée — voir le détail dans le payload / les logs.</span>
        </div>
      )}
    </div>
  );
}
