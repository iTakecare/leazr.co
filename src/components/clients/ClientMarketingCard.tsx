import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Building2, Handshake } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  MarketingChannel,
  MarketingPreferences,
  fetchMarketingChannels,
  isChannelConsented,
} from "@/services/marketingPreferencesService";

/**
 * Préférences marketing / consentement pub d'un client.
 * Par défaut tout est coché (opt-in) ; décocher un canal enregistre un refus.
 * Un toggle par « nos communications » + un par partenaire actif.
 */
export default function ClientMarketingCard({ clientId }: { clientId: string }) {
  const [channels, setChannels] = useState<MarketingChannel[] | null>(null);
  const [prefs, setPrefs] = useState<MarketingPreferences>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("clients")
        .select("company_id, marketing_preferences")
        .eq("id", clientId)
        .maybeSingle();
      if (cancelled || !data) return;

      const companyId = (data as any).company_id as string | null;
      setPrefs(((data as any).marketing_preferences as MarketingPreferences) ?? {});

      if (companyId) {
        const list = await fetchMarketingChannels(companyId);
        if (!cancelled) setChannels(list);
      } else {
        setChannels([]);
      }
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  const toggle = async (key: string, consented: boolean) => {
    const next: MarketingPreferences = { ...prefs };
    if (consented) {
      // consentement = valeur par défaut → on retire simplement le refus
      delete next[key];
    } else {
      next[key] = false;
    }
    const previous = prefs;
    setPrefs(next);
    setSaving(true);
    const { error } = await supabase
      .from("clients")
      .update({ marketing_preferences: next } as any)
      .eq("id", clientId);
    setSaving(false);
    if (error) {
      setPrefs(previous);
      toast.error("Impossible d'enregistrer : " + error.message);
    }
  };

  if (!channels) return null;

  const refusedCount = channels.filter((c) => !isChannelConsented(prefs, c.key)).length;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Megaphone className="h-5 w-5" />
          Préférences marketing
          {refusedCount > 0 && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200">
              {refusedCount} canal{refusedCount > 1 ? "aux" : ""} refusé{refusedCount > 1 ? "s" : ""}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Autorisations d'envoi de communications commerciales. Tout est autorisé par défaut ;
          décochez ce que ce client ne souhaite pas recevoir.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {channels.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun canal marketing disponible.</p>
        )}
        {channels.map((channel) => {
          const consented = isChannelConsented(prefs, channel.key);
          return (
            <div
              key={channel.key}
              className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2"
            >
              <Label
                htmlFor={`mkt-${channel.key}`}
                className="flex items-center gap-2 text-sm font-medium cursor-pointer"
              >
                {channel.isOwn ? (
                  <Building2 className="h-4 w-4 text-primary" />
                ) : (
                  <Handshake className="h-4 w-4 text-muted-foreground" />
                )}
                {channel.label}
                {channel.isOwn && (
                  <span className="text-xs text-muted-foreground">(nos communications)</span>
                )}
              </Label>
              <Switch
                id={`mkt-${channel.key}`}
                checked={consented}
                disabled={saving}
                onCheckedChange={(checked) => toggle(channel.key, checked)}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
