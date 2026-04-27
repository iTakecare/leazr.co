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
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BulkKycButtonProps {
  onCompleted?: () => void;
}

interface BulkResult {
  success: boolean;
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  failures?: Array<{ clientId: string; reason: string }>;
}

const BulkKycButton: React.FC<BulkKycButtonProps> = ({ onCompleted }) => {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [eligibleCount, setEligibleCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  const fetchEligibleCount = async () => {
    setLoadingCount(true);
    try {
      const { count, error } = await supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .not("vat_number", "is", null)
        .neq("vat_number", "")
        .is("kyc_validated_at", null);
      if (error) throw error;
      setEligibleCount(count ?? 0);
    } catch (err: any) {
      console.error(err);
      toast.error(`Impossible de compter les clients éligibles : ${err.message}`);
    } finally {
      setLoadingCount(false);
    }
  };

  const runBatch = async () => {
    setRunning(true);
    let totalSucceeded = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    let runs = 0;
    let lastBatchProcessed = -1;

    const toastId = toast.loading("Bulk KYC en cours… (lot 1)");

    try {
      // Boucle : on rappelle l'edge function tant qu'il reste des éligibles.
      // Chaque run traite jusqu'à 100 clients (limite serveur).
      // Sécurité : on stoppe après 10 runs (= 1000 clients max) ou si plus rien à traiter.
      while (runs < 10) {
        runs++;
        toast.loading(`Bulk KYC en cours… (lot ${runs})`, { id: toastId });
        const { data, error } = await supabase.functions.invoke("bulk-kyc-lookup", {
          body: {},
        });
        if (error) throw new Error(error.message);
        const result = data as BulkResult;
        if (!result.success) throw new Error("Réponse invalide du serveur");

        totalSucceeded += result.succeeded;
        totalFailed += result.failed;
        totalSkipped += result.skipped;

        // Si rien à traiter, on s'arrête
        if (result.processed === 0) break;
        // Si on n'a pas progressé d'un run à l'autre, on s'arrête (évite boucle infinie)
        if (result.processed === lastBatchProcessed && result.succeeded === 0) break;
        lastBatchProcessed = result.processed;
        // Si on a traité moins de 100 (= la limite), c'est qu'il n'y en a plus
        if (result.processed < 100) break;
      }

      toast.success(
        `Bulk KYC terminé : ${totalSucceeded} OK · ${totalFailed} échec(s) · ${totalSkipped} non BE skippé(s)`,
        { id: toastId, duration: 8000 },
      );
      setOpen(false);
      onCompleted?.();
    } catch (err: any) {
      console.error(err);
      toast.error(`Bulk KYC : ${err.message ?? "erreur inconnue"}`, { id: toastId });
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
          <Sparkles className="h-4 w-4 text-violet-500" />
          KYC en lot
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Lancer le KYC en lot</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              <p>
                Pour chaque client qui a un numéro de TVA mais pas encore de KYC validé,
                je lance un lookup automatique sur la BCE et je remplis les champs vides
                (forme juridique, date de création, secteur, adresse).
              </p>
              <p>
                <strong>Aucune donnée existante n'est écrasée.</strong> Le score KYC est
                calculé pour chaque client traité.
              </p>
              {loadingCount ? (
                <p className="italic text-muted-foreground">Comptage en cours…</p>
              ) : eligibleCount !== null ? (
                <p className="font-semibold">
                  {eligibleCount} client{eligibleCount > 1 ? "s" : ""} éligible
                  {eligibleCount > 1 ? "s" : ""}.{" "}
                  {eligibleCount === 0
                    ? "Rien à faire."
                    : `Durée estimée : ~${Math.ceil(eligibleCount * 1.1 / 60)} min.`}
                </p>
              ) : null}
              {eligibleCount && eligibleCount > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Le traitement se fait par lots de 100 clients (limite des edge functions).
                  Reste sur cette page jusqu'à la fin.
                </p>
              ) : null}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={running}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              if (eligibleCount && eligibleCount > 0) runBatch();
            }}
            disabled={running || !eligibleCount}
          >
            {running && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
            Lancer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default BulkKycButton;
