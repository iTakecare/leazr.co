import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Send,
  Save,
  ExternalLink,
  Wifi,
  WifiOff
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

interface ZapierConfig {
  id: string;
  webhook_url: string;
  enabled_events: string[];
  is_active: boolean;
  last_triggered_at: string | null;
}

const AVAILABLE_EVENTS = [
  { id: "contract_signed", label: "Nouveau contrat signé", description: "Déclenché quand un contrat est signé" },
  { id: "client_created", label: "Nouveau client créé", description: "Déclenché quand un client est créé" },
  { id: "offer_accepted", label: "Nouvelle offre acceptée", description: "Déclenché quand une offre est acceptée" },
  { id: "offer_sent", label: "Offre envoyée", description: "Déclenché quand une offre est envoyée au client" },
  { id: "document_uploaded", label: "Document téléversé", description: "Déclenché quand un document est uploadé" },
  { id: "sepa_payment_created", label: "Paiement SEPA créé", description: "Déclenché pour créer un prélèvement SEPA via GoCardless" },
];

export default function ZapierIntegrationCard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  
  const [config, setConfig] = useState<ZapierConfig | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [enabledEvents, setEnabledEvents] = useState<string[]>([]);
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

      // Get user's company
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

      // Get Zapier config
      const { data: zapierConfig, error } = await supabase
        .from("zapier_integrations")
        .select("*")
        .eq("company_id", profile.company_id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching Zapier config:", error);
        return;
      }

      if (zapierConfig) {
        setConfig(zapierConfig);
        setWebhookUrl(zapierConfig.webhook_url || "");
        setEnabledEvents(zapierConfig.enabled_events || []);
        setIsActive(zapierConfig.is_active);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!webhookUrl.trim()) {
      toast.error("Veuillez entrer une URL de webhook Zapier");
      return;
    }

    if (!webhookUrl.includes("hooks.zapier.com")) {
      toast.error("L'URL doit être un webhook Zapier valide");
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
        enabled_events: enabledEvents,
        is_active: isActive,
      };

      if (config?.id) {
        // Update existing config
        const { error } = await supabase
          .from("zapier_integrations")
          .update(configData)
          .eq("id", config.id);

        if (error) throw error;
      } else {
        // Create new config
        const { data, error } = await supabase
          .from("zapier_integrations")
          .insert(configData)
          .select()
          .single();

        if (error) throw error;
        setConfig(data);
      }

      toast.success("Configuration Zapier sauvegardée");
      await fetchConfig();
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    const trimmedUrl = webhookUrl.trim();
    
    if (!trimmedUrl) {
      toast.error("Veuillez d'abord entrer une URL de webhook");
      return;
    }

    // Validation stricte de l'URL
    try {
      const url = new URL(trimmedUrl);
      if (url.protocol !== "https:") {
        toast.error("L'URL doit commencer par https://");
        return;
      }
      if (!url.hostname.includes("zapier.com")) {
        toast.warning("L'URL ne semble pas être un webhook Zapier valide");
      }
    } catch {
      toast.error("L'URL du webhook n'est pas valide");
      return;
    }

    try {
      setTesting(true);

      const testPayload = {
        event_type: "test",
        timestamp: new Date().toISOString(),
        triggered_from: window.location.origin,
        data: {
          message: "Test de connexion Zapier depuis Leazr",
          test: true,
        },
      };

      // Créer un AbortController pour le timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        await fetch(trimmedUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          mode: "no-cors",
          body: JSON.stringify(testPayload),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        // En mode no-cors, certaines erreurs sont "normales"
        // car on ne peut pas lire la réponse
        console.warn("Fetch warning (peut être normal en no-cors):", fetchError);
      }

      // Avec no-cors, on ne peut pas savoir si ça a vraiment fonctionné
      // Donc on affiche toujours un message informatif
      
      if (config?.id) {
        await supabase
          .from("zapier_integrations")
          .update({ last_triggered_at: new Date().toISOString() })
          .eq("id", config.id);
      }

      toast.info(
        "Requête envoyée vers Zapier. Vérifiez l'historique de votre Zap pour confirmer la réception. Si le Zap est en Draft, publiez-le d'abord.",
        { duration: 6000 }
      );
      
      await fetchConfig();
    } catch (error) {
      console.error("Error testing webhook:", error);
      toast.error(
        "Erreur inattendue. Vérifiez que votre Zap est publié (pas en Draft).",
        { duration: 6000 }
      );
    } finally {
      setTesting(false);
    }
  };

  const toggleEvent = (eventId: string) => {
    setEnabledEvents((prev) =>
      prev.includes(eventId)
        ? prev.filter((e) => e !== eventId)
        : [...prev, eventId]
    );
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "Jamais";
    return new Date(dateString).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Zapier
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
            <div className="p-2 bg-orange-100 rounded-lg">
              <Zap className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Zapier
                {config?.is_active && config?.webhook_url && (
                  <Badge className="bg-primary/20 text-primary hover:bg-primary/20">
                    <Wifi className="h-3 w-3 mr-1" />
                    Connecté
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Automatisez vos workflows avec 5000+ applications
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" asChild>
            <a href="https://zapier.com/app/zaps" target="_blank" rel="noopener noreferrer">
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

        {/* Webhook URL input */}
        <div className="space-y-2">
          <Label htmlFor="webhook-url">URL du Webhook Zapier</Label>
          <Input
            id="webhook-url"
            type="url"
            placeholder="https://hooks.zapier.com/hooks/catch/..."
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Créez un Zap avec un déclencheur "Webhooks by Zapier" et copiez l'URL ici.
          </p>
        </div>

        <Separator />

        {/* Events selection */}
        <div className="space-y-3">
          <Label>Événements à déclencher</Label>
          <div className="space-y-3">
            {AVAILABLE_EVENTS.map((event) => (
              <div key={event.id} className="flex items-start space-x-3">
                <Checkbox
                  id={event.id}
                  checked={enabledEvents.includes(event.id)}
                  onCheckedChange={() => toggleEvent(event.id)}
                />
                <div className="grid gap-1 leading-none">
                  <label
                    htmlFor={event.id}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {event.label}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {event.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Last triggered info */}
        {config?.last_triggered_at && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Dernier déclenchement:</span>
            <span>{formatDate(config.last_triggered_at)}</span>
          </div>
        )}

        {/* Info alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Les événements seront envoyés au webhook Zapier en temps réel. 
            Assurez-vous que votre Zap est publié et actif.
          </AlertDescription>
        </Alert>

        {/* Action buttons */}
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
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={saving}
          >
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
