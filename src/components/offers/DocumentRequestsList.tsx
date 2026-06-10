import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Mail, MessageSquare, Smartphone, ExternalLink, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const DOC_LABELS: Record<string, string> = {
  balance_sheet: "Bilan financier", provisional_balance: "Bilan provisoire",
  tax_notice: "Avertissement extrait de rôle", tax_return: "Liasse fiscale",
  id_card_front: "CI recto", id_card_back: "CI verso", id_card: "Carte d'identité",
  company_register: "Registre d'entreprise", vat_certificate: "Attestation TVA",
  bank_statement: "Relevé bancaire", proof_of_address: "Justificatif de domicile",
  company_statutes: "Statuts", custom: "Autre",
};
const label = (c: string) => (c.startsWith("custom:") ? c.slice(7) : DOC_LABELS[c] ?? c);

interface DocRequest {
  id: string;
  documents: string[];
  channels: string[];
  email_status: string | null;
  whatsapp_status: string | null;
  sms_status: string | null;
  fulfilled_at: string | null;
  upload_url: string | null;
  created_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export default function DocumentRequestsList({ offerId }: { offerId: string }) {
  const queryClient = useQueryClient();

  const { data: requests = [] } = useQuery<DocRequest[]>({
    queryKey: ["document-requests", offerId],
    queryFn: async () => {
      const { data } = await db
        .from("document_requests")
        .select("id, documents, channels, email_status, whatsapp_status, sms_status, fulfilled_at, upload_url, created_at")
        .eq("offer_id", offerId)
        .order("created_at", { ascending: false });
      return (data as DocRequest[]) ?? [];
    },
  });

  useEffect(() => {
    const channel = db
      .channel(`doc_req_${offerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "document_requests", filter: `offer_id=eq.${offerId}` },
        () => queryClient.invalidateQueries({ queryKey: ["document-requests", offerId] }))
      .subscribe();
    return () => { db.removeChannel(channel); };
  }, [offerId, queryClient]);

  if (requests.length === 0) return null;

  const chBadge = (Icon: typeof Mail, name: string, status: string | null) => {
    if (!status) return null;
    const ok = status === "sent";
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]",
        ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
        <Icon className="h-3 w-3" /> {name} {ok ? "✓" : "✗"}
      </span>
    );
  };

  return (
    <div className="space-y-2 mb-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Demandes de documents envoyées</p>
      {requests.map((r) => (
        <div key={r.id} className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {format(new Date(r.created_at), "dd/MM/yyyy à HH:mm", { locale: fr })}
            </span>
            {r.fulfilled_at ? (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Documents reçus
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                <Clock className="h-3 w-3 mr-1" /> En attente
              </Badge>
            )}
          </div>
          <p className="text-sm">{r.documents.map(label).join(", ")}</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {chBadge(Mail, "Email", r.email_status)}
            {chBadge(MessageSquare, "WhatsApp", r.whatsapp_status)}
            {chBadge(Smartphone, "SMS", r.sms_status)}
            {r.upload_url && (
              <a href={r.upload_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-sky-600 hover:underline ml-auto">
                <ExternalLink className="h-3 w-3" /> Lien d'upload
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
