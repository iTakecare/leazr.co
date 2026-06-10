import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";

export interface ImapAccount {
  id: string;
  display_name: string;
  email_address: string;
  imap_host: string;
  imap_port: number;
  imap_use_ssl: boolean;
  imap_username: string;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_use_tls: boolean;
  smtp_username: string | null;
  color: string | null;
  signature_html: string | null;
  is_active: boolean;
  last_sync_at: string | null;
  last_sync_error: string | null;
}

export type ComposeMode = "new" | "reply" | "reply_all" | "forward";

interface ComposerAttachment {
  filename: string;
  content_type: string;
  base64: string;
  size: number;
}

interface MailComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: ImapAccount[];
  defaultAccountId?: string;
  mode: ComposeMode;
  replyToEmailId?: string;
  defaultTo?: string[];
  defaultCc?: string[];
  defaultSubject?: string;
}

const MAX_ATTACHMENTS_BYTES = 10 * 1024 * 1024; // 10 Mo

const MODE_TITLES: Record<ComposeMode, string> = {
  new: "Nouveau message",
  reply: "Répondre",
  reply_all: "Répondre à tous",
  forward: "Transférer",
};

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const parseAddressList = (value: string): string[] =>
  value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

const formatSize = (bytes: number): string => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${bytes} o`;
};

const readFileAsBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const commaIndex = result.indexOf(",");
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(new Error(`Lecture impossible : ${file.name}`));
    reader.readAsDataURL(file);
  });

async function invokeMailFunction(
  name: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  let result = data as Record<string, unknown> | null;
  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        result = (await ctx.json()) as Record<string, unknown>;
      } catch {
        // corps non JSON, on garde l'erreur d'origine
      }
    }
    if (!result) {
      throw new Error((error as Error).message || "Erreur de communication avec le serveur");
    }
  }
  if (result && result.success === false) {
    const message =
      (result.error as string) || (result.message as string) || "L'opération a échoué";
    throw new Error(message);
  }
  return result ?? {};
}

const MailComposer: React.FC<MailComposerProps> = ({
  open,
  onOpenChange,
  accounts,
  defaultAccountId,
  mode,
  replyToEmailId,
  defaultTo,
  defaultCc,
  defaultSubject,
}) => {
  const [accountId, setAccountId] = useState<string>("");
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Réinitialiser le formulaire à chaque ouverture
  useEffect(() => {
    if (!open) return;
    setAccountId(defaultAccountId || accounts[0]?.id || "");
    setTo((defaultTo ?? []).join(", "));
    setCc((defaultCc ?? []).join(", "));
    setBcc("");
    setShowCc((defaultCc ?? []).length > 0);
    setShowBcc(false);
    setSubject(defaultSubject ?? "");
    setBody("");
    setAttachments([]);
    setSending(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const totalAttachmentsSize = attachments.reduce((sum, a) => sum + a.size, 0);

  const handleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    let runningTotal = totalAttachmentsSize;
    const added: ComposerAttachment[] = [];
    for (const file of files) {
      if (runningTotal + file.size > MAX_ATTACHMENTS_BYTES) {
        toast.error("Pièces jointes : 10 Mo maximum au total");
        break;
      }
      try {
        const base64 = await readFileAsBase64(file);
        added.push({
          filename: file.name,
          content_type: file.type || "application/octet-stream",
          base64,
          size: file.size,
        });
        runningTotal += file.size;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Lecture du fichier impossible");
      }
    }
    if (added.length > 0) {
      setAttachments((prev) => [...prev, ...added]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    const toList = parseAddressList(to);
    const ccList = parseAddressList(cc);
    const bccList = parseAddressList(bcc);

    if (!accountId) {
      toast.error("Sélectionnez un compte expéditeur");
      return;
    }
    if (toList.length === 0) {
      toast.error("Indiquez au moins un destinataire");
      return;
    }

    const account = accounts.find((a) => a.id === accountId);
    let html = escapeHtml(body).replace(/\n/g, "<br>");
    if (account?.signature_html) {
      html += `<br><br>${account.signature_html}`;
    }

    setSending(true);
    try {
      await invokeMailFunction("mail-send", {
        action: "send",
        account_id: accountId,
        to: toList,
        cc: ccList,
        bcc: bccList,
        subject,
        html,
        attachments: attachments.map(({ filename, content_type, base64 }) => ({
          filename,
          content_type,
          base64,
        })),
        reply_to_email_id: replyToEmailId,
        mode,
      });
      toast.success("Email envoyé");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "L'envoi a échoué");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !sending && onOpenChange(value)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{MODE_TITLES[mode]}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="composer-account">De</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger id="composer-account">
                <SelectValue placeholder="Choisir un compte" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: account.color || "#888888" }}
                      />
                      {account.display_name} &lt;{account.email_address}&gt;
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="composer-to">À</Label>
              <div className="flex gap-2 text-xs">
                {!showCc && (
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground underline"
                    onClick={() => setShowCc(true)}
                  >
                    Cc
                  </button>
                )}
                {!showBcc && (
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground underline"
                    onClick={() => setShowBcc(true)}
                  >
                    Cci
                  </button>
                )}
              </div>
            </div>
            <Input
              id="composer-to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="destinataire@exemple.com, autre@exemple.com"
            />
          </div>

          {showCc && (
            <div className="space-y-1.5">
              <Label htmlFor="composer-cc">Cc</Label>
              <Input
                id="composer-cc"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="copie@exemple.com"
              />
            </div>
          )}

          {showBcc && (
            <div className="space-y-1.5">
              <Label htmlFor="composer-bcc">Cci</Label>
              <Input
                id="composer-bcc"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                placeholder="copie.cachee@exemple.com"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="composer-subject">Objet</Label>
            <Input
              id="composer-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Objet du message"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="composer-body">Message</Label>
            <Textarea
              id="composer-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[260px]"
              placeholder="Votre message…"
            />
          </div>

          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFilesSelected}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="mr-2 h-4 w-4" />
              Joindre des fichiers
            </Button>
            {attachments.length > 0 && (
              <ul className="space-y-1">
                {attachments.map((attachment, index) => (
                  <li
                    key={`${attachment.filename}-${index}`}
                    className="flex items-center justify-between rounded-md border px-2 py-1 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{attachment.filename}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatSize(attachment.size)}
                      </span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => removeAttachment(index)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Annuler
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Envoyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MailComposer;
