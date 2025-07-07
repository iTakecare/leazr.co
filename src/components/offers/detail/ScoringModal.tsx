import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  CheckCircle, 
  HelpCircle, 
  X, 
  FileText, 
  Search,
  Building,
  Mail,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { getOfferById } from "@/services/offerService";
import { sendDocumentRequestEmail } from "@/services/offers/documentEmail";
import { updateOfferStatus } from "@/services/offers/offerStatus";

interface ScoringModalProps {
  isOpen: boolean;
  onClose: () => void;
  offerId: string;
  currentStatus: string;
  analysisType: "internal" | "leaser";
  onScoreAssigned: (score: 'A' | 'B' | 'C', reason?: string) => Promise<void>;
  isLoading: boolean;
}

const DOCUMENT_OPTIONS = [
  { id: "balance_sheet", label: "Bilan financier" },
  { id: "provisional_balance", label: "Bilan financier provisoire récent" },
  { id: "tax_notice", label: "Avertissement extrait de rôle (BE)" },
  { id: "tax_return", label: "Liasse fiscale (FR)" },
  { id: "id_card", label: "Carte d'identité nationale (recto-verso)" },
  { id: "company_register", label: "Extrait de registre d'entreprise" },
  { id: "vat_certificate", label: "Attestation TVA" },
  { id: "bank_statement", label: "Relevé bancaire des 3 derniers mois" },
];

