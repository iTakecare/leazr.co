// Attach offer documents (ID card, financials, …) to the Grenke financing.
// Shown in the Grenke workflow panel once the offer has been submitted. Lets
// the user pick which documents to push, then calls grenke-api 'upload_document'
// (which base64-encodes each file and POSTs it to Grenke's documents endpoint).

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Paperclip, RefreshCw, CheckCircle2, FileText, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  offerId: string;
}

interface DocRow {
  id: string;
  file_name: string;
  document_type: string;
  status: "pending" | "approved" | "rejected";
}

const DOC_LABELS: Record<string, string> = {
  balance_sheet: "Bilan financier",
  tax_notice: "Avertissement extrait de rôle",
  id_card_front: "Carte d'identité (recto)",
  id_card_back: "Carte d'identité (verso)",
  id_card: "Carte d'identité",
  company_register: "Extrait de registre d'entreprise",
  vat_certificate: "Attestation TVA",
  bank_statement: "Relevé bancaire",
};

export default function GrenkeAttachDocuments({ offerId }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("offer_documents")
      .select("id, file_name, document_type, status")
      .eq("offer_id", offerId)
      .order("uploaded_at", { ascending: false });
    const rows = (data ?? []) as DocRow[];
    setDocs(rows);
    // Pre-select everything that isn't rejected.
    setSelected(Object.fromEntries(rows.filter((d) => d.status !== "rejected").map((d) => [d.id, true])));
    setLoading(false);
  };

  useEffect(() => {
    if (open) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const chosenIds = docs.filter((d) => selected[d.id]).map((d) => d.id);

  const handleSend = async () => {
    if (chosenIds.length === 0) {
      toast.error("Sélectionnez au moins un document.");
      return;
    }
    try {
      setSending(true);
      const { data, error } = await supabase.functions.invoke("grenke-api", {
        body: { action: "upload_document", environment: "production", offer_id: offerId, payload: { document_ids: chosenIds } },
      });
      let body = (data ?? null) as { success?: boolean; sent?: number; total?: number; message?: string; error?: string } | null;
      if (error) {
        const ctx = (error as unknown as { context?: Response }).context;
        if (ctx?.json) { try { body = await ctx.json(); } catch { /* */ } }
      }
      if (body?.success) {
        toast.success(`${body.sent}/${body.total} document(s) envoyé(s) à Grenke ✅`);
        setOpen(false);
      } else {
        toast.error(
          <div>
            <strong>Envoi échoué</strong>
            <p className="text-sm mt-1">{body?.message ?? body?.error ?? "Erreur inconnue"}</p>
          </div>,
          { duration: 12000 },
        );
      }
    } catch (e) {
      console.error("[GrenkeAttachDocuments] send error:", e);
      toast.error("Erreur inattendue");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Paperclip className="h-3.5 w-3.5" /> Joindre des documents
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Joindre des documents à Grenke</DialogTitle>
            <DialogDescription>
              Sélectionnez les pièces à transmettre au dossier Grenke (carte d'identité, bilan…).
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin" />
            </div>
          ) : docs.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <AlertCircle className="h-4 w-4" /> Aucun document sur cette offre.
            </div>
          ) : (
            <div className="space-y-2 max-h-[55vh] overflow-y-auto">
              {docs.map((d) => (
                <label key={d.id} className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/40">
                  <input
                    type="checkbox"
                    checked={!!selected[d.id]}
                    onChange={(e) => setSelected((s) => ({ ...s, [d.id]: e.target.checked }))}
                    className="h-4 w-4"
                  />
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{DOC_LABELS[d.document_type] ?? d.document_type}</div>
                    <div className="text-xs text-muted-foreground truncate">{d.file_name}</div>
                  </div>
                  {d.status === "approved" && <Badge variant="outline" className="text-[10px] text-green-700 border-green-300">validé</Badge>}
                  {d.status === "rejected" && <Badge variant="outline" className="text-[10px] text-red-700 border-red-300">rejeté</Badge>}
                  {d.status === "pending" && <Badge variant="outline" className="text-[10px]">en attente</Badge>}
                </label>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-2">
            <span className="text-xs text-muted-foreground">{chosenIds.length} sélectionné(s)</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Annuler</Button>
              <Button size="sm" onClick={handleSend} disabled={sending || chosenIds.length === 0} className="gap-1.5">
                {sending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Envoyer à Grenke
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
