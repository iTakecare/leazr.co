import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Building2, Handshake } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  MarketingChannel,
  MarketingPreferences,
  fetchMarketingChannels,
  isChannelConsented,
} from "@/services/marketingPreferencesService";

/**
 * Pré-réglage des préférences marketing appliqué par défaut aux nouveaux clients
 * rattachés à cet ambassadeur. Même logique d'opt-in que la fiche client :
 * tout est autorisé par défaut, on ne mémorise que les refus.
 */
export default function AmbassadorMarketingDefaultsCard({
  ambassadorId,
  companyId,
}: {
  ambassadorId: string;
  companyId?: string;
}) {
  const [channels, setChannels] = useState<MarketingChannel[] | null>(null);
  const [prefs, setPrefs] = useState<MarketingPreferences>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("ambassadors")
        .select("company_id, default_marketing_preferences")
        .eq("id", ambassadorId)
        .maybeSingle();
      if (cancelled || !data) return;

      const cid = companyId ?? ((data as any).company_id as string | null);
      setPrefs(((data as any).default_marketing_preferences as MarketingPreferences) ?? {});

      if (cid) {
        const list = await fetchMarketingChannels(cid);
        if (!cancelled) setChannels(list);
      } else {
        setChannels([]);
      }
    })();
    return () => { cancelled = true; };
  }, [ambassadorId, companyId]);

  const toggle = async (key: string, consented: boolean) => {
    const next: MarketingPreferences = { ...prefs };
    if (consented) {
      delete next[key];
    } else {
      next[key] = false;
    }
    const previous = prefs;
    setPrefs(next);
    setSaving(true);
    const { error } = await supabase
      .from("ambassadors")
      .update({ default_marketing_preferences: next } as any)
      .eq("id", ambassadorId);
    setSaving(false);
    if (error) {
      setPrefs(previous);
      toast.error("Impossible d'enregistrer : " + error.message);
    }
  };

  if (!channels) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Ces réglages s'appliquent automatiquement aux <strong>nouveaux</strong> clients rattachés à
        cet ambassadeur. Tout est autorisé par défaut ; décochez ce qui doit être refusé d'office.
      </p>
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
              htmlFor={`amb-mkt-${channel.key}`}
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
              id={`amb-mkt-${channel.key}`}
              checked={consented}
              disabled={saving}
              onCheckedChange={(checked) => toggle(channel.key, checked)}
            />
          </div>
        );
      })}
    </div>
  );
}
