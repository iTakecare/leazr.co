import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Megaphone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  Save,
  ExternalLink,
  Wifi,
  WifiOff,
  History,
  Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { testAdiOSWebhook, backfillAdiOSHistorical, type AdiOSBackfillResult } from "@/utils/adios";

interface AdiOSConfig {
  id: string;
  webhook_url: string;
  enabled_events: string[];
  is_active: boolean;
  last_triggered_at: string | null;
  last_status: string | null;
  last_error: string | null;
}

export default function AdiOSIntegrationCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [lastBackfill, setLastBackfill] = useState<AdiOSBackfillResult | null>(null);

  const [config, setConfig] = useState<AdiOSConfig | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", session.user.id)
        .single();

      if (!profile?.company_id) {
        setLoading(false);
        return;
      }
      setCompanyId(profile.company_id);

      const { data: adiosConfig, error } = await supabase
        .from("adios_integrations")
        .select("*")
        .eq("company_id", profile.company_id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching AdiOS config:", error);
        return;
      }
      if (adiosConfig) {
        setConfig({
          id: adiosConfig.id,
          webhook_url: adiosConfig.webhook_url,
          enabled_events: (adiosConfig.enabled_events as string[]) || [],
          is_active: adiosConfig.is_active,
          last_triggered_at: adiosConfig.last_triggered_at,
          last_status: adiosConfig.last_status,
          last_error: adiosConfig.last_error,
        });
        setWebhookUrl(adiosConfig.webhook_url || "");
        setIsActive(adiosConfig.is_active);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const validateUrl = (url: string): string | null => {
    if (!url.trim()) return "Veuillez entrer l'URL du webhook AdiOS";
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") return "L'URL doit commencer par https://";
      if (!parsed.hostname.includes("adios.pub") && !parsed.hostname.includes("adios.")) {
        return "L'URL ne semble pas être un webhook AdiOS";
      }
    } catch {
      return "URL invalide";
    }
    return null;
  };

  const handleSave = async () => {
    const err = validateUrl(webhookUrl);
    if (err) {
      toast.error(err);
      return;
    }
    if (!companyId) {
      toast.error("Erreur: Company ID manquant");
      return;
    }

    try {
      setSaving(true);
      const configData = {
        company_id: companyId,
        webhook_url: webhookUrl.trim(),
        enabled_events: ["contract_signed"],
        is_active: isActive,
      };

      if (config?.id) {
        const { error } = await supabase
          .from("adios_integrations")
          .update(configData)
          .eq("id", config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("adios_integrations")
          .insert(configData);
        if (error) throw error;
      }

      toast.success("Configuration AdiOS sauvegardée");
      await fetchConfig();
    } catch (error) {
      console.error("Error saving AdiOS config:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleBackfill = async (dryRun: boolean, forceResync: boolean = false) => {
    if (!config?.id || !config.is_active || !config.webhook_url) {
      toast.error("Configurez et activez AdiOS avant de lancer le backfill");
      return;
    }

    if (!dryRun && !forceResync) {
      const ok = window.confirm(
        "Cela va envoyer toutes les conversions Meta historiques (contrats signés non encore synchronisés) à AdiOS.\n\n" +
        "Action idempotente : chaque offre n'est envoyée qu'une seule fois.\n\n" +
        "Continuer ?",
      );
      if (!ok) return;
    }

    if (forceResync && !dryRun) {
      const ok = window.confirm(
        "⚠️ RESYNC FORCÉ\n\n" +
        "Cela va re-envoyer TOUS les leads Meta (même ceux déjà synchronisés) " +
        "avec le mapping de statut actuel.\n\n" +
        "À utiliser quand la logique de mapping a changé et qu'il faut corriger " +
        "des statuts envoyés à tort par un run précédent.\n\n" +
        "⚠️ Les anciens événements AdiOS (avec les anciens external_id) restent " +
        "dans AdiOS — il y aura des doublons à nettoyer côté AdiOS.\n\n" +
        "Continuer quand même ?",
      );
      if (!ok) return;
    }

    try {
      setBackfilling(true);
      setLastBackfill(null);
      const result = await backfillAdiOSHistorical({
        dry_run: dryRun,
        max_to_send: 200,
        delay_between_ms: 250,
        force_resync: forceResync,
      });
      setLastBackfill(result);

      if (!result.success) {
        toast.error(
          <div>
            <strong>Backfill échoué</strong>
            <p className="text-sm mt-1">{result.error || "Erreur inconnue"}</p>
          </div>,
        );
        return;
      }

      const breakdown = result.by_status
        ? [
            result.by_status.won > 0 ? `${result.by_status.won} won` : null,
            result.by_status.qualified > 0 ? `${result.by_status.qualified} qualified` : null,
            result.by_status.rejected > 0 ? `${result.by_status.rejected} rejected` : null,
            result.by_status.lost > 0 ? `${result.by_status.lost} lost` : null,
          ]
            .filter(Boolean)
            .join(" · ")
        : "";

      if (dryRun) {
        toast.info(
          <div>
            <strong>Aperçu (dry-run)</strong>
            <p className="text-sm mt-1">
              {result.sent} conversion(s) prête(s) à envoyer
              {breakdown ? ` (${breakdown})` : ""}
            </p>
            {(result.skipped_too_early ?? 0) > 0 && (
              <p className="text-xs mt-0.5 text-muted-foreground">
                {result.skipped_too_early} encore en cours · ignoré(s)
              </p>
            )}
          </div>,
          { duration: 8000 },
        );
      } else {
        toast.success(
          <div>
            <strong>Backfill terminé</strong>
            <p className="text-sm mt-1">
              {result.sent} envoyé(s)
              {breakdown ? ` · ${breakdown}` : ""}
              {result.errors > 0 ? ` · ${result.errors} erreur(s)` : ""}
            </p>
          </div>,
          { duration: 10000 },
        );
        await fetchConfig(); // refresh last_triggered_at
      }
    } catch (err) {
      console.error("Error in backfill:", err);
      toast.error("Erreur inattendue pendant le backfill");
    } finally {
      setBackfilling(false);
    }
  };

  const handleTest = async () => {
    const err = validateUrl(webhookUrl);
    if (err) {
      toast.error(err);
      return;
    }

    try {
      setTesting(true);
      const result = await testAdiOSWebhook(webhookUrl.trim());
      if (result.success) {
        toast.success(
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>{result.message}</span>
          </div>,
          { duration: 5000 },
        );
      } else {
        toast.error(
          <div>
            <strong>Échec du test</strong>
            <p className="text-sm mt-1">{result.message}</p>
            {result.status && (
              <p className="text-xs text-muted-foreground">Code HTTP: {result.status}</p>
            )}
          </div>,
          { duration: 8000 },
        );
      }
    } catch (error) {
      console.error("Error testing AdiOS webhook:", error);
      toast.error("Erreur inattendue lors du test");
    } finally {
      setTesting(false);
    }
  };

  const formatDate = (s?: string | null) => {
    if (!s) return "Jamais";
    return new Date(s).toLocaleString("fr-FR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            AdiOS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Megaphone className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                AdiOS
                {config?.is_active && config?.webhook_url && (
                  <Badge className="bg-primary/20 text-primary hover:bg-primary/20">
                    <Wifi className="h-3 w-3 mr-1" />
                    Connecté
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Suivi des conversions Meta Ads (Facebook & Instagram)
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" asChild>
            <a href="https://app.adios.pub/app/conversions" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Connection status */}
        <div className="flex items-center gap-2 text-sm">
          {config?.webhook_url ? (
            <>
              <Wifi className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Webhook configuré</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Non configuré</span>
            </>
          )}
        </div>

        {/* Webhook URL */}
        <div className="space-y-2">
          <Label htmlFor="adios-webhook-url">URL du Webhook AdiOS</Label>
          <Input
            id="adios-webhook-url"
            type="url"
            placeholder="https://app.adios.pub/api/webhooks/conversions/..."
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Dans AdiOS → <em>Brancher Leazr (ou un autre CRM)</em>, copiez l'URL
            du webhook actif et collez-la ici.
          </p>
        </div>

        {/* Active toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="adios-active">Intégration active</Label>
            <p className="text-xs text-muted-foreground">
              Quand un contrat issu de Facebook ou Instagram est signé, la
              conversion est envoyée à AdiOS automatiquement.
            </p>
          </div>
          <Switch
            id="adios-active"
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </div>

        <Separator />

        {/* How it works */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm space-y-1">
            <p className="font-medium">Comment ça marche</p>
            <p>
              Quand un lead arrivé via une <strong>publicité Meta</strong>{" "}
              (Facebook ou Instagram) signe son contrat, Leazr envoie
              automatiquement la conversion à AdiOS avec la plateforme
              d'origine, l'email et la valeur totale du contrat (mensualité ×
              durée).
            </p>
            <p className="text-xs text-muted-foreground pt-1">
              Détection de la source par ordre de priorité : (1) leads importés
              via <code>import-meta-leads</code> (plateforme connue), (2) liens
              UTM <code>utm_source=facebook|instagram</code> ou{" "}
              <code>fbclid</code> capturés sur les pages publiques, (3) mention
              "Plateforme: Facebook/Instagram" dans les remarques de l'offre ou
              les notes du client.
            </p>
          </AlertDescription>
        </Alert>

        {/* Historical backfill */}
        {config?.id && config.is_active && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <History className="h-4 w-4 mt-0.5 text-purple-600" />
              <div className="flex-1">
                <h4 className="text-sm font-medium">Importer l'historique Meta</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Renvoie toutes les conversions Meta passées (contrats déjà
                  signés non encore poussés) vers AdiOS pour calculer la
                  rentabilité de tes campagnes existantes. Idempotent — chaque
                  conversion n'est envoyée qu'une fois.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBackfill(true)}
                disabled={backfilling}
                className="flex-1"
              >
                {backfilling ? (
                  <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
                ) : (
                  <Eye className="h-3.5 w-3.5 mr-2" />
                )}
                Aperçu (dry-run)
              </Button>
              <Button
                size="sm"
                onClick={() => handleBackfill(false)}
                disabled={backfilling}
                className="flex-1"
              >
                {backfilling ? (
                  <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
                ) : (
                  <History className="h-3.5 w-3.5 mr-2" />
                )}
                Lancer le backfill
              </Button>
            </div>

            {/* Force-resync row — only useful after a mapping logic change */}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBackfill(true, true)}
                disabled={backfilling}
                className="flex-1 text-xs"
              >
                <Eye className="h-3 w-3 mr-1.5" />
                Aperçu — resync forcé
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBackfill(false, true)}
                disabled={backfilling}
                className="flex-1 text-xs text-amber-700 hover:text-amber-700 border-amber-300 hover:border-amber-400 hover:bg-amber-50"
              >
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Lancer — resync forcé
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground -mt-2">
              Resync forcé : ré-envoie même les leads déjà synchronisés (utile
              après un changement de mapping). Crée des doublons côté AdiOS.
            </p>

            {lastBackfill && (
              <div className="text-xs space-y-1 pt-2 border-t border-border/50">
                <div className="font-medium">
                  {lastBackfill.dry_run ? "Aperçu" : "Dernier backfill"}
                  {lastBackfill.success ? "" : " (échec)"}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-muted-foreground">
                  <span>Candidats Meta trouvés:</span>
                  <span className="text-foreground">{lastBackfill.total_candidates}</span>
                  <span>{lastBackfill.dry_run ? "À envoyer:" : "Envoyés:"}</span>
                  <span className="text-foreground">{lastBackfill.sent}</span>
                  <span>Non-Meta ignorés:</span>
                  <span className="text-foreground">{lastBackfill.skipped_not_meta}</span>
                  {(lastBackfill.skipped_too_early ?? 0) > 0 && (
                    <>
                      <span>Trop tôt (en cours):</span>
                      <span className="text-foreground">{lastBackfill.skipped_too_early}</span>
                    </>
                  )}
                  {lastBackfill.skipped_already_synced > 0 && (
                    <>
                      <span>Déjà synchronisés:</span>
                      <span className="text-foreground">{lastBackfill.skipped_already_synced}</span>
                    </>
                  )}
                  {lastBackfill.errors > 0 && (
                    <>
                      <span className="text-destructive">Erreurs:</span>
                      <span className="text-destructive">{lastBackfill.errors}</span>
                    </>
                  )}
                </div>

                {lastBackfill.by_status && lastBackfill.sent > 0 && (
                  <div className="pt-2 border-t border-border/50">
                    <div className="font-medium mb-1">Répartition par statut</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-muted-foreground">
                      {lastBackfill.by_status.won > 0 && (
                        <>
                          <span>✅ Won (signés):</span>
                          <span className="text-foreground">{lastBackfill.by_status.won}</span>
                        </>
                      )}
                      {lastBackfill.by_status.qualified > 0 && (
                        <>
                          <span>🟡 Qualified (en cours):</span>
                          <span className="text-foreground">{lastBackfill.by_status.qualified}</span>
                        </>
                      )}
                      {lastBackfill.by_status.rejected > 0 && (
                        <>
                          <span>❌ Rejected (refusés):</span>
                          <span className="text-foreground">{lastBackfill.by_status.rejected}</span>
                        </>
                      )}
                      {lastBackfill.by_status.lost > 0 && (
                        <>
                          <span>👋 Lost (sans suite):</span>
                          <span className="text-foreground">{lastBackfill.by_status.lost}</span>
                        </>
                      )}
                      {(lastBackfill.total_value_eur ?? 0) > 0 && (
                        <>
                          <span>💰 Marge totale (won):</span>
                          <span className="text-foreground">
                            {new Intl.NumberFormat("fr-BE", {
                              style: "currency",
                              currency: "EUR",
                              maximumFractionDigits: 0,
                            }).format(lastBackfill.total_value_eur ?? 0)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}
                {lastBackfill.error_details && lastBackfill.error_details.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-destructive">
                      Voir les erreurs
                    </summary>
                    <ul className="mt-1 space-y-0.5 pl-4 list-disc">
                      {lastBackfill.error_details.slice(0, 5).map((e, i) => (
                        <li key={i} className="text-destructive">
                          {e.error}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                {lastBackfill.sent >= 200 && (
                  <p className="text-amber-600 mt-1">
                    ⚠️ Maximum atteint (200 par appel). Relance le backfill
                    pour traiter le reste.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Last triggered */}
        {config?.last_triggered_at && (
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Dernier envoi:</span>
              <span>{formatDate(config.last_triggered_at)}</span>
            </div>
            {config.last_status && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Statut:</span>
                <Badge variant={config.last_status === "success" ? "default" : "destructive"}>
                  {config.last_status === "success" ? "Succès" : "Erreur"}
                </Badge>
              </div>
            )}
            {config.last_status === "error" && config.last_error && (
              <p className="text-xs text-destructive bg-destructive/10 rounded p-2">
                {config.last_error}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleTest}
            disabled={testing || !webhookUrl.trim()}
          >
            {testing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Tester le webhook
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Sauvegarder
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
