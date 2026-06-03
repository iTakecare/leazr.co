// Phase 3a.2b — Preview the Grenke FinancingRequest payload that submit_offer
// WOULD send for a given offer. Pure dry-run — no API call to Grenke.
//
// Visible only when the offer's leaser is Grenke. Calls the grenke-api edge
// function with action='build_offer_payload', shows the JSON in a modal
// with a copy-to-clipboard, and surfaces every validation warning above the
// JSON so the user can fix mappings / missing fields before going live.

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Eye, RefreshCw, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Same UUID as in src/services/offers/clientRequests.ts — Grenke's row in
// the leasers table.
const GRENKE_LEASER_UUID = "d60b86d7-a129-4a17-a877-e8e5caa66949";

interface GrenkePayloadPreviewButtonProps {
  offerId: string;
  leaserId: string | null | undefined;
  // Fired once the offer has been successfully submitted to Grenke. Lets the
  // parent merge the workflow "introduce to leaser" transition into this single
  // action (submitting to Grenke == introducing the dossier to the leaser).
  onSubmitted?: () => void | Promise<void>;
}

interface PayloadWarning {
  field: string;
  message: string;
  equipment_id?: string;
  fix_kind?: "category" | "manufacturer" | "selling_price" | "client_address";
}

interface EquipmentDebug {
  equipment_id: string;
  title: string;
  product_id: string | null;
  product_source?: "linked" | "title_match" | "none";
  resolved_category_id: string | null;
  category_source: "offer_equipment" | "product" | "title_match" | "none";
  resolved_brand_id: string | null;
  brand_source: string;
  resolved_manufacturer: string;
  resolved_object_type_id: number | null;
  resolved_net_price: number;
  price_source: "monthly_coefficient" | "selling_price" | "purchase_price";
}

interface PayloadResponse {
  success: boolean;
  environment?: string;
  offer_id?: string;
  payload?: unknown;
  warnings?: PayloadWarning[];
  sums?: { computed_total: number; declared_financing_amount: number };
  equipment_debug?: EquipmentDebug[];
  error?: string;
  message?: string;
}

// Friendly labels for document types (same set as GrenkeAttachDocuments).
const DOC_LABELS: Record<string, string> = {
  balance_sheet: "Bilan financier",
  tax_notice: "Avertissement extrait de rôle",
  id_card_front: "Carte d'identité (recto)",
  id_card_back: "Carte d'identité (verso)",
  id_card: "Carte d'identité",
  company_register: "Extrait de registre d'entreprise",
  vat_certificate: "Attestation TVA",
  bank_statement: "Relevé bancaire",
};

// Same set as in GrenkeFieldMappings — the hardcoded Leazr entity_type values.
const ENTITY_TYPES_LABEL: Record<string, string> = {
  societe: "Société",
  independant: "Indépendant",
  asbl: "ASBL",
  autre: "Autre",
};

