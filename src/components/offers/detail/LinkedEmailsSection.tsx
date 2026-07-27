import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Mail } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import DOMPurify from "dompurify";

interface LinkedEmailListItem {
  id: string;
  subject: string | null;
  from_name: string | null;
  from_address: string | null;
  received_at: string | null;
}

interface LinkedEmailFull extends LinkedEmailListItem {
  to_address: string | null;
  body_html: string | null;
  body_text: string | null;
}

interface LinkedEmailsSectionProps {
  offerId: string;
}

// Emails de la boîte mail (synced_emails) liés à la demande depuis l'écran
// Support ou le centre d'actions IA (linked_offer_id). Clic → modale qui
// affiche le mail complet (même sanitisation que EmailDetail).
const LinkedEmailsSection = ({ offerId }: LinkedEmailsSectionProps) => {
  const [openEmailId, setOpenEmailId] = useState<string | null>(null);

  const { data: emails = [] } = useQuery({
    queryKey: ["offer-linked-emails", offerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("synced_emails")
        .select("id, subject, from_name, from_address, received_at")
        .eq("linked_offer_id", offerId)
        .order("received_at", { ascending: false });
      if (error) throw error;
      return (data || []) as LinkedEmailListItem[];
    },
  });

  // Corps du mail chargé à l'ouverture de la modale (body_html peut être lourd).
  const { data: openEmail, isLoading: loadingEmail } = useQuery({
    queryKey: ["offer-linked-email-detail", openEmailId],
    enabled: !!openEmailId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("synced_emails")
        .select("id, subject, from_name, from_address, to_address, received_at, body_html, body_text")
        .eq("id", openEmailId!)
        .single();
      if (error) throw error;
      return data as LinkedEmailFull;
    },
  });

  // Images inline (cid:) résolues en data: URIs, comme dans EmailDetail.
  const [resolvedHtml, setResolvedHtml] = useState<string | null>(null);
  useEffect(() => {
    setResolvedHtml(null);
    if (openEmail?.body_html && openEmail.body_html.includes("cid:")) {
      supabase.functions
        .invoke("mail-sync", { body: { action: "resolve_inline", email_id: openEmail.id } })
        .then(({ data }) => {
          const html = (data as { success?: boolean; html?: string } | null)?.html;
          if (html) setResolvedHtml(html);
        })
        .catch(() => { /* on garde le HTML brut */ });
    }
  }, [openEmail?.id, openEmail?.body_html]);

  if (emails.length === 0) return null;

  const formatDate = (iso: string | null) =>
    iso ? format(new Date(iso), "d MMM yyyy 'à' HH:mm", { locale: fr }) : "";

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Emails liés
            <Badge variant="secondary">{emails.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {emails.map((email) => (
            <button
              key={email.id}
              type="button"
              onClick={() => setOpenEmailId(email.id)}
              className="w-full text-left border rounded-lg p-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm truncate">
                  {email.subject || "(sans sujet)"}
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(email.received_at)}
                </span>
              </div>
              <div className="text-xs text-muted-foreground truncate mt-0.5">
                {email.from_name ? `${email.from_name} <${email.from_address}>` : email.from_address}
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!openEmailId} onOpenChange={(open) => { if (!open) setOpenEmailId(null); }}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="pr-8">
              {openEmail?.subject || "(sans sujet)"}
            </DialogTitle>
          </DialogHeader>
          {loadingEmail || !openEmail ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex flex-col gap-3 overflow-hidden">
              <div className="text-sm text-muted-foreground space-y-0.5">
                <div>
                  <span className="font-medium text-foreground">De :</span>{" "}
                  {openEmail.from_name
                    ? `${openEmail.from_name} <${openEmail.from_address}>`
                    : openEmail.from_address}
                </div>
                {openEmail.to_address && (
                  <div>
                    <span className="font-medium text-foreground">À :</span> {openEmail.to_address}
                  </div>
                )}
                <div>
                  <span className="font-medium text-foreground">Reçu :</span>{" "}
                  {formatDate(openEmail.received_at)}
                </div>
              </div>
              <div className="border rounded-lg p-4 bg-muted/30 overflow-y-auto">
                {openEmail.body_html ? (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(resolvedHtml ?? openEmail.body_html, {
                        ADD_ATTR: ["target"],
                        // autorise les images embarquées (data:) résolues depuis cid:
                        ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
                      }),
                    }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm font-sans">
                    {openEmail.body_text || "Aucun contenu"}
                  </pre>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LinkedEmailsSection;
