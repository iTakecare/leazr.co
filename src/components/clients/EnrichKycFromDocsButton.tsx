import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FileSearch, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface EnrichKycFromDocsButtonProps {
  onCompleted?: () => void;
}

interface EnrichResult {
  success: boolean;
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  score_changes?: Array<{ name: string; from: string | null; to: string }>;
  failures?: Array<{ clientId: string; reason: string }>;
}

const EnrichKycFromDocsButton: React.FC<EnrichKycFromDocsButtonProps> = ({ onCompleted }) => {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [eligibleCount, setEligibleCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  const fetchEligibleCount = async () => {
    setLoadingCount(true);
    try {
      // Count clients with financial offer docs that haven't been enriched yet
      const { data, error } = await supabase.rpc("count_kyc_enrichment_candidates" as any, {});
      if (error) throw error;
      // Fallback: do the count via raw query if RPC not available
      const { count: docCount } = await supabase
        .from("offer_documents" as any)
        .select("offer_id", { count: "exact", head: true })
        .in("document_type", [
          "balance_sheet",
          "provisional_balance",
          "tax_notice",
          "additional:other_financial",
        ])
        .in("status", ["approved", "pending"])
        .ilike("mime_type", "%pdf%");
      setEligibleCount(typeof data === "number" ? data : docCount ?? 0);
    } catch (err: any) {
      // Just show a generous estimate if count fails
      setEligibleCount(null);
      console.warn("Count failed:", err.message);
    } finally {
      setLoadingCount(false);
    }
  };

  const runBatch = async () => {
    setRunning(true);
    let totalSucceeded = 0;
    let totalFailed = 0;
    let runs = 0;
    const allScoreChanges: EnrichResult["score_changes"] = [];

    const toastId = toast.loading("Enrichissement KYC depuis les documents… (lot 1)");

    try {
      while (runs < 15) {
        runs++;
        toast.loading(`Enrichissement KYC… (lot ${runs})`, { id: toastId });
        const { data, error } = await supabase.functions.invoke(
          "enrich-kyc-from-offer-docs",
          { body: {} },
        );
        if (error) {
          // IDLE_TIMEOUT happens when traitement traîne — on continue (les clients
          // qui ont réussi sont sortis du pipeline, le prochain run reprendra).
          console.warn("Run", runs, "error:", error);
          await new Promise((r) => setTimeout(r, 5000));
          continue;
        }
        const result = data as EnrichResult;
        if (!result?.success) {
          throw new Error("Réponse invalide");
        }
        totalSucceeded += result.succeeded;
        totalFailed += result.failed;
        if (result.score_changes) allScoreChanges.push(...result.score_changes);

        if (result.processed === 0) break; // plus rien à traiter
      }

      const summary = `Enrichissement KYC terminé : ${totalSucceeded} OK · ${totalFailed} échec(s)`;
      const changeLine =
        allScoreChanges && allScoreChanges.length > 0
          ? ` · ${allScoreChanges.length} score(s) modifié(s)`
          : "";
      toast.success(summary + changeLine, { id: toastId, duration: 8000 });
      setOpen(false);
      onCompleted?.();
    } catch (err: any) {
      toast.error(`Enrichissement : ${err.message ?? "erreur inconnue"}`, { id: toastId });
    } finally {
      setRunning(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) fetchEligibleCount();
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileSearch className="h-4 w-4 text-blue-500" />
          Enrichir KYC (docs)
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Enrichir le KYC depuis les documents d'offres</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              <p>
                Pour chaque client qui a des documents financiers déposés sur ses offres
                (bilan, AER, bilan provisoire), Claude analyse les PDF et extrait les
                indicateurs (CA, résultat net, fonds propres, employés) pour affiner le
                score KYC.
              </p>
              <p>
                <strong>Aucune donnée existante n'est écrasée.</strong> On ajoute juste un
                rapport KYC supplémentaire et on recalcule le score (qui peut passer de B
                à A si les indicateurs sont sains, ou à D si fonds propres négatifs).
              </p>
              {loadingCount ? (
                <p className="italic text-muted-foreground">Comptage en cours…</p>
              ) : eligibleCount !== null ? (
                <p className="font-semibold">
                  ~{eligibleCount} document{eligibleCount > 1 ? "s" : ""} financier
                  {eligibleCount > 1 ? "s" : ""} à analyser. Durée : 2-3 minutes par lot
                  de 3 clients (limite Claude 30k tokens/min).
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Coût Claude estimé : ~$0.05 par client. Reste sur cette page jusqu'à la
                fin du dernier lot.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={running}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              runBatch();
            }}
            disabled={running}
          >
            {running && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
            Lancer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default EnrichKycFromDocsButton;
