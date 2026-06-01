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

interface PayloadResponse {
  success: boolean;
  environment?: string;
  offer_id?: string;
  payload?: unknown;
  warnings?: Array<{ field: string; message: string }>;
  sums?: { computed_total: number; declared_financing_amount: number };
  error?: string;
  message?: string;
}

export default function GrenkePayloadPreviewButton({
  offerId,
  leaserId,
}: GrenkePayloadPreviewButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PayloadResponse | null>(null);

  // Don't render at all if the offer isn't targeting Grenke. Keeps the offer
  // detail page clean for non-Grenke leasers.
  if (!leaserId || leaserId !== GRENKE_LEASER_UUID) {
    return null;
  }

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
    await fetchPayload();
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
