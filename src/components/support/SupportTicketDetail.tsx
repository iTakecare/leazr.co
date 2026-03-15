import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface SupportTicketDetailProps {
  ticket: any;
  onBack: () => void;
}

const statusLabels: Record<string, string> = {
  open: "Ouvert",
  in_progress: "En cours",
  resolved: "Résolu",
  closed: "Fermé",
};
const priorityLabels: Record<string, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
  urgent: "Urgente",
};

const SupportTicketDetail = ({ ticket, onBack }: SupportTicketDetailProps) => {
  const queryClient = useQueryClient();

  const updateTicket = useMutation({
    mutationFn: async (updates: Record<string, string>) => {
      const { error } = await supabase
        .from("support_tickets")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", ticket.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      toast.success("Ticket mis à jour");
    },
  });

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour aux tickets
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{ticket.subject}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Créé le {format(new Date(ticket.created_at), "dd MMMM yyyy à HH:mm", { locale: fr })}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Statut</label>
              <Select
                value={ticket.status}
                onValueChange={(v) => updateTicket.mutate({ status: v })}
              >
                <SelectTrigger className="w-40 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Priorité</label>
              <Select
                value={ticket.priority}
                onValueChange={(v) => updateTicket.mutate({ priority: v })}
              >
                <SelectTrigger className="w-40 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {ticket.clients?.name && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Client</label>
                <p className="mt-1 font-medium">{ticket.clients.name}</p>
              </div>
            )}
          </div>

          {ticket.description && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Description</label>
              <p className="mt-1 whitespace-pre-wrap text-sm">{ticket.description}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SupportTicketDetail;
