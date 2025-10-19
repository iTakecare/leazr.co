import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { getOfferDocuments } from "@/services/offers/offerDocuments";
import { supabase } from "@/integrations/supabase/client";
import type { WorkflowStepConfig } from "@/types/workflow";

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
  { id: "id_card_front", label: "Carte d'identité - Recto" },
  { id: "id_card_back", label: "Carte d'identité - Verso" },
  { id: "company_register", label: "Extrait de registre d'entreprise" },
  { id: "vat_certificate", label: "Attestation TVA" },
  { id: "bank_statement", label: "Relevé bancaire des 3 derniers mois" },
];

const REJECTION_REASONS = [
  "Sans suite - Plus de nouvelles",
  "Sans suite - Ne souhaite plus de leasing",
  "REFUS - client suspect / Fraude",
  "REFUS - entreprise trop jeune / montant demandé",
  "REFUS - Client particulier",
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
  const [selectedRejectionReason, setSelectedRejectionReason] = useState<string>("");
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [otherDoc, setOtherDoc] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [autoApprovalAvailable, setAutoApprovalAvailable] = useState(false);
  const [currentWorkflowStep, setCurrentWorkflowStep] = useState<WorkflowStepConfig | null>(null);

  const isInternalAnalysis = analysisType === 'internal';
  
  // Récupérer la configuration du workflow pour l'étape actuelle
  useEffect(() => {
    const fetchWorkflowStep = async () => {
      try {
        const targetStepKey = analysisType === 'internal' ? 'internal_review' : 'leaser_review';
        console.log('🔍 SCORING MODAL - Fetching workflow step for active template:', { targetStepKey, analysisType, offerId });

        // 1) Récupérer l'offre pour obtenir company_id et offer_type
        const offer = await getOfferById(offerId);
        if (!offer) {
          console.error('❌ SCORING MODAL - Offre introuvable pour', offerId);
          toast.error("Offre introuvable");
          return;
        }

        // 2) Récupérer le template actif via la RPC
        const { data: stepsFromRpc, error: rpcError } = await supabase.rpc('get_workflow_for_offer_type', {
          p_company_id: offer.company_id,
          p_offer_type: offer.offer_type
        });
        if (rpcError) {
          console.error('❌ SCORING MODAL - RPC get_workflow_for_offer_type error:', rpcError);
        }
        const activeTemplateId = Array.isArray(stepsFromRpc) && stepsFromRpc.length > 0 ? stepsFromRpc[0].template_id : null;
        if (!activeTemplateId) {
          console.warn('⚠️ SCORING MODAL - Aucun template actif. Utilisation d\'un fallback temporaire.');
          // Fallback minimal permettant d'ouvrir la modale pour ne pas bloquer l'utilisateur
          setCurrentWorkflowStep({
            template_id: 'fallback',
            template_name: 'fallback',
            step_key: targetStepKey,
            step_label: analysisType === 'internal' ? 'Analyse interne' : 'Analyse Leaser',
            step_order: 0,
            is_required: true,
            is_visible: true,
            enables_scoring: true,
            scoring_type: analysisType,
          } as unknown as WorkflowStepConfig);
          return;
        }

        // 3) Charger l'étape précise dans ce template pour éviter les doublons
        const { data: stepRows, error: stepErr } = await supabase
          .from('workflow_steps')
          .select('*')
          .eq('workflow_template_id', activeTemplateId)
          .eq('step_key', targetStepKey)
          .eq('scoring_type', analysisType)
          .order('step_order', { ascending: true })
          .limit(1);

        if (stepErr) {
          console.error('❌ SCORING MODAL - Erreur chargement étape:', stepErr);
          // Fallback minimal
          setCurrentWorkflowStep({
            template_id: activeTemplateId,
            template_name: 'active',
            step_key: targetStepKey,
            step_label: analysisType === 'internal' ? 'Analyse interne' : 'Analyse Leaser',
            step_order: 0,
            is_required: true,
            is_visible: true,
            enables_scoring: true,
            scoring_type: analysisType,
          } as unknown as WorkflowStepConfig);
          return;
        }

        const step = stepRows && stepRows[0];
        if (step) {
          console.log('✅ SCORING MODAL - Workflow step loaded (scoped to template):', step);
          setCurrentWorkflowStep(step as unknown as WorkflowStepConfig);
        } else {
          console.warn('⚠️ SCORING MODAL - Étape introuvable dans le template actif. Fallback.');
          setCurrentWorkflowStep({
            template_id: activeTemplateId,
            template_name: 'active',
            step_key: targetStepKey,
            step_label: analysisType === 'internal' ? 'Analyse interne' : 'Analyse Leaser',
            step_order: 0,
            is_required: true,
            is_visible: true,
            enables_scoring: true,
            scoring_type: analysisType,
          } as unknown as WorkflowStepConfig);
        }
      } catch (error) {
        console.error('❌ SCORING MODAL - Erreur lors de la récupération de la configuration du workflow:', error);
        toast.error("Erreur lors du chargement de la configuration de scoring");
      }
    };

    if (isOpen) {
      console.log('🔍 SCORING MODAL - Opening with:', { currentStatus, analysisType });
      fetchWorkflowStep();
    }
  }, [analysisType, isOpen, offerId, currentStatus]);
  
  // Déterminer si le scoring est possible selon la configuration du workflow
  const canScore = currentWorkflowStep?.enables_scoring === true 
    && currentWorkflowStep?.scoring_type === analysisType;

  // Vérifier si une approbation automatique est disponible
  useEffect(() => {
    const checkAutoApproval = async () => {
      if ((currentStatus === 'internal_docs_requested' && isInternalAnalysis) ||
          (currentStatus === 'leaser_docs_requested' && !isInternalAnalysis)) {
        
        try {
          const { data: documents, error } = await supabase
            .from('offer_documents')
            .select('id, document_type, status')
            .eq('offer_id', offerId)
            .eq('requested_by', analysisType); // Filtrer par type d'analyse
          
          if (error) throw error;
          
          const allApproved = documents.length > 0 && 
            documents.every(doc => doc.status === 'approved') &&
            !documents.some(doc => doc.status === 'rejected');
          
          setAutoApprovalAvailable(allApproved);
          
          if (allApproved) {
            console.log(`🎉 Approbation automatique disponible pour l'analyse ${analysisType} - tous les documents sont validés`);
          }
        } catch (error) {
          console.error("Erreur lors de la vérification des documents:", error);
        }
      } else {
        setAutoApprovalAvailable(false);
      }
    };

    if (isOpen && canScore) {
      checkAutoApproval();
    }
  }, [offerId, currentStatus, isInternalAnalysis, isOpen, canScore, analysisType]);

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
    // Reset rejection fields when changing from C
    if (score !== 'C') {
      setSelectedRejectionReason("");
      setReason("");
    }
  };

  const handleSubmit = async () => {
    if (!selectedScore) {
      toast.error("Veuillez sélectionner un score");
      return;
    }

    if (selectedScore === 'C' && !selectedRejectionReason) {
      toast.error("Veuillez sélectionner une raison de refus");
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
          customMessage: customMessage || undefined,
          requestedBy: analysisType
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
      if (selectedScore === 'C') {
        // Combiner la raison sélectionnée avec le complément
        const finalReason = `${selectedRejectionReason}${reason.trim() ? `\n\nComplément: ${reason.trim()}` : ''}`;
        await onScoreAssigned(selectedScore, finalReason);
      } else {
        await onScoreAssigned(selectedScore, reason.trim() || undefined);
      }
      onClose();
    }
  };

  const handleSubmitWithoutEmail = async () => {
    if (!selectedScore || selectedScore !== 'B') {
      return;
    }

    try {
      setIsSending(true);
      
      // Construire une raison pour le workflow log
      let fullReason = "Score B attribué sans envoi d'email";
      
      if (selectedDocs.length > 0 || otherDoc.trim()) {
        const docsToRequest = [
          ...selectedDocs,
          ...(otherDoc.trim() ? [`custom:${otherDoc.trim()}`] : [])
        ];
        fullReason = `Documents notés (sans email): ${docsToRequest.join(', ')}`;
      }
      
      if (reason.trim()) {
        fullReason += ` - ${reason.trim()}`;
      }
      
      // Appeler le handler parent avec le score B et la raison
      await onScoreAssigned(selectedScore, fullReason);
      
      toast.success("Score B attribué sans envoi d'email");
      onClose();
    } catch (error) {
      console.error("Erreur lors de l'attribution du score:", error);
      toast.error("Erreur lors de l'attribution du score");
    } finally {
      setIsSending(false);
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
              {/* Notification d'approbation automatique disponible */}
              {autoApprovalAvailable && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Approbation automatique disponible</span>
                  </div>
                  <p className="text-sm text-green-700 mt-2">
                    Tous les documents requis ont été validés. Vous pouvez directement attribuer le score A.
                  </p>
                </div>
              )}

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

              {/* Zone de commentaire pour score B */}
              {selectedScore === 'B' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Commentaire (optionnel)
                  </label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ajoutez un commentaire sur les documents requis..."
                    rows={3}
                  />
                </div>
              )}

              {/* Zone de refus pour score C */}
              {selectedScore === 'C' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Raison du refus <span className="text-red-500 ml-1">*</span>
                    </label>
                    <Select value={selectedRejectionReason} onValueChange={setSelectedRejectionReason}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sélectionnez une raison de refus..." />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-background shadow-md border">
                        {REJECTION_REASONS.map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Complément d'information (optionnel)</label>
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Ajoutez des détails supplémentaires si nécessaire..."
                      rows={3}
                    />
                  </div>
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
            <>
              {/* Pour le score B, afficher DEUX boutons */}
              {selectedScore === 'B' ? (
                <>
                  {/* Bouton principal : Envoyer email */}
                  <Button 
                    onClick={handleSubmit}
                    disabled={isLoading || isSending}
                    size="lg"
                  >
                    {isLoading || isSending ? (
                      <>
                        <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></div>
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Valider score B et envoyer demande
                      </>
                    )}
                  </Button>
                  
                  {/* NOUVEAU : Bouton alternatif : Sans email */}
                  <Button 
                    onClick={handleSubmitWithoutEmail}
                    disabled={isLoading || isSending}
                    variant="secondary"
                    size="lg"
                  >
                    {isLoading || isSending ? (
                      <>
                        <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></div>
                        Traitement...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        Valider score B SANS envoyer de demande
                      </>
                    )}
                  </Button>
                </>
              ) : (
                /* Pour les scores A et C, comportement normal */
                <Button 
                  onClick={handleSubmit}
                  disabled={isLoading || isSending}
                  size="lg"
                >
                  {isLoading || isSending ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></div>
                      Traitement...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Valider le score {selectedScore}
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ScoringModal;