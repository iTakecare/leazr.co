import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle, FileText, Mail, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { sendDocumentRequestEmail } from "@/services/offers/documentEmail";

interface RelaunchYoungCompanyButtonProps {
  offer: any;
  onSuccess?: () => void;
}

const REJECTED_STATUSES = new Set([
  "internal_rejected",
  "leaser_rejected",
  "client_rejected",
  "refused",
]);

const YOUNG_COMPANY_KYC_PRESET: { id: string; label: string; defaultChecked: boolean }[] = [
  { id: "balance_sheet", label: "Bilan financier (dernier exercice)", defaultChecked: true },
  { id: "provisional_balance", label: "Bilan financier provisoire récent", defaultChecked: true },
  { id: "bank_statement", label: "Relevés bancaires des 3 derniers mois", defaultChecked: true },
  { id: "tax_notice", label: "Avertissement extrait de rôle (BE)", defaultChecked: true },
  { id: "tax_return", label: "Liasse fiscale (FR)", defaultChecked: false },
  { id: "company_register", label: "Extrait de registre d'entreprise", defaultChecked: true },
  { id: "vat_certificate", label: "Attestation TVA", defaultChecked: false },
  { id: "id_card_front", label: "Carte d'identité du gérant - Recto", defaultChecked: true },
  { id: "id_card_back", label: "Carte d'identité du gérant - Verso", defaultChecked: true },
];

const DEFAULT_MESSAGE = `Bonjour,

Suite à l'analyse de votre dossier de leasing, notre partenaire financier a besoin d'éléments complémentaires pour pouvoir reconsidérer votre demande au vu de l'ancienneté de votre société.

Merci de nous transmettre les documents listés ci-dessous via le lien sécurisé. Une fois ces éléments reçus, nous pourrons retravailler votre dossier et le re-soumettre au bailleur.

Cordialement,
L'équipe iTakecare`;

const RelaunchYoungCompanyButton: React.FC<RelaunchYoungCompanyButtonProps> = ({
  offer,
  onSuccess,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<string[]>(
    YOUNG_COMPANY_KYC_PRESET.filter((d) => d.defaultChecked).map((d) => d.id)
  );
  const [customMessage, setCustomMessage] = useState<string>(DEFAULT_MESSAGE);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRejected = REJECTED_STATUSES.has(offer?.workflow_status);
  const isYoungCompany = offer?.rejection_category === "young_company";
  if (!isRejected || !isYoungCompany) {
    return null;
  }

  const toggleDoc = (id: string, checked: boolean) => {
    setSelectedDocs((prev) =>
      checked ? [...prev, id] : prev.filter((d) => d !== id)
    );
  };

  const handleSubmit = async () => {
    if (selectedDocs.length === 0) {
      toast.error("Sélectionnez au moins un document à demander");
      return;
    }
    if (!offer.client_email) {
      toast.error("Aucune adresse email client sur cette offre");
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await sendDocumentRequestEmail({
        offerClientEmail: offer.client_email,
        offerClientName: offer.client_name,
        offerId: offer.id,
        requestedDocuments: selectedDocs,
        customMessage: customMessage.trim() || undefined,
        requestedBy: "leaser",
        templateType: "document_request_young_company",
      });

      if (!ok) {
        throw new Error("Echec de l'envoi");
      }

      toast.success("Demande de KYC renforcé envoyée au client");
      setIsOpen(false);
      onSuccess?.();
    } catch (err) {
      console.error("Erreur lors de la relance KYC jeune entreprise:", err);
      toast.error("Erreur lors de l'envoi de la demande");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="text-amber-700 border-amber-300 hover:bg-amber-50 w-full justify-start"
      >
        <RefreshCcw className="w-4 h-4 mr-2" />
        Relancer avec KYC renforcé
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCcw className="h-5 w-5 text-amber-600" />
              Relancer le client avec KYC renforcé
            </DialogTitle>
            <DialogDescription>
              Le dossier a été refusé pour ancienneté de société insuffisante.
              Demandez les pièces financières complémentaires pour reproposer
              le dossier au bailleur.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-600" />
                Documents à demander
              </Label>
              <div className="space-y-2 rounded-md border bg-amber-50/30 p-3">
                {YOUNG_COMPANY_KYC_PRESET.map((doc) => (
                  <div key={doc.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`yc-${doc.id}`}
                      checked={selectedDocs.includes(doc.id)}
                      onCheckedChange={(checked) =>
                        toggleDoc(doc.id, checked === true)
                      }
                    />
                    <label
                      htmlFor={`yc-${doc.id}`}
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      {doc.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="yc-message" className="text-sm font-medium">
                Message au client (modifiable)
              </Label>
              <Textarea
                id="yc-message"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={8}
                className="resize-none"
              />
            </div>

            <div className="flex items-start gap-2 text-amber-700 text-xs bg-amber-100 p-2 rounded">
              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>
                Un lien d'upload sécurisé sera généré et envoyé à{" "}
                <strong>{offer.client_email || "—"}</strong>. Le statut de
                l'offre n'est pas modifié, le client peut déposer ses pièces
                puis vous pourrez créer une nouvelle offre re-soumise au
                bailleur.
              </span>
            </div>
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
              onClick={handleSubmit}
              disabled={isSubmitting || selectedDocs.length === 0}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-current rounded-full" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Envoyer la demande
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RelaunchYoungCompanyButton;
