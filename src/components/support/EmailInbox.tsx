import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Loader2, Mail, MailOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import EmailDetail from "./EmailDetail";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const EmailInbox = () => {
  const { companyId } = useMultiTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [emailToHide, setEmailToHide] = useState<string | null>(null);

  const { data: emails, isLoading } = useQuery({
    queryKey: ["synced-emails", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("synced_emails")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_hidden", false)
        .order("received_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId && !!user,
  });

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-imap-emails", {
        body: { user_id: user!.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      queryClient.invalidateQueries({ queryKey: ["synced-emails"] });
      let msg = `Synchronisation terminée — ${data?.count || 0} nouveaux emails`;
      if (data?.skipped) msg += `, ${data.skipped} déjà synchronisés`;
      if (data?.timedOut) msg += " (interrompue, relancez pour continuer)";
      toast.success(msg);
    } catch (err: any) {
      toast.error("Erreur de synchronisation : " + (err.message || "Erreur inconnue"));
    } finally {
      setSyncing(false);
    }
  };

  const hideEmail = async (emailId: string) => {
    try {
      const { error } = await supabase
        .from("synced_emails")
        .update({ is_hidden: true } as any)
        .eq("id", emailId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["synced-emails"] });
      toast.success("Email masqué");
    } catch (err: any) {
      toast.error("Erreur : " + (err.message || "Échec"));
    }
    setEmailToHide(null);
  };

  if (selectedEmail) {
    return <EmailDetail email={selectedEmail} onBack={() => setSelectedEmail(null)} onHide={(id: string) => { setEmailToHide(id); }} />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Boîte mail</CardTitle>
        <Button onClick={handleSync} disabled={syncing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          Synchroniser
        </Button>
      </CardHeader>
      <CardContent>
        {!emails?.length ? (
          <div className="text-center py-12 space-y-2">
            <Mail className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              Aucun email synchronisé. Configurez votre IMAP puis cliquez sur Synchroniser.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>De</TableHead>
                <TableHead>Sujet</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Lié à</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emails.map((email: any) => (
                <TableRow
                  key={email.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedEmail(email)}
                >
                  <TableCell>
                    {email.is_read ? (
                      <MailOpen className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Mail className="h-4 w-4 text-primary" />
                    )}
                  </TableCell>
                  <TableCell className={!email.is_read ? "font-semibold" : ""}>
                    {email.from_name || email.from_address}
                  </TableCell>
                  <TableCell className={`max-w-[300px] truncate ${!email.is_read ? "font-semibold" : ""}`}>
                    {email.subject || "(sans sujet)"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {email.received_at
                      ? format(new Date(email.received_at), "dd MMM HH:mm", { locale: fr })
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {email.linked_ticket_id && <Badge variant="secondary">Ticket</Badge>}
                    {email.linked_task_id && <Badge variant="secondary">Tâche</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default EmailInbox;
