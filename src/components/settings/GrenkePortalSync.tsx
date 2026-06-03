// Reconcile Grenke dossiers created directly in the portal (not via the API)
// with existing Leazr offers. Calls grenke-api 'reconcile_grenke_requests'
// (auto-links confident matches), then lets the user manually link the rest.
// (Shipped via the retrying CI deploy.)

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { RefreshCw, Link2, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Candidate {
  offer_id: string;
  dossier_number: string | null;
  client_name: string | null;
  company: string | null;
  amount_close: boolean;
  monthly_close: boolean;
}
interface Row {
  financing_id: string;
  request_id: string | null;
  state: string | null;
  company: string | null;
  amount: number | null;
  monthly: number | null;
  status: "already_linked" | "auto_linked" | "needs_review" | "no_match" | "linked";
  offer_id?: string;
  dossier_number?: string | null;
  client_name?: string | null;
  candidates?: Candidate[];
}
interface ReconcileResponse {
  success: boolean;
  summary?: { total: number; already_linked: number; auto_linked: number; needs_review: number; no_match: number; created_contracts?: number; financed_from_contracts?: number };
  results?: Row[];
  message?: string;
  error?: string;
}

const fmtEur = (n?: number | null) =>
  n == null ? "—" : new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(n);

export default function GrenkePortalSync() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<ReconcileResponse | null>(null);
  const [picked, setPicked] = useState<Record<string, string>>({}); // financing_id -> offer_id
  const [linking, setLinking] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setResp(null);
    try {
      const parse = async (r: { data?: unknown; error?: unknown }): Promise<ReconcileResponse | null> => {
        let b = (r.data ?? null) as ReconcileResponse | null;
        if (r.error) { const ctx = (r.error as { context?: Response }).context; if (ctx?.json) { try { b = await ctx.json(); } catch { /* */ } } }
        return b;
      };
      // Reconcile the contracts FIRST (accepted deals → offers financed), THEN
      // the requests (in-progress / refused / cancelled). Sequential on purpose:
      // an accepted deal must be marked financed before the requests pass can
      // consider a Cancelled/Declined dossier for cancellation — otherwise an
      // accepted deal (whose request shows as Cancelled) could be wrongly
      // cancelled.
      const conRes = await supabase.functions.invoke("grenke-api", { body: { action: "reconcile_grenke_contracts", environment: "production", payload: { auto: true } } });
      const reqRes = await supabase.functions.invoke("grenke-api", { body: { action: "reconcile_grenke_requests", environment: "production", payload: { auto: true } } });
      const reqBody = await parse(reqRes);
      const conBody = await parse(conRes);
      const sum = (k: keyof NonNullable<ReconcileResponse["summary"]>) => (reqBody?.summary?.[k] ?? 0) + (conBody?.summary?.[k] ?? 0);
      const merged: ReconcileResponse = {
        success: !!(reqBody?.success || conBody?.success),
        summary: { total: sum("total"), already_linked: sum("already_linked"), auto_linked: sum("auto_linked"), needs_review: sum("needs_review"), no_match: sum("no_match"), created_contracts: sum("created_contracts"), financed_from_contracts: sum("financed_from_contracts") },
        results: [...(reqBody?.results ?? []), ...(conBody?.results ?? [])],
        message: reqBody?.message ?? conBody?.message,
        error: reqBody?.error ?? conBody?.error,
      };
      setResp(merged);
      if (merged.success) {
        const s = merged.summary;
        const extra = [
          (s?.created_contracts ?? 0) > 0 ? `${s?.created_contracts} contrat(s) créé(s)` : null,
          (s?.financed_from_contracts ?? 0) > 0 ? `${s?.financed_from_contracts} financée(s)` : null,
        ].filter(Boolean).join(" · ");
        toast.success(`${s?.auto_linked ?? 0} lié(s) auto · ${s?.needs_review ?? 0} à valider · ${s?.no_match ?? 0} sans correspondance${extra ? " · " + extra : ""}`);
        const defaults: Record<string, string> = {};
        (merged.results ?? []).forEach((r) => { if (r.status === "needs_review" && r.candidates?.[0]) defaults[r.financing_id] = r.candidates[0].offer_id; });
        setPicked(defaults);
      } else {
        toast.error(`Échec : ${merged.message ?? merged.error ?? "erreur"}`);
      }
    } catch (e) {
      console.error("[GrenkePortalSync] error:", e);
      toast.error("Erreur inattendue");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => { setOpen(true); void run(); };

  const link = async (row: Row) => {
    const offerId = picked[row.financing_id];
    if (!offerId) { toast.error("Choisissez une offre."); return; }
    setLinking(row.financing_id);
    try {
      const { data, error } = await supabase.functions.invoke("grenke-api", {
        body: { action: "link_grenke_request", environment: "production", payload: { offer_id: offerId, financing_id: row.financing_id, request_id: row.request_id, state: row.state } },
      });
      let body = (data ?? null) as { success?: boolean; message?: string; error?: string } | null;
      if (error) { const ctx = (error as unknown as { context?: Response }).context; if (ctx?.json) { try { body = await ctx.json(); } catch { /* */ } } }
      if (body?.success) {
        toast.success("Dossier lié ✅");
        setResp((prev) => prev ? { ...prev, results: (prev.results ?? []).map((r) => r.financing_id === row.financing_id ? { ...r, status: "linked", offer_id: offerId } : r) } : prev);
      } else {
        toast.error(`Lien échoué : ${body?.message ?? body?.error ?? "erreur"}`);
      }
    } catch (e) {
      console.error("[GrenkePortalSync] link error:", e);
      toast.error("Erreur inattendue");
    } finally {
      setLinking(null);
    }
  };

  const results = resp?.results ?? [];
  const review = results.filter((r) => r.status === "needs_review");
  const linked = results.filter((r) => r.status === "auto_linked" || r.status === "linked" || r.status === "already_linked");
  const noMatch = results.filter((r) => r.status === "no_match");

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h4 className="text-sm font-medium">Synchroniser les dossiers du portail Grenke</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Rapproche les demandes créées directement sur le portail Grenke avec vos offres Leazr (par nom + montant), et synchronise leur statut.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={handleOpen} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Synchroniser
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Synchronisation des dossiers Grenke</DialogTitle>
            <DialogDescription>
              Les correspondances certaines sont liées automatiquement. Validez les autres ci-dessous.
            </DialogDescription>
          </DialogHeader>

          {loading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          )}

          {!loading && resp?.summary && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline" className="text-green-700 border-green-300">{resp.summary.auto_linked} lié(s) auto</Badge>
                <Badge variant="outline" className="text-amber-700 border-amber-300">{resp.summary.needs_review} à valider</Badge>
                <Badge variant="outline">{resp.summary.already_linked} déjà lié(s)</Badge>
                <Badge variant="outline" className="text-muted-foreground">{resp.summary.no_match} sans correspondance</Badge>
              </div>

              {/* Needs review */}
              {review.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-sm font-medium"><AlertTriangle className="h-4 w-4 text-amber-600" /> À valider</div>
                  {review.map((r) => (
                    <div key={r.financing_id} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium">{r.company ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{r.request_id} · {fmtEur(r.amount)} · {fmtEur(r.monthly)}/mois · {r.state}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={picked[r.financing_id] ?? ""}
                          onChange={(e) => setPicked((p) => ({ ...p, [r.financing_id]: e.target.value }))}
                          className="h-8 flex-1 text-xs rounded-md border border-input bg-background px-2"
                        >
                          <option value="">— choisir l'offre Leazr —</option>
                          {(r.candidates ?? []).map((c) => (
                            <option key={c.offer_id} value={c.offer_id}>
                              {c.dossier_number ?? c.offer_id.slice(0, 8)} · {c.client_name ?? c.company ?? ""}{c.amount_close ? " · montant ✓" : ""}{c.monthly_close ? " · mensualité ✓" : ""}
                            </option>
                          ))}
                        </select>
                        <Button size="sm" onClick={() => link(r)} disabled={linking === r.financing_id || !picked[r.financing_id]} className="gap-1.5">
                          {linking === r.financing_id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />} Lier
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Linked (auto / manual / already) */}
              {linked.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-sm font-medium"><CheckCircle2 className="h-4 w-4 text-green-600" /> Liés</div>
                  {linked.map((r) => (
                    <div key={r.financing_id} className="flex items-center justify-between gap-2 text-xs rounded-md border bg-background px-3 py-2">
                      <span className="font-medium truncate">{r.company ?? "—"}</span>
                      <span className="text-muted-foreground">{r.request_id} · {r.state}{r.dossier_number ? ` → ${r.dossier_number}` : ""}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* No match */}
              {noMatch.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground"><HelpCircle className="h-4 w-4" /> Sans correspondance Leazr</div>
                  {noMatch.map((r) => (
                    <div key={r.financing_id} className="flex items-center justify-between gap-2 text-xs text-muted-foreground px-3 py-1.5">
                      <span className="truncate">{r.company ?? "—"}</span>
                      <span>{r.request_id} · {fmtEur(r.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={run} disabled={loading} className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" /> Relancer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