const ScoringModal: React.FC<ScoringModalProps> = ({
  isOpen,
  onClose,
  offerId,
  currentStatus,
  analysisType,
  onScoreAssigned,
  isLoading
}) => {
  const [selectedScore, setSelectedScore] = useState<'A' | 'B' | 'C' | null>(null);
  const [reason, setReason] = useState("");
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [otherDoc, setOtherDoc] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const isInternalAnalysis = analysisType === 'internal';
  
  // Déterminer si le scoring est possible selon le type d'analyse et le statut
  const canScore = isInternalAnalysis 
    ? ['draft', 'internal_review'].includes(currentStatus)
    : ['internal_approved', 'leaser_review'].includes(currentStatus);

  const scoreOptions = [
    {
      score: 'A' as const,
      label: 'Approuvé',
      description: 'Dossier complet - Poursuite du processus',
      icon: CheckCircle,
      color: 'bg-green-50 text-green-700 border-green-200',
      nextStep: isInternalAnalysis ? 'vers Analyse Leaser' : 'vers Offre validée'
    },
    {
      score: 'B' as const,
      label: 'Documents requis',
      description: 'Dossier incomplet - Demande de documents',
      icon: HelpCircle,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      nextStep: 'Demande de documents supplémentaires'
    },
    {
      score: 'C' as const,
      label: 'Refusé',
      description: 'Dossier non conforme - Refus',
      icon: X,
      color: 'bg-red-50 text-red-700 border-red-200',
      nextStep: 'Fin du processus'
    }
  ];

  const handleCheckboxChange = (docId: string, checked: boolean) => {
    if (checked) {
      setSelectedDocs(prev => [...prev, docId]);
    } else {
      setSelectedDocs(prev => prev.filter(id => id !== docId));
    }
  };

  const handleScoreSelection = (score: 'A' | 'B' | 'C') => {
    setSelectedScore(score);
    // Reset document selection when changing score
    if (score !== 'B') {
      setSelectedDocs([]);
      setOtherDoc("");
      setCustomMessage("");
    }
  };

  const handleSubmit = async () => {
    if (!selectedScore) {
      toast.error("Veuillez sélectionner un score");
      return;
    }

    if (selectedScore === 'C' && !reason.trim()) {
      toast.error("Veuillez préciser la raison du refus");
      return;
    }

    // Pour le score B, on gère la demande de documents
    if (selectedScore === 'B') {
      if (selectedDocs.length === 0 && !otherDoc.trim()) {
        toast.error("Veuillez sélectionner au moins un document à demander");
        return;
      }

      try {
        setIsSending(true);
        
        // Récupérer les détails de l'offre
        const offer = await getOfferById(offerId);
        if (!offer) {
          throw new Error("Offre non trouvée");
        }

        // Préparer la liste des documents demandés
        const docsToRequest = [
          ...selectedDocs,
          ...(otherDoc.trim() ? [`custom:${otherDoc.trim()}`] : [])
        ];
        
        // Envoyer l'email avec le lien d'upload
        const success = await sendDocumentRequestEmail({
          offerClientEmail: offer.client_email,
          offerClientName: offer.client_name,
          offerId: offerId,
          requestedDocuments: docsToRequest,
          customMessage: customMessage || undefined
        });

        if (!success) {
          throw new Error("Échec de l'envoi de l'email");
        }

        // Appeler le handler parent avec le score B et la raison
        const fullReason = `Documents demandés: ${docsToRequest.join(', ')}${reason.trim() ? ` - ${reason.trim()}` : ''}`;
        await onScoreAssigned(selectedScore, fullReason);
        
        toast.success("Score B attribué et demande de documents envoyée");
        onClose();
      } catch (error) {
        console.error("Erreur lors de l'envoi de la demande:", error);
        toast.error("Erreur lors de l'envoi de la demande");
      } finally {
        setIsSending(false);
      }
    } else {
      // Pour les scores A et C, comportement normal
      await onScoreAssigned(selectedScore, reason.trim() || undefined);
      onClose();
    }
  };

  if (!canScore) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${selectedScore === 'B' ? 'max-w-4xl' : 'max-w-2xl'} max-h-[90vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isInternalAnalysis ? (
              <Search className="h-5 w-5 text-purple-600" />
            ) : (
              <Building className="h-5 w-5 text-blue-600" />
            )}
            {analysisType === "internal" ? "Analyse interne" : "Analyse Leaser"}
          </DialogTitle>
        </DialogHeader>

        <div className={`space-y-6 ${selectedScore === 'B' ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : ''}`}>
          {/* Section Scoring */}
          <Card className="border-2 border-purple-200 bg-purple-50/30">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">
                Évaluation du dossier
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Attribuez un score pour déterminer la suite du processus.
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Options de scoring */}
              <div className="grid gap-3">
                {scoreOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = selectedScore === option.score;
                  
                  return (
                    <div
                      key={option.score}
                      className={`
                        border-2 rounded-lg p-4 cursor-pointer transition-all duration-200
                        ${isSelected 
                          ? `${option.color} border-current` 
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                        }
                      `}
                      onClick={() => handleScoreSelection(option.score)}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={`h-5 w-5 mt-0.5 ${isSelected ? 'text-current' : 'text-gray-500'}`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={isSelected ? option.color : 'bg-gray-100'}>
                              Score {option.score}
                            </Badge>
                            <span className={`font-medium ${isSelected ? 'text-current' : 'text-gray-900'}`}>
                              {option.label}
                            </span>
                          </div>
                          <p className={`text-sm ${isSelected ? 'text-current' : 'text-gray-600'} mb-2`}>
                            {option.description}
                          </p>
                          <p className={`text-xs ${isSelected ? 'text-current' : 'text-gray-500'}`}>
                            ➜ {option.nextStep}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Zone de commentaire pour scores B et C */}
              {selectedScore && (selectedScore === 'B' || selectedScore === 'C') && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {selectedScore === 'B' ? 'Commentaire (optionnel)' : 'Raison du refus'}
                    {selectedScore === 'C' && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={
                      selectedScore === 'B' 
                        ? "Ajoutez un commentaire sur les documents requis..."
                        : "Expliquez les raisons du refus du dossier..."
                    }
                    rows={3}
                  />
                </div>
              )}

              {/* Zone de commentaire optionnel pour score A */}
              {selectedScore === 'A' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Commentaire (optionnel)
                  </label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ajoutez un commentaire sur l'approbation..."
                    rows={2}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section Documents (visible uniquement pour score B) */}
          {selectedScore === 'B' && (
            <Card className="border-2 border-amber-200 bg-amber-50/30">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-amber-600" />
                  Demande de documents
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Sélectionnez les documents à demander au client. Un email avec un lien d'upload sécurisé sera envoyé.
                </p>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {DOCUMENT_OPTIONS.map((doc) => (
                    <div key={doc.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`doc-${doc.id}`} 
                        checked={selectedDocs.includes(doc.id)}
                        onCheckedChange={(checked) => 
                          handleCheckboxChange(doc.id, checked === true)
                        }
                      />
                      <label 
                        htmlFor={`doc-${doc.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {doc.label}
                      </label>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <label htmlFor="other-doc" className="text-sm font-medium">
                    Autre document (précisez)
                  </label>
                  <Textarea
                    id="other-doc"
                    value={otherDoc}
                    onChange={(e) => setOtherDoc(e.target.value)}
                    placeholder="Ex: Preuve de domicile récente"
                    className="resize-none h-20"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="custom-message" className="text-sm font-medium">
                    Message personnalisé (optionnel)
                  </label>
                  <Textarea
                    id="custom-message"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Message qui sera inclus dans l'email au client..."
                    className="resize-none h-24"
                  />
                </div>

                <div className="flex items-center text-amber-600 text-xs bg-amber-100 p-2 rounded">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  L'offre sera mise en attente d'informations après envoi
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Boutons d'action */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isLoading || isSending}>
            Annuler
          </Button>
          {selectedScore && (
            <Button 
              onClick={handleSubmit}
              disabled={isLoading || isSending}
              size="lg"
            >
              {isLoading || isSending ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></div>
                  {selectedScore === 'B' ? 'Envoi en cours...' : 'Traitement...'}
                </>
              ) : (
                <>
                  {selectedScore === 'B' ? (
                    <Mail className="mr-2 h-4 w-4" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4" />
                  )}
                  {selectedScore === 'B' 
                    ? 'Valider score B et envoyer demande' 
                    : `Valider le score ${selectedScore}`
                  }
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ScoringModal;