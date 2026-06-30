import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, MessageSquare, Smartphone, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logOfferEvent } from "@/services/offers/offerEvents";
import { cn } from "@/lib/utils";

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

type Channel = "email" | "whatsapp" | "sms";
type Lang = "fr" | "nl" | "en" | "de";

const LANGUAGES: { id: Lang; label: string; flag: string }[] = [
  { id: "fr", label: "FR", flag: "🇫🇷" },
  { id: "nl", label: "NL", flag: "🇳🇱" },
  { id: "en", label: "EN", flag: "🇬🇧" },
  { id: "de", label: "DE", flag: "🇩🇪" },
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  offerId: string;
  defaultDocuments?: string[];
  defaultMessage?: string;
  onSent?: () => void;
}

export default function RequestDocumentsDialog({ open, onOpenChange, offerId, defaultDocuments, defaultMessage, onSent }: Props) {
  const [selected, setSelected] = useState<string[]>(defaultDocuments ?? []);
  const [customDoc, setCustomDoc] = useState("");
  const [message, setMessage] = useState(defaultMessage ?? "");
  const [channels, setChannels] = useState<Channel[]>(["email"]);
  const [language, setLanguage] = useState<Lang>("fr");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(defaultDocuments ?? []);
      setMessage(defaultMessage ?? "");
      setCustomDoc("");
      setChannels(["email"]);
      setLanguage("fr");
    }
  }, [open, defaultDocuments, defaultMessage]);

  const toggleDoc = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleChannel = (c: Channel) =>
    setChannels((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]));

  const documents = [...selected, ...(customDoc.trim() ? [`custom:${customDoc.trim()}`] : [])];
  const canSend = documents.length > 0 && channels.length > 0 && !sending;

  const send = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("document-request", {
        body: { offer_id: offerId, documents, custom_message: message || undefined, channels, language },
      });
      let body = (data ?? null) as
        | { success?: boolean; email_status?: string | null; whatsapp_status?: string | null; sms_status?: string | null; message?: string }
        | null;
      if (error) {
        const ctx = (error as { context?: { json?: () => Promise<unknown> } }).context;
        if (ctx?.json) { try { body = (await ctx.json()) as typeof body; } catch { /* */ } }
      }
      const parts: string[] = [];
      const fmt = (label: string, st?: string | null) => { if (st) parts.push(`${label} ${st === "sent" ? "✓" : "✗"}`); };
      fmt("Email", body?.email_status);
      fmt("WhatsApp", body?.whatsapp_status);
      fmt("SMS", body?.sms_status);
      if (body?.success) {
        toast.success(`Demande envoyée${parts.length ? " — " + parts.join(", ") : ""}`);
        logOfferEvent(offerId, "email_doc_request", `Demande de documents envoyée (${channels.join(", ")}) : ${documents.join(", ")}`);
        onSent?.();
        onOpenChange(false);
      } else {
        toast.error(`Échec de l'envoi${parts.length ? " — " + parts.join(", ") : ""}${body?.message ? " : " + body.message : ""}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Envoi impossible");
    } finally {
      setSending(false);
    }
  };

  const channelBtn = (c: Channel, label: string, Icon: typeof Mail) => (
    <button
      type="button"
      onClick={() => toggleChannel(c)}
      className={cn(
        "flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors",
        channels.includes(c) ? "bg-emerald-600 text-white border-emerald-600" : "hover:bg-accent"
      )}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Demander des documents</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5 max-h-52 overflow-auto pr-1">
            {DOCUMENT_OPTIONS.map((d) => (
              <label key={d.id} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-accent cursor-pointer text-sm">
                <input type="checkbox" checked={selected.includes(d.id)} onChange={() => toggleDoc(d.id)} className="h-4 w-4 accent-emerald-600" />
                {d.label}
              </label>
            ))}
          </div>
          <div>
            <Label className="text-xs">Autre document</Label>
            <Input value={customDoc} onChange={(e) => setCustomDoc(e.target.value)} placeholder="Ex. preuve de domicile" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Message au client (optionnel)</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Un mot personnalisé…" className="mt-1 min-h-[70px]" />
          </div>
          <div>
            <Label className="text-xs">Langue de la demande</Label>
            <div className="flex gap-2 mt-1">
              {LANGUAGES.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLanguage(l.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors",
                    language === l.id ? "bg-emerald-600 text-white border-emerald-600" : "hover:bg-accent"
                  )}
                >
                  <span aria-hidden>{l.flag}</span> {l.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Le courriel et le SMS/WhatsApp seront rédigés dans cette langue (français par défaut).
            </p>
          </div>
          <div>
            <Label className="text-xs">Canaux d'envoi</Label>
            <div className="flex gap-2 mt-1">
              {channelBtn("email", "Email", Mail)}
              {channelBtn("whatsapp", "WhatsApp", MessageSquare)}
              {channelBtn("sms", "SMS", Smartphone)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              WhatsApp/SMS nécessitent un numéro sur la fiche client. Sans réponse WhatsApp sous 24 h, une relance vous sera notifiée.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button onClick={send} disabled={!canSend} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Envoyer la demande
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
