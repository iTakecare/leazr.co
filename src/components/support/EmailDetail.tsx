import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Ticket, CheckSquare, Sparkles, Loader2, User, MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import DOMPurify from "dompurify";

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

const EmailDetail = ({ email, onBack }: EmailDetailProps) => {
  const { companyId } = useMultiTenant();
  const queryClient = useQueryClient();

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

  const createTaskFromEmail = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          company_id: companyId!,
          title: email.subject || "Tâche depuis email",
          description: `Email de: ${email.from_name || ""} <${email.from_address}>\n\n${email.body_text || ""}`,
        })
        .select("id")
        .single();
      if (error) throw error;
      await supabase.from("synced_emails").update({ linked_task_id: data.id }).eq("id", email.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["synced-emails"] });
      toast.success("Tâche créée depuis cet email");
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
              onClick={() => createTaskFromEmail.mutate()}
              disabled={!!email.linked_task_id}
            >
              <CheckSquare className="h-4 w-4 mr-2" />
              {email.linked_task_id ? "Tâche liée" : "Créer une tâche"}
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
                          onClick={() => {
                            if (action.action === "create_ticket") createTicketFromEmail.mutate();
                            else if (action.action === "create_task") createTaskFromEmail.mutate();
                            else toast.info(action.label);
                          }}
                          disabled={
                            (action.action === "create_ticket" && !!email.linked_ticket_id) ||
                            (action.action === "create_task" && !!email.linked_task_id)
                          }
                        >
                          {action.action === "create_ticket" && <Ticket className="h-3 w-3 mr-1" />}
                          {action.action === "create_task" && <CheckSquare className="h-3 w-3 mr-1" />}
                          {action.action === "reply" && <MessageSquare className="h-3 w-3 mr-1" />}
                          {action.action === "link_client" && <User className="h-3 w-3 mr-1" />}
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
    </div>
  );
};

export default EmailDetail;
