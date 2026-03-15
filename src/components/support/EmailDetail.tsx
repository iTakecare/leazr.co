import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Ticket, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import DOMPurify from "dompurify";

interface EmailDetailProps {
  email: any;
  onBack: () => void;
}

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
          <div className="flex gap-2">
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
          </div>

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