export default function GrenkePayloadPreviewButton({
  offerId,
  leaserId,
  onSubmitted,
}: GrenkePayloadPreviewButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PayloadResponse | null>(null);

  // Inline-fix state
  const [categories, setCategories] = useState<Array<{ id: string; label: string }>>([]);
  const [pendingFixes, setPendingFixes] = useState<Record<string, { category_id?: string; manufacturer?: string }>>({});
  const [savingFixes, setSavingFixes] = useState(false);
  const [fixModalOpen, setFixModalOpen] = useState(false);
  const [monthlyPayment, setMonthlyPayment] = useState<number | null>(null);

  // Documents to attach to Grenke right after submission (financingId only
  // exists once the request is created, so we submit first, then upload).
  const [offerDocs, setOfferDocs] = useState<Array<{ id: string; file_name: string; document_type: string; status: string }>>([]);
  const [selectedDocs, setSelectedDocs] = useState<Record<string, boolean>>({});

  // Submit state (Phase 3b)
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<
    | null
    | { success: boolean; grenke_financing_id?: string | null; grenke_state?: string; error?: string; message?: string; grenke_response?: unknown }
  >(null);

  // Don't render at all if the offer isn't targeting Grenke. Keeps the offer
  // detail page clean for non-Grenke leasers.
  if (!leaserId || leaserId !== GRENKE_LEASER_UUID) {
    return null;
  }

  const loadCategories = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", session.user.id)
      .single();
    if (!profile?.company_id) return;
    const { data: cats } = await supabase
      .from("categories")
      .select("id, name, translation")
      .eq("company_id", profile.company_id)
      .order("translation");
    setCategories(((cats ?? []) as Array<{ id: string; name: string; translation: string }>).map((c) => ({
      id: c.id,
      label: c.translation || c.name,
    })));
  };

  const fetchPayload = async () => {
    try {
      setLoading(true);
      setResult(null);

      const { data, error } = await supabase.functions.invoke("grenke-api", {
        body: {
          action: "build_offer_payload",
          environment: "production",
          offer_id: offerId,
        },
      });

      // Read body even on non-2xx so we can surface the real error message.
      let body: PayloadResponse | null = data as never;
      if (error) {
        const ctx = (error as unknown as { context?: Response }).context;
        if (ctx && typeof ctx.json === "function") {
          try { body = await ctx.json(); } catch { /* fall through */ }
        }
      }

      if (!body) {
        toast.error("Réponse vide");
        return;
      }
      setResult(body);
    } catch (e) {
      console.error("[GrenkePayloadPreview] error:", e);
      toast.error("Erreur inattendue");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async () => {
    setOpen(true);
    setPendingFixes({});
    setSubmitResult(null);
    // Fetch the offer's monthly payment for the recap (Grenke doesn't echo it).
    supabase.from("offers").select("monthly_payment").eq("id", offerId).maybeSingle()
      .then(({ data }) => setMonthlyPayment((data as { monthly_payment?: number } | null)?.monthly_payment ?? null));
    // Load the offer's documents so the user can choose which to attach.
    supabase.from("offer_documents").select("id, file_name, document_type, status").eq("offer_id", offerId).order("uploaded_at", { ascending: false })
      .then(({ data }) => {
        const rows = (data ?? []) as Array<{ id: string; file_name: string; document_type: string; status: string }>;
        setOfferDocs(rows);
        setSelectedDocs(Object.fromEntries(rows.filter((d) => d.status !== "rejected").map((d) => [d.id, true])));
      });
    await Promise.all([fetchPayload(), loadCategories()]);
  };

  // Phase 3b — REAL submission. Double-confirm with client + amount, then
  // POST. The edge function re-builds the payload server-side and refuses
  // if there are warnings or if already submitted.
  const handleSubmit = async () => {
    const payload = result?.payload as
      | { Lessee?: { CompanyName?: string }; FinancingAmount?: number }
      | undefined;
    const company = payload?.Lessee?.CompanyName ?? "ce client";
    const amount = payload?.FinancingAmount ?? 0;
    const fmtAmount = new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(amount);

    const ok = window.confirm(
      `⚠️ SOUMISSION RÉELLE À GRENKE\n\n` +
      `Vous allez créer un VRAI dossier de financement chez Grenke pour :\n\n` +
      `  Client : ${company}\n` +
      `  Montant : ${fmtAmount}\n` +
      `  Durée : 36 mois · Rent · Quarterly\n\n` +
      `Ceci n'est pas un test — un dossier sera créé dans le système Grenke.\n\n` +
      `Confirmer la soumission ?`,
    );
    if (!ok) return;

    try {
      setSubmitting(true);
      setSubmitResult(null);
      const { data, error } = await supabase.functions.invoke("grenke-api", {
        body: { action: "submit_offer", environment: "production", offer_id: offerId },
      });
      type SubmitBody = {
        success?: boolean;
        grenke_financing_id?: string | null;
        grenke_state?: string;
        error?: string;
        message?: string;
        warnings?: Array<{ field: string; message: string }>;
        grenke_response?: unknown;
      };
      let body: SubmitBody | null = (data ?? null) as SubmitBody | null;
      if (error) {
        const ctx = (error as unknown as { context?: Response }).context;
        if (ctx?.json) { try { body = await ctx.json(); } catch { /* */ } }
      }
      const r = body;

      if (r?.success) {
        setSubmitResult({
          success: true,
          grenke_financing_id: r.grenke_financing_id,
          grenke_state: r.grenke_state,
        });
        toast.success(
          <div>
            <strong>Dossier créé chez Grenke ✅</strong>
            <p className="text-sm mt-1">État : {r.grenke_state ?? "RequestToGrenke"}</p>
          </div>,
          { duration: 10000 },
        );

        // Attach the selected documents now that the dossier (financingId) exists.
        const docIds = offerDocs.filter((d) => selectedDocs[d.id]).map((d) => d.id);
        if (docIds.length > 0) {
          try {
            const { data: upData, error: upErr } = await supabase.functions.invoke("grenke-api", {
              body: { action: "upload_document", environment: "production", offer_id: offerId, payload: { document_ids: docIds } },
            });
            let up = (upData ?? null) as { success?: boolean; sent?: number; total?: number; message?: string } | null;
            if (upErr) { const ctx = (upErr as unknown as { context?: Response }).context; if (ctx?.json) { try { up = await ctx.json(); } catch { /* */ } } }
            if (up?.success) toast.success(`${up.sent}/${up.total} document(s) joint(s) au dossier Grenke 📎`);
            else toast.warning(`Dossier soumis, mais l'envoi des documents a échoué : ${up?.message ?? "erreur"}. Tu peux réessayer via « Joindre des documents ».`, { duration: 12000 });
          } catch (upe) {
            console.error("[GrenkePayloadPreview] document upload error:", upe);
            toast.warning("Dossier soumis, mais l'envoi des documents a échoué. Tu peux réessayer via « Joindre des documents ».", { duration: 12000 });
          }
        }

        // Merge with the workflow: submitting to Grenke IS "introduce to leaser".
        try { await onSubmitted?.(); } catch (cbErr) { console.error("[GrenkePayloadPreview] onSubmitted callback error:", cbErr); }
      } else {
        setSubmitResult({
          success: false,
          error: r?.error,
          message: r?.message,
          grenke_response: r?.grenke_response,
        });
        toast.error(
          <div>
            <strong>Soumission échouée</strong>
            <p className="text-sm mt-1">{r?.message ?? r?.error ?? "Erreur inconnue"}</p>
          </div>,
          { duration: 12000 },
        );
      }
    } catch (e) {
      console.error("[GrenkePayloadPreview] submit error:", e);
      toast.error("Erreur inattendue pendant la soumission");
    } finally {
      setSubmitting(false);
    }
  };

  // Persist the pending fixes to offer_equipment then re-fetch the payload.
  const saveFixes = async () => {
    const entries = Object.entries(pendingFixes).filter(
      ([, fix]) => (fix.category_id && fix.category_id.length > 0) || (fix.manufacturer && fix.manufacturer.trim()),
    );
    if (entries.length === 0) {
      toast.error("Aucune modification à enregistrer");
      return;
    }
    try {
      setSavingFixes(true);
      // Run updates sequentially so a failure mid-way is easier to recover from.
      for (const [equipmentId, fix] of entries) {
        const update: Record<string, string> = {};
        if (fix.category_id) update.category_id = fix.category_id;
        if (fix.manufacturer && fix.manufacturer.trim()) {
          update.grenke_manufacturer_override = fix.manufacturer.trim();
        }
        if (Object.keys(update).length === 0) continue;
        const { error } = await supabase
          .from("offer_equipment")
          .update(update)
          .eq("id", equipmentId);
        if (error) throw error;
      }
      toast.success(`${entries.length} ligne(s) mise(s) à jour`);
      setPendingFixes({});
      setFixModalOpen(false);
      await fetchPayload();
    } catch (e) {
      console.error("[GrenkePayloadPreview] save fixes error:", e);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSavingFixes(false);
    }
  };


  return (
    <>
      <Button
        size="sm"
        onClick={handleOpen}
        className="gap-2"
      >
        <Send className="h-4 w-4" />
        Soumettre à Grenke
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Soumettre le dossier à Grenke</DialogTitle>
            <DialogDescription>
              Vérifiez le récapitulatif puis soumettez le dossier de financement.
            </DialogDescription>
          </DialogHeader>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && result && (
            <div className="space-y-4">
              {/* Errors from the edge function (validation_error / 4xx / 5xx) */}
              {result.error && !result.payload && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{result.error}</AlertTitle>
                  <AlertDescription>{result.message ?? "Erreur inconnue"}</AlertDescription>
                </Alert>
              )}

              {/* Missing category/brand → compact alert + button opening a nested modal */}
              {result.warnings && result.warnings.some((w) => w.equipment_id && (w.fix_kind === "category" || w.fix_kind === "manufacturer")) && (() => {
                const fixableCount = new Set(
                  result.warnings.filter((w) => w.equipment_id && (w.fix_kind === "category" || w.fix_kind === "manufacturer")).map((w) => w.equipment_id),
                ).size;
                return (
                  <Alert className="border-amber-500/30 bg-amber-50/30">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800">Infos manquantes</AlertTitle>
                    <AlertDescription className="text-amber-700 space-y-2">
                      <p className="text-sm">
                        {fixableCount} équipement{fixableCount > 1 ? "s" : ""} n'a pas de catégorie / marque.
                        Complétez-les avant de soumettre.
                      </p>
                      <Button size="sm" onClick={() => setFixModalOpen(true)} className="h-8">
                        Compléter les infos
                      </Button>
                    </AlertDescription>
                  </Alert>
                );
              })()}

              {/* Other (non-fixable) warnings */}
              {result.warnings && result.warnings.some((w) => !(w.equipment_id && (w.fix_kind === "category" || w.fix_kind === "manufacturer"))) && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>
                    {result.warnings.length} avertissement{result.warnings.length > 1 ? "s" : ""} à corriger avant submit
                  </AlertTitle>
                  <AlertDescription>
                    <ul className="mt-2 space-y-1 text-xs">
                      {result.warnings.map((w, idx) => (
                        <li key={idx}>
                          <code className="bg-muted px-1 rounded">{w.field}</code>{" "}
                          — {w.message}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Success banner (no warnings) + REAL submit button */}
              {result.success && result.payload && !submitResult?.success && (
                <Alert variant="default" className="border-green-500/30 bg-green-50/30">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">
                    Payload prêt à être soumis
                  </AlertTitle>
                  <AlertDescription className="text-xs text-green-700 space-y-2">
                    <p>Aucun champ manquant. Tu peux soumettre ce dossier à Grenke.</p>
                    <Button
                      size="sm"
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {submitting ? (
                        <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5 mr-2" />
                      )}
                      Soumettre le dossier à Grenke
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Submission result */}
              {submitResult?.success && (
                <Alert variant="default" className="border-green-600/50 bg-green-100/40">
                  <CheckCircle2 className="h-4 w-4 text-green-700" />
                  <AlertTitle className="text-green-900">Dossier créé chez Grenke ✅</AlertTitle>
                  <AlertDescription className="text-xs text-green-800 space-y-0.5">
                    <div>Le dossier a été transmis à Grenke et est en cours de traitement.</div>
                    <p className="pt-1 text-[11px]">Le suivi se met à jour automatiquement dans le workflow.</p>
                  </AlertDescription>
                </Alert>
              )}
              {submitResult && !submitResult.success && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Soumission échouée — {submitResult.error}</AlertTitle>
                  <AlertDescription className="text-xs space-y-1">
                    <p>{submitResult.message}</p>
                    {submitResult.grenke_response != null && (
                      <pre className="rounded border bg-background/60 p-2 overflow-x-auto max-h-40">
                        {JSON.stringify(submitResult.grenke_response, null, 2)}
                      </pre>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Human-friendly recap (no JSON, no technical fields) */}
              {result.payload != null && (() => {
                const p = result.payload as {
                  Lessee?: { CompanyName?: string; Email?: string };
                  FinancingAmount?: number;
                  Period?: number;
                  FinancingObjects?: Array<{ Quantity: number; Name?: string; Details?: string; Manufacturer: string }>;
                };
                const fmt = (n?: number) =>
                  new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(n ?? 0);
                return (
                  <div className="rounded-lg border divide-y">
                    <div className="p-3 grid grid-cols-2 gap-y-1.5 gap-x-4 text-sm">
                      <span className="text-muted-foreground">Client</span>
                      <span className="font-medium text-right">{p.Lessee?.CompanyName ?? "—"}</span>
                      <span className="text-muted-foreground">Montant financé</span>
                      <span className="font-medium text-right tabular-nums">{fmt(p.FinancingAmount)}</span>
                      <span className="text-muted-foreground">Durée</span>
                      <span className="font-medium text-right">{p.Period ?? 36} mois</span>
                      {monthlyPayment != null && (
                        <>
                          <span className="text-muted-foreground">Mensualité</span>
                          <span className="font-medium text-right tabular-nums">{fmt(monthlyPayment)}</span>
                        </>
                      )}
                    </div>
                    {p.FinancingObjects && p.FinancingObjects.length > 0 && (
                      <div className="p-3">
                        <div className="text-xs text-muted-foreground mb-1">Équipements</div>
                        <ul className="space-y-0.5 text-sm">
                          {p.FinancingObjects.map((o, i) => (
                            <li key={i} className="flex justify-between gap-3">
                              {/* The product label now lives in Details (Name is reserved
                                  for the object-type). Fall back to Name for safety. */}
                              <span><span className="tabular-nums text-muted-foreground">{o.Quantity}×</span> {o.Details || o.Name || "(équipement)"}</span>
                              <span className="text-muted-foreground text-xs whitespace-nowrap">{o.Manufacturer}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Documents to attach to the Grenke dossier (sent right after submit). */}
              {result.payload != null && !submitResult?.success && offerDocs.length > 0 && (
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">Documents à joindre</span>
                    <Badge variant="outline" className="text-xs">
                      {offerDocs.filter((d) => selectedDocs[d.id]).length}/{offerDocs.length}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Ces pièces seront transmises au dossier Grenke juste après la soumission.
                  </p>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto">
                    {offerDocs.map((d) => (
                      <label key={d.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!selectedDocs[d.id]}
                          onChange={(e) => setSelectedDocs((s) => ({ ...s, [d.id]: e.target.checked }))}
                          className="h-4 w-4"
                        />
                        <span className="flex-1 truncate">{DOC_LABELS[d.document_type] ?? d.document_type}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[40%]">{d.file_name}</span>
                        {d.status === "rejected" && <span className="text-[10px] text-red-600">rejeté</span>}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Nested modal — complete missing category / manufacturer */}
      <Dialog open={fixModalOpen} onOpenChange={setFixModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Compléter catégorie & marque</DialogTitle>
            <DialogDescription>
              Ces équipements ont été saisis manuellement (hors catalogue).
              Choisissez la catégorie et la marque à transmettre à Grenke.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[55vh] overflow-y-auto">
            {result?.warnings && Array.from(
              new Map(
                result.warnings
                  .filter((w) => w.equipment_id && (w.fix_kind === "category" || w.fix_kind === "manufacturer"))
                  .map((w) => [w.equipment_id, w]),
              ).keys(),
            ).map((eqId) => {
              const dbg = result.equipment_debug?.find((d) => d.equipment_id === eqId);
              const fixesForThisRow = result.warnings?.filter((w) => w.equipment_id === eqId) ?? [];
              const needsCategory = fixesForThisRow.some((w) => w.fix_kind === "category");
              const needsManufacturer = fixesForThisRow.some((w) => w.fix_kind === "manufacturer");
              const pending = pendingFixes[eqId!] ?? {};
              return (
                <div key={eqId} className="rounded-lg border p-3 space-y-2">
                  <div className="text-sm font-medium">{dbg?.title ?? "(équipement)"}</div>
                  <div className="grid grid-cols-2 gap-3">
                    {needsCategory && (
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Catégorie</label>
                        <select
                          value={pending.category_id ?? ""}
                          onChange={(e) => setPendingFixes((prev) => ({ ...prev, [eqId!]: { ...prev[eqId!], category_id: e.target.value } }))}
                          className="h-9 w-full text-sm rounded-md border border-input bg-background px-2"
                        >
                          <option value="">— choisir —</option>
                          {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                      </div>
                    )}
                    {needsManufacturer && (
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Marque</label>
                        <input
                          type="text"
                          placeholder="ex: HP, Dell, Other…"
                          value={pending.manufacturer ?? ""}
                          onChange={(e) => setPendingFixes((prev) => ({ ...prev, [eqId!]: { ...prev[eqId!], manufacturer: e.target.value } }))}
                          className="h-9 w-full text-sm rounded-md border border-input bg-background px-2"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setFixModalOpen(false)}>Annuler</Button>
            <Button size="sm" onClick={saveFixes} disabled={savingFixes || Object.keys(pendingFixes).length === 0}>
              {savingFixes ? <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-2" />}
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
