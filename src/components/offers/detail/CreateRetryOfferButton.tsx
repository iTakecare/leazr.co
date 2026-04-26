import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, FileCheck, FilePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cloneOfferForRetry } from "@/services/offers/cloneOfferForRetry";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";

interface CreateRetryOfferButtonProps {
  offer: any;
}

const REJECTED_STATUSES = new Set([
  "internal_rejected",
  "leaser_rejected",
  "client_rejected",
  "refused",
]);

interface DocSummary {
  approved: number;
  pending: number;
  rejected: number;
  total: number;
}

const CreateRetryOfferButton: React.FC<CreateRetryOfferButtonProps> = ({ offer }) => {
  const { navigateToAdmin } = useRoleNavigation();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [docSummary, setDocSummary] = useState<DocSummary | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const isRejected = REJECTED_STATUSES.has(offer?.workflow_status);
  const isYoungCompany = offer?.rejection_category === "young_company";

  useEffect(() => {
    if (!isOpen || !offer?.id) return;
    let cancelled = false;
    const loadDocs = async () => {
      setLoadingDocs(true);
      try {
        const { data, error } = await supabase
          .from("offer_documents")
          .select("status")
          .eq("offer_id", offer.id);
        if (cancelled) return;
        if (error) {
          console.error("Erreur chargement docs:", error);
          setDocSummary(null);
          return;
        }
        const summary: DocSummary = { approved: 0, pending: 0, rejected: 0, total: data?.length ?? 0 };
        (data ?? []).forEach((d: any) => {
          if (d.status === "approved") summary.approved += 1;
          else if (d.status === "rejected") summary.rejected += 1;
          else summary.pending += 1;
        });
        setDocSummary(summary);
      } finally {
        if (!cancelled) setLoadingDocs(false);
      }
    };
    loadDocs();
    return () => {
      cancelled = true;
    };
  }, [isOpen, offer?.id]);

  if (!isRejected || !isYoungCompany) {
    return null;
  }

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const result = await cloneOfferForRetry(offer.id);
      if (!result) {
        throw new Error("Echec de la duplication");
      }
      toast.success(
        `Nouvelle offre créée (${result.newDossierNumber}) - dossier prêt à re-soumettre`
      );
      setIsOpen(false);
      navigateToAdmin(`offers/${result.newOfferId}`);
    } catch (err) {
      console.error("Erreur lors de la création de l'offre re-soumise:", err);
      toast.error("Erreur lors de la création de l'offre re-soumise");
    } finally {
      setIsSubmitting(false);
    }
  };

  const noApprovedDocs = docSummary !== null && docSummary.approved === 0;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 w-full justify-start"
      >
        <FilePlus className="w-4 h-4 mr-2" />
        Créer offre re-soumise
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FilePlus className="h-5 w-5 text-emerald-600" />
              Créer une offre re-soumise
            </DialogTitle>
            <DialogDescription>
              Une nouvelle offre va être créée à partir de celle-ci, en
              brouillon, avec les mêmes équipements et conditions financières.
              Le lien vers l'offre actuelle sera conservé.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
              <div>
                <span className="text-muted-foreground">Offre source :</span>{" "}
                <span className="font-medium">
                  {offer.dossier_number || offer.id?.slice(0, 8)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Client :</span>{" "}
                <span className="font-medium">{offer.client_name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Mensualité :</span>{" "}
                <span className="font-medium">
                  {offer.monthly_payment != null
                    ? `${Number(offer.monthly_payment).toFixed(2)} €/mois`
                    : "—"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-emerald-600" />
                Documents complémentaires reçus
              </div>
              {loadingDocs ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement...
                </div>
              ) : docSummary && docSummary.total > 0 ? (
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                    {docSummary.approved} approuvé
                    {docSummary.approved > 1 ? "s" : ""}
                  </Badge>
                  {docSummary.pending > 0 && (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                      {docSummary.pending} en attente
                    </Badge>
                  )}
                  {docSummary.rejected > 0 && (
                    <Badge className="bg-red-100 text-red-700 border-red-200">
                      {docSummary.rejected} rejeté
                      {docSummary.rejected > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Aucun document complémentaire reçu pour cette offre.
                </div>
              )}
            </div>

            {noApprovedDocs && (
              <div className="flex items-start gap-2 text-amber-700 text-xs bg-amber-100 p-2 rounded">
                <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>
                  Aucun document n'a encore été approuvé. Vous pouvez quand même
                  créer l'offre re-soumise, mais le bailleur risque de refuser
                  à nouveau sans pièces complémentaires validées.
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <FilePlus className="mr-2 h-4 w-4" />
                  Créer la nouvelle offre
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CreateRetryOfferButton;
