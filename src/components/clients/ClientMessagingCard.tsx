import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Consentement + canal de messagerie (WhatsApp/SMS) du client.
// whatsapp_status est appris automatiquement par les envois/réceptions
// (messaging-webhook) — affiché ici en lecture seule.
interface MessagingFields {
  messaging_opt_in_at: string | null;
  voice_consent_given_at: string | null;
  whatsapp_status: "unknown" | "yes" | "no";
  preferred_channel: "auto" | "whatsapp" | "sms" | "none";
  phone: string | null;
  communication_language: "fr" | "nl" | "en" | "de";
}

const CHANNEL_LABELS: Record<MessagingFields["preferred_channel"], string> = {
  auto: "Automatique (WhatsApp d'abord, SMS sinon)",
  whatsapp: "WhatsApp uniquement",
  sms: "SMS uniquement",
  none: "Aucun (désactivé)",
};

const LANGUAGE_LABELS: Record<MessagingFields["communication_language"], string> = {
  fr: "Français",
  nl: "Nederlands",
  en: "English",
  de: "Deutsch",
};

export default function ClientMessagingCard({ clientId }: { clientId: string }) {
  const [fields, setFields] = useState<MessagingFields | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("clients")
      .select("messaging_opt_in_at, voice_consent_given_at, whatsapp_status, preferred_channel, phone, communication_language")
      .eq("id", clientId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setFields(data as MessagingFields);
      });
    return () => { cancelled = true; };
  }, [clientId]);

  const save = async (patch: Partial<MessagingFields>) => {
    if (!fields) return;
    const previous = fields;
    setFields({ ...fields, ...patch });
    setSaving(true);
    const { error } = await supabase.from("clients").update(patch).eq("id", clientId);
    setSaving(false);
    if (error) {
      setFields(previous);
      toast.error("Impossible d'enregistrer : " + error.message);
    }
  };

  if (!fields) return null;

  const optedIn = !!fields.messaging_opt_in_at;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="h-5 w-5" />
          Messagerie & appels IA
          {fields.whatsapp_status === "yes" && (
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200">WhatsApp ✓</Badge>
          )}
          {fields.whatsapp_status === "no" && (
            <Badge variant="secondary" className="bg-sky-100 text-sky-700 border-sky-200">SMS (pas de WhatsApp)</Badge>
          )}
          {fields.whatsapp_status === "unknown" && (
            <Badge variant="outline">WhatsApp : non vérifié</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
        <div className="flex items-center gap-3">
          <Switch
            id="messaging-opt-in"
            checked={optedIn}
            disabled={saving}
            onCheckedChange={(checked) =>
              save({ messaging_opt_in_at: checked ? new Date().toISOString() : null })
            }
          />
          <Label htmlFor="messaging-opt-in" className="text-sm">
            Consentement aux messages
            {optedIn && fields.messaging_opt_in_at && (
              <span className="block text-xs text-muted-foreground">
                depuis le {new Date(fields.messaging_opt_in_at).toLocaleDateString("fr-FR")}
              </span>
            )}
          </Label>
        </div>

        <div className="flex items-center gap-3">
          <Switch
            id="voice-consent"
            checked={!!fields.voice_consent_given_at}
            disabled={saving}
            onCheckedChange={(checked) =>
              save({ voice_consent_given_at: checked ? new Date().toISOString() : null })
            }
          />
          <Label htmlFor="voice-consent" className="text-sm">
            Consentement appels IA (Alex)
            {fields.voice_consent_given_at && (
              <span className="block text-xs text-muted-foreground">
                depuis le {new Date(fields.voice_consent_given_at).toLocaleDateString("fr-FR")}
              </span>
            )}
          </Label>
        </div>

        <div className="flex items-center gap-3">
          <Label className="text-sm shrink-0">Canal préféré</Label>
          <Select
            value={fields.preferred_channel}
            disabled={saving}
            onValueChange={(v) => save({ preferred_channel: v as MessagingFields["preferred_channel"] })}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(CHANNEL_LABELS) as Array<MessagingFields["preferred_channel"]>).map((k) => (
                <SelectItem key={k} value={k}>{CHANNEL_LABELS[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <Label className="text-sm shrink-0">Langue de communication</Label>
          <Select
            value={fields.communication_language ?? "fr"}
            disabled={saving}
            onValueChange={(v) => save({ communication_language: v as MessagingFields["communication_language"] })}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(LANGUAGE_LABELS) as Array<MessagingFields["communication_language"]>).map((k) => (
                <SelectItem key={k} value={k}>{LANGUAGE_LABELS[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!fields.phone && (
          <p className="text-xs text-orange-600">
            ⚠️ Pas de numéro de téléphone sur la fiche — aucun message ne pourra partir.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
