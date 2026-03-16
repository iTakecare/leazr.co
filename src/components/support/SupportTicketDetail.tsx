import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Trash2, Send, Paperclip, Download, Loader2, User, Shield } from "lucide-react";
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch replies
  const { data: replies = [], isLoading: repliesLoading } = useQuery({
    queryKey: ["ticket-replies", ticket.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_replies")
        .select("*")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

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

  const deleteTicket = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("support_tickets")
        .delete()
        .eq("id", ticket.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      toast.success("Ticket supprimé");
      onBack();
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });

  const sendReply = useMutation({
    mutationFn: async () => {
      setUploading(true);
      
      // Upload attachments
      const uploadedFiles: { name: string; path: string; size: number }[] = [];
      for (const file of attachments) {
        const filePath = `${ticket.id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("ticket-attachments")
          .upload(filePath, file);
        if (uploadError) throw uploadError;
        uploadedFiles.push({ name: file.name, path: filePath, size: file.size });
      }

      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user!.id)
        .maybeSingle();

      const senderName = profile 
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Admin'
        : 'Admin';

      const { error } = await supabase.from("ticket_replies").insert({
        ticket_id: ticket.id,
        sender_type: "admin",
        sender_id: user!.id,
        sender_name: senderName,
        message: replyMessage,
        attachments: uploadedFiles,
      });
      if (error) throw error;

      // Update ticket status to in_progress if it was open
      if (ticket.status === "open") {
        await supabase
          .from("support_tickets")
          .update({ status: "in_progress", updated_at: new Date().toISOString() })
          .eq("id", ticket.id);
      }

      // Notify client by email
      try {
        await supabase.functions.invoke("notify-ticket-reply", {
          body: { ticketId: ticket.id, message: replyMessage, senderName },
        });
      } catch (e) {
        console.warn("Email notification failed:", e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-replies", ticket.id] });
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      setReplyMessage("");
      setAttachments([]);
      setUploading(false);
      toast.success("Réponse envoyée");
    },
    onError: () => {
      setUploading(false);
      toast.error("Erreur lors de l'envoi");
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const downloadAttachment = async (path: string, name: string) => {
    const { data, error } = await supabase.storage
      .from("ticket-attachments")
      .download(path);
    if (error || !data) {
      toast.error("Erreur de téléchargement");
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux tickets
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => setShowDeleteConfirm(true)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Supprimer
        </Button>
      </div>

      {/* Ticket info */}
      <Card>
        <CardHeader>
          <CardTitle>{ticket.subject}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Créé le {format(new Date(ticket.created_at), "dd MMMM yyyy à HH:mm", { locale: fr })}
            {ticket.created_by_client && " · par le client"}
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
              <label className="text-sm font-medium text-muted-foreground">Description initiale</label>
              <div className="mt-1 p-3 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap">{ticket.description}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversation thread */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conversation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {repliesLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : replies.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Aucune réponse pour le moment</p>
          ) : (
            <div className="space-y-3">
              {replies.map((reply: any) => {
                const isAdmin = reply.sender_type === "admin";
                const replyAttachments = (reply.attachments || []) as { name: string; path: string; size: number }[];
                return (
                  <div
                    key={reply.id}
                    className={`p-4 rounded-xl border ${isAdmin ? "bg-primary/5 border-primary/20 ml-4" : "bg-muted/50 border-border mr-4"}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1 rounded-full ${isAdmin ? "bg-primary/10" : "bg-muted"}`}>
                        {isAdmin ? <Shield className="h-3 w-3 text-primary" /> : <User className="h-3 w-3 text-muted-foreground" />}
                      </div>
                      <span className="text-sm font-medium">{reply.sender_name}</span>
                      <Badge variant="outline" className="text-xs">{isAdmin ? "Support" : "Client"}</Badge>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {format(new Date(reply.created_at), "dd MMM yyyy à HH:mm", { locale: fr })}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
                    {replyAttachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {replyAttachments.map((att, i) => (
                          <Button
                            key={i}
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 gap-1"
                            onClick={() => downloadAttachment(att.path, att.name)}
                          >
                            <Download className="h-3 w-3" />
                            {att.name}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Reply form */}
          <div className="border-t pt-4 space-y-3">
            <Textarea
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder="Rédigez votre réponse..."
              rows={3}
              className="resize-none"
            />

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 cursor-pointer" onClick={() => removeAttachment(i)}>
                    <Paperclip className="h-3 w-3" />
                    {file.name}
                    <span className="text-xs opacity-60">✕</span>
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4 mr-2" />
                  Joindre un fichier
                </Button>
              </div>
              <Button
                onClick={() => sendReply.mutate()}
                disabled={!replyMessage.trim() || uploading || sendReply.isPending}
                className="gap-2"
              >
                {(uploading || sendReply.isPending) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Répondre
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce ticket ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le ticket "{ticket.subject}" sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTicket.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SupportTicketDetail;
