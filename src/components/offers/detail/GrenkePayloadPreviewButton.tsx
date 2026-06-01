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
import { AlertCircle, CheckCircle2, ClipboardCopy, Eye, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Same UUID as in src/services/offers/clientRequests.ts — Grenke's row in
// the leasers table.
const GRENKE_LEASER_UUID = "d60b86d7-a129-4a17-a877-e8e5caa66949";

interface GrenkePayloadPreviewButtonProps {
  offerId: string;
  leaserId: string | null | undefined;
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
  resolved_category_id: string | null;
  category_source: "offer_equipment" | "product" | "none";
  resolved_brand_id: string | null;
  brand_source: string;
  resolved_manufacturer: string;
  resolved_object_type_id: number | null;
  resolved_net_price: number;
  price_source: "selling_price" | "purchase_price";
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
}: GrenkePayloadPreviewButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PayloadResponse | null>(null);

  // Inline-fix state
  const [categories, setCategories] = useState<Array<{ id: string; label: string }>>([]);
  const [pendingFixes, setPendingFixes] = useState<Record<string, { category_id?: string; manufacturer?: string }>>({});
  const [savingFixes, setSavingFixes] = useState(false);

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
    await Promise.all([fetchPayload(), loadCategories()]);
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
      toast.success(`${entries.length} ligne(s) mise(s) à jour — reconstruction du payload…`);
      setPendingFixes({});
      await fetchPayload();
    } catch (e) {
      console.error("[GrenkePayloadPreview] save fixes error:", e);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSavingFixes(false);
    }
  };

  const handleCopy = () => {
    if (!result?.payload) return;
    void navigator.clipboard.writeText(JSON.stringify(result.payload, null, 2));
    toast.success("JSON copié dans le presse-papier");
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className="gap-2"
      >
        <Eye className="h-4 w-4" />
        Voir le payload Grenke
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Payload Grenke — Aperçu
              <Badge variant="outline" className="text-xs">
                Dry-run · aucune soumission
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Ce JSON est exactement ce que <code className="text-xs">submit_offer</code> enverra
              à <code className="text-xs">POST /basic/v1/requests</code>. Aucun appel n'est fait
              ce stade — purement informatif.
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

              {/* Inline-fix panel — group fixable warnings by equipment_id and
                  let the user pick category + manufacturer right here. */}
              {result.warnings && result.warnings.some((w) => w.equipment_id && (w.fix_kind === "category" || w.fix_kind === "manufacturer")) && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Compléter les infos manquantes</AlertTitle>
                  <AlertDescription>
                    <p className="text-xs mb-2">
                      Pour les lignes d'équipement saisies manuellement (sans
                      lien catalogue), choisis ici la catégorie et la marque
                      à envoyer à Grenke. Les changements sont sauvegardés sur
                      la ligne d'offre.
                    </p>
                    <div className="space-y-2">
                      {Array.from(
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
                          <div key={eqId} className="rounded border bg-background p-2 space-y-2">
                            <div className="text-xs font-medium">{dbg?.title ?? "(équipement)"}</div>
                            <div className="grid grid-cols-2 gap-2">
                              {needsCategory && (
                                <div>
                                  <label className="text-[10px] text-muted-foreground block mb-0.5">Catégorie Leazr</label>
                                  <select
                                    value={pending.category_id ?? ""}
                                    onChange={(e) => setPendingFixes((p) => ({
                                      ...p,
                                      [eqId!]: { ...p[eqId!], category_id: e.target.value },
                                    }))}
                                    className="h-7 w-full text-xs rounded-md border border-input bg-background px-2"
                                  >
                                    <option value="">— choisir —</option>
                                    {categories.map((c) => (
                                      <option key={c.id} value={c.id}>{c.label}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                              {needsManufacturer && (
                                <div>
                                  <label className="text-[10px] text-muted-foreground block mb-0.5">Manufacturer (override)</label>
                                  <input
                                    type="text"
                                    placeholder="ex: HP, Dell, Other…"
                                    value={pending.manufacturer ?? ""}
                                    onChange={(e) => setPendingFixes((p) => ({
                                      ...p,
                                      [eqId!]: { ...p[eqId!], manufacturer: e.target.value },
                                    }))}
                                    className="h-7 w-full text-xs rounded-md border border-input bg-background px-2"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <Button
                      size="sm"
                      onClick={saveFixes}
                      disabled={savingFixes || Object.keys(pendingFixes).length === 0}
                      className="mt-2 h-7 text-xs"
                    >
                      {savingFixes ? (
                        <RefreshCw className="h-3 w-3 mr-1.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3 mr-1.5" />
                      )}
                      Sauver et reconstruire
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Per-field warnings collected during build */}
              {result.warnings && result.warnings.length > 0 && (
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

              {/* Success banner (no warnings) */}
              {result.success && result.payload && (
                <Alert variant="default" className="border-green-500/30 bg-green-50/30">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">
                    Payload prêt à être soumis
                  </AlertTitle>
                  <AlertDescription className="text-xs text-green-700">
                    Aucun champ manquant. Quand on activera Phase 3b (submit
                    réel), ce JSON sera envoyé tel quel à Grenke.
                  </AlertDescription>
                </Alert>
              )}

              {/* Sums sanity check */}
              {result.sums && (
                <div className="rounded border bg-muted/30 p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">FinancingAmount déclaré :</span>
                    <span className="tabular-nums font-medium">
                      {new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" })
                        .format(result.sums.declared_financing_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Σ (quantity × purchase_price) :</span>
                    <span className="tabular-nums font-medium">
                      {new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" })
                        .format(result.sums.computed_total)}
                    </span>
                  </div>
                  {Math.abs(result.sums.computed_total - result.sums.declared_financing_amount) > 0.01 && (
                    <p className="text-destructive text-[11px] mt-1">
                      ⚠ Grenke rejettera ce déséquilibre.
                    </p>
                  )}
                </div>
              )}

              {/* JSON view */}
              {result.payload != null && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">JSON FinancingRequest</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCopy}
                      className="h-7 gap-1.5 text-xs"
                    >
                      <ClipboardCopy className="h-3.5 w-3.5" />
                      Copier
                    </Button>
                  </div>
                  <pre className="rounded border bg-muted/30 p-3 text-[11px] overflow-x-auto max-h-[400px] overflow-y-auto">
                    {JSON.stringify(result.payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
