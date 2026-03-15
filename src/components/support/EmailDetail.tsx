import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { useTaskMutations } from "@/hooks/useTasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Ticket, CheckSquare, Sparkles, Loader2, User, MessageSquare, Trash2, Link, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import DOMPurify from "dompurify";
import TaskDialog from "@/components/tasks/TaskDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import ClientSearchInput from "@/components/tasks/ClientSearchInput";
import { fetchClientContracts, fetchClientOffers } from "@/services/taskService";
import { formatCurrency, formatDateToFrench } from "@/utils/formatters";

interface EmailDetailProps {
  email: any;
  onBack: () => void;
  onHide?: (id: string) => void;
}

const SENTIMENT_COLORS: Record<string, string> = {
  positif: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  neutre: "bg-muted text-muted-foreground",
  négatif: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const REQUEST_TYPE_LABELS: Record<string, string> = {
  support: "Support",
  commercial: "Commercial",
  facturation: "Facturation",
  information: "Information",
  autre: "Autre",
};

const EmailDetail = ({ email, onBack, onHide }: EmailDetailProps) => {
  const { companyId } = useMultiTenant();
  const queryClient = useQueryClient();
  const { create: createTask } = useTaskMutations();

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [linkDossierDialogOpen, setLinkDossierDialogOpen] = useState(false);

  // Link dossier state (2-step)
  const [linkStep, setLinkStep] = useState<'client' | 'dossier'>('client');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedClientName, setSelectedClientName] = useState<string>('');
  const [clientOffers, setClientOffers] = useState<any[]>([]);
  const [clientContracts, setClientContracts] = useState<any[]>([]);
  const [loadingDossiers, setLoadingDossiers] = useState(false);
  const [selectedDossierType, setSelectedDossierType] = useState<'offer' | 'contract' | null>(null);
  const [selectedDossierId, setSelectedDossierId] = useState<string>('');

  // Mark as read on mount
  React.useEffect(() => {
    if (!email.is_read) {
      supabase
        .from("synced_emails")
        .update({ is_read: true })
        .eq("id", email.id)
        .then(() => queryClient.invalidateQueries({ queryKey: ["synced-emails"] }));
    }
  }, [email.id]);

  const createTicketFromEmail = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .insert({
          company_id: companyId!,
          email_id: email.id,
          subject: email.subject || "Email sans sujet",
          description: `De: ${email.from_name || ""} <${email.from_address}>\n\n${email.body_text || ""}`,
        })
        .select("id")
        .single();
      if (error) throw error;
      await supabase.from("synced_emails").update({ linked_ticket_id: data.id }).eq("id", email.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["synced-emails"] });
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      toast.success("Ticket créé depuis cet email");
    },
  });

  const analyzeEmail = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("analyze-email", {
        body: { email_id: email.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.analysis;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["synced-emails"] });
      toast.success("Analyse IA terminée");
    },
    onError: (err: any) => {
      toast.error("Erreur d'analyse : " + (err.message || "Échec"));
    },
  });

  const aiSuggestions = email.ai_suggestions as any;
  const hasAnalysis = !!email.ai_analyzed_at;
  const isLinkedToDossier = !!(email.linked_offer_id || email.linked_contract_id);

  // Build enriched description for pre-filled task
  const buildTaskDescription = () => {
    const parts: string[] = [];
    parts.push(`📧 Email de : ${email.from_name || ""} <${email.from_address}>`);
    if (email.received_at) {
      parts.push(`📅 Reçu le : ${format(new Date(email.received_at), "dd MMMM yyyy à HH:mm", { locale: fr })}`);
    }
    if (aiSuggestions) {
      if (aiSuggestions.summary) {
        parts.push(`\n📋 Résumé IA : ${aiSuggestions.summary}`);
      }
      if (aiSuggestions.sentiment) {
        parts.push(`💡 Sentiment : ${aiSuggestions.sentiment}`);
      }
      if (aiSuggestions.request_type) {
        const label = REQUEST_TYPE_LABELS[aiSuggestions.request_type] || aiSuggestions.request_type;
        parts.push(`📂 Type de demande : ${label}`);
      }
      if (aiSuggestions.key_topics?.length > 0) {
        parts.push(`🏷️ Sujets : ${aiSuggestions.key_topics.join(", ")}`);
      }
      if (aiSuggestions.suggested_actions?.length > 0) {
        const actionLabels = aiSuggestions.suggested_actions.map((a: any) => a.label).join(", ");
        parts.push(`⚡ Actions suggérées : ${actionLabels}`);
      }
      if (aiSuggestions.matched_client_name) {
        parts.push(`👤 Client détecté : ${aiSuggestions.matched_client_name}`);
      }
    }
    if (email.body_text) {
      parts.push(`\n---\nContenu de l'email :\n${email.body_text.substring(0, 500)}`);
    }
    return parts.join("\n");
  };

  const handleTaskCreated = async (data: any) => {
    createTask.mutate(data, {
      onSuccess: async (task: any) => {
        if (task?.id) {
          await supabase.from("synced_emails").update({ linked_task_id: task.id }).eq("id", email.id);
          queryClient.invalidateQueries({ queryKey: ["synced-emails"] });
        }
      },
    });
    setTaskDialogOpen(false);
  };

  // 2-step dossier linking
  const handleClientSelected = async (clientId: string, clientName?: string) => {
    setSelectedClientId(clientId);
    setSelectedClientName(clientName || '');
    if (!clientId) return;

    setLoadingDossiers(true);
    try {
      const [contracts, offers] = await Promise.all([
        fetchClientContracts(clientId),
        fetchClientOffers(clientId),
      ]);
      setClientContracts(contracts);
      setClientOffers(offers);
      setLinkStep('dossier');
    } catch (err) {
      console.error("Error loading dossiers:", err);
      toast.error("Erreur lors du chargement des dossiers");
    } finally {
      setLoadingDossiers(false);
    }
  };

  const handleLinkDossier = async () => {
    if (!selectedDossierId || !selectedDossierType) return;
    const updateData: any = {
      linked_offer_id: selectedDossierType === 'offer' ? selectedDossierId : null,
      linked_contract_id: selectedDossierType === 'contract' ? selectedDossierId : null,
    };
    const { error } = await supabase
      .from("synced_emails")
      .update(updateData)
      .eq("id", email.id);
    if (error) {
      toast.error("Erreur lors de la liaison");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["synced-emails"] });
    toast.success("Email lié au dossier avec succès");
    resetLinkDialog();
  };

  const resetLinkDialog = () => {
    setLinkDossierDialogOpen(false);
    setLinkStep('client');
    setSelectedClientId('');
    setSelectedClientName('');
    setClientOffers([]);
    setClientContracts([]);
    setSelectedDossierType(null);
    setSelectedDossierId('');
  };

  const handleOpenTaskDialog = () => setTaskDialogOpen(true);
  const handleOpenLinkDossier = () => {
    // Pre-select client from AI suggestions if available
    if (aiSuggestions?.matched_client_id) {
      handleClientSelected(aiSuggestions.matched_client_id, aiSuggestions.matched_client_name);
    } else {
      setLinkStep('client');
    }
    setLinkDossierDialogOpen(true);
  };

  const handleSuggestedAction = (action: any) => {
    if (action.action === "create_ticket") createTicketFromEmail.mutate();
    else if (action.action === "create_task") handleOpenTaskDialog();
    else if (action.action === "link_client") handleOpenLinkDossier();
    else toast.info(action.label);
  };

  const selectDossier = (type: 'offer' | 'contract', id: string) => {
    setSelectedDossierType(type);
    setSelectedDossierId(id);
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour à la boîte mail
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{email.subject || "(sans sujet)"}</CardTitle>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>De : {email.from_name ? `${email.from_name} <${email.from_address}>` : email.from_address}</p>
            <p>À : {email.to_address}</p>
            {email.received_at && (
              <p>Reçu le {format(new Date(email.received_at), "dd MMMM yyyy à HH:mm", { locale: fr })}</p>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => createTicketFromEmail.mutate()}
              disabled={!!email.linked_ticket_id}
            >
              <Ticket className="h-4 w-4 mr-2" />
              {email.linked_ticket_id ? "Ticket lié" : "Créer un ticket"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenTaskDialog}
              disabled={!!email.linked_task_id}
            >
              <CheckSquare className="h-4 w-4 mr-2" />
              {email.linked_task_id ? "Tâche liée" : "Créer une tâche"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenLinkDossier}
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              {isLinkedToDossier ? "Dossier lié" : "Lier à un dossier"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => analyzeEmail.mutate()}
              disabled={analyzeEmail.isPending}
            >
              {analyzeEmail.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {hasAnalysis ? "Ré-analyser" : "Analyser avec IA"}
            </Button>
            {onHide && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => onHide(email.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Masquer cet email
              </Button>
            )}
          </div>

          {/* AI Analysis Results */}
          {hasAnalysis && aiSuggestions && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Analyse IA
                </div>

                {/* Summary */}
                <p className="text-sm text-muted-foreground">{aiSuggestions.summary}</p>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {aiSuggestions.sentiment && (
                    <Badge variant="secondary" className={SENTIMENT_COLORS[aiSuggestions.sentiment] || ""}>
                      {aiSuggestions.sentiment}
                    </Badge>
                  )}
                  {aiSuggestions.request_type && (
                    <Badge variant="outline">
                      {REQUEST_TYPE_LABELS[aiSuggestions.request_type] || aiSuggestions.request_type}
                    </Badge>
                  )}
                  {aiSuggestions.key_topics?.map((topic: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>

                {/* Matched client */}
                {aiSuggestions.matched_client_name && (
                  <div className="flex items-center gap-2 text-sm bg-background rounded-md p-2 border">
                    <User className="h-4 w-4 text-primary" />
                    <span>
                      Client détecté : <strong>{aiSuggestions.matched_client_name}</strong>
                    </span>
                    {aiSuggestions.match_reason && (
                      <span className="text-muted-foreground text-xs">({aiSuggestions.match_reason})</span>
                    )}
                  </div>
                )}

                {/* Suggested actions */}
                {aiSuggestions.suggested_actions?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Actions suggérées :</p>
                    <div className="flex flex-wrap gap-2">
                      {aiSuggestions.suggested_actions.map((action: any, i: number) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => handleSuggestedAction(action)}
                          disabled={
                            (action.action === "create_ticket" && !!email.linked_ticket_id) ||
                            (action.action === "create_task" && !!email.linked_task_id)
                          }
                        >
                          {action.action === "create_ticket" && <Ticket className="h-3 w-3 mr-1" />}
                          {action.action === "create_task" && <CheckSquare className="h-3 w-3 mr-1" />}
                          {action.action === "reply" && <MessageSquare className="h-3 w-3 mr-1" />}
                          {action.action === "link_client" && <FolderOpen className="h-3 w-3 mr-1" />}
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="border rounded-lg p-4 bg-muted/30">
            {email.body_html ? (
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(email.body_html) }}
              />
            ) : (
              <pre className="whitespace-pre-wrap text-sm font-sans">{email.body_text || "Aucun contenu"}</pre>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Task creation modal - pre-filled with AI analysis */}
      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={null}
        onSubmit={handleTaskCreated}
        defaultTitle={email.subject || "Tâche depuis email"}
        defaultDescription={buildTaskDescription()}
        defaultClientId={aiSuggestions?.matched_client_id || ""}
        defaultClientName={aiSuggestions?.matched_client_name || ""}
      />

      {/* Dossier linking modal - 2 steps: client → offer/contract */}
      <Dialog open={linkDossierDialogOpen} onOpenChange={(open) => { if (!open) resetLinkDialog(); }}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              {linkStep === 'client' ? "Sélectionner un client" : `Dossiers de ${selectedClientName}`}
            </DialogTitle>
          </DialogHeader>

          {linkStep === 'client' && (
            <div className="py-4 space-y-4">
              <ClientSearchInput
                value={selectedClientId}
                onChange={(clientId, clientName) => {
                  if (clientId) {
                    handleClientSelected(clientId, clientName);
                  }
                }}
              />
              {loadingDossiers && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Chargement des dossiers...</span>
                </div>
              )}
            </div>
          )}

          {linkStep === 'dossier' && (
            <div className="py-4 space-y-4 max-h-[400px] overflow-y-auto">
              <Button variant="ghost" size="sm" onClick={() => { setLinkStep('client'); setSelectedClientId(''); setSelectedClientName(''); }}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Changer de client
              </Button>

              {clientOffers.length === 0 && clientContracts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun dossier trouvé pour ce client.
                </p>
              )}

              {clientOffers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Demandes / Offres</p>
                  {clientOffers.map((offer) => (
                    <div
                      key={offer.id}
                      onClick={() => selectDossier('offer', offer.id)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedDossierType === 'offer' && selectedDossierId === offer.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Offre du {formatDateToFrench(offer.created_at)}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {offer.workflow_status || offer.status}
                        </Badge>
                      </div>
                      {offer.monthly_payment && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatCurrency(offer.monthly_payment)}/mois
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {clientContracts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Contrats</p>
                  {clientContracts.map((contract) => (
                    <div
                      key={contract.id}
                      onClick={() => selectDossier('contract', contract.id)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedDossierType === 'contract' && selectedDossierId === contract.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {contract.leaser_name ? `Contrat ${contract.leaser_name}` : `Contrat ${contract.id.slice(0, 8)}`}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {contract.status}
                        </Badge>
                      </div>
                      {contract.monthly_payment && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatCurrency(contract.monthly_payment)}/mois
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={resetLinkDialog}>Annuler</Button>
            {linkStep === 'dossier' && (
              <Button onClick={handleLinkDossier} disabled={!selectedDossierId}>
                Lier au dossier
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailDetail;
